# Full-proposal quotes: design

Date: 2026-10-11 · Status: awaiting owner review · Builds on PR 1 (client quotes, #157) and the full-page editor (#158)

## Goal

Web-project quotes should explain what the client is paying for, so they feel informed rather than sold to. The owner's West Africa Wander draft is the reference; the approved mockup ("Option A", with the owner's trims) is the target layout. Small quotes must stay as short as they are today: every new section is optional and hidden when empty.

## Non-goals

- **No payments for optional work.** An optional phase (e.g. "Phase 2") is information only: not in the total, not in the payment plan, never payable from this quote. When the client wants it, the owner sends a new quote.
- No weekly or dated milestones. Payment stays as percentage stages per quote (presets 100 / 50-50 / 60-40 / 70-30 / 40-30-30), requested manually.
- No maintenance-plan table, no "why later" explanations, no signature lines (typed-name acceptance already covers it).
- No change to Paystack, settlement, receipts or the pay page.

## What the client sees (quote page `/q/:token`)

Order, from the mockup:

1. Journey bar and banner (unchanged; the banner never mentions optional work).
2. **At a glance**: up to 4 short facts, e.g. "Live in about 14 weeks", "You own the code, data and domain".
3. **What you'll get**: the line items. Each item can carry a **"What it includes"** note, shown under a disclosure (`<details>`) so the list stays scannable. Below the items: subtotal labelled **Standard value** when there is a discount, the discount with its **label** (e.g. "First-client discount"), then the price.
4. **How you pay**: the existing stage plan. Each stage can carry a short **"when"** note, e.g. "To start the project", "When the platform is live".
5. **Running costs**: rows of service, what it's for, and an estimated cost, with the line "Paid by you directly to each provider. Not part of the price above." Not in any total.
6. **Scope notes**: one collapsed section holding **Not included** and **What I need from you** (assumptions).
7. **Next steps**: a short numbered list.
8. Decision card (unchanged).
9. **Optional extras for later**: collapsed, dashed outline, after the decision card. It holds a title (default "Optional extras for later"), the optional items with their own "what it includes" notes and an indicative total, and a fixed line: "Not included in the {total} above, and not part of these payments. Ask for a separate quote when you're ready."

The existing Overview, Scope, Timeline, Notes and Terms sections stay where they are.

## Data model

New quote fields (all optional; existing quotes read them as empty):

| Field           | Type                       | Limits                         | Storage                       |
| --------------- | -------------------------- | ------------------------------ | ----------------------------- |
| `highlights`    | string[]                   | ≤ 4, each ≤ 80 chars           | new column, text (JSON)       |
| `discountLabel` | string                     | ≤ 60                           | new column, string(60)        |
| `runningCosts`  | {service, purpose, cost}[] | ≤ 12 rows; 60 / 120 / 60 chars | new column, text (JSON)       |
| `exclusions`    | text (one item per line)   | ≤ 3000                         | new column, text              |
| `assumptions`   | text (one item per line)   | ≤ 3000                         | new column, text              |
| `nextSteps`     | text (one step per line)   | ≤ 1500                         | new column, text              |
| `optionalTitle` | string                     | ≤ 80                           | new column, string(80)        |
| `optionalItems` | same shape as `items`      | ≤ 30                           | new column, mediumtext (JSON) |

Inside existing JSON columns (no schema change):

- `items[].detail`: "what it includes", ≤ 600 chars (also on `optionalItems`).
- `schedule[].note`: the stage's "when", ≤ 80 chars.

Totals, stage amounts, settlement and the accepted snapshot ignore `optionalItems`, `runningCosts` and all text fields. The accepted snapshot includes the new fields so what the client accepted stays on record.

Appwrite: the 8 columns are added to the `quotes` table. The Cosmos migration plan gets the same fields; `repo.js` stays the only module that touches storage.

## Server (`api/shared/quotes`, `api/quote-admin`, `api/quote-view`)

- `model.validateDraft` parses and limits the new fields, with friendly field errors in the existing `fields` map (e.g. `runningCosts.2.cost`). Empty rows are dropped, not rejected.
- `repo.js` JSON-encodes `highlights`, `runningCosts` and `optionalItems` the way it already handles `items` and `schedule`.
- `views.clientQuoteView` and `adminQuoteView` add the fields to their explicit whitelists; the key-set tests are updated so nothing else leaks.
- Optional items get computed line totals and an `optionalTotalMinor` for display only.

## Editor (full-page, `QuoteEditor` + `editorSteps`)

Steps become: Client → Page content → Line items → Payment stages → **Extras** → Terms → Review.

- **Page content**: adds "At a glance" (up to 4 short lines).
- **Line items**: each row gets an "Add what it includes" toggle that opens a textarea. The discount gets an optional label.
- **Payment stages**: each stage gets an optional "when" note (placeholder from the preset, e.g. "To start the project").
- **Extras** (new): Running costs (add or remove rows), Not included, What I need from you, Next steps, and Optional extras (title plus item rows like line items, each with a detail note). The step says clearly that none of this changes the price.
- **Review**: shows the client page sections as they will appear.
- The sticky summary shows "Optional extras (not in total): GHS X" when present.

## Emails

Unchanged. The quote email links to the page, where the detail lives.

## Error handling

- Validation errors map to fields and jump the editor to the step that holds them, as today.
- On the client page, malformed or missing new fields render as empty sections, never as errors.

## Testing

- `model.test.js`: parse, limits, empty-row dropping; totals unaffected by optional items and running costs; snapshot includes the new fields.
- `views.test.js`: whitelist key sets; optional total.
- `repo.test.js`: JSON round trip of the new JSON fields.
- `quote-admin` / `quote-view` tests: save and read back the new fields.
- `QuotePage.test.tsx`: each section renders only when filled; optional section collapsed and labelled "not in this quote"; a quote with no new fields looks as it does today.
- `QuoteEditor.test.tsx`: the Extras step, item detail toggle and stage note save.
- Browser check of the West Africa Wander example at 375px and 1280px, light and dark: no horizontal scroll, sections collapsed by default.

## Rollout

1. Add the 8 Appwrite columns (`quotes` table) before deploying the server change.
2. Ship the server and editor changes in one PR, then the client page in a second PR. Existing quotes keep working throughout.
