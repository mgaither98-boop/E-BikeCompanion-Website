# Private tester applications: Cloudflare Pages + n8n + Gmail

The website form and proxy are committed, but **the workflow is not live until Cloudflare and n8n are configured and tested**.

## Data flow

1. The public form posts to the same-origin endpoint /api/tester-applications.
2. The Cloudflare Pages Function validates basic fields and forwards the application to the production n8n webhook. The n8n URL is stored in a Cloudflare Pages environment variable, not browser JavaScript.
3. n8n records the application in a private Google Sheet with Approval Status set to Pending.
4. You review the application and manually change Approval Status to Approved or Rejected.
5. A scheduled n8n workflow processes approved rows, marks each row Sending before sending Gmail, then records Sent, timestamp, and Gmail message ID.
6. The invitation contains the approved Google Play opt-in URL. Keep that URL in n8n or private configuration; never expose it on the public site.

## Cloudflare Pages setup

In Cloudflare Dashboard → Workers & Pages → your Pages project → Settings → Variables and Secrets, add this Production environment variable:

- Name: N8N_TESTER_WEBHOOK_URL
- Value: the Production URL from the n8n Webhook node, not its test URL

Redeploy after setting the variable. The Pages Function is at functions/api/tester-applications.js. It validates JSON, email, Android version, consent, payload size and test-area values. It does not intentionally log application contents or return upstream error details.

Before promoting the page, submit a test application and confirm it appears only in the private sheet. Do not use a public GitHub issue as an application inbox.

## Private Google Sheet

Create a private sheet named TesterApplications with these columns:

1. Application ID
2. Received At
3. Preferred Name
4. Email
5. Android Device and Version
6. Bike Model
7. Test Areas
8. Notes
9. Consent
10. Approval Status
11. Reviewed At
12. Invitation Status
13. Invitation Sent At
14. Gmail Message ID

Restrict access to the maintainer only (add a second reviewer only if necessary). Never publish the sheet or share it with a public link. Use a generated unique Application ID, not the email address, as the idempotency key. Set a retention period and reflect the real period in the privacy policy before launch.

## n8n workflow A — receive applications

Create a workflow with these nodes:

1. Webhook: method POST, path ebike-tester-application, production URL. Respond using a Respond to Webhook node.
2. Validate and normalise: repeat validation in n8n; do not rely solely on browser validation. Require consent, valid email and Android details. Reject oversized text and create a UUID Application ID server-side.
3. Duplicate check: search the private sheet for the same normalised email with an active Pending, Approved or Sent application. If one exists, do not create another row; return a generic accepted response to the browser. Do not reveal whether an email already exists.
4. Google Sheets Append Row: append the application with Approval Status Pending and Invitation Status blank.
5. Respond to Webhook: return { "ok": true } only after the private row is recorded. On validation/storage failure, return a generic error without echoing submitted data.

Set a conservative rate limit and bot protection in Cloudflare (Cloudflare Turnstile is an option) before public promotion. The Pages Function is a proxy and basic validator, not a complete anti-abuse system.

## n8n workflow B — approval and invitation

Use a Schedule Trigger every 2–5 minutes, then:

1. Read rows where Approval Status is Approved and Invitation Status is blank.
2. Process rows serially. Google Sheets does not provide a true atomic compare-and-set operation; ensure overlapping executions are disabled or otherwise prevented.
3. Write Invitation Status = Sending before sending email.
4. Send one Gmail message to the row's Email. Use a privately configured approved Play opt-in URL, never a link supplied by an applicant.
5. If Gmail succeeds, update Invitation Status = Sent, Invitation Sent At and Gmail Message ID. If sending fails, record Error and a short non-sensitive error code.
6. Never automatically retry rows marked Sending or Sent. Review stuck Sending rows manually against Gmail Sent before retrying.

### About exactly-once delivery

Gmail and Google Sheets do not share a transaction, so strict exactly-once delivery cannot be guaranteed. A run could send an email and fail before recording Sent. This design reduces duplicates by claiming rows before sending, serialising workflow execution, and requiring manual reconciliation of stuck Sending rows. Never blindly retry an uncertain send.

## Invitation email

Subject: You're invited to test E-Bike Companion

Include the approved Google Play opt-in URL, brief steps to join the test and install through Google Play, app version/build, where to report issues, safety reminders, and a contact address for questions or deletion requests. Do not include the entire application or unnecessary personal details.

## Go-live checklist

- [ ] Confirm the privacy policy accurately describes collection, purpose, processors, retention and deletion requests.
- [ ] Add the production n8n webhook URL as a Cloudflare Pages environment variable; never commit it to GitHub.
- [ ] Connect n8n credentials to the private Google Sheet and intended Gmail sender.
- [ ] Configure the real Google Play testing opt-in URL privately in n8n.
- [ ] Ensure only one invitation workflow execution can process rows at a time.
- [ ] Test invalid data, duplicate applications, approved and rejected applications, Gmail failure and a stuck Sending row.
- [ ] Verify no email address appears in browser URLs, public GitHub issues, public logs or public website source.
- [ ] Test the live form on a phone and desktop before announcing it.
