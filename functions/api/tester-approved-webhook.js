/**
 * Sends an accepted-tester invitation when the private application issue is
 * labelled tester-approved. See automation/PRIVATE_GITHUB_TESTER_SETUP.md.
 */
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

async function signatureIsValid(raw, signature, secret) {
  if (!signature || !signature.startsWith("sha256=") || !secret) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)));
  const expected = "sha256=" + Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

function field(body, label) {
  const line = body.split("\n").find(item => item.startsWith("- **" + label + "**: "));
  return line ? line.slice(("- **" + label + "**: ").length).trim() : "";
}

export async function onRequestPost({ request, env }) {
  if (!env.GITHUB_WEBHOOK_SECRET || !env.RESEND_API_KEY ||
      !env.TESTER_EMAIL_FROM || !env.TESTER_CLOSED_TEST_URL) {
    return json({ ok: false, error: "Tester email service is not configured." }, 503);
  }

  const raw = await request.text();
  if (raw.length > 1024 * 1024) return json({ ok: false, error: "Payload too large." }, 413);
  if (!await signatureIsValid(raw, request.headers.get("X-Hub-Signature-256"), env.GITHUB_WEBHOOK_SECRET)) {
    return json({ ok: false, error: "Invalid signature." }, 401);
  }
  if (request.headers.get("X-GitHub-Event") !== "issues") return json({ ok: true, ignored: true });

  let payload;
  try { payload = JSON.parse(raw); } catch { return json({ ok: false, error: "Invalid JSON." }, 400); }
  if (payload.repository?.full_name !== "mgaither98-boop/E-BikeCompanion") {
    return json({ ok: false, error: "Repository not allowed." }, 403);
  }
  if (payload.action !== "labeled" || payload.label?.name !== "tester-approved" ||
      !Number.isInteger(payload.issue?.number)) {
    return json({ ok: true, ignored: true });
  }

  const application = typeof payload.issue.body === "string" ? payload.issue.body : "";
  const email = field(application, "Email");
  const name = field(application, "Preferred name/handle") || "there";
  if (!email || !email.includes("@") || !email.includes(".")) {
    return json({ ok: false, error: "Application email is missing or invalid." }, 422);
  }
  const optInUrl = env.TESTER_CLOSED_TEST_URL.trim();
  if (!optInUrl.startsWith("https://")) {
    return json({ ok: false, error: "Closed-test opt-in URL must be HTTPS." }, 503);
  }

  const textBody = `Hi ${name},

Thanks for volunteering to test E-Bike Companion. Your tester application has been accepted.

STEP 1 — OPT IN TO THE CLOSED TEST
Open this Google Play link while signed in with the Google account you use for the Play Store:
${optInUrl}

Tap the option to join/become a tester and follow the on-screen instructions. Please opt in before contacting support to request your complimentary promo code.

STEP 2 — REQUEST YOUR PROMO CODE
After opting in, email support@ebike.magservers.org and ask for your E-Bike Companion tester promo code. Include the Google account email you use for Google Play so we can help you redeem it on the correct account. Never send your password or payment details.

STEP 3 — REDEEM THE CODE AND INSTALL
1. Open the Google Play Store and tap your profile picture.
2. Choose Payments & subscriptions → Redeem code. You can also visit https://play.google.com/redeem while signed into the same Google account.
3. Enter the promo code we send you and follow Google's instructions.
4. Return to the closed-test page or app listing using the same Google account and install E-Bike Companion.

Please remain opted into the closed test for the required testing period. After installation, reply to let us know you're set up. If any step does not work, contact support@ebike.magservers.org.

Thanks for helping improve E-Bike Companion!

E-Bike Companion Support
support@ebike.magservers.org
`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "authorization": "Bearer " + env.RESEND_API_KEY,
        "content-type": "application/json",
        "Idempotency-Key": "tester-approved-issue-" + payload.issue.id,
      },
      body: JSON.stringify({
        from: env.TESTER_EMAIL_FROM,
        to: [email],
        reply_to: "support@ebike.magservers.org",
        subject: "Your E-Bike Companion closed-testing invitation",
        text: textBody,
      }),
    });
    if (!response.ok) return json({ ok: false, error: "Email provider rejected the message (HTTP " + response.status + ")." }, 502);
    return json({ ok: true, sent: true });
  } catch {
    return json({ ok: false, error: "Email service temporarily unavailable." }, 502);
  }
}

export async function onRequest(context) {
  if (context.request.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: { allow: "POST", "cache-control": "no-store" } });
  }
  return onRequestPost(context);
}
