/* =========================================================================
   LINTA — site engine (no dependencies)
   Edit CONFIG below to change prices, links, guarantee numbers, founding spots.
   ========================================================================= */
export const CONFIG = {
  brand: "Linta",
  ai: "Ava",
  email: "lintaagency@gmail.com",
  cal: {
    audit: "https://cal.com/linta/revenue-audit",        // 15 min
    strategy: "https://cal.com/linta/strategy-session",  // 30 min
  },
  paths: { models: "./models/" },
  foundingSpotsLeft: 3,       // update this number as you sign Founding Partners (per trade)
  recoveryDefault: 10,        // intentionally cautious illustrative scenario, not a verified performance claim
  plans: [
    {
      id: "catch", name: "Catch", tag: "Stop the bleeding", monthly: 497, setup: 497,
      features: [
        "Ava answers after-hours, busy and missed calls",
        "Instant text-back on every missed call",
        "Bookings land straight in your calendar",
        "Weekly results report",
      ],
    },
    {
      id: "capture", name: "Capture", tag: "The full front desk", monthly: 797, setup: 997, rec: true,
      features: [
        "Everything in Catch",
        "Ava on every call, 24/7",
        "Knowledge base trained on your business",
        "Emergency triage and live transfer to your on-call",
        "Appointment reminders (fewer no-shows)",
        "Quote follow-up sequences",
      ],
    },
    {
      id: "dominate", name: "Dominate", tag: "Win the whole market", monthly: 1297, setup: 1497,
      features: [
        "Everything in Capture",
        "{reactivation}",
        "Review engine after every job",
        "{campaign}",
        "Monthly 30-minute strategy session",
        "Priority support",
      ],
    },
  ],
};

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;
const COARSE = matchMedia("(pointer: coarse)").matches;
const fmt$ = (n) => "$" + Math.round(n).toLocaleString("en-US");
const root = document.documentElement;
const NICHE = (() => { try { return JSON.parse($("#niche")?.textContent || "null"); } catch { return null; } })();

/* =========================================================================
   1. LIQUID GLASS — low-cost CSS blur + pointer-following specular highlight.
   ========================================================================= */
function liquidGlass() {
  // Lightweight pointer-following highlight. Mobile and reduced-motion users keep the static glass.
  if (COARSE || REDUCE) return;
  let raf = 0, last = null, px = 0, py = 0;
  addEventListener("pointermove", (e) => {
    const target = e.target.closest && e.target.closest(".lg");
    if (!target) return;
    last = target; px = e.clientX; py = e.clientY;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (!last || !last.isConnected) return;
      const r = last.getBoundingClientRect();
      if (!r.width || !r.height) return;
      last.style.setProperty("--lx", ((px - r.left) / r.width * 100).toFixed(1) + "%");
      last.style.setProperty("--ly", ((py - r.top) / r.height * 100).toFixed(1) + "%");
    });
  }, { passive: true });
}
/* =========================================================================
   2. TEXT MOTION: word reveal, typed text, counters, generic reveal
   ========================================================================= */
function splitWords(el) {
  let i = 0;
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((tok) => {
          if (!tok) return;
          if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(" ")); return; }
          const w = document.createElement("span"); w.className = "w";
          const k = document.createElement("i"); k.style.setProperty("--i", i++); k.textContent = tok; w.appendChild(k); frag.appendChild(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== "BR") walk(n);
    });
  };
  walk(el);
}
function typeText(el) {
  const full = el.textContent; el.setAttribute("aria-label", full); el.textContent = "";
  if (REDUCE) { el.textContent = full; el.classList.add("done"); return; }
  let n = 0; const tick = () => { el.textContent = full.slice(0, ++n); if (n < full.length) setTimeout(tick, 26); else el.classList.add("done"); }; tick();
}
function countTo(el) {
  const to = parseFloat(el.dataset.count), pre = el.dataset.pre || "", suf = el.dataset.suf || "", dec = +el.dataset.dec || 0;
  const w = (v) => { el.textContent = pre + v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf; };
  if (REDUCE) { w(to); return; }
  const t0 = performance.now();
  (function f(t) { const p = clamp((t - t0) / 1500); w(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f); })(t0);
}
function motion() {
  $$("[data-split]").forEach(splitWords);
  $$("[data-type]").forEach((el) => { el.__full = el.textContent; el.textContent = ""; });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target; io.unobserve(el);
      if (el.hasAttribute("data-type")) { el.textContent = el.__full; typeText(el); }
      if (el.hasAttribute("data-count")) countTo(el);
      el.classList.add("in");
    });
  }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
  $$("[data-r],[data-split],[data-count],[data-type]").forEach((el) => io.observe(el));
}

/* magnetic buttons + tilt cards (desktop only) */
function interactions() {
  if (COARSE || REDUCE) return;
  const mags = $$(".mag");
  addEventListener("pointermove", (e) => {
    mags.forEach((b) => {
      const r = b.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, dx = e.clientX - cx, dy = e.clientY - cy, d = Math.hypot(dx, dy);
      if (d < 130) b.style.transform = `translate(${dx * 0.22}px, ${dy * 0.28}px)`; else if (b.style.transform) b.style.transform = "";
    });
  }, { passive: true });
  $$(".tcard").forEach((c) => {
    c.addEventListener("pointermove", (e) => {
      const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      c.style.setProperty("--tx", x.toFixed(3)); c.style.setProperty("--ty", y.toFixed(3));
    });
    c.addEventListener("pointerleave", () => { c.style.setProperty("--tx", 0); c.style.setProperty("--ty", 0); });
  });
  addEventListener("pointermove", (e) => {
    root.style.setProperty("--mx", (e.clientX / innerWidth - 0.5).toFixed(3));
    root.style.setProperty("--my", (e.clientY / innerHeight - 0.5).toFixed(3));
  }, { passive: true });
}

/* =========================================================================
   3. STORY — 3D model scroll sync, copy slides, dim + hand-off to sales page
   ========================================================================= */
function story(N) {
  const track = $("#track"), canvas = $("#stage"), slides = $$("#copy article"), stops = N.stops || [0.18, 0.44, 0.7];
  if (!track || !canvas) return;
  let S = null, cur = -1, hidden = false, raf = 0;
  const dry = N.dry || null;
  function onScroll() {
    raf = 0;
    const y = scrollY, vh = innerHeight, th = track.offsetHeight, endY = Math.max(1, th - vh);
    const p = clamp(y / endY);
    if (S) S.setProgress(p);
    root.style.setProperty("--p", p.toFixed(4));
    root.style.setProperty("--cool", sm(0.45, 0.7, p).toFixed(3));
    if (dry) root.style.setProperty("--dry", sm(dry[0], dry[1], p).toFixed(3));
    const out = sm(endY - 0.2 * vh, endY + 0.55 * vh, y);
    root.style.setProperty("--dim", out.toFixed(3));
    root.style.setProperty("--copyO", (1 - sm(endY - 0.3 * vh, endY + 0.1 * vh, y)).toFixed(3));
    canvas.style.setProperty("--cv", (1 - out).toFixed(3));
    const hide = out >= 0.999;
    if (hide !== hidden) { hidden = hide; canvas.style.display = hide ? "none" : "block"; }   // stops rendering → saves phone battery
    const i = stops.filter((s) => p >= s).length;
    if (i !== cur) { slides.forEach((s, k) => s.classList.toggle("on", k === i)); cur = i; }
  }
  const sched = () => { if (!raf) raf = requestAnimationFrame(onScroll); };
  addEventListener("scroll", sched, { passive: true });
  addEventListener("resize", sched, { passive: true });
  onScroll();
  (async () => {
    await new Promise((res) => { const t = () => (canvas.clientWidth && canvas.clientHeight ? res() : requestAnimationFrame(t)); t(); });
    try {
      const m = await import(CONFIG.paths.models + N.model + "?v=10");
      S = m.mount(canvas);
      window.dispatchEvent(new Event("linta:model-ready"));
      canvas.classList.add("on"); setTimeout(() => canvas.classList.add("settled"), 1300);
      onScroll();
    } catch (e) { console.error("3D model failed to load:", e); window.dispatchEvent(new Event("linta:model-ready")); }
  })();
}

/* =========================================================================
   4. CALCULATOR + BLEED METER + PLANS
   ========================================================================= */
function renderPlans(N) {
  const host = $("#plans"); if (!host) return;
  const spots = CONFIG.foundingSpotsLeft;
  const fill = (t) => t.replace("{reactivation}", N.reactivation).replace("{campaign}", N.campaign);
  host.innerHTML = CONFIG.plans.map((p) => `
    <article class="plan lg ${p.rec ? "rec" : ""}" ${p.rec ? "data-lg" : ""} data-r>
      ${p.rec ? '<span class="badge">MOST POPULAR</span>' : ""}
      <h3>${p.name}</h3>
      <div class="tagl">${p.tag}</div>
      <div class="price">${fmt$(p.monthly)}<small> /month</small></div>
      <div class="setup">${spots > 0 ? `<s>${fmt$(p.setup)} setup</s><b>$0 setup for Founding Partners</b>` : `${fmt$(p.setup)} one-time setup`}</div>
      <ul>${p.features.map((f) => `<li>${fill(f)}</li>`).join("")}</ul>
      <a class="btn ${p.rec ? "primary" : "lg"} mag" href="${CONFIG.cal.audit}" target="_blank" rel="noopener">Book my free audit <span class="arr">→</span></a>
    </article>`).join("");
  const sp = $("#spots"); if (sp) sp.textContent = `${spots} of 3 spots open`;
  const fd = $("#found"); if (fd && spots <= 0) fd.hidden = true;
}
function calculator(N) {
  const c = $("#calc"); if (!c) return;
  const ids = ["calls", "miss", "job", "close", "rec"], el = {};
  ids.forEach((k) => (el[k] = $("#c-" + k)));
  const out = { leak: $("#o-leak"), rec: $("#o-rec"), fee: $("#o-fee"), net: $("#o-net"), pay: $("#o-pay"), be: $("#o-be"), month: $("#m-month") };
  const bars = { l: $("#bar-leak"), r: $("#bar-rec") };
  let plan = "capture", found = false;
  function tween(node, to, f = fmt$) {
    if (!node) return;
    if (node.__frame) cancelAnimationFrame(node.__frame);
    const from = typeof node.__shown === "number" ? node.__shown : 0;
    if (REDUCE || Math.abs(to - from) < 0.5) { node.__shown = to; node.textContent = f(to); node.__frame = 0; return; }
    const t0 = performance.now();
    const step = (t) => {
      const p = clamp((t - t0) / 360), e = 1 - Math.pow(1 - p, 3), value = from + (to - from) * e;
      node.__shown = value; node.textContent = f(value);
      if (p < 1) node.__frame = requestAnimationFrame(step); else node.__frame = 0;
    };
    node.__frame = requestAnimationFrame(step);
  }
  function update(pulse = true) {
    const v = {};
    ids.forEach((k) => { v[k] = +el[k].value; el[k].style.setProperty("--fill", ((el[k].value - el[k].min) / (el[k].max - el[k].min) * 100) + "%"); });
    $("#v-calls").textContent = v.calls; $("#v-miss").textContent = v.miss + "%"; $("#v-job").textContent = fmt$(v.job); $("#v-close").textContent = v.close + "%"; $("#v-rec").textContent = v.rec + "%";
    const p = CONFIG.plans.find((x) => x.id === plan), firstMonthFee = p.monthly + (found ? 0 : p.setup);
    const missedCalls = v.calls * (v.miss / 100) * 4.33;
    // Planning scenario: the entered answered-call close rate is applied to missed calls too.
    const opportunity = missedCalls * (v.close / 100) * v.job;
    const recoveredJobs = missedCalls * (v.rec / 100) * (v.close / 100);
    const recoveredGross = recoveredJobs * v.job;
    const grossLessFirstMonthFee = recoveredGross - firstMonthFee;
    const jobsToCoverFee = Math.max(1, Math.ceil(firstMonthFee / Math.max(1, v.job)));
    tween(out.leak, opportunity);
    tween(out.rec, recoveredGross);
    tween(out.fee, firstMonthFee);
    tween(out.net, grossLessFirstMonthFee, (n) => (n < 0 ? "−" : "") + fmt$(Math.abs(n)));
    tween(out.be, jobsToCoverFee, (n) => Math.round(n) + (Math.round(n) === 1 ? " job" : " jobs"));
    tween(out.pay, recoveredJobs, (n) => n.toFixed(1) + " jobs/mo");
    tween(out.month, opportunity);
    const mx = Math.max(opportunity, 1);
    if (bars.l) bars.l.style.width = "100%";
    if (bars.r) bars.r.style.width = clamp(recoveredGross / mx) * 100 + "%";
    const cta = $("#c-cta");
    if (cta) cta.href = `${CONFIG.cal.audit}?notes=${encodeURIComponent(`Illustrative calculator scenario: ${v.calls} calls/wk, ${v.miss}% missed, ${fmt$(v.job)} average job, ${v.close}% close rate, ${v.rec}% recovery scenario. Potential gross sales represented by missed calls: ${fmt$(opportunity)}/mo; estimated recovered gross sales: ${fmt$(recoveredGross)}/mo. Not verified results. Plan: ${p.name}. Founding Partner setup waiver: ${found ? "applied" : "not applied"}.`)}`;
    if (pulse) $$(".res .card", c).forEach((cd) => { cd.classList.add("pulse"); setTimeout(() => cd.classList.remove("pulse"), 450); });
  }
  const d = N.calc || {};
  ids.forEach((k) => { const r = el[k]; if (d[k] !== undefined) r.value = d[k]; r.addEventListener("input", () => update()); });
  el.rec.value = CONFIG.recoveryDefault;
  $$("#plansel button").forEach((b) => b.addEventListener("click", () => { plan = b.dataset.p; $$("#plansel button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); update(); }));
  const founding = $("#c-found"); if (founding) founding.addEventListener("change", (e) => { found = e.target.checked; update(); });
  update(false);
}
/* =========================================================================
   5. AVA DEMOS — looping example conversations
   ========================================================================= */
function demos(N) {
  if (!N || !N.demos) return;
  $$("[data-demo]").forEach((box) => {
    const script = N.demos[box.dataset.demo]; if (!script) return;
    const screen = $(".screen", box), wave = $(".wave", box);
    let timers = [], running = false;
    const clear = () => { timers.forEach(clearTimeout); timers = []; };
    function play() {
      clear(); screen.innerHTML = ""; let t = 400;
      script.forEach((ln) => {
        t += ln.d ?? 1500;
        timers.push(setTimeout(() => {
          const b = document.createElement("div"); b.className = "bub " + ln.t; b.textContent = ln.s; screen.appendChild(b);
          if (wave) wave.classList.toggle("idle", ln.t !== "ava");
          while (screen.children.length > 7) screen.firstChild.remove();
        }, t));
      });
      timers.push(setTimeout(() => { if (running) play(); }, t + 3800));
    }
    new IntersectionObserver((en) => { const on = en[0].isIntersecting; if (on && !running) { running = true; play(); } if (!on && running) { running = false; clear(); } }, { threshold: 0.35 }).observe(box);
  });
}

/* =========================================================================
   6. FAQ, nav, sticky CTA, anchors, curtain, landing transitions
   ========================================================================= */
function faq() {
  $$(".qa").forEach((q) => {
    const b = $("button", q);
    b.addEventListener("click", () => {
      const open = q.classList.contains("open");
      $$(".qa.open").forEach((o) => { o.classList.remove("open"); $("button", o).setAttribute("aria-expanded", "false"); });
      if (!open) { q.classList.add("open"); b.setAttribute("aria-expanded", "true"); }
    });
  });
}
function anchors() {
  $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
    const t = $(a.getAttribute("href")); if (!t) return; e.preventDefault();
    const y = t.getBoundingClientRect().top + scrollY - 20; if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1.4 }); else scrollTo({ top: y, behavior: REDUCE ? "auto" : "smooth" });
  }));
}
function sticky() {
  const s = $(".sticky-cta"); if (!s) return;
  const fin = $("#final");
  let finalOn = false;
  if (fin) new IntersectionObserver((en) => { finalOn = en[0].isIntersecting; upd(); }, { threshold: 0.15 }).observe(fin);
  const trk = $("#track");
  const upd = () => { const inStory = trk && scrollY < trk.offsetHeight - innerHeight * 0.5; s.classList.toggle("on", scrollY > innerHeight * 0.6 && !finalOn && !inStory); };
  addEventListener("scroll", upd, { passive: true }); upd();
}
function curtain() {
  const c = $(".curtain"); if (!c) return;
  const start = performance.now();
  let loaded = document.readyState === "complete", modelReady = !NICHE, done = false;
  let minTimer = 0, safetyTimer = 0;
  const finish = () => {
    if (done) return;
    done = true;
    if (minTimer) clearTimeout(minTimer);
    if (safetyTimer) clearTimeout(safetyTimer);
    c.classList.add("done"); root.classList.add("ready");
  };
  const check = () => {
    if (done || !loaded || !modelReady || minTimer) return;
    const minTime = REDUCE ? 120 : 480;
    minTimer = setTimeout(finish, Math.max(0, minTime - (performance.now() - start)));
  };
  if (!loaded) addEventListener("load", () => { loaded = true; check(); }, { once: true });
  if (!modelReady) addEventListener("linta:model-ready", () => { modelReady = true; check(); }, { once: true });
  // Escape hatch if slow network/GPU initialization prevents the model-ready event.
  safetyTimer = setTimeout(finish, 4200);
  check();
}
async function smooth() {
  if (COARSE || REDUCE) return;
  try {
    const { default: Lenis } = await import("https://cdn.jsdelivr.net/npm/lenis@1.1.20/dist/lenis.mjs");
    const l = new Lenis({ lerp: 0.11, wheelMultiplier: 0.95 });
    window.__lenis = l; root.classList.add("lenis", "lenis-smooth");
    let raf = 0, alive = true;
    const frame = (ts) => { raf = 0; if (!alive || document.hidden) return; l.raf(ts); raf = requestAnimationFrame(frame); };
    const start = () => { if (alive && !document.hidden && !raf) raf = requestAnimationFrame(frame); };
    const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
    document.addEventListener("visibilitychange", () => document.hidden ? stop() : start(), { passive: true });
    window.addEventListener("pagehide", () => { alive = false; stop(); l.destroy(); }, { once: true });
    start();
  } catch (e) { /* CDN unavailable: native scrolling remains functional. */ }
}
function landing() {
  const cards = $$(".tcard"); if (!cards.length) return;
  const add = (rel, href, as, extra = {}) => {
    if (document.querySelector(`link[rel="${rel}"][href="${href}"]`)) return;
    const l = document.createElement("link"); l.rel = rel; l.href = href; if (as) l.as = as; Object.assign(l, extra); document.head.appendChild(l);
  };
  const warm = (c) => {
    if (c.__w) return; c.__w = true;
    add("prefetch", c.getAttribute("href"));
    add("modulepreload", CONFIG.paths.models + "core.js?v=10"); add("modulepreload", CONFIG.paths.models + c.dataset.model + "?v=10");
    add("preload", c.dataset.bg, "image");
  };
  cards.forEach((c) => {
    ["pointerenter", "focus", "touchstart"].forEach((ev) => c.addEventListener(ev, () => warm(c), { passive: true }));
    c.addEventListener("click", (e) => {
      if (e.metaKey || e.ctrlKey) return;
      e.preventDefault(); warm(c);
      const w = $(".wipe"); w.style.setProperty("--wx", e.clientX + "px"); w.style.setProperty("--wy", e.clientY + "px");
      w.style.setProperty("--ac", c.dataset.c); w.style.setProperty("--ac2", c.dataset.c2);
      requestAnimationFrame(() => w.classList.add("go"));
      setTimeout(() => (location.href = c.getAttribute("href")), REDUCE ? 10 : 650);
    });
  });
  // idle: pre-warm three.js itself (skip on data-saver / slow links)
  const conn = navigator.connection || {};
  if (!conn.saveData && !/2g/.test(conn.effectiveType || "")) {
    (window.requestIdleCallback || ((f) => setTimeout(f, 2500)))(() => add("modulepreload", "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js"));
  }
}

/* ---------- boot ---------- */
function boot() {
  if (NICHE) renderPlans(NICHE);   // must exist before motion()/liquidGlass() scan the page
  curtain(); smooth(); motion(); liquidGlass(); interactions(); faq(); anchors(); sticky(); landing();
  $$("[data-year]").forEach((n) => (n.textContent = new Date().getFullYear()));
  if (NICHE) { calculator(NICHE); demos(NICHE); story(NICHE); }
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
