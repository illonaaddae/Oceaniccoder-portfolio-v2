# Migration plan: Appwrite → Azure

**Date:** 2026-10-01
**Why:** The Appwrite organization is "GitHub Student Organization". Appwrite has
warned that when the education period ends, everything in it (database, storage,
users, functions, and Appwrite's own backups) will be deleted.
**Decision:** Do Option A (files to Azure Blob) first, then Option B (database,
auth and realtime to Azure).

---

## 0. Blockers to settle before any work

| #   | Question                                                                                                                                                                                                                                                                                                                                                                                | Why it matters                                                           |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 0.1 | **When does the education period end?**                                                                                                                                                                                                                                                                                                                                                 | Sets the deadline. Phase 1 has to finish before it, whatever else slips. |
| 0.2 | ~~Which Azure account hosts the site?~~ **Answered 2026-10-01.** Static Web App `oceaniccoder-portfolio` (resource group `oceaniccoder-portfolio`, Standard tier, domain `oceaniccoder.dev`, deploys from `main`) in the SLINT Tech subscription, where the user is Owner. Not the student subscription, which expires at graduation. Account details are kept out of this public repo. | New resources go in this subscription, next to the site.                 |
| 0.3 | **When does the sponsorship end?** The subscription's offer is `Sponsored_2016-01-01` (Azure Sponsorship, credit-based, spending limit off). Sponsorships end on a date or when the credit runs out, and the subscription is then disabled unless it's renewed or switched to pay-as-you-go. Check at microsoftazuresponsorships.com.                                                   | Graduation doesn't affect it, but it has its own expiry.                 |
| 0.4 | ~~Is SLINT Tech the user's own organisation?~~ **Answered 2026-10-01: yes.** The portfolio stays in this subscription; Phase 4 isn't needed.                                                                                                                                                                                                                                            | —                                                                        |

> Put all new resources in their own resource group (`oceaniccoder-portfolio`)
> so they're easy to tell apart from the other workloads in this subscription
> and easy to move to another subscription later (`az resource move`).

---

## Inventory (taken 2026-10-01)

**Appwrite project** `6943431e00253c8f9883` (region `fra`)

- **Database** `6943493400018e7c314c`: 21 collections

  | Access pattern (today's Appwrite permissions) | Collections                                                                                                                          |
  | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
  | Public read                                   | projects, certifications, education, gallery, blog_posts, journey, skills, about, testimonials, project_videos, project_case_studies |
  | Public create (visitor writes)                | comments, messages, bookings, project_inquiries                                                                                      |
  | Visitor-written counters                      | blog_reactions, site_views, blog_views                                                                                               |
  | Admin only                                    | settings (has public rows: hero_images, hero_roles, platform_logos; plus private rows), invoices, payments                           |

- **Storage:** 1 bucket `69444749001b5f3a325b`, 134 files (images, certificate files, the 47 MB Craigtec walkthrough video).
  File URLs are written _into documents_ (project images, screenshots, gallery, hero images, about photo, certificate files, blog covers, project_videos).
- **Auth:** 1 admin user, email and password, with password recovery (`account.createRecovery` / `updateRecovery`), and `account.createJWT` for calls to Azure Functions.
- **Realtime:** `subscribeToPayments` in `src/services/api/payments.ts`, so payments written by the webhook appear without a refresh.
- **Appwrite Function:** "Contact Email Notification" (`6945509a0010b1fd9d46`). **Its source is not in this repo.**
- **Code touching Appwrite:** 25 files in `src/services/api/` (~1,900 lines), `src/lib/appwrite.ts`, auth in `auth.ts`, and 4 Azure Functions using `node-appwrite` (`get-invoice`, `create-booking`, `send-newsletter`, `paystack-webhook`).

---

## Phase 1 — Off-Appwrite backup (do first, ~1 hour)

Appwrite's built-in backups live in the organization that is going to be deleted, so they don't count.

1. `scripts/backup-appwrite.mjs` (node-appwrite, run with `APPWRITE_API_KEY` from the shell, never committed):
   - every document of all 21 collections → `backup/<date>/db/<collection>.json` (paged, so nothing is capped at 25 rows);
   - each collection's schema: attributes, indexes, permissions → `backup/<date>/schema.json`;
   - all 134 files, with their metadata → `backup/<date>/storage/`;
   - the Appwrite Function's deployment source and its environment variable _names_ → `backup/<date>/functions/`;
   - the user list (no passwords; Appwrite can't export those).
2. Add `backup/` to `.gitignore`. It contains personal data from bookings, invoices, payments and messages.
3. Copy the backup off this laptop (personal cloud drive or external disk).
4. Re-run the script right before each cutover.

**Done when:** the document count per collection and the file count (134) match the Appwrite console.

---

## Phase 2 — Option A: files to Azure Blob Storage (~1 day)

Also removes the Free-plan bandwidth risk: a single video served from Appwrite can use up the monthly allowance.

1. **Create** (personal subscription, same region family as the site, e.g. West Europe):
   - Storage account `oceaniccodermedia` (StorageV2, LRS, hot tier);
   - container `media` with **anonymous read for blobs only** (no container listing);
   - a CORS rule for `https://oceaniccoder.dev` and `http://localhost:5173` (needed for direct uploads).
2. **Copy files:** `scripts/migrate-storage-to-blob.mjs` uploads each backed-up file as `media/<appwriteFileId>/<originalName>` with the correct `Content-Type` and `Cache-Control: public, max-age=31536000, immutable`.
3. **Rewrite URLs in documents:** the same script scans every string field (arrays and JSON-in-string included, e.g. `settings.hero_images`) for `…/storage/buckets/<b>/files/<id>/(view|preview|download)…` and replaces it with the blob URL. It writes a dry-run diff first and applies only after review.
4. **Uploads from the dashboard:** new Azure Function `POST /api/admin/upload-url` that checks the admin session and returns a short-lived **write-only SAS URL** for one new blob name. The browser `PUT`s straight to Blob, so 50 MB videos never pass through a Function.
   - Change `uploadImage`, `uploadVideo` and `deleteImage` in `src/services/api/storage.ts`, plus `getFileIdFromUrl`.
   - Update `isDirectVideoUrl` in `src/utils/videoUrl.ts` to recognise the blob host. Blob names keep their extension, so the existing regex already matches.
5. **Image previews:** `storage.getFilePreview` (Appwrite resizing) is used once. Replace it with sizes generated at upload time, or serve the original if it's only a thumbnail. Check that call site before deciding.
6. **Settings:** `VITE_AZURE_MEDIA_BASE_URL` in GitHub secrets; `AZURE_STORAGE_ACCOUNT` and `AZURE_STORAGE_KEY` (or a managed identity) in Static Web App settings.

**Done when:** a grep of all documents finds 0 `appwrite.io/v1/storage` URLs, every page shows its images and video, and a new upload from the dashboard lands in Blob.

---

## Phase 3 — Option B: database, auth and realtime to Azure (~3–5 days)

### 3.1 Target architecture

```text
browser ──(fetch /api/*)──▶ Azure Functions (SWA managed API) ──▶ Cosmos DB for NoSQL
   ▲                              │
   └──── SWA built-in auth ───────┘  (x-ms-client-principal, role "admin")
```

The key change: today the browser talks to Appwrite directly, and Appwrite permissions protect the data. Cosmos keys can never go to the browser, so **every read and write goes through a Function**, and the permission table above becomes code.

| Need                | Azure service                                                                                                                                                                                     | Why                                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database            | **Cosmos DB for NoSQL, free tier** (1,000 RU/s and 25 GB free, one per subscription), one database with shared throughput, one container per collection (21, under the 25-container shared limit) | Document model maps 1:1 to Appwrite documents, so no schema redesign.                                                                             |
| Admin auth          | **Static Web Apps custom auth** with two OpenID Connect providers: GitHub, and email + password through **Microsoft Entra External ID**. Plus a custom `admin` role (decided 2026-10-03)          | We store no passwords; Entra handles sign-up, reset and lockout. Route rules in `staticwebapp.config.json` are enforced by Azure, not the client. |
| Realtime (payments) | Poll every 15s while the Payments tab is open                                                                                                                                                     | One admin user, so Web PubSub is overkill. Revisit if needed.                                                                                     |
| Contact email       | Send it inside the `POST /api/messages` Function (Resend is already in use)                                                                                                                       | Replaces the Appwrite Function.                                                                                                                   |

> **Auth note:** any custom provider switches off the SWA built-in ones, so
> GitHub needs its own OAuth app registration as well as the Entra one. Both
> need the Standard plan, which the site has.

### 3.2 Steps

1. ✅ **Cosmos setup (2026-10-03):** account `oceaniccoder-db` in Central US (the region the SWA's API runs in), free tier on, database `portfolio` with 1,000 RU/s shared, 21 containers. Layout lives in `api/shared/cosmos.js`. Partition keys: `/id` for content; `/postId` for `blog_views` and `blog_reactions` with a unique key on `/visitorId`; `/projectId` for `project_videos` and `project_case_studies` with a unique key on `/projectId`.
   - **`analytics` container (added 2026-10-13):** first-party page views from
     `/api/visit`. It's Cosmos-only (no Appwrite table, so the import script
     skips it via `imported: false`). Partition key `/day` (UTC date). Time to
     Live **On, no default** (`defaultTtl: -1`); each item sets its own `ttl`
     (raw events 90 days, daily salts and counters 48 hours). With container
     TTL Off, item `ttl` is ignored and nothing would ever expire. Lean
     indexing: only `/type/?`, `/day/?`, `/ts/?` and `/sid/?` are included and
     `/*` is excluded. Shared throughput, never its own.
   - **Container count:** 23 live today. Moving `quotes` and `locks` makes 25,
     which is the limit for a database with shared throughput. Nothing else
     can get its own container after that; new event types go into
     `analytics`, and `expenses` must share an existing container or wait for
     a new database.
2. ✅ **Import:** `scripts/import-to-cosmos.mjs` reads the Phase 1 backup and keeps `$id`, `$createdAt` and `$updatedAt` as `id`, `createdAt` and `updatedAt`, so links and slugs don't break. It refuses a backup that still has Appwrite file URLs (taken before the Phase 2 rewrite) and skips `settings.admin_password_hash`.
3. **Data API** (`api/data/index.js`):
   - `GET /api/data/{collection}` and `/{id}`: public read for the public-read collections only, plus the three public `settings` keys;
   - `POST /api/data/{collection}`: public create for comments, messages, bookings and inquiries, with server-side validation and Cloudflare Turnstile (already used elsewhere);
   - counter endpoints for reactions and views (increment-only);
   - **Testimonials:** the public "Share your experience" form (`src/components/Testimonials/useTestimonialForm.ts`) has never worked for visitors, because only the admin can create testimonials. Give it a `POST` that saves a pending, unapproved testimonial, and upload the optional photo through the same endpoint (not anonymously to storage), so failed submissions stop leaving orphan photos.
     ✅ Done in `/api/submit/testimonials` (Cosmos mode). Since 2026-10-13 the "Share your experience" button and form are hidden while `VITE_DATA_BACKEND` is unset (`src/components/TestimonialsSection.tsx`), so visitors no longer hit the broken Appwrite flow. They come back on their own at the cutover; no code change is needed.
   - `/api/admin/data/{collection}[/{id}]`: full CRUD, `admin` role only (enforced in `staticwebapp.config.json` **and** checked in the Function).
   - Query support: translate the `Query.*` options actually used (`equal`, `orderAsc/Desc`, `limit`, `offset`, `select`) into parameterised Cosmos SQL. Grep every `Query.` in `src/services/api` first and support only those.
4. **Response shape adapter:** the Functions return `$id`, `$createdAt` and `$updatedAt` exactly as today, so **components don't change**. Only `src/services/api/*` changes, one file per domain. Each file keeps its tests, retargeted at `fetch`.
5. **Server Functions:** move `get-invoice`, `create-booking`, `send-newsletter` and `paystack-webhook` from `node-appwrite` to `@azure/cosmos`. The webhook is the most sensitive: test the paid-invoice path with Paystack test keys before cutover.
   - Quotes (added 2026-10-10): containers `quotes`, `locks` and the new `payments`
     fields. Only `api/shared/quotes/repo.js` and `api/shared/locks.js` talk to
     the database; swap those two modules (and `api/shared/appwrite.js`) at cutover.
6. **Auth swap:** replace `auth.ts` (`verifyAdminPassword`, session checks, `createJWT`) with `/.auth/me` plus role checks. The admin login page becomes "Sign in with GitHub". Keep the rule from `CLAUDE.md`: no client-only guards. Routes are protected by SWA config.
7. **Realtime:** replace `subscribeToPayments` with a polling hook. The function signature stays the same, so callers don't change. (Since 2026-10-12 the Payments tab already polls every 15s while visible, in `tabs/Payments/usePaymentsFeed.ts`, so dropping the subscription only loses the instant update.)
8. **Remove Appwrite:** delete `src/lib/appwrite.ts` and the `appwrite`/`node-appwrite` dependencies, delete all `VITE_APPWRITE_*` and `APPWRITE_*` variables, and delete the stale `VITE_ADMIN_PASSWORD_HASH` line in `.github/workflows/azure-static-web-apps.yml`. Update the env tables in `CLAUDE.md`.

#### Quote collections as they exist in Appwrite (2026-10-10)

Created in the Appwrite console. The `quotes` and `locks` collections have no permissions (server key only). Long fields use `text`/`mediumtext` because Appwrite caps a row at 65,535 bytes.

- **`quotes`**
  - `quoteNumber` string(20), required, unique index
  - `revision` int, required (1–1000)
  - `inquiryId` string(36)
  - `clientName` string(120), required; `clientEmail` string(254); `clientPhone` string(40); `clientCompany` string(120)
  - `currency` enum [GHS, USD], required
  - `title` string(160), required
  - `overview`, `scope`, `timeline`, `notes`, `terms` text
  - `items` mediumtext, required (JSON)
  - `discountMinor`, `subtotalMinor`, `totalMinor` int
  - `schedule` text, required (JSON)
  - `validDays` int (1–90)
  - `validUntil`, `sentAt`, `viewedAt`, `respondedAt` datetime
  - `status` enum [draft, sent, accepted, declined, expired, cancelled], required, key index
  - `tokenHash` string(64), unique index
  - `acceptedName` string(120); `acceptedIpHash` string(64); `acceptedUa` string(300)
  - `acceptedSnapshot` mediumtext (JSON)
  - `declineReason` string(500)
  - `payState` text (JSON)
  - `requirementsId` string(36)
  - Added 2026-10-11 (full proposal): `highlights` text (JSON); `discountLabel` string(60);
    `runningCosts` text (JSON); `exclusions`, `assumptions`, `nextSteps` text;
    `optionalTitle` string(80); `optionalItems` mediumtext (JSON)
  - Added 2026-10-12 (needs and maintenance): `extras` string(100000) (JSON:
    `{ needs, maintenance }`); `maintenanceOfferSentAt` datetime
- **`locks`**
  - `key` string(200), required
  - Document id is `"s_"` plus the first 34 hex characters of the SHA-256 of the lock key.
- **`payments`** (new fields)
  - `kind` string(10); `quoteId` string(36); `quoteNumber` string(20); `stageId` string(24)
  - `amountMinor` int; `note` string(300); `recordedBy` string(254); `channel` string(40)
  - `paystackId` string(40); `accessCode` string(100)
  - Key indexes on `quoteNumber`, `kind` and `paystackReference`.
  - Added 2026-10-12 (archive): `archivedAt` datetime, optional. Null means not
    archived. Set and cleared only by `/api/quote-admin` (`archivePayment`,
    `restorePayment`); successful payments are never archived, and settling an
    archived attempt clears it.
- **`invoices`** (new field)
  - Added 2026-10-12 (archive): `archivedAt` datetime, optional. Null means not
    archived. Set and cleared by `/api/quote-admin` (`archiveInvoice`,
    `restoreInvoice`). Replaces the old permanent delete from the Invoices tab.

### 3.3 Cutover (one evening)

1. Stop admin edits; take a final Phase 1 backup.
2. Re-run the import (it's idempotent: upsert by `id`).
3. Merge the PR and let the deploy finish.
4. Smoke test: each public page, blog read counts, a comment, a contact message (and its email), a test booking (Meet link), a Paystack **test** payment through the webhook, an admin edit, a dashboard upload, and a testimonial with a photo (the "Share your experience" form reappears with Cosmos; the new row must stay hidden until approved).
5. Leave Appwrite untouched until the deadline, as a fallback. Revert = redeploy the previous commit.

---

## Phase 4 — Only if the site itself is on a student subscription

1. Create a new Static Web App (Free tier) in the personal subscription, linked to the same GitHub repo.
2. Copy all application settings (grep `process.env.` in `api/`; the `CLAUDE.md` tables have drifted before).
3. Replace the `AZURE_STATIC_WEB_APPS_API_TOKEN` secret, deploy, and test on the `*.azurestaticapps.net` URL.
4. Move the `oceaniccoder.dev` custom domain (DNS CNAME/ALIAS → new app). Expect a short gap while the certificate is reissued.

---

## Security

Permission gaps found in the current Appwrite setup are tracked privately, not
in this public repo. Each one is closed by Phase 2 or Phase 3 (admin-issued
upload URLs, increment-only counters, server-side role checks), and none of the
private settings rows are migrated.

## Order and estimate

| Phase                        | Effort                                                                                                                               | Depends on |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| 0 Blockers                   | user answers                                                                                                                         | —          |
| 1 Backup                     | ~1 h                                                                                                                                 | API key    |
| 2 Files → Blob               | ~1 day                                                                                                                               | 0.2, 0.3   |
| 3 DB, auth, realtime → Azure | 3–5 days, as ~4 PRs: Cosmos + import script; data API + public reads; visitor writes + admin CRUD + auth; server functions + cleanup | Phase 2    |
| 4 Move the site (if needed)  | ~half a day                                                                                                                          | 0.2        |
