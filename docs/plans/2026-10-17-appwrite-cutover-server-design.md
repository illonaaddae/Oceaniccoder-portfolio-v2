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
with `DATA_BACKEND=cosmos` through a tunnel. That run must not touch
production Cosmos: point `COSMOS_ENDPOINT` and `COSMOS_KEY` in
`api/local.settings.json` at the Cosmos emulator or a separate Cosmos account
(the database name is fixed to `portfolio` in `api/shared/cosmos.js`, so a
second database in the production account is not an option). If a test run
ever hit production, delete its test-mode `pi_` payments rows, quotes and
locks by hand before the final import.

## Runbook

### Keys on the night

- Put the keys in two git-ignored env files, `chmod 600` both, and pass them
  with `node --env-file=...`, never inline (inline keys land in shell history):
  - `.env.cutover`: `COSMOS_ENDPOINT`, the Cosmos **read-only** key as
    `COSMOS_KEY`, `PAYSTACK_SECRET_KEY`, `APPWRITE_API_KEY` (read scopes). For
    backups, `--dry-run` imports and reconcile.
  - `.env.cutover.write`: `COSMOS_ENDPOINT` and the Cosmos **primary** key.
    Only for the real import, `--backfill-quote-locks` and `--mark-cutover`.
- The scripts never print keys. Reconcile prints the Paystack mode and the
  Cosmos host it reads.
- `--env-file` needs Node 20.6 or later. Check `node --version` first:
  `.nvmrc` says 18, which has no `--env-file`.

### Before cutover night

- **PR 2 merged and deployed is a hard prerequisite** for setting `WRITE_HOLD`
  or `DATA_BACKEND=cosmos`. Without it the webhook invoice branch ignores the
  hold and keeps recording payments in Appwrite, after the final backup.
- `WRITE_HOLD` accepts only `"1"`. Unset, `""` and `"0"` mean off; any other
  value (`true`, `yes`) makes every function that reads it throw.
- Under the hold the webhook quote branch answers 500, so Paystack retries it.
- Run `node --env-file=.env.cutover scripts/import-to-cosmos.mjs --dry-run --pre-cutover`,
  then the same with `.env.cutover.write` and without `--dry-run`, and read the
  data checks it prints. Fix duplicate invoice numbers and invoices with no
  total or currency in Appwrite. Quotes without a `quoteNumber` lock get one
  with `--backfill-quote-locks`.

### Import flags (`scripts/import-to-cosmos.mjs`)

Every run needs `COSMOS_ENDPOINT` and `COSMOS_KEY`, the dry run too (it reads
Cosmos to count; the read-only key is enough). Rules live in
`scripts/lib/import-plan.mjs`.

| Flag                                | Effect                                                                                                                                                                              |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--backup <dir>`                    | Backup folder; default the newest `backup/<date>` (a `backup/<date>-final` folder is only used when named). A missing folder or table file fails.                                   |
| `--only a,b`                        | Only these containers. An unknown name, or `analytics`, fails.                                                                                                                      |
| `--dry-run`                         | Read-only. Per container: create, overwrite, newer-in-Cosmos and prune counts, then the data checks on the result.                                                                  |
| `--insert-only`                     | Creates missing rows only; overwrites nothing. The only kind of run allowed after the marker (`--dry-run` aside).                                                                   |
| `--created-after <time>`            | Only backup rows whose `$createdAt` is after this time (Z or an offset). Needs `--insert-only`. Rows with no readable `$createdAt` are left out and listed.                         |
| `--force-overwrite`                 | Also overwrites rows whose Cosmos `updatedAt` is newer than the backup (skipped by default). Warns per row.                                                                         |
| `--pre-cutover`                     | Asserts the cutover has not happened; refused once the marker exists. Also refreshes `payments`, `invoices`, `quotes` and `locks` (see below).                                      |
| `--prune`                           | Deletes Cosmos rows not in the backup, after which rows are created. Needs `--pre-cutover`.                                                                                         |
| `--prune-money`                     | With `--prune`, also prunes `payments` and `invoices`.                                                                                                                              |
| `--allow-overwrite-after-cutover`   | After the marker, allows a run without `--insert-only`. Counters and reactions don't bump `updatedAt`, so this can overwrite live counts.                                           |
| `--allow-quote-state-after-cutover` | After the marker, allows `quotes` and `locks` in the run, and `--backfill-quote-locks`. Without it they are refused: a lock released in Cosmos would come back and block a payment. |
| `--mark-cutover`                    | Runs alone. Writes the row `cutover` (`at`, `by`) in `locks`, which `/api/manage` can't list or change. After it only `--insert-only` runs.                                         |
| `--backfill-quote-locks`            | Creates the missing `quoteNumber:` lock rows the data checks report.                                                                                                                |

`payments`, `invoices`, `quotes` and `locks`:

- Without `--pre-cutover` they are create-only: an existing row is kept.
- With `--pre-cutover` they are refreshed like every other container (an
  existing row is overwritten unless Cosmos has a newer `updatedAt`). Nothing
  writes them in Cosmos before cutover, so an import taken days earlier would
  otherwise keep stale invoice status, quote stages, pending payments and
  released `stage:`/`settle:` locks; a stale lock blocks a real payment
  (`api/shared/quotes/settle.js`).
- `--prune` clears `quotes` and `locks` rows that are gone from Appwrite. It
  touches `payments` and `invoices` only with `--prune-money` too, and never a
  `payments` row whose id starts with `pi_` (written by the Cosmos webhook, for
  example in a test-mode run). Deleting a money record is the one loss Cosmos
  can't give back, so it takes a second flag, given only after the dry run
  lists exactly the rows you know were deleted in Appwrite.
- `locks` rows made by `--backfill-quote-locks` are not in Appwrite, so a
  `--prune` run removes them; pass `--backfill-quote-locks` in the same run to
  recreate them.

`--prune` never touches the containers `/api/submit` writes (`bookings`,
`messages`, `project_inquiries`, `comments`, `testimonials`); naming one of
those in `--only` with `--prune` fails. A unique-key clash on create
(`blog_reactions`, `blog_views`, `project_case_studies`, `project_videos`) is
reported with the Cosmos row that holds the key.

Exit codes: 2 on bad flags; 1 on a Cosmos error, a backup row missing after
the import, a refusal (marker present), or, before the marker, any invoice,
quote or payment whose `status` or `updatedAt` differs from the backup. After
the marker `--dry-run` always runs (but not with `--prune` or
`--pre-cutover`). The marker is read once at the start of a run, so never run
`--mark-cutover` while another import is running.

`scripts/reconcile-paystack.mjs --since <time with Z or offset> --mode live|test`
(needs `PAYSTACK_SECRET_KEY`, `COSMOS_ENDPOINT`, `COSMOS_KEY`; the read-only
key is enough) lists successful Paystack transactions since then with no
settled Cosmos `payments` row, and how to replay them. Only a `success` or
`paid` row settles a transaction (quote-pay writes `pending` before the
charge); rows that exist but are not settled are listed apart, and rows
settled as `failed`, `duplicate` or `refunded` are listed for a look by hand.
`--mode` must match the key's `sk_live_`/`sk_test_` prefix. Read-only;
`--apply` is refused. Exit 0 all settled; 3 some unrecorded or unsettled;
4 none of those, but some settled as `failed`, `duplicate` or `refunded` on a
successful charge (a person must resolve or refund them); 2 bad arguments or
mode mismatch.

Paging is by page number. Paystack documents an offset meta (`pageCount`)
and, in one example, a cursor meta (`next`, `previous`, `perPage`); with the
cursor shape the script keeps asking while `next` is set or the page was full,
and fails on a full page with neither. Paystack's own cursor parameters
(`use_cursor`, `next`) are not used: their behaviour is not verified.

### Cutover night

1. Freeze admin edits. `WRITE_HOLD=1`; check quote-pay answers 503 and the
   webhook does not answer 200 (its quote branch answers 500). Note the time
   as H.
2. Confirm last hour's Paystack charges are recorded or queued for retry.
3. Final backup:
   `node --env-file=.env.cutover scripts/backup-appwrite.mjs --out backup/<date>-final`.
   Compare manifest counts with the console. Take T from the backup's
   `manifest.json` `takenAt` (set before any table is read), not from the
   clock when it finishes.
4. Dry run, read-only key:
   `node --env-file=.env.cutover scripts/import-to-cosmos.mjs --backup backup/<date>-final --dry-run --prune --pre-cutover --backfill-quote-locks`.
   Read every prune line. Add `--prune-money` only if the `payments` or
   `invoices` rows it would prune are ones you know were deleted in Appwrite.
   Then, primary key:
   `node --env-file=.env.cutover.write scripts/import-to-cosmos.mjs --backup backup/<date>-final --prune --pre-cutover --backfill-quote-locks`
   (last prune ever). Go on only with exit 0 (that includes no invoice, quote
   or payment drifting from the backup) and every data-check problem
   understood.
5. `DATA_BACKEND=cosmos`, repo variable `VITE_DATA_BACKEND=cosmos`, redeploy.
6. Smoke test with the hold on: GitHub sign-in, counts, get-invoice, booked
   times and a test booking, message, comment. Note their ids. (`WRITE_HOLD`
   blocks quote reads too, because some flows email before they write, so the
   public quote view is checked in step 8.)
7. No-go: revert both settings and redeploy. This is not lossless: rows written
   to Cosmos after the flip (the smoke tests, and any visitor booking, message,
   comment, reaction or view) are stranded there, because Appwrite never sees
   them. Before removing the hold, list them in Data Explorer with
   `SELECT c.id, c.createdAt FROM c WHERE c.createdAt > "<T>"` in `bookings`,
   `messages`, `comments`, `project_inquiries`, `testimonials`,
   `blog_reactions` and `blog_views`, and re-enter the real ones in Appwrite by
   hand. Then remove the hold.
8. Go: `node --env-file=.env.cutover.write scripts/import-to-cosmos.mjs --mark-cutover`,
   then remove the hold. Straight away, settle every pending quote payment
   (resend its webhook from the Paystack dashboard) before clients can retry
   and start a second charge. Open a public quote view. Run
   `node --env-file=.env.cutover scripts/reconcile-paystack.mjs --since <H minus 24 h, with Z> --mode live`
   until it exits 0. Start the window well before the hold, not at T: a charge
   taken before the hold can still be waiting on a retry. Check its first lines
   read `Paystack mode: LIVE` and the production Cosmos host. Exit 4 is not
   done: resolve or refund every check-by-hand line in the Paystack dashboard
   first. Then delete the step 6 smoke-test rows.
9. With admin edits still frozen, second backup,
   `node --env-file=.env.cutover scripts/backup-appwrite.mjs --out backup/<date>-post`, then
   `node --env-file=.env.cutover.write scripts/import-to-cosmos.mjs --backup backup/<date>-post --insert-only --created-after <T, with Z> --only bookings,messages,comments,project_inquiries,testimonials`.
   T is the final backup's `takenAt` from step 3, or a few minutes earlier,
   never a later time: visitors keep writing to Appwrite while that backup
   reads its tables, so a row created during it may be missing from it, and
   only a T at or before its start brings that row across. An earlier T costs
   nothing, because `--insert-only` skips ids already in Cosmos.
   `--created-after` keeps older rows that were deleted in Cosmos after the
   flip from coming back. Unfreeze admin edits only after this step.
10. Leave Appwrite alone until it is disabled. After step 8, roll forward only.
11. Rotate the Cosmos key the scripts used (Azure portal, Cosmos account,
    Keys). If the site uses that key, point the Static Web App `COSMOS_KEY` at
    the other key first, then regenerate. Delete `.env.cutover` and
    `.env.cutover.write`.
12. Once Appwrite is gone and nothing needs the backups, delete the local
    `backup/` folders (they hold personal data from bookings, invoices,
    payments and messages) or move them to encrypted storage.
