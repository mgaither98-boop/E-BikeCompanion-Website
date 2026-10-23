/**
 * Cloudflare Pages Function: private tester application proxy.
 *
 * Required Pages environment variable:
 *   N8N_TESTER_WEBHOOK_URL = the production n8n webhook URL
 *
 * Do not put the webhook URL or any credential in browser JavaScript.
 */
const ALLOWED_AREAS = new Set([
  "General app testing",
  "Bluetooth and bike compatibility",
  "Offline maps and GPX",
  "Read-only research and diagnostics",
]);

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin");
  const requestUrl = new URL(request.url);
  if (origin && origin !== requestUrl.origin) {
    return json({ ok: false, error: "Origin not allowed." }, 403);
  }

  if (!env.N8N_TESTER_WEBHOOK_URL) {
    return json({ ok: false, error: "Tester applications are not configured yet." }, 503);
  }

  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return json({ ok: false, error: "JSON is required." }, 415);
  }

  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > 10000) return json({ ok: false, error: "Application is too large." }, 413);

  let data;
  try {
    const raw = await request.text();
    if (raw.length > 10000) return json({ ok: false, error: "Application is too large." }, 413);
    data = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: "Invalid application data." }, 400);
  }

  const clean = (value, max) => typeof value === "string" ? value.trim().slice(0, max) : "";
  const name = clean(data.name, 80);
  const email = clean(data.email, 160).toLowerCase();
  const android = clean(data.android, 120);
  const bike = clean(data.bike, 160);
  const notes = clean(data.notes, 1500);
  const testAreas = Array.isArray(data.testAreas)
    ? [...new Set(data.testAreas.filter(v => typeof v === "string" && ALLOWED_AREAS.has(v)))]
    : [];

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, error: "Enter a valid email address." }, 400);
  }
  if (!android) return json({ ok: false, error: "Android device and version are required." }, 400);
  if (data.consent !== true) return json({ ok: false, error: "Consent is required." }, 400);

  const payload = {
    name, email, android, bike, testAreas, notes,
    consent: true,
    source: "ebike.magservers.org/testers",
    receivedAt: new Date().toISOString(),
  };

  try {
    const upstream = await fetch(env.N8N_TESTER_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!upstream.ok) {
      // Do not relay upstream response bodies; they may contain internal details.
      return json({ ok: false, error: "Application service temporarily unavailable." }, 502);
    }
    return json({ ok: true }, 202);
  } catch {
    return json({ ok: false, error: "Application service temporarily unavailable." }, 502);
  }
}

export async function onRequest(context) {
  if (context.request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { "allow": "POST", "cache-control": "no-store" },
    });
  }
  return onRequestPost(context);
}
