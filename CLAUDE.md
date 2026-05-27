## Project Context
- This is Zak Esposito's personal developer portfolio (live at zakesposito.dev). It is NOT the business/agency site.
- Audience: developers, recruiters, hiring managers. They judge it on craft, personality, and originality, not conversion copy.
- Goal: the site itself is the strongest project on it. Bold, playful, memorable, demonstrably well-built.
- Theme: an original racing-game main-menu experience (boot sequence, tile-based mode select, sound design, motion). All assets original. Do NOT use Ferrari, F1, PlayStation, LEGO, or any real brand assets, logos, or copyrighted material.
- The accent green (#10B981) is the only colour through-line so the site still reads as "Zak"; the dark racing palette owns the rest.

## Styling
- Hand-written CSS in [css/](css/) with custom properties defined in [css/tokens.css](css/tokens.css). No Tailwind CDN, no utility framework, no build step for styles.
- All colour, type-scale, spacing, easing, and z-layer values flow through CSS custom properties — never hard-code a hex outside of `tokens.css`.
- Dark theme only: `--bg-base: #07090A`, text `--text-primary: #E8EBED`, single accent `--accent: #10B981`.

## Audio
- UI sounds (hover, select, back, error, etc.) are synthesised at runtime via WebAudio — no sample files.
- One exception: the boot chime uses a CC0 sample at [assets/audio/boot-chime.mp3](assets/audio/boot-chime.mp3) for `bootChime`. Any new ambient/musical cue should be WebAudio-synthesised unless there's a specific reason a sample is required, in which case it must be CC0 / public-domain licensed and documented here.

## Reference / Originality
- No reference image to match. Design from scratch with high craft.
- Invent the look. Do not copy any existing site or game UI; take inspiration for motion and feel only.
- Still screenshot and iterate (at least 2 Puppeteer rounds), comparing against the plan and fixing rough edges.
