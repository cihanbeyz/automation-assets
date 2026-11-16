# Linta v2 - what changed
- Live loss counter + honest calculator (spam/existing-customer filter, crew-capacity cap, yearly/daily/hourly, since-Jan-1, ROI)
- Phone mockup (home hero) + sample-call transcript player on every niche page; real audio is played only from supplied MP3 recordings
- Offer stack ("what you get / what it replaces") with sourced price anchors
- Plan cards on the home page, FAQ answers for spam + fully booked, one CTA (15-min audit)
- privacy.html + terms.html (DRAFT - fill brackets, have a lawyer review)

# To do before launch
1. Buy a domain, then run: ./set-domain.sh yourdomain.com hello@yourdomain.com
2. No sample audio is included in this build because the previous MP3s were AI-generated and the requested target is real human performance. Until consented human recordings are supplied, each player displays the conversation transcript only. Add `ava-hvac.mp3`, `ava-plumbing.mp3` and `ava-restoration.mp3` to `assets/audio/`, then set `CONFIG.humanAudioApproved = true` in `linta.js`. Browser text-to-speech and synthetic demo playback are disabled.
3. Put a real demo number in linta.js CONFIG.demoPhone (hidden while empty)
4. Add real testimonials to CONFIG.testimonials when you have them (hidden while empty)
5. Verify the cited stats in #bleed and the answering-service price source.
Upload the folder contents as the site root. 3D models are untouched.

# v18 additions (calm layer)
- linta-clean.css: quieter design, removes marquee/scroll cue/wipe, mobile one-column, reduced-motion support.
- linta-extras.js: sample dashboard on every page (labelled sample data), client-proof section (hidden until you add real clients to window.LINTA_CLIENTS), cookie banner (Essential only / Accept all, stored on device, "Cookie settings" link in footer).
- vercel.json: added CSP, HSTS, COOP/CORP. Test the site after deploying; if something is blocked, check the browser console for "Content Security Policy".
- Replace https://YOUR-DOMAIN.com before launch (./set-domain.sh).
- Add real client photos only with permission, and add human-recorded audio only with speaker consent. Illustrative avatars in assets/avatars/ are fictional demo callers, not clients or testimonials.


## Mobile v27 refinement
- Added six polished circular illustrated caller portraits (WEBP) to the sample dashboard across the home, HVAC, plumbing and restoration pages.
- Redesigned each niche sample-call handset with a modern device frame, status bar, readable message area, explicit in-phone Play / Read control, time display and walkthrough CTA.
- Synced the in-phone sample control with the existing accessible sample player so it never becomes a dead visual element.
- Added mobile-specific layout and navigation refinements for narrow widths, safe-area insets, tap targets, dashboard rows and scroll clipping.
- Synthetic sample MP3s were removed from the public assets; the player defaults to a transcript until consented human recordings are added and explicitly enabled.
