// Mints a fresh GOOGLE_REFRESH_TOKEN for the booking flow.
//
// Why this exists: on 2026-09-03 every booking since at least June had a null
// meetingLink, calendarEventLink and zoomLink. /api/create-booking was
// answering `_phase: "Error: oauth:invalid_grant"` — the refresh token in Azure
// had stopped working, so no calendar event was created and there was no Meet
// link to hand the visitor. /api/get-availability failed the same way and, by
// design, fell back to "every slot free", so the booking page was advertising
// availability it had never checked.
//
// A refresh token dies for one of these reasons, and the fix differs:
//   - The OAuth consent screen is still in "Testing". Google expires refresh
//     tokens after 7 days in that mode, so this recurs weekly until the app is
//     published. Check: Google Cloud Console > APIs & Services > OAuth consent
//     screen > Publishing status should read "In production".
//   - Access was revoked (account password change, or the app removed from
//     myaccount.google.com/permissions).
//   - The token was minted for a different OAuth client than the one whose
//     GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are configured in Azure.
//
// Usage:
//   GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... node scripts/get-google-refresh-token.mjs
//
// The client must have http://localhost:53682 listed as an authorised redirect
// URI (Google Cloud Console > Credentials > your OAuth 2.0 Client ID). Open the
// printed URL, approve, and the new refresh token is printed here. Put it in
// Azure Portal > Static Web App > Configuration > GOOGLE_REFRESH_TOKEN, then
// verify with:
//
//   curl -s "https://oceaniccoder.dev/api/get-availability?date=2026-12-30"
//
// A calendar with real events should come back with some slots false. If every
// slot is true, the credentials are still not working.

import { createServer } from "node:http";

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

const PORT = 53682;
const REDIRECT_URI = `http://localhost:${PORT}`;
// The booking flow reads freeBusy and creates events with a Meet conference.
const SCOPE = "https://www.googleapis.com/auth/calendar";

if (!clientId || !clientSecret) {
  console.error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required");
  console.error("Find them in Google Cloud Console > APIs & Services > Credentials");
  process.exit(1);
}

const authUrl =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPE,
    // Without both of these Google returns an access token and no refresh token.
    access_type: "offline",
    prompt: "consent",
  }).toString();

async function exchangeCode(code) {
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: REDIRECT_URI,
    grant_type: "authorization_code",
  }).toString();

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await response.json();
  if (!response.ok) throw new Error(`token exchange failed: ${JSON.stringify(data)}`);
  return data;
}

console.log("\nOpen this URL, sign in as the calendar owner, and approve:\n");
console.log(authUrl);
console.log(`\nWaiting for the redirect on ${REDIRECT_URI} ...\n`);

const server = createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end(`Authorisation failed: ${error}`);
    console.error(`\nAuthorisation failed: ${error}`);
    server.close();
    process.exit(1);
  }

  if (!code) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Waiting for the OAuth redirect.");
    return;
  }

  try {
    const tokens = await exchangeCode(code);
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<h2>Done. Return to your terminal for the refresh token.</h2>");

    if (!tokens.refresh_token) {
      console.error("\nGoogle returned no refresh token.");
      console.error("Revoke access at myaccount.google.com/permissions and run this again;");
      console.error("Google only issues one on first consent for a given client.");
      server.close();
      process.exit(1);
    }

    console.log("GOOGLE_REFRESH_TOKEN:\n");
    console.log(tokens.refresh_token);
    console.log("\nSet it in Azure Portal > Static Web App > Configuration, then restart the app.");
    console.log("Scope granted:", tokens.scope);
  } catch (err) {
    console.error("\n", err.message);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});

server.listen(PORT);

// Never leave the loopback listener up if nobody completes the flow.
setTimeout(
  () => {
    console.error("\nTimed out after 5 minutes with no redirect.");
    server.close();
    process.exit(1);
  },
  5 * 60 * 1000,
).unref();
