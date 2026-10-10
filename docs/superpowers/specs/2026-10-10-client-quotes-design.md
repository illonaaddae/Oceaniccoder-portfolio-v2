# Client quotes, staged payments and requirements requests

Date: 2026-10-10
Status: approved in conversation, awaiting spec review
Reference implementation: `Craigtec-engineering/craigtec-website` (quote, payment and email code)

## 1. Why

A real client already has the inquiry link and needs a quote now. Today the
portfolio has no quote: "quoted" is just an inquiry status, the invoice doubles
as the quote, there is no accept step, the client must pay the full total in one
charge, and invoice links are guessable (`/pay/INV-` + 6 clock digits, served by
an open `get-invoice`).

The Craigtec site already solved this well: a full quote page the client
accepts, a staged payment plan, server-priced Paystack payments that settle
exactly once, and a consistent set of branded emails. This project ports that
flow, rebranded for OceanicCoder, and adds a way to collect what a project needs
from the client (documents, images, links, details).

## 2. Decisions already made

| Topic                  | Decision                                                                                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend                | Build on **Appwrite** now (the client cannot wait for the Cosmos cutover). Keep all data access in one service layer per feature so the later move swaps that layer only. |
| Payment stages         | Editable per quote, 1–8 stages summing to 100%. Default **Deposit 60% / Balance 40%**.                                                                                    |
| Currency               | **GHS and USD** only on quotes.                                                                                                                                           |
| Client files           | Per requirement item: **Google Drive link** (with written instructions) or **secure upload** to private storage.                                                          |
| Requirements placement | Shown inside the quote journey after the deposit, and also sendable **standalone**.                                                                                       |
| Emails                 | Port Craigtec's email kit structure as plain JS components (no JSX build in `api/`), OceanicCoder branding.                                                               |
| Existing invoices      | Keep working unchanged. New client work uses quotes.                                                                                                                      |

Out of scope: the Cosmos cutover (separate plan,
`docs/plans/2026-10-01-appwrite-to-azure-migration.md`; the new collections are
added to it), tax lines, FX estimates, WhatsApp automation, drawn signatures,
client accounts or logins.

## 3. Architecture

```
Admin (React, Appwrite session)       Azure Functions (APPWRITE_API_KEY)        Storage
QuotesTab / QuoteEditor  ───────▶  quote-admin                          ─▶ Appwrite: quotes
RequirementsTab / Editor ───────▶  requirements-admin                   ─▶ Appwrite: requirement_requests
EmailsTab (previews)     ───────▶  email-preview                        ─▶ Appwrite: payments (extended)
                                                                        ─▶ Appwrite: locks
Client (public, token in URL)
/q/:token                ───────▶  quote-view, quote-respond
/q/:token/pay/:stageId   ───────▶  quote-pay (Paystack initialize, verify)
/q/:token/invoice/:stageId ─────▶  quote-view (same payload)
/receipt/:reference?s=   ───────▶  quote-receipt
/r/:token                ───────▶  requirements-view, requirements-save,
                                   requirements-upload-url             ─▶ Blob: client-files (private)
Paystack                 ───────▶  paystack-webhook (new branch: metadata.kind = "quote")
```

Principles:

- **Clients never talk to Appwrite directly.** Quote and requirement documents
  have no browser read permission. Every client request goes through a function
  that hashes the URL token, looks the document up, and returns only the fields
  the page needs.
- **Admin writes also go through functions** (`quote-admin`,
  `requirements-admin`), guarded by the existing `requireAdmin`
  (`api/shared/adminAuth.js`). Totals, numbers, tokens and state changes are
  computed on the server so the browser can't forge them. Admin reads may use
  the browser SDK with admin-only permissions, matching the current invoices
  code.
- **Pure logic lives in shared modules with no I/O**, unit tested:
  `api/shared/quotes/model.js`, `api/shared/quotes/payments.js`,
  `api/shared/requirements/model.js`, `api/shared/tokens.js`.
- **Data access lives in one module per entity** (`api/shared/quotes/repo.js`,
  `api/shared/requirements/repo.js`, `api/shared/locks.js`). This is the only
  code that changes at the Cosmos cutover.
- New functions follow the existing layout: `api/<name>/index.js` +
  `function.json`, CommonJS, shared code under `api/shared/` (no
  `function.json`, never exposed).

## 4. Data model (Appwrite)

Money is always an **integer in minor units** (pesewas or cents). JSON fields
are stored as string attributes and parsed in the repo layer. Collections are
created by a setup script (`scripts/create-quote-collections.mjs`) in the style
of `scripts/create-bookings-collection.mjs`: idempotent, attributes and indexes
declared in one list.

### 4.1 `quotes`

| Field                                                              | Type                 | Notes                                                                                 |
| ------------------------------------------------------------------ | -------------------- | ------------------------------------------------------------------------------------- |
| `quoteNumber`                                                      | string, unique index | `Q-2026-0001`, sequential per year, allocated on create with retry on unique conflict |
| `revision`                                                         | int                  | starts at 1, bumped by revise                                                         |
| `inquiryId`                                                        | string?              | link to `project_inquiries`                                                           |
| `clientName`, `clientEmail`, `clientPhone`, `clientCompany`        | string               | email required to send                                                                |
| `currency`                                                         | enum `GHS`/`USD`     |                                                                                       |
| `title`                                                            | string               | project title on the cover                                                            |
| `overview`, `scope`, `timeline`, `notes`, `terms`                  | string (long)        | plain text with line breaks and `- ` bullets; rendered safely, no HTML                |
| `items`                                                            | JSON                 | `[{id, description, qty, unitMinor}]`, 1–100 items                                    |
| `discountMinor`, `subtotalMinor`, `totalMinor`                     | int                  | computed server-side on every save                                                    |
| `schedule`                                                         | JSON                 | `[{id, label, percent}]`, 1–8 stages, integer percents summing to 100                 |
| `validDays`, `validUntil`                                          | int, datetime        | default 14 days; `validUntil` set on send                                             |
| `status`                                                           | enum                 | `draft`, `sent`, `accepted`, `declined`, `expired`, `cancelled`                       |
| `tokenHash`                                                        | string, unique index | SHA-256 of the client token; null when no live link                                   |
| `sentAt`, `viewedAt`, `respondedAt`                                | datetime?            | `viewedAt` set on first non-admin view                                                |
| `acceptedName`, `acceptedIpHash`, `acceptedUa`, `acceptedSnapshot` | string?              | evidence; snapshot = JSON of items, totals, schedule, terms as accepted               |
| `declineReason`                                                    | string?              | ≤ 500 chars                                                                           |
| `payState`                                                         | JSON                 | `{ due: { [stageId]: isoRequestedAt } }`                                              |
| `requirementsId`                                                   | string?              | linked requirements request                                                           |

Allowed status moves (enforced in `model.js`):

```
draft:     sent, cancelled
sent:      accepted, declined, expired, cancelled, draft (revise)
accepted:  cancelled   (blocked if any successful payment exists)
declined:  draft
expired:   draft
cancelled: (none)
```

Expiry is lazy: when a `sent` quote past `validUntil` is opened, it is moved
to `expired` before rendering. No cron.

### 4.2 Stage maths

- `lineMinor = round(qty * unitMinor)`, `subtotal = Σ lineMinor`,
  `total = max(0, subtotal - discount)`; discount may not exceed subtotal.
- `stageAmounts(total, schedule)`: each stage `floor(total * percent / 100)`,
  the remainder goes to the **last** stage so the parts always sum to the total.
- Stage amounts are computed when read, never stored or accepted from the
  browser.
- Stage state (`stageStates`): `paid` if a successful payment exists for it;
  else `due` if it is the first stage of an accepted quote or listed in
  `payState.due`; else `later`. A due stage is `overdue` 7 days after it became
  due.
- Invoice number per stage: `Q-2026-0001-INV-1`.
- Payment reference: `Q-2026-0001-1-K7Q2X9PL` (quote, stage index, 8 random
  chars).

### 4.3 `payments` (existing collection, extended)

New optional attributes: `quoteNumber`, `stageId`, `reference` (unique index),
`kind` (`invoice` | `quote`), `note`, `recordedBy`. Statuses gain `abandoned`,
`duplicate`, `refunded` alongside `pending`, `success`, `failed`.
Existing rows and the invoice flow are untouched. `PaymentsTab` and revenue
analytics read the new rows without changes; analytics adds quote payments to
revenue by summing `status = success` payments of kind `quote`.

### 4.4 `locks`

Documents whose **ID is the lock key**; `createDocument` returns 409 when the key
exists, which makes each lock atomic.

- `settle-<reference>`: one settlement per payment (webhook, return page and
  poll race).
- `stage-<quoteId>-<stageId>`: one successful payment per stage; a second
  becomes `duplicate` and alerts the admin to refund.

Appwrite document IDs allow `[a-zA-Z0-9._-]`, max 36 chars, so keys are
`s_` + first 34 chars of SHA-256 hex of the logical key.

### 4.5 `requirement_requests`

| Field                                  | Type                 | Notes                                                                         |
| -------------------------------------- | -------------------- | ----------------------------------------------------------------------------- |
| `title`, `intro`                       | string               | e.g. "What we need to start your app"                                         |
| `quoteId`                              | string?              | when attached to a quote                                                      |
| `clientName`, `clientEmail`            | string               |                                                                               |
| `items`                                | JSON                 | see below                                                                     |
| `responses`                            | JSON                 | `{ [itemId]: { value?, links?, files?: [{path, name, size, type}], note? } }` |
| `review`                               | JSON                 | `{ [itemId]: { state: "ok" \| "changes", note? } }`                           |
| `status`                               | enum                 | `draft`, `sent`, `in_progress`, `submitted`, `changes_requested`, `complete`  |
| `tokenHash`                            | string, unique index |                                                                               |
| `sentAt`, `submittedAt`, `completedAt` | datetime?            |                                                                               |

Item shape: `{ id, type, label, instructions?, required, accept? }` where
`type` is one of:

- `text` (one line), `longtext` (paragraph)
- `link` (URL, typically a Google Drive folder; instructions shown beside it,
  e.g. "Create a folder, add all images, set sharing to Anyone with the link")
- `upload` (1–10 files; `accept` subset of PDF, JPEG, PNG, WebP, DOCX; 20 MB each)
- `checkbox` (confirmation, e.g. "I have shared the folder with hello@oceaniccoder.dev")

**Presets** live in code (`src/components/AdminDashboard/tabs/Requirements/presets.ts`),
not the database. Initial presets:

- **Paystack business verification:** business registration certificate
  (upload), certificate of incorporation / Form 3 if applicable (upload),
  director's ID card (upload), TIN (text), settlement bank account details
  (longtext), business address (text), business email and phone (text).
- **Brand and content:** logo files (upload or link), brand colours and fonts
  (longtext), images folder (link with Drive instructions), copy for each page
  (link or longtext).
- **Access and accounts:** domain registrar access (longtext), hosting or app
  store accounts (longtext), confirmation that credentials will be shared
  securely, not by email (checkbox).

## 5. Tokens and links

- Token: `crypto.randomBytes(32).toString("base64url")` (43 chars). Only
  `sha256(token)` is stored. Lookup validates `^[A-Za-z0-9_-]{40,60}$` before
  hashing.
- Quote link: `https://oceaniccoder.dev/q/<token>`. Requirements link:
  `https://oceaniccoder.dev/r/<token>`.
- A new token is issued on send, on revise (old link dies), on "request
  payment" (fresh link in that email), and on manual "new link". Cancel clears
  it.
- Receipts: `/receipt/<reference>?s=<sig>`, `sig` = first 32 chars of
  base64url HMAC-SHA256 of `receipt:<reference>` with a new
  `RECEIPT_SIGNING_SECRET`. Receipt links do not expire.
- Client pages and receipt pages send `noindex` meta and are excluded from the
  sitemap.

## 6. Client experience

### 6.1 Quote page `/q/:token`

One shell (`src/components/Quote/QuoteShell.tsx`): slim logo bar, theme toggle,
print styles (`print:` variants), max width ~4xl. Sections:

1. **Journey bar**: Review → Accept → Deposit → Send requirements → Balance.
   The current step is highlighted; "Send requirements" appears only when a
   requirements request is attached. With more than two stages, the payment
   steps list each stage label.
2. **Cover card**: logo, "Quote" + number + revision, issued and valid-until
   dates, prepared for (client, company), project title. Status banner when
   accepted, declined or expired.
3. **Overview**, **Scope and deliverables**, **Timeline**: from the quote
   text; sections with no text are hidden.
4. **Line items**: description, qty, unit price, line total; on mobile qty and
   unit price fold under the description. Subtotal, discount, **Total** with a
   heavy rule.
5. **Payment plan**: numbered stages with label, percent, amount, and state:
   Paid (receipt link) / Pay now / Requested on <date> / Later, plus Overdue
   tag and invoice link.
6. **Notes** and **Terms**.
7. **Actions** while `sent`: accept form (typed full name ≥ 3 chars + "I agree
   to the scope, payment plan and terms" checkbox), Decline (optional reason),
   Ask a question (mailto and WhatsApp), Print / save as PDF. After accepting:
   success state with "Pay the deposit now".
8. After acceptance: a "Next step" card for the next due stage, or for the
   requirements request once the deposit is paid.

States without a usable quote (unknown, draft, cancelled, revised-away link):
an "This link is no longer active" screen with contact buttons.

### 6.2 Checkout `/q/:token/pay/:stageId`

Redirects to the quote unless the quote is accepted and the stage is due and
unpaid. Two columns (stacked on mobile):

- **Summary card**: stage label, big amount, stage list with ticks, paid so far
  and balance after this payment.
- **Pay panel**: method tiles (Card, Mobile Money, and Apple Pay when
  `VITE_APPLE_PAY_ENABLED`), email field pre-filled from the quote, Pay button,
  "Paystack handles your card details" line, test-mode banner when the public
  key starts `pk_test_`. Bank transfer instructions shown as a fallback with
  "we'll confirm it manually".

Flow: `POST /api/quote-pay {token, stageId, method, email}` → server checks the
stage is payable, writes a `pending` payment row with a fresh reference, calls
Paystack `transaction/initialize` (amount from the server, `channels:[method]`,
`callback_url` to the return page, `metadata.kind = "quote"`) → returns
`accessCode` and `authorizationUrl` → the page opens the Inline v2 popup with
`resumeTransaction(accessCode)`, falling back to `authorizationUrl` if the script
is blocked. It polls `GET /api/quote-pay?reference=` every 4 s while open.

### 6.3 Return page `/q/:token/paid?reference=`

Calls `GET /api/quote-pay?reference=`, which verifies with Paystack and settles
if needed, then shows **Paid** (receipt link), **Failed** (try again), or
**Confirming** (polls every 5 s for up to 5 minutes, then "We'll email you the
receipt as soon as Paystack confirms"). It never shows success from a query
string alone.

### 6.4 Stage invoice `/q/:token/invoice/:stageId` and receipt `/receipt/:ref`

Printable documents: invoice number, issue and due dates, status pill, the stage
line and quote reference, Pay / Receipt / Print buttons. The receipt shows the
amount, method, reference, date and paid-to details.

### 6.5 Requirements page `/r/:token`

- Header with the request title, intro and progress ("4 of 7 done").
- One card per item: label, required tag, instructions (rendered with line
  breaks and links), the input for its type, review note when changes were
  requested.
- `upload` items: drag and drop or pick; each file goes
  `POST /api/requirements-upload-url` → a write-only SAS URL for one blob
  (10 min) → browser `PUT` → `POST /api/requirements-save` records the file.
  Files can be removed before submitting.
- **Save progress** (any time, status `in_progress`) and **Submit** (all
  required items answered, status `submitted`). After submitting the page is
  read-only until the admin requests changes.

## 7. Admin experience

New tabs in the Business group (`SidebarParts/tabs.ts`), hidden on the public
read-only `/dashboard` like the other business tabs.

### 7.1 Quotes tab

- List with status filter pills, total, amount paid, next due stage, viewed
  indicator.
- **New quote** from scratch, or **Create quote** on an inquiry card in Client
  Work (pre-fills client details and seeds items the way `InvoiceModal` does
  today). The existing "Generate Invoice" stays available.
- **Editor** (wizard, per-step validation with the same rules as the server):
  Client → Page content → Line items → Payment stages (60/40 default, add,
  remove, rename, live 100% check, live amount preview) → Terms and validity →
  Review and send. Save draft at any step; unsaved-changes guard.
- **Detail view**: status timeline (sent, viewed, accepted or declined with
  evidence), stages with state, **Request payment** per later stage, **Record
  manual payment** (bank, MoMo, cash; amount fixed to the stage amount; note),
  Copy link, Share on WhatsApp, New link, Revise (back to draft, old link dies),
  Cancel (blocked once anything is paid), Attach or create requirements request.
- Inquiry status follows the quote: send → `quoted`, accept → `won`, decline →
  `declined`. `won` is added to the inquiry status list.

### 7.2 Requirements tab

- List with status and progress.
- **Editor**: title, intro, client, optional quote link, items (add from preset
  or blank, reorder, edit type, label, instructions, required, accepted file
  types). Send emails the link.
- **Detail view**: each item's answer; uploaded files open through a 5-minute
  read SAS from `requirements-admin`; per item "OK" or "Needs changes" with a
  note; **Request changes** (emails the client, reopens the page) and **Mark
  complete**.
- When a quote has an attached request, the request email goes out
  automatically once the deposit is paid; otherwise the admin sends it.

### 7.3 Emails tab

Previews every template with sample data (rendered by `email-preview`) and a
"Send test to me" button.

## 8. Emails

### 8.1 Kit

`api/shared/email/ui.js`: plain functions returning table-based HTML with inline
styles, ported from Craigtec's `src/emails/ui.tsx` structure:
`shell({preview, reason, body})`, `heading({eyebrow, title, intro, tone})`,
`p()`, `card({title, highlight, rows})`, `button({href, label, variant})`,
`buttons()`, `steps()`, `notice({tone, text})`, `divider()`, `small()`.
Every interpolated value passes through one `esc()`; URLs pass through
`safeUrl()` (https only). Every template returns `{subject, html, text}` with a
plain-text version.

Branding: dark navy header (`#0a0f1a` / `#111827`) with the OceanicCoder logo
(`https://oceaniccoder.dev/images/logo/Oceaniccoder-croped.png`), white body,
teal CTA (`#0C8599`, hover-free), soft footer with contact links and the reason
line ("You received this because you requested a quote from OceanicCoder").
System font stack; monospace for labels and amounts.

`api/shared/email/send.js`: one Resend sender (`RESEND_API_KEY`,
`RESEND_FROM_EMAIL`, reply-to `hello@oceaniccoder.dev`) used by every new
template; failures are logged and returned, never thrown into the caller's
state change. Templates take pre-formatted view models (money and dates already
strings, `Africa/Accra` time zone).

### 8.2 Templates in this project

| Template                                                                  | To                        | Trigger                         |
| ------------------------------------------------------------------------- | ------------------------- | ------------------------------- |
| `quoteSent`                                                               | client                    | send, revise-and-send           |
| `quoteAccepted` (with deposit invoice card and pay button)                | client                    | accept                          |
| `quoteDecisionAlert`                                                      | admin (`RESEND_TO_EMAIL`) | accept, decline                 |
| `paymentRequest` (stage invoice card)                                     | client                    | Request payment                 |
| `paymentReceipt`                                                          | client                    | settlement (Paystack or manual) |
| `paymentAlert` (paid, or problem: duplicate, amount or currency mismatch) | admin                     | settlement                      |
| `requirementsRequest`                                                     | client                    | send, or auto after deposit     |
| `requirementsSubmitted`                                                   | admin                     | submit                          |
| `requirementsChanges`                                                     | client                    | request changes                 |

PR 3 moves the existing emails (`send-invoice`, `send-inquiry-status`,
`send-payment-confirmation`, invoice-path webhook emails, `notify-inquiry`,
`create-booking`) onto the kit without changing when they are sent, and adds a
client confirmation email for new inquiries.

## 9. Payments: settlement

`api/shared/quotes/settle.js`, called by the webhook, the return-page check and
manual recording:

1. Find the payment row by `reference`; take lock `settle-<reference>` (409 →
   already handled, return current state).
2. Map the Paystack status: `success` → continue; `failed`/`reversed` → mark
   failed; anything else including `abandoned` (MoMo prompt waiting) → stays
   pending and the lock is released.
3. Reject a test transaction on a live key and vice versa.
4. Check exact amount and currency against the server-computed stage amount
   (expected amount must be > 0). Mismatch → status `failed` with note, admin
   `paymentAlert` (problem), stage not marked paid.
5. Take lock `stage-<quoteId>-<stageId>`; 409 → mark `duplicate`, admin alert
   to refund.
6. Mark the payment `success` with `paidAt`, channel and Paystack id; send
   `paymentReceipt` and `paymentAlert`; if this was the first stage and a
   requirements request is attached and unsent, send `requirementsRequest`.

Webhook changes (`api/paystack-webhook/index.js`): after the existing signature
check, if `metadata.kind === "quote"` re-fetch the transaction from Paystack
(`/transaction/verify/<ref>`, never trust the payload) and call `settle`.
Return 500 on transient errors so Paystack retries, 200 on permanent ones (with
an admin alert). The invoice branch is unchanged.

## 10. Security

- Tokens: 256-bit, hashed at rest, rotated on revise and payment request.
- Client functions return a whitelisted view model only (no `tokenHash`,
  evidence, IP hash or internal ids beyond stage ids).
- All amounts, numbers and status changes are server-side; the browser sends
  only ids, method, email and typed name.
- Accept, decline, pay-initialize and requirements-save reject bodies over
  64 KB and validate every field. Rate limiting by IP is not available without
  shared state on Functions; token entropy is the guard, and Paystack
  initialize is idempotent per pending reference (a payable stage with a
  pending row younger than 15 minutes reuses it).
- Uploads: private container `client-files` (no anonymous access), path
  `req/<requestId>/<itemId>/<uuid>-<slug>.<ext>`, type checked before issuing
  the SAS, size checked after upload (blob deleted if over 20 MB, the pattern
  in `api/shared/media.js`), SAS write-only for one blob for 10 minutes. Admin
  reads use 5-minute read SAS URLs.
- Rendering: quote and requirement text is rendered as text with line breaks
  and auto-linked https URLs; no HTML from the database is injected.
- Acceptance evidence stores `sha256("ip:" + ip)`, not the raw IP.

## 11. Configuration

New Azure app settings: `RECEIPT_SIGNING_SECRET`, `CLIENT_FILES_CONTAINER`
(default `client-files`). Existing ones reused: `APPWRITE_API_KEY`,
`PAYSTACK_SECRET_KEY`, `RESEND_*`, `AZURE_STORAGE_ACCOUNT`,
`AZURE_STORAGE_KEY`. Blob CORS on the storage account must allow `PUT` from
`https://oceaniccoder.dev` (and `http://localhost:5173` for development). The
`CLAUDE.md` env tables are updated in the PR that introduces each setting.

## 12. Testing

- **Unit (Vitest)**: money and stage maths including rounding remainder,
  schedule validation, status transitions, stage states and overdue, invoice
  number and reference formats, settlement decision table (amount, currency,
  mode, status mapping), token generation and hashing, receipt signature,
  requirements validation (required items, types, file rules), email `esc` and
  `safeUrl`, every template renders with sample data.
- **Function tests** with mocked Appwrite, Paystack and Blob clients, following
  `api/shared/*.test.js`: quote-view (expiry flip, viewed, inactive link),
  quote-respond (accept evidence, idempotent re-accept, decline), quote-pay
  (payable checks, reuse of pending row), webhook quote branch (success,
  duplicate, mismatch, abandoned), requirements save/submit and upload-url
  rules.
- **Component tests** (Testing Library): quote page in each status, checkout
  method tiles, return page states, requirements form validation.
- **End-to-end in the browser with Paystack test keys**, before merge:
  create quote → send → open link → accept → pay deposit (card and MoMo test
  numbers) → webhook settles → receipt email → requirements request arrives →
  upload a PDF and a Drive link → submit → admin reviews → request balance →
  pay → quote shows fully paid. Run against a local Functions host plus a
  tunnel for the webhook, or on the SWA preview environment.
- Quality gates from `CLAUDE.md`: type-check, lint, format, build.

## 13. Delivery

Three PRs, each shippable:

1. **Quotes and staged payments**: collections script, shared models, quote
   functions, webhook branch, client pages (quote, checkout, return, invoice,
   receipt), Quotes tab, email kit, quote and payment templates, Emails preview
   tab. After merge the client can be sent a quote.
2. **Requirements requests**: collection, upload functions and container,
   client page, Requirements tab with presets, review flow, templates,
   auto-send after deposit.
3. **Email migration and old-flow fixes**: existing emails onto the kit, client
   inquiry confirmation, remove trust in `?payment=success` on `/pay`, protect
   `notify-inquiry` (Turnstile token check), fix its dashboard link to
   `/admin/dashboard`.

After all three, the migration plan gains the `quotes`,
`requirement_requests` and `locks` containers and the quote functions' repo
modules move to Cosmos at cutover.

## 14. Open items for the user

- Paystack: confirm USD is enabled on the account before sending a USD quote.
- Provide or approve the default quote terms text (a starter version ships in
  the editor and is editable per quote).
- Confirm the WhatsApp number shown on client pages.

## 15. PR 1b: AI quote drafter (proposed, awaiting user answers)

Added 2026-10-10 at the user's request. Builds on PR 1's quote editor.

- **Flow:** the editor gains a first step, "Draft with AI". The admin pastes
  everything known about the project (client conversation, stack, features,
  timeline, third-party services). An admin-only function `quote-draft` sends it
  with the admin's rate card to Claude and returns a `QuoteDraft` (line items
  with amounts, overview, scope, timeline, payment plan) plus a private
  "things to check" list (assumptions, risks, low-confidence prices, questions
  for the client). The editor is filled in; the admin edits, approves and sends
  as usual. Nothing is sent automatically and the checklist never reaches the
  client.
- **Recurring costs:** a "Running costs" section on the quote (e.g. Appwrite
  Pro $25/month), shown to the client but excluded from the total and the
  payment stages. Pass-through prepaid blocks (e.g. 12 months the admin pays
  upfront) are ordinary line items in the deposit stage. The AI must flag who
  pays recurring costs when unclear.
- **Inputs needed from the user:** a rate card (day/hour rate, typical package
  prices, third-party markup policy), `ANTHROPIC_API_KEY` set by the user in
  Azure and local settings, and confirmation of the running-costs section.
- **Model and SDK:** chosen when PR 1b is designed, from the current Claude API
  reference; structured output validated against `validateDraft` before it
  reaches the editor.
