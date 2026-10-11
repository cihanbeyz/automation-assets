# Linta adaptive performance candidate (v16)

This package combines the newer visual/CSS baseline and loader/back-navigation work from the `automation-assets-smooth` ZIP with the adaptive device-tier model code from the `linta-complete-adaptive-performance` ZIP.

## Intended behavior
- High-capability devices keep the full CSS effects and are not forced to 30 fps.
- Likely lower-capability devices receive the `.lite` CSS overrides; this is based on CPU/RAM hints, not merely touch input.
- 3D model quality tiers use the shared device-tier estimate; the lowest tier is capped near 30 fps to reduce sustained GPU load, while higher tiers are not capped.
- 3D canvas pixel ratio minimum is 1.0; the candidate does not use the `0.85` cap from `automation-assets-smooth`.
- Scene preload/dynamic import URLs are aligned at `v=16`.
- Story layout dimensions are cached outside the scroll hot path.
- Back/forward-cache restoration forces the page to ready state and restores reveal/typewriter text.
- A bounded same-origin service worker cache is included; third-party resources such as Three.js on jsDelivr are not intercepted.

## Deployment
1. Back up your current live site.
2. Extract this ZIP. Upload the CONTENTS of the extracted folder as the hosting root, so `index.html`, `linta.css`, `linta.js`, `assets/`, and `models/` sit at the top level together.
3. The `vercel.json` caching headers apply on Vercel. Other hosts may ignore this file; the service worker needs HTTPS in production (or localhost for testing).
4. Before launch, replace every `https://YOUR-DOMAIN.com` placeholder in the canonical URLs and social-share metadata with the real domain.
5. Because the Vercel config marks image assets immutable for a year, rename an image or add a new versioned URL whenever you replace an asset using the same path. Keep CSS/JS/model query versions aligned; bump them together when changing code.
6. Test these paths on the actual deployment: first visit to landing, first niche click, loading each model, browser Back to landing, reloading each niche directly, and a repeat visit after caching has populated.

## Important validation note
JavaScript syntax and local file references were checked during packaging. This candidate has NOT been tested in a real browser or on a Tecno Spark 30C, so do not treat static checks as a guarantee. Run the deployment smoke tests above before making it your permanent live version. Hardware hints are estimates; actual GPU performance varies by device.
