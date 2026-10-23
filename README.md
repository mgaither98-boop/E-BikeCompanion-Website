# E-Bike Companion Website

Static website for E-Bike Companion, designed to deploy on Cloudflare Pages.

## Pages
- `/` — homepage
- `/privacy/` — privacy policy draft
- `/support/` — help and troubleshooting
- `/404.html` — custom not-found page

## Cloudflare Pages settings
- Framework preset: **None**
- Build command: leave empty
- Build output directory: `/` (repository root)
- Production branch: `main`

Connect this repository through Cloudflare Pages → Create application → Pages → Connect to Git. Commits to `main` will deploy automatically.

## Custom domain
In the Pages project's **Custom domains**, add `ebike.magservers.org`. Follow the DNS instructions shown in the dashboard. Do not remove records for other services on `magservers.org`.

## Before public launch
- [ ] Verify the privacy policy against the exact released APK, including dependency SDKs and network behaviour.
- [ ] Add and test a monitored support/privacy email.
- [ ] Update the draft policy effective date after review.
- [ ] Link the privacy page from inside the app and in Google Play Console.
- [ ] Add the real Google Play listing link after publication.
- [ ] Test homepage, `/privacy/`, and `/support/` over HTTPS on mobile and desktop.
- [ ] Check the custom domain and HTTPS certificate.
- [ ] Review product and feature statements for accuracy.

## Design
The site uses E-Bike Companion's dark graphite, Vela Mint and electric-blue palette. It is responsive, keyboard-accessible, supports reduced motion and uses system-font fallbacks. Google Fonts are an optional progressive enhancement.

The privacy page is a draft for publisher review, not legal advice. Do not submit it to Google Play until its statements have been checked against the exact release build.
