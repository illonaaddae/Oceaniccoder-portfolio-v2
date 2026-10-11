# Full-Proposal Quotes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let web-project quotes carry client-friendly detail (highlights, "what it includes" per item, discount label, stage "when" notes, running costs, scope notes, next steps, optional extras) without changing money, payments or small quotes.

**Architecture:** New optional fields on the quote record. Lists go in JSON text columns encoded by `repo.js`; per-item and per-stage notes go inside the existing `items` / `schedule` JSON. `model.validateDraft` is the single parser and limiter. `views.js` whitelists decide what reaches each UI. The editor gains fields plus one new "Extras" step. The client page renders each section only when it's filled.

**Tech Stack:** Azure Functions (Node, CommonJS) + Vitest in `api/`; React 19 + TypeScript + Vite + Vitest/Testing Library in `src/`; Appwrite TablesDB (`quotes` table).

**Spec:** `docs/superpowers/specs/2026-10-11-quote-full-proposal-design.md`

## Global Constraints

- All new fields are optional. A quote with none of them renders exactly as today.
- Optional extras are never payable: excluded from `subtotalMinor`, `totalMinor`, stages, settlement and Paystack.
- Limits: highlights ≤ 4 × 80 chars; discountLabel ≤ 60; runningCosts ≤ 12 rows (service 60, purpose 120, cost 60); exclusions ≤ 3000; assumptions ≤ 3000; nextSteps ≤ 1500; optionalTitle ≤ 80; optionalItems ≤ 30; `items[].detail` ≤ 600; `schedule[].note` ≤ 80.
- Empty rows (all text blank) are dropped, not rejected.
- Client-facing copy: plain, short, no em-dash flourishes; fixed optional-section line: "Not included in the {total} above, and not part of these payments. Ask for a separate quote when you're ready."
- Commits: `feat(OC-0): …`, no Co-Authored-By trailer and no "Generated with Claude Code" footer (CLAUDE.md). Never `git stash`.
- Colours: brand/slate/status tokens only (`npm run check:colors`).
- Gates before each PR: `npm run type-check`, `npm run lint` (0 errors), `npx prettier --check <changed files>`, `npm run check:colors`, `npx vitest run <changed areas>`, `cd api && npx vitest run`, `npm run build`.

## Review Focus

1. A quote saved **before** this change (fields absent, `items` without `detail`) loads in the editor and on the client page with no crash and no empty headings. Owner: Task 3 (views) and Task 7 (client page).
2. An item or stage note that is pure whitespace is stored as empty and renders nothing. Owner: Task 1.
3. Optional items with prices never change `totalMinor` or stage amounts, even when the discount equals the subtotal. Owner: Task 1.
4. Running-cost or optional rows left half-filled in the editor (only a cost, no service) produce a field error on that row, not a silent drop or a crash. Owner: Task 1.
5. Very long single-word content (a URL as an item detail) wraps on a 375px client page with no horizontal scroll. Owner: Task 7.

---

## File Structure

| File                                                        | Responsibility                                                                                                            |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `api/shared/quotes/model.js`                                | parse and limit new fields in `validateDraft`; `optionalTotals()`                                                         |
| `api/shared/quotes/repo.js`                                 | JSON-encode `highlights`, `runningCosts`, `optionalItems`                                                                 |
| `api/shared/quotes/views.js`                                | add fields to `clientQuoteView`, `adminQuoteView`, `stageView`                                                            |
| `api/quote-respond/index.js`                                | include new fields in `acceptedSnapshot`                                                                                  |
| `src/types/quote.ts`                                        | `RunningCost`, new optional fields on `QuoteDraft`, `ClientQuote`, `AdminQuote`, `QuoteItem.detail`, `QuoteStageDef.note` |
| `src/utils/quoteMath.ts`                                    | `quoteToDraft` defaults for new fields                                                                                    |
| `src/components/AdminDashboard/tabs/Quotes/editorSteps.tsx` | highlights field, item detail toggle, discount label, stage note, `ExtrasStep`                                            |
| `src/components/AdminDashboard/tabs/Quotes/QuoteEditor.tsx` | insert Extras step, summary line for optional total                                                                       |
| `src/components/Quote/ProposalSections.tsx` (new)           | client sections: AtAGlance, RunningCosts, ScopeNotes, NextSteps, OptionalExtras                                           |
| `src/components/Quote/QuoteDocument.tsx`                    | item detail disclosure, discount label, render new sections in order                                                      |
| `src/components/Quote/StagePlan.tsx`                        | stage note line                                                                                                           |

---

## PR 1: data, server, editor

### Task 0: Appwrite columns (operational, done by the controller before Task 1 ships)

Add to `quotes` (database `6943493400018e7c314c`, project `6943431e00253c8f9883`), all optional, no default:

| key           | type       | size |
| ------------- | ---------- | ---- |
| highlights    | text       | —    |
| discountLabel | string     | 60   |
| runningCosts  | text       | —    |
| exclusions    | text       | —    |
| assumptions   | text       | —    |
| nextSteps     | text       | —    |
| optionalTitle | string     | 80   |
| optionalItems | mediumtext | —    |

Verify with `tables_db_list_columns` (expect 41 columns, all `available`).

### Task 1: Parse and limit the new fields (`model.js`)

**Files:**

- Modify: `api/shared/quotes/model.js` (`validateDraft`, constants, exports)
- Test: `api/shared/quotes/model.test.js`

**Interfaces:**

- Produces: `validateDraft(input).value` gains `highlights: string[]`, `discountLabel: string`, `runningCosts: {service,purpose,cost}[]`, `exclusions`, `assumptions`, `nextSteps`, `optionalTitle: string`, `optionalItems: Item[]`, and `items[i].detail`, `schedule[i].note`. `optionalTotals(optionalItems) -> { optionalTotalMinor }`.

- [ ] **Step 1: Write failing tests** (append to `model.test.js`)

```js
describe("full-proposal fields", () => {
  const base = {
    clientName: "Kofi",
    currency: "GHS",
    title: "Store",
    items: [
      {
        id: "i1",
        description: "Build",
        qty: 1,
        unitMinor: 100000,
        detail: "  Pages and checkout  ",
      },
    ],
    schedule: [
      { id: "deposit", label: "Deposit", percent: 60, note: " To start " },
      { id: "balance", label: "Balance", percent: 40 },
    ],
  };

  it("keeps trimmed item details and stage notes, empty when blank", () => {
    const r = M.validateDraft({
      ...base,
      items: [
        { ...base.items[0] },
        { id: "i2", description: "Hosting", qty: 1, unitMinor: 0, detail: "   " },
      ],
    });
    expect(r.ok).toBe(true);
    expect(r.value.items[0].detail).toBe("Pages and checkout");
    expect(r.value.items[1].detail).toBe("");
    expect(r.value.schedule[0].note).toBe("To start");
    expect(r.value.schedule[1].note).toBe("");
  });

  it("drops empty highlight and running-cost rows and limits them", () => {
    const r = M.validateDraft({
      ...base,
      highlights: ["Live in 14 weeks", " ", "You own it"],
      runningCosts: [
        { service: "Appwrite", purpose: "Hosting", cost: "USD 25/month" },
        { service: "", purpose: "", cost: "" },
      ],
    });
    expect(r.value.highlights).toEqual(["Live in 14 weeks", "You own it"]);
    expect(r.value.runningCosts).toHaveLength(1);
    expect(
      M.validateDraft({ ...base, highlights: ["a", "b", "c", "d", "e"] }).errors.highlights,
    ).toMatch(/4/);
  });

  it("flags a half-filled running cost row instead of dropping it", () => {
    const r = M.validateDraft({
      ...base,
      runningCosts: [{ service: "", purpose: "", cost: "USD 25" }],
    });
    expect(r.errors["runningCosts.0.service"]).toBeDefined();
  });

  it("never lets optional items change the price", () => {
    const withOpt = M.validateDraft({
      ...base,
      optionalItems: [{ id: "o1", description: "SMS", qty: 1, unitMinor: 250000 }],
    });
    const plain = M.validateDraft(base);
    expect(M.computeTotals(withOpt.value.items, 0)).toEqual(M.computeTotals(plain.value.items, 0));
    expect(M.optionalTotals(withOpt.value.optionalItems).optionalTotalMinor).toBe(250000);
  });

  it("applies the text limits", () => {
    const r = M.validateDraft({
      ...base,
      discountLabel: "x".repeat(61),
      exclusions: "x".repeat(3001),
      optionalTitle: "x".repeat(81),
    });
    expect(r.errors.discountLabel).toBeDefined();
    expect(r.errors.exclusions).toBeDefined();
    expect(r.errors.optionalTitle).toBeDefined();
  });

  it("reads a quote saved before these fields existed", () => {
    const r = M.validateDraft(base);
    expect(r.value).toMatchObject({
      highlights: [],
      runningCosts: [],
      optionalItems: [],
      exclusions: "",
      discountLabel: "",
    });
  });
});
```

- [ ] **Step 2: Run, expect failures**

Run: `cd api && npx vitest run shared/quotes/model.test.js -t "full-proposal"`
Expected: FAIL (`optionalTotals is not a function`, undefined fields).

- [ ] **Step 3: Implement** in `model.js`

```js
const LIMITS = {
  highlights: 4,
  highlight: 80,
  discountLabel: 60,
  runningCosts: 12,
  rcService: 60,
  rcPurpose: 120,
  rcCost: 60,
  exclusions: 3000,
  assumptions: 3000,
  nextSteps: 1500,
  optionalTitle: 80,
  optionalItems: 30,
  itemDetail: 600,
  stageNote: 80,
};

function parseItem(i) {
  return {
    id: str(i && i.id),
    description: str(i && i.description),
    qty: Number(i && i.qty),
    unitMinor: Number(i && i.unitMinor),
    detail: str(i && i.detail),
  };
}

function optionalTotals(optionalItems) {
  return { optionalTotalMinor: (optionalItems || []).reduce((t, i) => t + lineMinor(i), 0) };
}
```

In `validateDraft`, replace the `items` mapper with `d.items.map(parseItem)`, add `note: str(s && s.note)` to the schedule mapper, and add to `value`:

```js
    highlights: (Array.isArray(d.highlights) ? d.highlights : []).map(str).filter(Boolean),
    discountLabel: str(d.discountLabel),
    runningCosts: (Array.isArray(d.runningCosts) ? d.runningCosts : [])
      .map((r) => ({ service: str(r && r.service), purpose: str(r && r.purpose), cost: str(r && r.cost) }))
      .filter((r) => r.service || r.purpose || r.cost),
    exclusions: str(d.exclusions),
    assumptions: str(d.assumptions),
    nextSteps: str(d.nextSteps),
    optionalTitle: str(d.optionalTitle),
    optionalItems: (Array.isArray(d.optionalItems) ? d.optionalItems : [])
      .map(parseItem)
      .filter((i) => i.description || i.unitMinor || i.detail),
```

Then add checks after the existing item checks:

```js
value.items.forEach((it, i) => {
  if (it.detail.length > LIMITS.itemDetail)
    errors[`items.${i}.detail`] = `Keep this under ${LIMITS.itemDetail} characters.`;
});
value.schedule.forEach((s, i) => {
  if (s.note.length > LIMITS.stageNote)
    errors[`schedule.${i}.note`] = `Keep this under ${LIMITS.stageNote} characters.`;
});
if (value.highlights.length > LIMITS.highlights)
  errors.highlights = `Use up to ${LIMITS.highlights} short facts.`;
value.highlights.forEach((h, i) => {
  if (h.length > LIMITS.highlight)
    errors[`highlights.${i}`] = `Keep each fact under ${LIMITS.highlight} characters.`;
});
if (value.discountLabel.length > LIMITS.discountLabel)
  errors.discountLabel = `Keep the label under ${LIMITS.discountLabel} characters.`;
if (value.runningCosts.length > LIMITS.runningCosts)
  errors.runningCosts = `Use up to ${LIMITS.runningCosts} rows.`;
value.runningCosts.forEach((r, i) => {
  if (!r.service || r.service.length > LIMITS.rcService)
    errors[`runningCosts.${i}.service`] = "Name the service (up to 60 characters).";
  if (r.purpose.length > LIMITS.rcPurpose)
    errors[`runningCosts.${i}.purpose`] = "Keep this under 120 characters.";
  if (!r.cost || r.cost.length > LIMITS.rcCost)
    errors[`runningCosts.${i}.cost`] = "Add an estimated cost (up to 60 characters).";
});
for (const f of ["exclusions", "assumptions", "nextSteps", "optionalTitle"]) {
  if (value[f].length > LIMITS[f]) errors[f] = `Keep this under ${LIMITS[f]} characters.`;
}
if (value.optionalItems.length > LIMITS.optionalItems)
  errors.optionalItems = `Use up to ${LIMITS.optionalItems} optional items.`;
value.optionalItems.forEach((it, i) => {
  if (!it.description || it.description.length > 300)
    errors[`optionalItems.${i}.description`] = "Describe the item (up to 300 characters).";
  if (!(it.qty > 0 && it.qty <= 10000))
    errors[`optionalItems.${i}.qty`] = "Quantity must be more than 0.";
  if (!Number.isInteger(it.unitMinor) || it.unitMinor < 0 || it.unitMinor > 1e11)
    errors[`optionalItems.${i}.unitMinor`] = "Enter a valid price.";
  if (it.detail.length > LIMITS.itemDetail)
    errors[`optionalItems.${i}.detail`] = `Keep this under ${LIMITS.itemDetail} characters.`;
  if (!ID_RE.test(it.id)) errors[`optionalItems.${i}.id`] = "Invalid item id.";
});
```

Export `optionalTotals` and `LIMITS`.

- [ ] **Step 4: Run tests**

Run: `cd api && npx vitest run shared/quotes`
Expected: all pass (existing tests unchanged).

- [ ] **Step 5: Commit**

```bash
git add api/shared/quotes/model.js api/shared/quotes/model.test.js
git commit -m "feat(OC-0): parse and limit full-proposal quote fields"
```

### Task 2: Store and expose the fields (`repo.js`, `views.js`, snapshot)

**Files:**

- Modify: `api/shared/quotes/repo.js:13`, `api/shared/quotes/views.js` (`stageView`, `clientQuoteView`, `adminQuoteView`), `api/quote-respond/index.js` (snapshot object)
- Modify: `api/shared/quotes/fakes.js` (JSON fields mirror the repo)
- Test: `api/shared/quotes/repo.test.js`, `api/shared/quotes/views.test.js`, `api/quote-respond/quote-respond.test.js`

**Interfaces:**

- Consumes: Task 1 `value` shape, `M.optionalTotals`.
- Produces: `clientQuoteView` adds `highlights, discountLabel, runningCosts, exclusions, assumptions, nextSteps, optionalTitle, optionalItems (with lineMinor, detail), optionalTotalMinor`; `items[].detail`; `stages[].note`. `adminQuoteView` adds the same raw fields.

- [ ] **Step 1: Failing tests**

`repo.test.js`:

```js
it("round-trips the new JSON fields", async () => {
  const saved = await repo.create({
    ...fields,
    highlights: ["Live in 14 weeks"],
    runningCosts: [{ service: "Appwrite", purpose: "Hosting", cost: "USD 25" }],
    optionalItems: [{ id: "o1", description: "SMS", qty: 1, unitMinor: 1, detail: "" }],
  });
  const again = await repo.get(saved.id);
  expect(again.highlights).toEqual(["Live in 14 weeks"]);
  expect(again.runningCosts[0].service).toBe("Appwrite");
  expect(again.optionalItems[0].description).toBe("SMS");
});
```

(`fields` = the minimal create fields already used in that file.)

`views.test.js`: add the new keys to `CLIENT_KEYS`, `ADMIN_KEYS` and `CLIENT_STAGE_KEYS` (`note`), plus:

```js
it("shows optional extras with a display-only total and reads old quotes as empty", () => {
  const q = {
    ...quote,
    optionalItems: [{ id: "o1", description: "SMS", qty: 2, unitMinor: 100, detail: "Opt-in" }],
  };
  const v = V.clientQuoteView(q, M.stageStates(q, [], Date.now()));
  expect(v.optionalTotalMinor).toBe(200);
  expect(v.optionalItems[0]).toMatchObject({ lineMinor: 200, detail: "Opt-in" });
  expect(v.totalMinor).toBe(quote.totalMinor);
  const old = V.clientQuoteView(quote, M.stageStates(quote, [], Date.now()));
  expect(old).toMatchObject({
    highlights: [],
    runningCosts: [],
    optionalItems: [],
    optionalTotalMinor: 0,
    discountLabel: "",
  });
  expect(old.items[0].detail).toBe("");
});
```

`quote-respond.test.js`: in the accept test, assert `JSON.parse(saved.acceptedSnapshot)` (or the object, matching how the test reads it) contains `highlights`, `runningCosts`, `optionalItems`, `exclusions`.

- [ ] **Step 2: Run, expect failures**

Run: `cd api && npx vitest run shared/quotes quote-respond`

- [ ] **Step 3: Implement**

`repo.js` and `fakes.js`:

```js
const JSON_FIELDS = {
  items: [],
  schedule: [],
  payState: { due: {} },
  highlights: [],
  runningCosts: [],
  optionalItems: [],
};
```

`views.js` `stageView`: add `note: stage.note || "",` (and make sure `M.stageStates` passes `note` through from `schedule`; if it builds stages from schedule entries with spread, nothing to change, otherwise add `note: def.note || ""` there).

`views.js` `clientQuoteView`: items map adds `detail: i.detail || ""`; add:

```js
    highlights: q.highlights || [],
    discountLabel: q.discountLabel || "",
    runningCosts: q.runningCosts || [],
    exclusions: q.exclusions || "",
    assumptions: q.assumptions || "",
    nextSteps: q.nextSteps || "",
    optionalTitle: q.optionalTitle || "",
    optionalItems: (q.optionalItems || []).map((i) => ({
      id: i.id, description: i.description, qty: i.qty, unitMinor: i.unitMinor,
      lineMinor: M.lineMinor(i), detail: i.detail || "",
    })),
    optionalTotalMinor: M.optionalTotals(q.optionalItems).optionalTotalMinor,
```

`adminQuoteView`: add each new field as `name: q.name ?? null`.

`quote-respond/index.js` snapshot: add `highlights: quote.highlights || [], runningCosts: quote.runningCosts || [], exclusions: quote.exclusions || "", assumptions: quote.assumptions || "", nextSteps: quote.nextSteps || "", optionalTitle: quote.optionalTitle || "", optionalItems: quote.optionalItems || [], discountLabel: quote.discountLabel || ""`.

- [ ] **Step 4: Run** `cd api && npx vitest run` → all pass.

- [ ] **Step 5: Commit**

```bash
git add api/shared/quotes api/quote-respond
git commit -m "feat(OC-0): store and expose full-proposal quote fields"
```

### Task 3: Frontend types and draft defaults

**Files:**

- Modify: `src/types/quote.ts`, `src/utils/quoteMath.ts` (`quoteToDraft`)
- Test: `src/utils/quoteMath.test.ts`

**Interfaces:**

- Produces (TypeScript):

```ts
export interface RunningCost {
  service: string;
  purpose: string;
  cost: string;
}
// QuoteItem: detail?: string
// QuoteStageDef: note?: string
// QuoteDraft adds: highlights: string[]; discountLabel: string; runningCosts: RunningCost[];
//   exclusions: string; assumptions: string; nextSteps: string; optionalTitle: string; optionalItems: QuoteItem[];
// AdminQuote adds the same fields as optional (?: T | null)
// ClientQuote adds: highlights: string[]; discountLabel: string; runningCosts: RunningCost[]; exclusions: string;
//   assumptions: string; nextSteps: string; optionalTitle: string;
//   optionalItems: (QuoteItem & { lineMinor: number; detail: string })[]; optionalTotalMinor: number;
//   items: (… existing … & { detail: string })[]; stages: (ClientStage & { note: string })[]
```

- [ ] **Step 1: Failing test** in `quoteMath.test.ts`

```ts
it("gives new full-proposal fields empty defaults and keeps saved ones", () => {
  expect(quoteToDraft(null)).toMatchObject({
    highlights: [],
    runningCosts: [],
    optionalItems: [],
    exclusions: "",
    discountLabel: "",
    optionalTitle: "",
  });
  expect(quoteToDraft({ highlights: ["Live soon"], optionalTitle: "Phase 2" })).toMatchObject({
    highlights: ["Live soon"],
    optionalTitle: "Phase 2",
  });
});
```

- [ ] **Step 2: Run** `npx vitest run src/utils/quoteMath.test.ts` → FAIL.

- [ ] **Step 3: Implement** types above, and in `quoteToDraft` add:

```ts
    highlights: q?.highlights ? [...q.highlights] : [],
    discountLabel: pick(q?.discountLabel, ""),
    runningCosts: q?.runningCosts ? q.runningCosts.map((r) => ({ ...r })) : [],
    exclusions: pick(q?.exclusions, ""),
    assumptions: pick(q?.assumptions, ""),
    nextSteps: pick(q?.nextSteps, ""),
    optionalTitle: pick(q?.optionalTitle, ""),
    optionalItems: q?.optionalItems ? q.optionalItems.map((i) => ({ ...i })) : [],
```

Update test fixtures that build a full `ClientQuote` / `QuoteDraft` (`QuotePage.test.tsx`, `CheckoutPage.test.tsx`, `PaidPage.test.tsx`, `QuoteEditor.test.tsx`, mock data) with the new fields so `tsc` passes.

- [ ] **Step 4: Run** `npm run type-check && npx vitest run src/utils src/components/Quote src/components/AdminDashboard/tabs/Quotes` → pass.

- [ ] **Step 5: Commit** `feat(OC-0): add full-proposal fields to quote types and drafts`

### Task 4: Editor: highlights, item details, discount label, stage notes

**Files:**

- Modify: `src/components/AdminDashboard/tabs/Quotes/editorSteps.tsx` (`ContentStep`, `ItemsStep`, `StagesStep`)
- Test: `src/components/AdminDashboard/tabs/Quotes/QuoteEditor.test.tsx`

**Interfaces:**

- Consumes: Task 3 `QuoteDraft`.
- Produces: input labels used by tests: `At a glance fact 1`…`4`; `What item 1 includes`; `Discount label`; `When stage 1 is due` (note).

- [ ] **Step 1: Failing test**

```tsx
it("saves highlights, item details, a discount label and stage notes", async () => {
  quoteAdmin.mockResolvedValue({ quote: { id: "q1", status: "draft" }, stages: [], payments: [] });
  render(<QuoteEditor theme="dark" onClose={vi.fn()} onSaved={vi.fn()} />);
  await fillClient();
  await userEvent.click(screen.getByRole("button", { name: /next/i }));
  await userEvent.type(screen.getByLabelText(/project title/i), "Store");
  await userEvent.type(screen.getByLabelText(/at a glance fact 1/i), "Live in 14 weeks");
  await userEvent.click(screen.getByRole("button", { name: /next/i }));
  await userEvent.type(screen.getByLabelText(/description for item 1/i), "Build");
  await userEvent.click(screen.getByRole("button", { name: /add what it includes/i }));
  await userEvent.type(screen.getByLabelText(/what item 1 includes/i), "Pages and checkout");
  await userEvent.type(screen.getByLabelText(/discount label/i), "First-client discount");
  await userEvent.click(screen.getByRole("button", { name: /next/i }));
  await userEvent.type(screen.getByLabelText(/when stage 1 is due/i), "To start the project");
  await userEvent.click(screen.getByRole("button", { name: /save draft/i }));
  const draft = quoteAdmin.mock.calls.at(-1)![1].draft;
  expect(draft.highlights).toEqual(["Live in 14 weeks"]);
  expect(draft.items[0].detail).toBe("Pages and checkout");
  expect(draft.discountLabel).toBe("First-client discount");
  expect(draft.schedule[0].note).toBe("To start the project");
});
```

- [ ] **Step 2: Run** `npx vitest run src/components/AdminDashboard/tabs/Quotes/QuoteEditor.test.tsx -t "highlights"` → FAIL.

- [ ] **Step 3: Implement**, following the existing `Field` / `inputCls` patterns in `editorSteps.tsx`:
  - `ContentStep`: an "At a glance (optional)" group with 4 inputs `id="q-hl-{n}"`, label `At a glance fact {n}`, `maxLength={80}`. Writes `draft.highlights` as the non-empty values in order.
  - `ItemsStep`: per row, a text button "Add what it includes" (aria-expanded) that shows a `<textarea aria-label="What item {n} includes" maxLength={600}>` bound to `items[i].detail`; it starts open when `detail` is non-empty. Under the discount input, `Field id="q-discount-label" label="Discount label"` with `maxLength={60}` and placeholder "First-client discount".
  - `StagesStep`: per stage, an input `aria-label="When stage {n} is due"`, `maxLength={80}`. Placeholders: index 0 "To start the project", last "When the project is live", others "When this stage is done".
  - Error keys from the server (`items.{i}.detail`, `schedule.{i}.note`, `highlights.{i}`, `discountLabel`) show under their inputs via the existing `errors` prop.

- [ ] **Step 4: Run** the editor tests → pass.

- [ ] **Step 5: Commit** `feat(OC-0): editor fields for highlights, item details, discount label and stage notes`

### Task 5: Editor: Extras step

**Files:**

- Modify: `editorSteps.tsx` (new `ExtrasStep`), `QuoteEditor.tsx` (`STEPS` insert before Terms with `fields: ["runningCosts", "exclusions", "assumptions", "nextSteps", "optionalTitle", "optionalItems"]`; summary line)
- Test: `QuoteEditor.test.tsx`

**Interfaces:**

- Produces labels: `Service for running cost 1`, `What running cost 1 is for`, `Estimated cost 1`; `Not included`; `What I need from you`; `Next steps`; `Optional section title`; `Description for optional item 1`, `Price for optional item 1`, `What optional item 1 includes`. Buttons: `Add running cost`, `Add optional item`. Summary text: `Optional extras (not in total)`.

- [ ] **Step 1: Failing test**

```tsx
it("adds extras that never change the total", async () => {
  quoteAdmin.mockResolvedValue({ quote: { id: "q1", status: "draft" }, stages: [], payments: [] });
  render(<QuoteEditor theme="dark" onClose={vi.fn()} onSaved={vi.fn()} />);
  await fillClient();
  await userEvent.click(screen.getByRole("button", { name: /next/i }));
  await userEvent.type(screen.getByLabelText(/project title/i), "Store");
  await userEvent.click(screen.getByRole("button", { name: /next/i }));
  await userEvent.type(screen.getByLabelText(/description for item 1/i), "Build");
  await userEvent.clear(screen.getByLabelText(/price for item 1/i));
  await userEvent.type(screen.getByLabelText(/price for item 1/i), "10000");
  await userEvent.click(screen.getByRole("button", { name: /next/i })); // stages
  await userEvent.click(screen.getByRole("button", { name: /next/i })); // extras
  await userEvent.click(screen.getByRole("button", { name: /add running cost/i }));
  await userEvent.type(screen.getByLabelText(/service for running cost 1/i), "Appwrite Pro");
  await userEvent.type(screen.getByLabelText(/estimated cost 1/i), "USD 25 / month");
  await userEvent.type(screen.getByLabelText(/not included/i), "Logo design");
  await userEvent.type(screen.getByLabelText(/optional section title/i), "Phase 2");
  await userEvent.click(screen.getByRole("button", { name: /add optional item/i }));
  await userEvent.type(screen.getByLabelText(/description for optional item 1/i), "SMS updates");
  await userEvent.clear(screen.getByLabelText(/price for optional item 1/i));
  await userEvent.type(screen.getByLabelText(/price for optional item 1/i), "2500");
  expect(screen.getByText(/Total GHS 10,000.00/)).toBeInTheDocument();
  expect(screen.getByText(/optional extras \(not in total\)/i)).toHaveTextContent("GHS 2,500.00");
  await userEvent.click(screen.getByRole("button", { name: /save draft/i }));
  const draft = quoteAdmin.mock.calls.at(-1)![1].draft;
  expect(draft.runningCosts[0]).toMatchObject({ service: "Appwrite Pro", cost: "USD 25 / month" });
  expect(draft.exclusions).toBe("Logo design");
  expect(draft.optionalItems[0]).toMatchObject({ description: "SMS updates", unitMinor: 250000 });
});
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement** `ExtrasStep` with four groups, in order, each in a bordered sub-card, with an intro line "Nothing here changes the price or the payments.":
  1. Running costs: rows of 3 inputs plus a remove button; "Add running cost" (max 12).
  2. Not included / What I need from you: two textareas, one item per line (hint text says so); maxLength 3000.
  3. Next steps: textarea, one step per line; maxLength 1500.
  4. Optional extras: title input (placeholder "Optional extras for later"), then item rows reusing the line-item row markup with price input in major units converted with the same helper `ItemsStep` uses (`toMinor`), plus the detail toggle; "Add optional item" (max 30).
     New ids via `newId("opt")` / `newId("rc")` from `quoteMath`.
     In `QuoteEditor.tsx` summary panel, when `optionalTotals > 0`, add a row: `Optional extras (not in total)` · `money(total)` (compute with the same line math as items).

- [ ] **Step 4: Run** editor tests + `npm run type-check` → pass.

- [ ] **Step 5: Commit** `feat(OC-0): Extras step for running costs, scope notes, next steps and optional extras`

### Task 6: PR 1

- [ ] Run all gates (Global Constraints). Push `feat/OC-0-quote-full-proposal` and open PR `feat(OC-0): full-proposal quote fields in the server and editor` with the template filled. Note in "How to Test" that the client page is PR 2 and nothing changes for clients yet.

---

## PR 2: client page

### Task 7: Client sections

**Files:**

- Create: `src/components/Quote/ProposalSections.tsx`
- Modify: `src/components/Quote/QuoteDocument.tsx`, `src/components/Quote/StagePlan.tsx`, `src/components/Quote/QuotePage.tsx` (render `OptionalExtras` after the decision card)
- Test: `src/components/Quote/QuotePage.test.tsx`

**Interfaces:**

- Consumes: Task 3 `ClientQuote`.
- Produces components: `AtAGlance({ quote })`, `RunningCosts({ quote })`, `ScopeNotes({ quote })`, `NextSteps({ quote })`, `OptionalExtras({ quote, money })`. Each returns `null` when its data is empty.

- [ ] **Step 1: Failing tests**

```tsx
it("renders proposal sections only when filled", async () => {
  fetchClientQuote.mockResolvedValue({ quote: baseQuote });
  renderAt();
  await screen.findByText("Online store");
  for (const t of [
    /at a glance/i,
    /running costs/i,
    /scope notes/i,
    /next steps/i,
    /optional extras/i,
  ])
    expect(screen.queryByText(t)).toBeNull();
});

it("shows the full proposal with optional extras kept out of the price", async () => {
  fetchClientQuote.mockResolvedValue({
    quote: {
      ...baseQuote,
      highlights: ["Live in about 14 weeks"],
      discountLabel: "First-client discount",
      discountMinor: 100000,
      subtotalMinor: 1100000,
      totalMinor: 1000000,
      items: [{ ...baseQuote.items[0], detail: "Pages, cart and checkout" }],
      runningCosts: [{ service: "Appwrite Pro", purpose: "Hosting", cost: "USD 25 / month" }],
      exclusions: "Logo design",
      assumptions: "Content on time",
      nextSteps: "Review\nAccept",
      optionalTitle: "Phase 2",
      optionalItems: [
        { id: "o1", description: "SMS", qty: 1, unitMinor: 250000, lineMinor: 250000, detail: "" },
      ],
      optionalTotalMinor: 250000,
      stages: baseQuote.stages.map((s, i) => ({
        ...s,
        note: i === 0 ? "To start the project" : "",
      })),
    },
  });
  renderAt();
  expect(await screen.findByText("Live in about 14 weeks")).toBeInTheDocument();
  expect(screen.getByText("Standard value")).toBeInTheDocument();
  expect(screen.getByText("First-client discount")).toBeInTheDocument();
  expect(screen.getByText("Pages, cart and checkout")).toBeInTheDocument();
  expect(screen.getByText("To start the project")).toBeInTheDocument();
  expect(screen.getByText("Appwrite Pro")).toBeInTheDocument();
  expect(screen.getByText(/not part of the price above/i)).toBeInTheDocument();
  expect(
    screen.getByText(/not included in the GHS 10,000.00 above, and not part of these payments/i),
  ).toBeInTheDocument();
});
```

- [ ] **Step 2: Run** `npx vitest run src/components/Quote/QuotePage.test.tsx` → FAIL.

- [ ] **Step 3: Implement**
  - Use `QuoteCard` + `SectionLabel` from `QuoteShell` and `TextBlock` for line-per-item text, matching `QuoteDocument` styles (Ysabeau, tabular-nums, slate borders, `var(--text-*)`).
  - `QuoteDocument` items table: under the description, when `detail`, a `<details>` with summary "What it includes" and the text (`break-words`). Totals: label the subtotal row "Standard value" when `discountMinor > 0`; the discount row reads `discountLabel || "Discount"` with a minus amount.
  - Order inside `QuoteDocument`: banner → `AtAGlance` → existing text sections → items → (StagePlan stays where `QuotePage` puts it) → `RunningCosts` → `ScopeNotes` (one `<details>` titled "Scope notes" holding "Not included" and "What I need from you" lists) → `NextSteps` (numbered list from lines) → notes/terms as today.
  - `StagePlan`: under the label line, render `stage.note` in `text-sm` secondary when non-empty.
  - `OptionalExtras`: rendered by `QuotePage` after the decision card. A `<details>` with dashed border (`borderStyle: "dashed"`), summary `{optionalTitle || "Optional extras for later"} · Not in this quote`, the fixed sentence with `money(quote.totalMinor)`, item rows with detail disclosures, and "Indicative total {money(optionalTotalMinor)}".
  - Every text container gets `min-w-0 break-words`.

- [ ] **Step 4: Run** Quote tests + `npm run type-check` + `npm run check:colors` → pass.

- [ ] **Step 5: Commit** `feat(OC-0): show full-proposal sections on the client quote page`

### Task 8: Browser check and PR 2

- [ ] Create a draft quote in a local mock (or extend the scratchpad mock API) with the West Africa Wander content and check `/q/<token>` at 375px and 1280px, light and dark: sections collapsed by default, `document.documentElement.scrollWidth === clientWidth`, no empty headings on a plain quote.
- [ ] Run all gates. Push and open PR `feat(OC-0): full-proposal sections on the client quote page` with the template filled.

---

## PR 3: one page per quote (owner request, 2026-10-11)

Owner approved: like Craigtec, opening a quote goes to one page for that quote. Drafts show the editable stepper; every other status shows the same sections read-only, with a sidebar for status, link, payments and actions. Saving keeps you on the page.

### Task 9: Quote page (admin)

**Files:**

- Create: `src/components/AdminDashboard/tabs/Quotes/QuoteWorkspace.tsx` (loads one quote, picks editable or read-only, lays out main + sidebar)
- Create: `src/components/AdminDashboard/tabs/Quotes/QuoteSidebar.tsx` (status, viewed/accepted/declined info, client link with Copy / Send on WhatsApp / Preview, payment stages with Request stage / reminder / Record payment, actions Send / Revise / Cancel). Move this markup and its `run()` logic out of `QuoteDetail.tsx`; do not rewrite it.
- Modify: `QuoteEditor.tsx` (prop `embedded?: boolean`: no full-page title/close, "Save draft" stays on the page and calls `onSaved(id)`; a `readOnly?: boolean` mode renders every step stacked inside `<fieldset disabled>` with each step's heading, no step rail, no action bar)
- Modify: `QuotesTab.tsx` (state: list | `{ open: id }` | `{ creating: draft? }`; list row click opens the page; "New quote" and the Client Work handoff open the editor; after the first save switch to `{ open: id }`; Invoices tab handoff `peekPendingQuoteOpen` opens the page)
- Delete or reduce: `QuoteDetail.tsx` (nothing left that the sidebar doesn't cover)
- Test: `QuotesTab.test.tsx`, `QuoteEditor.test.tsx`

**Interfaces:**

- `QuoteWorkspace({ id, theme, onBack })` — fetches `quoteAdmin("get", { id })` → `QuoteDetailResponse`; reloads after any sidebar action.
- `QuoteSidebar({ data, theme, onChanged })` — `onChanged(next: QuoteDetailResponse)`.
- Page header: "← All quotes" (button, calls `onBack`), quote number, title, status pill.

- [ ] **Step 1: Failing tests** (`QuotesTab.test.tsx`)

```tsx
it("opens a sent quote as a read-only page with its actions", async () => {
  // list returns one sent quote q1; get returns its detail
  render(<QuotesTab theme="dark" />);
  await userEvent.click(await screen.findByText("Q-2026-0001"));
  expect(await screen.findByRole("button", { name: /all quotes/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/client name/i)).toBeDisabled();
  expect(screen.getByLabelText(/description for item 1/i)).toBeDisabled();
  expect(screen.getByRole("button", { name: /revise/i })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^next/i })).toBeNull();
});

it("opens a draft as the editable stepper and stays there after saving", async () => {
  render(<QuotesTab theme="dark" />);
  await userEvent.click(await screen.findByText("Q-2026-0002"));
  const name = await screen.findByLabelText(/client name/i);
  expect(name).not.toBeDisabled();
  await userEvent.click(screen.getByRole("button", { name: /save draft/i }));
  expect(await screen.findByRole("button", { name: /all quotes/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/client name/i)).toBeInTheDocument();
});

it("goes back to the list", async () => {
  render(<QuotesTab theme="dark" />);
  await userEvent.click(await screen.findByText("Q-2026-0001"));
  await userEvent.click(await screen.findByRole("button", { name: /all quotes/i }));
  expect(await screen.findByRole("button", { name: /new quote/i })).toBeInTheDocument();
});
```

Adapt mock data to the existing `QuotesTab.test.tsx` setup (`quoteAdmin` mock by action).

- [ ] **Step 2: Run, expect failures.**
- [ ] **Step 3: Implement** as in Files. Layout: two columns on `xl` (main `minmax(0,1fr)`, sidebar `22rem`, sticky), one column below. Read-only view uses the same step components so new fields appear automatically. After Revise the page re-renders as the editable stepper.
- [ ] **Step 4: Run** Quotes tests, `npm run type-check`, `npm run check:colors`.
- [ ] **Step 5: Commit** `feat(OC-0): one page per quote with a read-only view and sidebar`.

### Task 10: PR 3

- [ ] Gates, browser check of a draft and a sent quote at 1280px and 375px, push branch `feat/OC-0-quote-page`, open PR `feat(OC-0): one page per quote, like Craigtec`. Do not merge.
