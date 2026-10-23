# E-Bike Companion Website

Static website for E-Bike Companion, designed to deploy on Cloudflare Pages.

## Pages
- `/` — homepage and genuine app screenshot gallery
- `/compatibility/` — compatibility status and verification criteria
- `/guides/` — setup and troubleshooting guides
- `/releases/` — official download and release information
- `/roadmap/` — public project roadmap
- `/contribute/` — safe contribution guidance
- `/privacy/` — privacy policy draft requiring release review
- `/support/` — help and troubleshooting
- `/404.html` — custom not-found page

## Cloudflare Pages settings
- Framework preset: **None**
- Build command: leave empty
- Build output directory: repository root
- Production branch: `main`

Connect this repository through Cloudflare Pages → Create application → Pages → Connect to Git. Commits to `main` should deploy automatically when Git integration is enabled.

## Custom domain
In the Pages project's **Custom domains**, add `ebike.magservers.org`. Follow the DNS instructions shown in the dashboard. Do not remove records for other services on `magservers.org`.

## Required before public launch
- [ ] Add and test the real Google Play listing URL on the Releases page and homepage.
- [ ] Add the actual app version/build, minimum Android version and supported Android versions.
- [ ] Connect a public submission endpoint for bug reports and compatibility contributions. The current website is static and the app source repository is private; the contribution page is guidance only and does not send submissions.
- [ ] Add and test a monitored support/privacy email or another real contact route.
- [ ] Verify the privacy policy against the exact release APK, all SDKs, permissions and network behaviour; get appropriate legal review.
- [ ] Update the policy effective date after review and remove all draft/publisher checklist notices only after the checklist is completed.
- [ ] Link the privacy page from inside the app and in Google Play Console.
- [ ] Confirm compatibility claims against reproducible evidence. Do not mark a bike or capability verified based only on screenshots.
- [ ] Add actual release notes and known issues for each published version.
- [ ] Test every route and screenshot on mobile and desktop; validate links, keyboard focus, contrast and accessibility.
- [ ] Verify the custom domain, HTTPS and Cloudflare Pages production deployment.

## Important limitations
This site intentionally does not claim that the app is available in Google Play until the official listing is provided. No public submission form or backend is connected yet. Do not present the compatibility directory as a verified compatibility database until entries have been reviewed and documented.

## Design
The site uses the app's graphite, evergreen, Vela Mint and electric-blue palette, official launcher icon and genuine app screenshots. It is a static site with responsive layouts and reduced-motion support.

The privacy page is a draft for publisher review, not legal advice. Check all statements against the exact release build before submitting it to Google Play.
