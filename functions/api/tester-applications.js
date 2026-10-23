/**
 * Cloudflare Pages Function: private tester application inbox.
 *
 * Required Cloudflare Pages secret:
 *   GITHUB_TESTER_TOKEN = fine-grained GitHub token with Issues read/write
 *     access ONLY to mgaither98-boop/E-BikeCompanion (private repository).
 *
 * The token must never be exposed to browser JavaScript or committed to Git.
 * Applications are created as issues in the private app repository.
 */
const REPOSITORY = "mgaither98-boop/E-BikeCompanion";
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

  if (!env.GITHUB_TESTER_TOKEN) {
    return json({ ok: false, error: "Private application service is not configured yet." }, 503);
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

  if (!email || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
    return json({ ok: false, error: "Enter a valid email address." }, 400);
  }
  if (!android) return json({ ok: false, error: "Android device and version are required." }, 400);
  if (data.consent !== true) return json({ ok: false, error: "Consent is required." }, 400);

  const receivedAt = new Date().toISOString();
  const title = `Tester application — ${name || "Unnamed applicant"}`.slice(0, 180);
  const body = [
    "## Private tester application",
    "",
    "> This issue contains personal information. Keep the repository private. Do not transfer this issue or its contents to the public community repository.",
    "",
    `- **Received:** ${receivedAt}`,
    `- **Preferred name/handle:** ${name || "Not provided"}`,
    `- **Email:** ${email}`,
    `- **Android device/version:** ${android}`,
    `- **Bike model:** ${bike || "Not provided"}`,
    `- **Testing interests:** ${testAreas.length ? testAreas.join(", ") : "Not specified"}`,
    `- **Consent:** Confirmed on submission`,
    "",
    "### Additional notes",
    notes || "None provided",
    "",
    "### Maintainer review",
    "- [ ] Review application",
    "- [ ] Mark accepted or declined",
    "- [ ] If accepted, send Google Play testing instructions privately by email",
    "",
    "Suggested maintainer labels: `tester-pending`, `tester-approved`, `tester-rejected`.",
  ].join("\n");

  try {
    const upstream = await fetch(`https://api.github.com/repos/${REPOSITORY}/issues`, {
      method: "POST",
      headers: {
        "accept": "application/vnd.github+json",
        "authorization": `Bearer ${env.GITHUB_TESTER_TOKEN}`,
        "content-type": "application/json",
        "x-github-api-version": "2022-11-28",
        "user-agent": "E-Bike-Companion-Tester-Applications",
      },
      body: JSON.stringify({ title, body }),
    });

    if (!upstream.ok) {
      // Do not relay GitHub response bodies; they can contain internal details.
      return json({ ok: false, error: "Application service temporarily unavailable. Please try again later." }, 502);
    }

    return json({ ok: true }, 202);
  } catch {
    return json({ ok: false, error: "Application service temporarily unavailable. Please try again later." }, 502);
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
