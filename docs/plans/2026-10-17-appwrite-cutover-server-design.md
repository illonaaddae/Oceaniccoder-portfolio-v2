# Appwrite cutover: server side and runbook (draft, 2026-10-17)

Deadline: the Appwrite org is disabled around 1 Nov 2026. Target cutover: 28 Oct.
Admin sign-in: GitHub only (SWA custom registration), PR `feat/OC-0-azure-admin-v2`.

## Approach

A server switch `DATA_BACKEND` (`appwrite` default, `cosmos`), read only in
`api/shared/backend.js`, which throws on any other value. The Cosmos code merges
dark before cutover night, so the night is setting changes and data moves only.
`WRITE_HOLD=1` makes the quote service answer 503 and the Paystack webhook
refuse deliveries (the quote branch answers 500), so Paystack retries (every
3 min x4, then hourly for 72 h in live mode) replay into Cosmos after the flip.
The server switch and `VITE_DATA_BACKEND` flip together.

## Gaps found

- `quotes` and `locks` are not in `CONTAINERS` (`api/shared/cosmos.js`). Adding
  them must not expose them through `/api/manage` (mark `manage: false`, honour
  it in `adminData.isCollection`). That makes 25 containers, the shared limit.
- `StorageCleanupTab` reads through Appwrite. In cosmos mode every read fails,
  so every file looks orphaned and live media could be deleted.
- `create-booking` `isSlotTaken` uses Appwrite and fails open.
- Invoice webhook is check-then-insert; two deliveries can both pass.

## Webhook invoice flow on Cosmos

1. 503 if `WRITE_HOLD`.
2. Older row with that `paystackReference` (Appwrite id) → 200 duplicate.
3. Find invoice, `evaluateSettlement` as today.
4. Create the `payments` row with a fixed id (`pi_` + sha256(reference)),
   `invoiceApplied: false`; 409 → read it and resume.
5. Not applied → mark invoice paid (or un-archive if underpaid), replace with
   `IfMatch` etag, retry on 412, set `invoiceApplied: true`.
6. Not notified → send emails, set `notifiedAt` (at-least-once).
7. Transient error → alert and 500 so Paystack retries.

## Quote repo

`repo.cosmos.js` with the same 16 methods as `repo.js`; `createCosmosLocks` in
`locks.js`; `service.js` picks by backend. Updates are read, merge, replace with
`IfMatch`, retry on 412 (not patch: 10-op limit). Quote numbers reserved through
a lock (Cosmos unique keys are per partition). Locks are imported. Existing suites
against `fakes.js` are the parity check.

## PRs

| #    | Scope                                                                                                           | Depends       |
| ---- | --------------------------------------------------------------------------------------------------------------- | ------------- |
| 1    | `backend.js`, `quotes`/`locks` containers, `repo.cosmos.js`, Cosmos locks, `WRITE_HOLD`                         | 3b            |
| 2    | Webhook invoice branch on Cosmos (money, high risk)                                                             | 1             |
| 3    | `get-invoice` and `create-booking` slot check on Cosmos                                                         | 1             |
| 4    | StorageCleanupTab via `manageList`, delete blocked on read errors; drop `isSlotBooked`                          | none          |
| 5    | Import `--only`, `--insert-only`, `--prune` needs `--pre-cutover`; `reconcile-paystack.mjs`; runbook; env table | 1             |
| 6    | Server Appwrite removal                                                                                         | after cutover |
| 7a/b | Browser Appwrite removal                                                                                        | after cutover |

Before cutover: end-to-end in Paystack test mode against local `func start`
with `DATA_BACKEND=cosmos` through a tunnel.

## Runbook

### Before cutover night

- **PR 2 merged and deployed is a hard prerequisite** for setting `WRITE_HOLD`
  or `DATA_BACKEND=cosmos`. Without it the webhook invoice branch ignores the
  hold and keeps recording payments in Appwrite, after the final backup.
- `WRITE_HOLD` accepts only `"1"`. Unset, `""` and `"0"` mean off; any other
  value (`true`, `yes`) makes every function that reads it throw.
- Under the hold the webhook quote branch answers 500, so Paystack retries it.
- Run `node scripts/import-to-cosmos.mjs --dry-run` and a real import, and read
  the data checks it prints. Fix duplicate invoice numbers and invoices with no
  total or currency in Appwrite. Quotes without a `quoteNumber` lock get one
  with `--backfill-quote-locks`.

### Import flags (`scripts/import-to-cosmos.mjs`)

Every run needs `COSMOS_ENDPOINT` and `COSMOS_KEY`, the dry run too (it reads
Cosmos to count). Rules live in `scripts/lib/import-plan.mjs`.

| Flag                     | Effect                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `--backup <dir>`         | Backup folder; default the newest `backup/<date>`. A missing folder or table file fails.                            |
| `--only a,b`             | Only these containers. An unknown name, or `analytics`, fails.                                                      |
| `--dry-run`              | Read-only. Per container: create, overwrite, newer-in-Cosmos and prune counts, then the data checks on the result.  |
| `--insert-only`          | Creates missing rows only; overwrites nothing.                                                                      |
| `--force-overwrite`      | Also overwrites rows whose Cosmos `updatedAt` is newer than the backup (skipped by default). Warns per row.         |
| `--prune`                | Deletes Cosmos rows not in the backup. Needs `--pre-cutover`.                                                       |
| `--pre-cutover`          | Asserts the cutover has not happened; refused once the marker exists.                                               |
| `--mark-cutover`         | Runs alone. Writes the private settings row `cutover` (`at`, `by`); after it, `--prune` and `--pre-cutover` refuse. |
| `--backfill-quote-locks` | Creates the missing `quoteNumber:` lock rows the data checks report.                                                |

Always, whatever the flags: `payments`, `invoices`, `quotes` and `locks` are
create-only (an existing row is kept) and never pruned, and `--prune` never
touches the containers `/api/submit` writes (`bookings`, `messages`,
`project_inquiries`, `comments`, `testimonials`). Naming one of those in
`--only` with `--prune` fails. Exit 1 on a Cosmos error or a backup row missing
after the import, 2 on bad flags.

`scripts/reconcile-paystack.mjs --since <ISO>` (needs `PAYSTACK_SECRET_KEY`,
`COSMOS_ENDPOINT`, `COSMOS_KEY`) lists successful Paystack transactions since
then with no Cosmos `payments` row, and how to replay them. Read-only; `--apply`
is refused. Exit 0 all recorded, 3 some missing.

### Cutover night

1. Freeze admin edits. `WRITE_HOLD=1`; check quote-pay answers 503 and the
   webhook does not answer 200 (its quote branch answers 500).
2. Confirm last hour's Paystack charges are recorded or queued for retry.
3. Final backup (`scripts/backup-appwrite.mjs`); compare manifest counts with
   the console. Note the time as T.
4. `node scripts/import-to-cosmos.mjs --dry-run --prune --pre-cutover`, read it,
   then `node scripts/import-to-cosmos.mjs --prune --pre-cutover` (last prune
   ever). Go on only with exit 0 and every data-check problem understood.
5. `DATA_BACKEND=cosmos`, repo variable `VITE_DATA_BACKEND=cosmos`, redeploy.
6. Smoke test with the hold on: GitHub sign-in, counts, get-invoice, booked
   times and a test booking, message, comment. (`WRITE_HOLD` blocks quote reads
   too, because some flows email before they write, so the public quote view is
   checked in step 8.)
7. No-go: revert both settings, redeploy, remove hold. Nothing lost.
8. Go: `node scripts/import-to-cosmos.mjs --mark-cutover`, then remove the hold.
   Straight away, settle every pending quote payment (resend its webhook from
   the Paystack dashboard) before clients can retry and start a second charge.
   Open a public quote view. Run `node scripts/reconcile-paystack.mjs --since T`
   until it exits 0.
9. Second backup, then
   `node scripts/import-to-cosmos.mjs --insert-only --only bookings,messages,comments,project_inquiries,testimonials`.
10. Leave Appwrite alone until it is disabled. After step 8, roll forward only.
