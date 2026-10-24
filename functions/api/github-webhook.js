/**
 * GitHub issue-close webhook. Configure the webhook on the community repo:
 * URL: https://ebike.magservers.org/api/github-webhook
 * Content type: application/json
 * Secret: a strong random value stored as GITHUB_WEBHOOK_SECRET in Pages
 * Events: Issues only
 *
 * Deletes private contact details when an issue is closed. The public issue is
 * not modified. GitHub retries may safely call this more than once.
 */
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

async function verifySignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=") || !secret) return false;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody)));
  const expected = "sha256=" + Array.from(digest, b => b.toString(16).padStart(2, "0")).join("");
  if (expected.length !== signatureHeader.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signatureHeader.charCodeAt(i);
  return diff === 0;
}

export async function onRequestPost({ request, env }) {
  if (!env.GITHUB_WEBHOOK_SECRET || !env.CONTACTS_DB) {
    return json({ ok: false, error: "Webhook is not configured." }, 503);
  }
  const raw = await request.text();
  if (raw.length > 1024 * 1024) return json({ ok: false, error: "Payload too large." }, 413);
  const valid = await verifySignature(raw, request.headers.get("X-Hub-Signature-256"), env.GITHUB_WEBHOOK_SECRET);
  if (!valid) return json({ ok: false, error: "Invalid signature." }, 401);
  if (request.headers.get("X-GitHub-Event") !== "issues") return json({ ok: true, ignored: true });
  let payload;
  try { payload = JSON.parse(raw); } catch { return json({ ok: false, error: "Invalid JSON." }, 400); }
  if (payload.action !== "closed" || !Number.isInteger(payload.issue?.number)) {
    return json({ ok: true, ignored: true });
  }
  // Restrict processing to the intended public community repository.
  if (payload.repository?.full_name !== "mgaither98-boop/E-BikeCompanion-Community") {
    return json({ ok: false, error: "Repository not allowed." }, 403);
  }
  const result = await env.CONTACTS_DB.prepare(
    "DELETE FROM report_contacts WHERE issue_number = ?"
  ).bind(payload.issue.number).run();
  return json({ ok: true, deleted: result.meta?.changes || 0 });
}

export async function onRequest(context) {
  if (context.request.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: { allow: "POST", "cache-control": "no-store" } });
  }
  return onRequestPost(context);
}
