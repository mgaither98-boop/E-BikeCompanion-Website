# Private GitHub tester applications

This setup sends applications from the public tester page to issues in the **private** `mgaither98-boop/E-BikeCompanion` repository. No n8n, Google Sheet or email automation is required. You review applications and send invitations manually.

## 1. Create a narrowly scoped GitHub token

1. In GitHub, open **Settings → Developer settings → Fine-grained personal access tokens**.
2. Generate a token with a descriptive name such as `E-Bike Companion tester intake`.
3. Set resource owner to `mgaither98-boop`.
4. Choose **Only select repositories** and select `E-BikeCompanion` (the private app repository only).
5. Grant **Issues: Read and write** repository permission. No code, contents, administration or workflow permissions are needed.
6. Generate the token and copy it once. Never commit it to either repository or paste it into the website HTML.

## 2. Add the token to Cloudflare Pages

1. Open Cloudflare Dashboard → **Workers & Pages** → the Pages project for `ebike.magservers.org`.
2. Open **Settings → Variables and Secrets** (wording may vary by dashboard version).
3. Add a **secret**, not a public variable:
   - Name: `GITHUB_TESTER_TOKEN`
   - Value: the fine-grained token created above
4. Save and trigger a new deployment if Cloudflare does not redeploy automatically.

The website function at `functions/api/tester-applications.js` uses this secret server-side to create an issue in the private repository. The token is not included in browser code or returned in responses. The function returns a generic error if GitHub rejects the request.

## 3. Test before announcing applications

1. Open `https://ebike.magservers.org/testers/` after the deployment completes.
2. Submit a test application using an email address you control and a test Android device/version.
3. Confirm the issue appears in the private `E-BikeCompanion` repository and contains the submitted fields.
4. Confirm the same application is **not** visible in the public `E-BikeCompanion-Community` repository.
5. Test an invalid email and an unchecked consent box; the browser should reject them.
6. If submission fails, check Cloudflare Pages function logs for status/error information, but do not add application contents, email addresses or tokens to logs.

Do not advertise the form as working until this end-to-end test succeeds.

## 4. Review applications and invite testers

- Open Issues in the private app repository.
- Review each application manually.
- Optionally create labels `tester-pending`, `tester-approved` and `tester-rejected` to organise applications.
- If accepted, send the tester the email below from your chosen contact address. The form **does not send emails automatically**; it creates a private GitHub issue for manual review.
- Keep the Google Play invitation link and promo codes out of public pages and public repositories.
- Close or label rejected applications without publishing personal details.

### Accepted tester email template

**Subject:** E-Bike Companion closed testing — next steps

Hi [Tester name],

Thanks for volunteering to test E-Bike Companion. Your application has been accepted.

Please join the closed test using this Google Play opt-in link:

[PASTE YOUR CLOSED-TEST OPT-IN LINK HERE]

Because E-Bike Companion is a paid app, please contact **support@ebike.magservers.org** to request a complimentary Google Play promo code before installing. In your email, include the Google account email address you use for Google Play so we can help make sure you redeem the code on the correct account. Do not send us your password or any payment details.

**How to redeem your promo code**

1. Open the Google Play Store on your Android device.
2. Tap your profile picture in the top-right corner.
3. Select **Payments & subscriptions → Redeem code**. If that option is not shown, visit [play.google.com/redeem](https://play.google.com/redeem) while signed in to the same Google account.
4. Enter the promo code we send you and follow the on-screen instructions.
5. Make sure you are using that same Google account, open the E-Bike Companion Play Store listing from the closed-test link, and install the app.

Please accept the closed-test invitation and remain opted in for the required testing period. After installing, reply to let us know you're set up. Feedback can be sent through the channels provided with the test.

Thanks for helping improve E-Bike Companion!

E-Bike Companion Support  
support@ebike.magservers.org

**Maintainer reminder:** Generate and send each promo code individually through Play Console. Do not promise that a code has been issued until you have actually created one. Promo-code availability and redemption can depend on Google Play's current promotion rules.

## Privacy and limitations

- Application issues contain personal data, so keep this repository private and grant access only to people who need it.
- Anyone with access to the private repository may be able to view application details. Review collaborators and token permissions.
- The current intake does not automatically send emails, deduplicate applications, or enforce a retention period. Review and delete records when no longer needed, and publish a real retention period in the privacy policy before launch.
- The public website endpoint has basic validation but is not a complete anti-spam or rate-limiting system. Add abuse protection if the form receives spam.
- GitHub issue creation is the storage step; the form should report success only when GitHub accepts the issue.
- This is an implementation guide, not a legal compliance certification. Verify the privacy policy against the live deployment and actual handling before promotion.
