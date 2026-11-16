# Linta v25 — mobile, avatar and demo-control audit

## Source reviewed

Reviewed the uploaded `Linta_Website_v24.zip` project: `index.html`, HVAC, plumbing and restoration niche pages, privacy/terms pages, shared HTML/CSS/JavaScript, niche conversation JSON, avatar assets, audio assets, service worker, and deployment configuration. This is a source-package review, not a test of the live production domain.

## Changes in this revision

- Added six distinct circular illustrated portrait avatars as optimized WEBP assets under `assets/avatars/`. The home dashboard and all three niche dashboards now use the illustrated portraits for fictional sample callers; the dashboard explicitly labels its data and people as illustrative, not client proof.
- Added six sample-caller entries where each niche dashboard uses six distinct portraits.
- Redesigned each niche sample-call phone as a modern handset with a status bar, refined device frame, trade/assistant header, legible conversation area, and a fixed action area.
- Added a prominent Play / Read Transcript control inside each phone. It is a real button, keyboard-accessible, displays a live elapsed time, and proxies to the existing sample player so the phone control and full-size control stay synchronized.
- Added a visible `Book a walkthrough` link inside each phone, using the existing Linta booking URL.
- Reworked the mobile navigation dimensions, hamburger menu panel positioning, safe-area offsets, narrow-screen CTA sizing, one-column niche demo layout, dashboard rows, avatar sizing, tap targets and horizontal overflow behavior.
- Added a mobile fallback that keeps reveal-animated content visible on lite/coarse-pointer devices, so CTAs do not remain transparent if the reveal observer is delayed or unavailable.
- Removed the AI-generated sample MP3s from the public audio folder. The sample player is now transcript-only by default and contains no browser speech-synthesis fallback. Human-recorded audio is only enabled after the operator adds consented recordings and explicitly sets `CONFIG.humanAudioApproved = true`.
- Updated the service-worker cache namespace to `linta-cache-v12` and bumped page asset query strings to reduce the chance of an older mobile stylesheet or script remaining cached.

## QA checks completed

- Parsed all six HTML pages. No duplicate IDs were found.
- Checked local `src`/`href` dependencies from all six pages; no missing page-local references were found.
- Parsed the embedded niche JSON on HVAC, plumbing and restoration; each retained `voice`, `sms` and `qa` conversation sets.
- Ran `node --check` on the shared showcase/extras scripts, service worker and model modules; checked `linta.js` as an ES module. All passed syntax checks.
- Parsed `linta.css`, `linta-clean.css` and `linta-mobile-peak.css` with `tinycss2`; no top-level CSS parse errors were found.
- Confirmed all six WEBP portrait assets exist and are referenced by the showcase script.
- Confirmed browser `speechSynthesis` / `SpeechSynthesisUtterance` is absent.
- Confirmed the phone controls are present on all three niche pages and connect to the shared sample player.
- Confirmed the cache namespace was bumped.

## Not verified here

A live browser screenshot / interaction pass could not be completed in this runtime: system Chromium stalled even on `about:blank`, and the Playwright-managed browser binary is not installed. Consequently, this report does **not** claim a full mobile-browser visual regression pass. Before public launch, test the ZIP on an actual staging URL at 320, 360, 390, 430, 768 and desktop widths, especially opening/closing the menu, tapping the in-phone transcript button, using the external player, and testing keyboard focus.

## Remaining launch dependencies

1. **Human audio:** no audio files are included. Obtain explicit speaker recording and website-publication consent, then add `assets/audio/ava-hvac.mp3`, `assets/audio/ava-plumbing.mp3` and `assets/audio/ava-restoration.mp3`, aligning their turn sequence to the niche scripts. Only then set `CONFIG.humanAudioApproved = true`. The player intentionally stays transcript-only otherwise.
2. **Live GPT conversation:** the supplied project is still a static frontend with illustrative scripted examples. A live, context-aware GPT conversation requires a secure server-side endpoint and provider credentials; no credentials or backend were supplied. Do not expose a secret API key in frontend JavaScript.
3. **Live call-in number:** `CONFIG.demoPhone` is empty, so a phone-call CTA is intentionally not shown. Provision a real number before enabling this feature. The in-phone walkthrough link is available meanwhile.
4. **Client proof:** avatars are fictional illustrative caller art. Add real customer photos, endorsements or results only with permission and verified details.
5. **Production metadata:** replace `YOUR-DOMAIN.com`, update generic social links and review draft privacy/terms with the operating company's actual details.

## Staging checklist

- [ ] Open home, HVAC, plumbing and restoration pages at 320 / 360 / 390 / 430 / 768 / 1280 px.
- [ ] Confirm the top bar, logo, audit CTA and hamburger fit without horizontal scroll.
- [ ] Open and close the mobile menu; verify every menu link can be tapped.
- [ ] Confirm the in-phone `Read transcript` control is visible and advances the transcript; confirm timer, pause and replay labels stay synchronized with the external button.
- [ ] Confirm `Book a walkthrough` opens the intended booking page.
- [ ] Confirm all six illustrated avatars appear in the dashboard and do not overflow their rows.
- [ ] Confirm the phone and dashboard remain usable with reduced motion and keyboard-only navigation.
- [ ] After consented recordings are installed, enable `humanAudioApproved`, then test playback and fallback behavior.
