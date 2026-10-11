/* Linta safe runtime cache — no image resizing/compression and no visual changes.
   Bump CACHE_VERSION whenever this caching logic itself changes. */
const CACHE_VERSION = "linta-cache-v2";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;
const MAX_STATIC_ENTRIES = 180;

self.addEventListener("install", (event) => {
  // Activate the new worker promptly; old tabs continue to work normally.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((name) =>
          name.startsWith("linta-cache-") &&
          name !== STATIC_CACHE &&
          name !== PAGE_CACHE
        )
        .map((name) => caches.delete(name))
    );
    await self.clients.claim();
  })());
});

function isSameOrigin(requestURL) {
  return requestURL.origin === self.location.origin;
}

function isCacheableStatic(url) {
  return /\.(?:css|js|mjs|png|jpe?g|webp|avif|gif|svg|ico|woff2?|ttf|otf)$/i.test(url.pathname);
}

function isVersioned(url) {
  return url.searchParams.has("v") || url.searchParams.has("hash") || url.searchParams.has("rev");
}

async function putIfValid(cacheName, request, response) {
  if (!response || !response.ok || response.type !== "basic") return;
  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());

  // Keep the runtime cache bounded so it doesn't grow without limit.
  const keys = await cache.keys();
  if (keys.length > MAX_STATIC_ENTRIES) {
    const removeCount = keys.length - MAX_STATIC_ENTRIES;
    await Promise.all(keys.slice(0, removeCount).map((key) => cache.delete(key)));
  }
}

async function networkFirstPage(request) {
  const cache = await caches.open(PAGE_CACHE);
  const networkPromise = fetch(request).then(async (response) => {
    if (response.ok && response.type === "basic") {
      await cache.put(request, response.clone());
    }
    return response;
  });

  // If the network is slow, show a previously visited page after 3 seconds,
  // while allowing the network request to finish and refresh the cache.
  let timeoutId;
  const timeoutPromise = new Promise((resolve) => {
    timeoutId = setTimeout(() => resolve(null), 3000);
  });

  try {
    const response = await Promise.race([networkPromise, timeoutPromise]);
    if (response) return response;
    const cached = await cache.match(request);
    return cached || await networkPromise;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response("You appear to be offline. Reconnect and reload Linta.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function cacheFirstVersioned(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    await putIfValid(STATIC_CACHE, request, response);
  }
  return response;
}

async function staleWhileRevalidate(request, event) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  const update = fetch(request).then(async (response) => {
    if (response.ok && response.type === "basic") {
      await putIfValid(STATIC_CACHE, request, response);
    }
    return response;
  });
  // Keep the background refresh alive after returning a cached response.
  event.waitUntil(update.catch(() => {}));

  if (cached) {
    // Refresh in the background; keep the current visit fast.
    return cached;
  }
  return update;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (!isSameOrigin(url)) return;

  // Always prefer the network for page navigations, with a cached fallback.
  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }

  // Ignore non-static requests such as APIs, forms, and other dynamic data.
  if (!isCacheableStatic(url)) return;

  if (isVersioned(url)) {
    event.respondWith(cacheFirstVersioned(request));
  } else {
    event.respondWith(staleWhileRevalidate(request, event));
  }
});
