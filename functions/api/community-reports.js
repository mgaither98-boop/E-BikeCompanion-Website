/**
 * Cloudflare Pages Function: account-free public bug and compatibility intake.
 *
 * Required Cloudflare Pages secret:
 *   COMMUNITY_GITHUB_TOKEN — fine-grained token with Issues: Read and write
 *   access ONLY to mgaither98-boop/E-BikeCompanion-Community.
 *
 * This endpoint creates a public issue. Never include sensitive/private data.
 */
const REPOSITORY = "mgaither98-boop/E-BikeCompanion-Community";
const TYPES = new Set(["Bug report", "Compatibility report", "General support"]);
const MAX_BODY = 12000;

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

const clean = (value, max) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin");
  const requestUrl = new URL(request.url);
  if (origin && origin !== requestUrl.origin) {
    return json({ ok: false, error: "Origin not allowed." }, 403);
  }
  if (!env.COMMUNITY_GITHUB_TOKEN) {
    return json({ ok: false, error: "The submission service is not configured yet. Please try again later or use the email contact on the support page." }, 503);
  }
  if (!(request.headers.get("Content-Type") || "").toLowerCase().includes("application/json")) {
    return json({ ok: false, error: "JSON is required." }, 415);
  }
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > MAX_BODY) return json({ ok: false, error: "Report is too large." }, 413);

  let data;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY) return json({ ok: false, error: "Report is too large." }, 413);
    data = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: "Invalid report data." }, 400);
  }

  // Honeypot: silently accept bot submissions without creating an issue.
  if (clean(data.website, 200)) return json({ ok: true }, 202);

  const type = clean(data.type, 40);
  const title = clean(data.title, 120);
  const details = clean(data.details, 6000);
  const appVersion = clean(data.appVersion, 80) || "Not provided";
  const androidVersion = clean(data.androidVersion, 80) || "Not provided";
  const bike = clean(data.bike, 160) || "Not provided";
  const modelYear = clean(data.modelYear, 80) || "Not provided";
  const displayController = clean(data.displayController, 200) || "Not provided";
  const evidence = clean(data.evidence, 4000) || "Not provided";
  const email = clean(data.email, 254).toLowerCase();
  const consent = data.publicConsent === true;

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, error: "Please enter a valid email address or leave it blank." }, 400);
  if (!TYPES.has(type)) return json({ ok: false, error: "Choose a valid report type." }, 400);
  if (title.length < 4 || details.length < 10) return json({ ok: false, error: "Please provide a short summary and at least 10 characters of detail." }, 400);
  if (!consent) return json({ ok: false, error: "Please confirm that this report can be published publicly." }, 400);

  const labels = type === "Compatibility report"
    ? ["compatibility", "needs-triage"]
    : type === "Bug report"
      ? ["bug", "needs-triage"]
      : ["question", "needs-triage"];

  const body = [
    "## Public community submission",
    "",
    "> Submitted through the E-Bike Companion website without requiring a GitHub account. This issue is public. Do not add personal data, GPS routes, serial numbers, passwords, access tokens or private diagnostic files.",
    "",
    `- **Report type:** ${type}`,
    `- **App version/build:** ${appVersion}`,
    `- **Android version:** ${androidVersion}`,
    `- **Bike model:** ${bike}`,
    `- **Model year/region:** ${modelYear}`,
    `- **Display/controller/firmware:** ${displayController}`,
    "",
    "### Details",
    details,
    "",
    "### Compatibility evidence (if relevant)",
    evidence,
    "",
    "### Maintainer review",
    "- [ ] Check for duplicate reports",
    "- [ ] Review privacy and evidence",
    "- [ ] Request further information if needed",
    "- [ ] Record verification decision; do not mark verified without reproducible evidence",
    "",
    "### Safety",
    "This submission does not itself verify compatibility. Experimental driver validation must remain read-only unless a separate reviewed process explicitly approves otherwise.",
  ].join("\n");

  try {
    const upstream = await fetch(`https://api.github.com/repos/${REPOSITORY}/issues`, {
      method: "POST",
      headers: {
        "accept": "application/vnd.github+json",
        "authorization": `Bearer ${env.COMMUNITY_GITHUB_TOKEN}`,
        "content-type": "application/json",
        "x-github-api-version": "2022-11-28",
        "user-agent": "E-Bike-Companion-Public-Submission",
      },
      body: JSON.stringify({ title: `[${type}] ${title}`, body, labels }),
    });
    if (!upstream.ok) {
      return json({ ok: false, error: "The community repository could not accept the report just now. Please try again later or use the email contact on the support page." }, 502);
    }
    const issue = await upstream.json();
    // Store contact details only in private D1, never in the public issue body.
    // If D1 fails, the public report still succeeds; do not claim contact storage succeeded.
    let contactStored = false;
    if (email && env.CONTACTS_DB) {
      try {
        await env.CONTACTS_DB.prepare(
          "INSERT INTO report_contacts (issue_number, email) VALUES (?, ?)"
        ).bind(issue.number, email).run();
        contactStored = true;
      } catch {
        // Keep the public submission successful without exposing the email.
      }
    }
    return json({ ok: true, issueUrl: issue.html_url, contactStored }, 201);
  } catch {
    return json({ ok: false, error: "The submission service is temporarily unavailable. Please try again later or use the email contact on the support page." }, 502);
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
