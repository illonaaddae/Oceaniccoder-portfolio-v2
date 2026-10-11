# Client Quotes and Staged Payments (PR 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the admin build a quote, send the client a private link, have the client accept it by typed name, and collect each payment stage (default 60% deposit / 40% balance) through server-priced Paystack payments that settle exactly once, with branded emails at every step.

**Architecture:** Three new Appwrite collections (`quotes`, `locks`, plus new attributes on `payments`) that only Azure Functions touch, using `APPWRITE_API_KEY`. Pure rule modules (`api/shared/quotes/model.js`, `settlement.js`, `api/shared/tokens.js`) hold all money and state logic. One repo module per entity is the only code that talks to Appwrite, so the Cosmos cutover swaps those modules alone. Each function exports `createHandler(deps)` so tests inject fakes instead of mocking `require`. The React client pages live under `/q/:token` and `/receipt/:reference`; the admin gets a Quotes tab with a wizard editor and an Emails preview tab.

**Tech Stack:** Azure Functions (Node 20, CommonJS), node-appwrite 21, Paystack REST + Inline JS v2, Resend REST, React 19 + TypeScript + Vite + Tailwind, react-router-dom, react-helmet-async, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-10-client-quotes-design.md` (sections 1–13; requirements requests are PR 2, email migration of old flows is PR 3).

## Global Constraints

- Backend for this PR is **Appwrite**. No Cosmos code paths.
- Currencies on quotes: `GHS` and `USD` only.
- Money is always an **integer in minor units** (pesewas/cents) in quote logic; the existing `payments.amount` (major units, float) is still written for the Payments tab, alongside new `amountMinor`.
- Payment stages: 1–8 stages, integer percents 1–100 summing to exactly 100; default `[{id:"deposit",label:"Deposit",percent:60},{id:"balance",label:"Balance",percent:40}]`. The last stage absorbs the rounding remainder.
- Quote statuses: `draft`, `sent`, `accepted`, `declined`, `expired`, `cancelled`, with the move table in spec §4.1.
- Tokens: `crypto.randomBytes(32).toString("base64url")`; store only SHA-256 hex; accept only `^[A-Za-z0-9_-]{40,60}$`.
- Quote numbers `Q-YYYY-NNNN`; stage invoice numbers `Q-YYYY-NNNN-INV-<n>`; payment references `Q-YYYY-NNNN-<n>-<8 chars>`.
- The browser never sends an amount. Paystack is initialised server-side with `PAYSTACK_SECRET_KEY`.
- Settlement requires exact amount and currency match; Paystack `abandoned` counts as pending; `failed`/`reversed` are failures.
- Emails: one sender (`api/shared/email/send.js`), every interpolated value through `esc()`, every URL through `safeUrl()`, every template returns `{subject, html, text}`.
- Commits: `<type>(OC-0): <description>`, **no** `Co-Authored-By` trailer and no "Generated with Claude Code" footer (CLAUDE.md).
- Quality gates before every commit that touches `src/`: `npm run type-check`, `npm run lint`, `npm run format:check`; before the PR also `npm run build`.
- Never use `any` without a comment saying why. API calls go through `src/utils/apiUrl.ts`.
- Function tests start with `// @vitest-environment node` and import the module with `await import("./file.js")` (pattern from `api/shared/turnstile.test.js`).

## Review Focus

1. **A revised or cancelled quote's old link** must show "This link is no longer active", never the stale quote. Pinned in Task 9 (`quote-view` test "old token after revise").
2. **Two Pay clicks or two tabs** must not charge twice: the second initialise within 15 minutes reuses the pending reference, and a second successful charge for a paid stage becomes `duplicate` with an admin alert. Pinned in Task 7 (settle "duplicate") and Task 10 (quote-pay "reuses pending").
3. **Mobile Money approval taking minutes** (`abandoned`) must keep showing "Confirming", never "Failed". Pinned in Task 7 (settle "abandoned stays pending") and Task 15 (PaidPage "pending keeps polling").
4. **Totals that don't split evenly** (e.g. GHS 100.01 at 60/40) must give stages that sum exactly to the total, and the exact stage amount is what Paystack is asked for and checked against. Pinned in Task 1 (stageAmounts remainder) and Task 7 (settle exact check).
5. **Accept submitted twice or after a refresh** must return the accepted quote without sending the emails again; accepting after `validUntil` must say the quote expired. Pinned in Task 9 (`quote-respond` tests "idempotent accept" and "expired").

---

## File Structure

**Server, shared (no `function.json`, never exposed):**

| File                              | Responsibility                                                                                     |
| --------------------------------- | -------------------------------------------------------------------------------------------------- |
| `api/shared/quotes/model.js`      | Pure quote rules: totals, stages, validation, status moves, numbering, payment row shape           |
| `api/shared/quotes/settlement.js` | Pure payment rules: Paystack status mapping, exact settlement check, method from channel, key mode |
| `api/shared/tokens.js`            | Link tokens, hashing, receipt signatures, IP hashing                                               |
| `api/shared/http.js`              | JSON responses, body size limit, `HttpError`                                                       |
| `api/shared/appwrite.js`          | Server Appwrite client from env                                                                    |
| `api/shared/quotes/repo.js`       | All Appwrite reads/writes for quotes, quote payments, inquiry status                               |
| `api/shared/locks.js`             | Atomic lock documents                                                                              |
| `api/shared/quotes/fakes.js`      | In-memory repo + locks for tests (imported only by tests)                                          |
| `api/shared/paystack.js`          | Paystack initialise and verify                                                                     |
| `api/shared/email/ui.js`          | Email kit (layout and blocks)                                                                      |
| `api/shared/email/send.js`        | Resend sender                                                                                      |
| `api/shared/email/quoteEmails.js` | The six quote and payment templates                                                                |
| `api/shared/email/samples.js`     | Sample data for previews and tests                                                                 |
| `api/shared/quotes/views.js`      | Formatting and whitelisted view models (client, admin, email, receipt)                             |
| `api/shared/quotes/notify.js`     | Builds and sends each email                                                                        |
| `api/shared/quotes/settle.js`     | Settles one payment reference (locks, checks, emails)                                              |
| `api/shared/quotes/service.js`    | Wires real dependencies; `handleQuoteCharge` for the webhook                                       |

**Server, functions:** `api/quote-admin/` (`index.js`, `actions.js`, `function.json`), `api/quote-view/`, `api/quote-respond/`, `api/quote-pay/`, `api/quote-receipt/`, `api/email-preview/`; modify `api/paystack-webhook/index.js`.

**Scripts:** `scripts/create-quote-collections.mjs`.

**Client:**

| File                                                                                                                | Responsibility                                                          |
| ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `src/types/quote.ts`                                                                                                | Shared quote types                                                      |
| `src/utils/quoteMath.ts`                                                                                            | Editor-side totals/stages/formatting (parity-tested against `model.js`) |
| `src/utils/paystackV2.ts`                                                                                           | Inline v2 loader (moved out of `ApplePayPayment.tsx`)                   |
| `src/services/api/quotes.ts`                                                                                        | Client and admin calls to the quote functions                           |
| `src/components/Quote/QuoteShell.tsx`                                                                               | Client page frame, noindex, print styles                                |
| `src/components/Quote/TextBlock.tsx`                                                                                | Safe text rendering with bullets and links                              |
| `src/components/Quote/journey.ts`                                                                                   | Journey step computation                                                |
| `src/components/Quote/JourneyBar.tsx`, `QuoteDocument.tsx`, `StagePlan.tsx`, `QuoteActions.tsx`, `InactiveLink.tsx` | Quote page parts                                                        |
| `src/components/Quote/QuotePage.tsx`                                                                                | `/q/:token`                                                             |
| `src/components/Quote/CheckoutPage.tsx`                                                                             | `/q/:token/pay/:stageId`                                                |
| `src/components/Quote/PaidPage.tsx`                                                                                 | `/q/:token/paid`                                                        |
| `src/components/Quote/StageInvoicePage.tsx`                                                                         | `/q/:token/invoice/:stageId`                                            |
| `src/components/Quote/ReceiptPage.tsx`                                                                              | `/receipt/:reference`                                                   |
| `src/components/Quote/useClientQuote.ts`                                                                            | Load-quote hook shared by the client pages                              |
| `src/components/AdminDashboard/tabs/Quotes/QuotesTab.tsx`                                                           | List, filters, open detail/editor                                       |
| `src/components/AdminDashboard/tabs/Quotes/QuoteDetail.tsx`                                                         | Status, stages, actions                                                 |
| `src/components/AdminDashboard/tabs/Quotes/QuoteEditor.tsx`                                                         | Wizard shell and state                                                  |
| `src/components/AdminDashboard/tabs/Quotes/editorSteps.tsx`                                                         | The five wizard steps                                                   |
| `src/components/AdminDashboard/tabs/Quotes/draftFromInquiry.ts`                                                     | Seed a draft from an inquiry                                            |
| `src/components/AdminDashboard/tabs/EmailsTab.tsx`                                                                  | Email previews and test send                                            |

Modified: `src/routes/publicRoutes.tsx`, `src/routes/lazyComponents.ts`, `src/components/MainLayout.tsx`, `src/components/TerminalLoader/useTerminalAnimation.ts`, `src/components/Payment/ApplePayPayment.tsx`, `src/components/AdminDashboard/SidebarParts/types.ts`, `.../SidebarParts/tabs.ts`, `.../Sidebar.tsx`, `.../TabContentExtra.tsx`, `.../tabs/ClientWorkTab.tsx`, `.../tabs/AnalyticsTab.tsx`, `src/types/index.ts`, `src/services/api/payments.ts`, `CLAUDE.md`, `docs/plans/2026-10-01-appwrite-to-azure-migration.md`.

---

### Task 1: Quote rules (`model.js`)

**Files:**

- Create: `api/shared/quotes/model.js`
- Test: `api/shared/quotes/model.test.js`

**Interfaces:**

- Produces: `CURRENCIES`, `STATUSES`, `DEFAULT_SCHEDULE`, `DEFAULT_TERMS`, `INVOICE_DUE_DAYS`, `DAY_MS`, `canMove(from,to)`, `lineMinor(item)`, `computeTotals(items, discountMinor)` → `{subtotalMinor, discountMinor, totalMinor}`, `stageAmounts(totalMinor, schedule)` → `[{id,label,percent,amountMinor}]`, `scheduleError(schedule)` → `string|null`, `validateDraft(input)` → `{ok, errors, value}`, `sendError(quote)` → `string|null`, `stageStates(quote, payments, nowMs)` → `Stage[]`, `paymentSummary(stages)` → `{paidMinor, balanceMinor, complete, nextDue}`, `isExpired(quote, nowMs)`, `quoteNumber(year, seq)`, `invoiceNumber(qn, index)`, `paymentReference(qn, index)`, `paymentRow(quote, stage, fields)`.
- `Stage` = `{id, label, percent, amountMinor, index, state: "paid"|"due"|"later", dueAt, overdue, invoiceNumber, paidAt, reference}`.

- [ ] **Step 1: Write the failing tests**

```js
// @vitest-environment node
import { describe, it, expect } from "vitest";

const M = await import("./model.js");

const item = (over = {}) => ({
  id: "item-1",
  description: "Website",
  qty: 1,
  unitMinor: 10000,
  ...over,
});
const draft = (over = {}) => ({
  clientName: "Kofi Mensah",
  clientEmail: "kofi@example.com",
  currency: "GHS",
  title: "Online store",
  items: [item()],
  discountMinor: 0,
  schedule: M.DEFAULT_SCHEDULE,
  validDays: 14,
  ...over,
});

describe("totals", () => {
  it("rounds each line and clamps the discount to the subtotal", () => {
    expect(M.computeTotals([item({ qty: 1.5, unitMinor: 333 })], 0)).toEqual({
      subtotalMinor: 500,
      discountMinor: 0,
      totalMinor: 500,
    });
    expect(M.computeTotals([item()], 99999).totalMinor).toBe(0);
  });
});

describe("stageAmounts", () => {
  it("puts the rounding remainder on the last stage so parts sum to the total", () => {
    const stages = M.stageAmounts(10001, M.DEFAULT_SCHEDULE);
    expect(stages.map((s) => s.amountMinor)).toEqual([6000, 4001]);
    const three = M.stageAmounts(100, [
      { id: "a", label: "A", percent: 33 },
      { id: "b", label: "B", percent: 33 },
      { id: "c", label: "C", percent: 34 },
    ]);
    expect(three.reduce((t, s) => t + s.amountMinor, 0)).toBe(100);
  });
});

describe("scheduleError", () => {
  it.each([
    [[], /between 1 and 8/],
    [[{ id: "a", label: "A", percent: 50 }], /add up to 50%/],
    [
      [
        { id: "a", label: "A", percent: 60 },
        { id: "a", label: "B", percent: 40 },
      ],
      /unique id/,
    ],
    [[{ id: "a", label: "", percent: 100 }], /name/],
    [
      [
        { id: "a", label: "A", percent: 99.5 },
        { id: "b", label: "B", percent: 0.5 },
      ],
      /whole percentage/,
    ],
  ])("rejects %j", (schedule, msg) => {
    expect(M.scheduleError(schedule)).toMatch(msg);
  });
  it("accepts the default", () => expect(M.scheduleError(M.DEFAULT_SCHEDULE)).toBeNull());
});

describe("validateDraft", () => {
  it("accepts a good draft and trims strings", () => {
    const r = M.validateDraft(draft({ clientName: "  Kofi  " }));
    expect(r.ok).toBe(true);
    expect(r.value.clientName).toBe("Kofi");
  });
  it("reports field errors", () => {
    const r = M.validateDraft(draft({ currency: "EUR", items: [], title: "" }));
    expect(r.ok).toBe(false);
    expect(Object.keys(r.errors)).toEqual(expect.arrayContaining(["currency", "items", "title"]));
  });
  it("rejects a discount above the subtotal", () => {
    expect(M.validateDraft(draft({ discountMinor: 20000 })).errors.discountMinor).toBeTruthy();
  });
  it("rejects a non-integer price", () => {
    expect(
      M.validateDraft(draft({ items: [item({ unitMinor: 10.5 })] })).errors["items.0.unitMinor"],
    ).toBeTruthy();
  });
});

describe("sendError", () => {
  it("needs a client email and a total above zero", () => {
    expect(M.sendError({ clientEmail: "", totalMinor: 100 })).toMatch(/email/);
    expect(M.sendError({ clientEmail: "a@b.co", totalMinor: 0 })).toMatch(/total/);
    expect(M.sendError({ clientEmail: "a@b.co", totalMinor: 100 })).toBeNull();
  });
});

describe("canMove", () => {
  it("follows the move table", () => {
    expect(M.canMove("draft", "sent")).toBe(true);
    expect(M.canMove("accepted", "draft")).toBe(false);
    expect(M.canMove("cancelled", "draft")).toBe(false);
  });
});

describe("stageStates", () => {
  const base = {
    quoteNumber: "Q-2026-0001",
    status: "accepted",
    totalMinor: 10000,
    schedule: M.DEFAULT_SCHEDULE,
    respondedAt: "2026-10-01T10:00:00.000Z",
    payState: { due: {} },
  };
  const now = Date.parse("2026-10-03T10:00:00.000Z");

  it("makes the first stage due on acceptance and the rest later", () => {
    const [deposit, balance] = M.stageStates(base, [], now);
    expect(deposit).toMatchObject({
      state: "due",
      amountMinor: 6000,
      invoiceNumber: "Q-2026-0001-INV-1",
      overdue: false,
    });
    expect(balance).toMatchObject({ state: "later", dueAt: null });
  });
  it("marks paid stages and requested stages", () => {
    const quote = { ...base, payState: { due: { balance: "2026-10-02T00:00:00.000Z" } } };
    const payments = [
      {
        stageId: "deposit",
        status: "success",
        paidAt: "2026-10-01T11:00:00.000Z",
        paystackReference: "R1",
      },
    ];
    const [deposit, balance] = M.stageStates(quote, payments, now);
    expect(deposit).toMatchObject({ state: "paid", reference: "R1" });
    expect(balance.state).toBe("due");
  });
  it("flags a due stage as overdue after 7 days", () => {
    const later = Date.parse("2026-10-09T10:00:01.000Z");
    expect(M.stageStates(base, [], later)[0].overdue).toBe(true);
  });
  it("ignores failed and pending payments", () => {
    const payments = [
      { stageId: "deposit", status: "pending" },
      { stageId: "deposit", status: "failed" },
    ];
    expect(M.stageStates(base, payments, now)[0].state).toBe("due");
  });
  it("shows everything as later before acceptance", () => {
    expect(
      M.stageStates({ ...base, status: "sent" }, [], now).every((s) => s.state === "later"),
    ).toBe(true);
  });
});

describe("paymentSummary", () => {
  it("adds paid stages and finds the next due one", () => {
    const stages = [
      { id: "deposit", amountMinor: 6000, state: "paid" },
      { id: "balance", amountMinor: 4000, state: "due" },
    ];
    expect(M.paymentSummary(stages)).toMatchObject({
      paidMinor: 6000,
      balanceMinor: 4000,
      complete: false,
      nextDue: stages[1],
    });
  });
});

describe("numbers", () => {
  it("formats quote, invoice and reference numbers", () => {
    expect(M.quoteNumber(2026, 7)).toBe("Q-2026-0007");
    expect(M.invoiceNumber("Q-2026-0007", 1)).toBe("Q-2026-0007-INV-2");
    expect(M.paymentReference("Q-2026-0007", 0)).toMatch(/^Q-2026-0007-1-[A-Z2-9]{8}$/);
  });
});

describe("isExpired", () => {
  it("only expires sent quotes past validUntil", () => {
    const now = Date.parse("2026-10-10T00:00:00Z");
    expect(M.isExpired({ status: "sent", validUntil: "2026-10-09T00:00:00Z" }, now)).toBe(true);
    expect(M.isExpired({ status: "accepted", validUntil: "2026-10-09T00:00:00Z" }, now)).toBe(
      false,
    );
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run api/shared/quotes/model.test.js`
Expected: FAIL, cannot find module `./model.js`.

- [ ] **Step 3: Implement `model.js`**

```js
// Pure quote rules: money, payment stages, status moves and numbering.
//
// No I/O, so the functions, the tests and the dashboard editor (through the
// parity test in src/utils/quoteMath.test.ts) all agree on the same numbers.
// Money is always an integer in minor units (pesewas or cents).

const crypto = require("crypto");

const CURRENCIES = ["GHS", "USD"];
const STATUSES = ["draft", "sent", "accepted", "declined", "expired", "cancelled"];

// Which status a quote may move to from each status. "sent → draft" is revise.
const TRANSITIONS = {
  draft: ["sent", "cancelled"],
  sent: ["accepted", "declined", "expired", "cancelled", "draft"],
  accepted: ["cancelled"],
  declined: ["draft"],
  expired: ["draft"],
  cancelled: [],
};

const INVOICE_DUE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_SCHEDULE = [
  { id: "deposit", label: "Deposit", percent: 60 },
  { id: "balance", label: "Balance", percent: 40 },
];

const DEFAULT_TERMS = [
  "- Work starts once the deposit is received.",
  "- The balance is due on delivery, before final files, source code and credentials are handed over.",
  "- This quote covers the scope above. New features or changes are quoted separately.",
  "- Third-party costs (domains, hosting, app store fees, paid APIs) are paid by the client unless listed above.",
  "- Each payment stage is invoiced separately and is due within 7 days of its invoice.",
].join("\n");

const ID_RE = /^[a-z0-9-]{1,24}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TEXT_MAX = 5000;
const TERMS_MAX = 8000;
const REF_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function str(v) {
  return typeof v === "string" ? v.trim() : "";
}

function canMove(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}

function lineMinor(item) {
  return Math.round(Number(item.qty) * Number(item.unitMinor));
}

function computeTotals(items, discountMinor = 0) {
  const subtotalMinor = items.reduce((sum, i) => sum + lineMinor(i), 0);
  const discount = Math.min(Math.max(0, Math.round(Number(discountMinor) || 0)), subtotalMinor);
  return { subtotalMinor, discountMinor: discount, totalMinor: subtotalMinor - discount };
}

function stageAmounts(totalMinor, schedule) {
  let allocated = 0;
  return schedule.map((stage, i) => {
    const last = i === schedule.length - 1;
    const amountMinor = last
      ? totalMinor - allocated
      : Math.floor((totalMinor * stage.percent) / 100);
    allocated += amountMinor;
    return { ...stage, amountMinor };
  });
}

function scheduleError(schedule) {
  if (!Array.isArray(schedule) || schedule.length < 1 || schedule.length > 8) {
    return "Use between 1 and 8 payment stages.";
  }
  const ids = new Set();
  for (const s of schedule) {
    if (!s || !ID_RE.test(s.id) || ids.has(s.id)) return "Each stage needs a unique id.";
    ids.add(s.id);
    if (!s.label || s.label.length > 40) return "Give every stage a name (up to 40 characters).";
    if (!Number.isInteger(s.percent) || s.percent < 1 || s.percent > 100) {
      return "Each stage must be a whole percentage from 1 to 100.";
    }
  }
  const sum = schedule.reduce((t, s) => t + s.percent, 0);
  if (sum !== 100) return `Stages add up to ${sum}%. They must add up to 100%.`;
  return null;
}

function validateDraft(input) {
  const d = input || {};
  const errors = {};
  const value = {
    clientName: str(d.clientName),
    clientEmail: str(d.clientEmail).toLowerCase(),
    clientPhone: str(d.clientPhone),
    clientCompany: str(d.clientCompany),
    currency: d.currency,
    title: str(d.title),
    overview: str(d.overview),
    scope: str(d.scope),
    timeline: str(d.timeline),
    notes: str(d.notes),
    terms: str(d.terms),
    items: Array.isArray(d.items)
      ? d.items.map((i) => ({
          id: str(i && i.id),
          description: str(i && i.description),
          qty: Number(i && i.qty),
          unitMinor: Number(i && i.unitMinor),
        }))
      : [],
    discountMinor: Number(d.discountMinor || 0),
    schedule: Array.isArray(d.schedule)
      ? d.schedule.map((s) => ({
          id: str(s && s.id),
          label: str(s && s.label),
          percent: Number(s && s.percent),
        }))
      : [],
    validDays: Number(d.validDays || 14),
    inquiryId: str(d.inquiryId) || null,
  };

  if (!value.clientName || value.clientName.length > 120) {
    errors.clientName = "Enter the client's name (up to 120 characters).";
  }
  if (value.clientEmail && !EMAIL_RE.test(value.clientEmail))
    errors.clientEmail = "Enter a valid email address.";
  if (value.clientPhone.length > 40)
    errors.clientPhone = "Keep the phone number under 40 characters.";
  if (value.clientCompany.length > 120)
    errors.clientCompany = "Keep the company name under 120 characters.";
  if (!CURRENCIES.includes(value.currency)) errors.currency = "Currency must be GHS or USD.";
  if (!value.title || value.title.length > 160)
    errors.title = "Give the project a title (up to 160 characters).";
  for (const field of ["overview", "scope", "timeline", "notes"]) {
    if (value[field].length > TEXT_MAX) errors[field] = `Keep this under ${TEXT_MAX} characters.`;
  }
  if (value.terms.length > TERMS_MAX)
    errors.terms = `Keep the terms under ${TERMS_MAX} characters.`;

  let itemsOk = true;
  if (value.items.length < 1 || value.items.length > 100) {
    errors.items = "Add between 1 and 100 line items.";
    itemsOk = false;
  } else {
    value.items.forEach((it, i) => {
      if (!ID_RE.test(it.id)) errors[`items.${i}.id`] = "Invalid item id.";
      if (!it.description || it.description.length > 300) {
        errors[`items.${i}.description`] = "Describe the item (up to 300 characters).";
      }
      if (!(it.qty > 0 && it.qty <= 10000))
        errors[`items.${i}.qty`] = "Quantity must be more than 0.";
      if (!Number.isInteger(it.unitMinor) || it.unitMinor < 0 || it.unitMinor > 1e11) {
        errors[`items.${i}.unitMinor`] = "Enter a valid price.";
      }
      if (Object.keys(errors).some((k) => k.startsWith(`items.${i}.`))) itemsOk = false;
    });
  }

  if (!Number.isInteger(value.discountMinor) || value.discountMinor < 0) {
    errors.discountMinor = "Enter a valid discount.";
  } else if (itemsOk && value.discountMinor > computeTotals(value.items).subtotalMinor) {
    errors.discountMinor = "The discount can't be more than the subtotal.";
  }

  const sched = scheduleError(value.schedule);
  if (sched) errors.schedule = sched;
  if (!Number.isInteger(value.validDays) || value.validDays < 1 || value.validDays > 90) {
    errors.validDays = "Validity must be 1 to 90 days.";
  }

  return { ok: Object.keys(errors).length === 0, errors, value };
}

function sendError(quote) {
  if (!quote.clientEmail || !EMAIL_RE.test(quote.clientEmail))
    return "Add the client's email address before sending.";
  if (!(quote.totalMinor > 0)) return "The quote total must be more than zero.";
  return null;
}

function quoteNumber(year, seq) {
  return `Q-${year}-${String(seq).padStart(4, "0")}`;
}

function invoiceNumber(qn, index) {
  return `${qn}-INV-${index + 1}`;
}

function paymentReference(qn, index) {
  let suffix = "";
  for (let i = 0; i < 8; i++) suffix += REF_ALPHABET[crypto.randomInt(REF_ALPHABET.length)];
  return `${qn}-${index + 1}-${suffix}`;
}

function stageStates(quote, payments, nowMs = Date.now()) {
  const paid = new Map();
  for (const p of payments || []) {
    if (p.status === "success" && p.stageId && !paid.has(p.stageId)) paid.set(p.stageId, p);
  }
  const due = (quote.payState && quote.payState.due) || {};
  const accepted = quote.status === "accepted";

  return stageAmounts(quote.totalMinor, quote.schedule).map((stage, index) => {
    const payment = paid.get(stage.id) || null;
    const isDue = accepted && (index === 0 || Boolean(due[stage.id]));
    const dueAt = isDue ? (index === 0 ? quote.respondedAt || null : due[stage.id]) : null;
    const state = payment ? "paid" : isDue ? "due" : "later";
    const overdue =
      state === "due" && Boolean(dueAt) && nowMs - Date.parse(dueAt) > INVOICE_DUE_DAYS * DAY_MS;
    return {
      ...stage,
      index,
      state,
      dueAt,
      overdue,
      invoiceNumber: invoiceNumber(quote.quoteNumber, index),
      paidAt: payment ? payment.paidAt || null : null,
      reference: payment ? payment.paystackReference || null : null,
    };
  });
}

function paymentSummary(stages) {
  const total = stages.reduce((t, s) => t + s.amountMinor, 0);
  const paidMinor = stages.filter((s) => s.state === "paid").reduce((t, s) => t + s.amountMinor, 0);
  return {
    paidMinor,
    balanceMinor: total - paidMinor,
    complete: stages.length > 0 && stages.every((s) => s.state === "paid"),
    nextDue: stages.find((s) => s.state === "due") || null,
  };
}

function isExpired(quote, nowMs = Date.now()) {
  return (
    quote.status === "sent" && Boolean(quote.validUntil) && Date.parse(quote.validUntil) < nowMs
  );
}

// The payments row for a quote stage. `amount` (major units) keeps the
// existing Payments tab working; `amountMinor` is what quote logic reads.
function paymentRow(quote, stage, fields) {
  return {
    kind: "quote",
    quoteId: quote.id,
    quoteNumber: quote.quoteNumber,
    stageId: stage.id,
    invoiceNumber: stage.invoiceNumber,
    clientName: quote.clientName,
    clientEmail: quote.clientEmail || "",
    amountMinor: stage.amountMinor,
    amount: stage.amountMinor / 100,
    currency: quote.currency,
    ...fields,
  };
}

module.exports = {
  CURRENCIES,
  STATUSES,
  DEFAULT_SCHEDULE,
  DEFAULT_TERMS,
  INVOICE_DUE_DAYS,
  DAY_MS,
  canMove,
  lineMinor,
  computeTotals,
  stageAmounts,
  scheduleError,
  validateDraft,
  sendError,
  quoteNumber,
  invoiceNumber,
  paymentReference,
  stageStates,
  paymentSummary,
  isExpired,
  paymentRow,
};
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx vitest run api/shared/quotes/model.test.js`
Expected: PASS, all tests green.

- [ ] **Step 5: Commit**

```bash
git add api/shared/quotes/model.js api/shared/quotes/model.test.js
git commit -m "feat(OC-0): add pure quote rules for totals, stages and status moves"
```

---

### Task 2: Tokens and settlement rules

**Files:**

- Create: `api/shared/tokens.js`, `api/shared/quotes/settlement.js`
- Test: `api/shared/tokens.test.js`, `api/shared/quotes/settlement.test.js`

**Interfaces:**

- Produces (tokens): `newToken()` → 43-char string, `hashToken(t)` → 64-char hex, `isTokenShape(t)` → bool, `hashIp(ip)` → hex or `""`, `signReceipt(reference, secret)` → 32 chars, `verifyReceipt(reference, sig, secret)` → bool, `lockId(key)` → `"s_" + 34 hex`.
- Produces (settlement): `mapPaystackStatus(status)` → `"success"|"failed"|"pending"`, `checkSettlement({expectedMinor, expectedCurrency, paidMinor, paidCurrency})` → `{ok:true}|{ok:false, reason}` with reason in `no-expected-amount|currency-mismatch|underpaid|overpaid`, `methodFromChannel(channel)` → `card|momo|bank|apple_pay`, `keyMode(secret)` → `live|test|unknown`.

- [ ] **Step 1: Write the failing tests**

`api/shared/tokens.test.js`:

```js
// @vitest-environment node
import { describe, it, expect } from "vitest";

const T = await import("./tokens.js");

describe("tokens", () => {
  it("creates url-safe 256-bit tokens that pass the shape check", () => {
    const t = T.newToken();
    expect(t).toHaveLength(43);
    expect(T.isTokenShape(t)).toBe(true);
    expect(T.newToken()).not.toBe(t);
  });
  it.each(["", "short", "has spaces in it but is long enough to pass length....", null, 42])(
    "rejects %j",
    (t) => expect(T.isTokenShape(t)).toBe(false),
  );
  it("hashes to stable hex", () => {
    expect(T.hashToken("abc")).toBe(T.hashToken("abc"));
    expect(T.hashToken("abc")).toMatch(/^[0-9a-f]{64}$/);
  });
  it("hashes IPs with a prefix and returns empty for none", () => {
    expect(T.hashIp("1.2.3.4")).toMatch(/^[0-9a-f]{64}$/);
    expect(T.hashIp("1.2.3.4")).not.toBe(T.hashToken("1.2.3.4"));
    expect(T.hashIp(undefined)).toBe("");
  });
});

describe("receipt signatures", () => {
  it("verifies its own signature and rejects others", () => {
    const sig = T.signReceipt("Q-2026-0001-1-ABCDEFGH", "secret");
    expect(sig).toHaveLength(32);
    expect(T.verifyReceipt("Q-2026-0001-1-ABCDEFGH", sig, "secret")).toBe(true);
    expect(T.verifyReceipt("Q-2026-0001-1-ABCDEFGX", sig, "secret")).toBe(false);
    expect(T.verifyReceipt("Q-2026-0001-1-ABCDEFGH", sig, "other")).toBe(false);
    expect(T.verifyReceipt("Q-2026-0001-1-ABCDEFGH", "short", "secret")).toBe(false);
    expect(T.verifyReceipt("Q-2026-0001-1-ABCDEFGH", sig, "")).toBe(false);
  });
});

describe("lockId", () => {
  it("fits Appwrite's 36-char id rules", () => {
    const id = T.lockId("stage:abc:deposit");
    expect(id).toMatch(/^s_[0-9a-f]{34}$/);
    expect(id).toHaveLength(36);
  });
});
```

`api/shared/quotes/settlement.test.js`:

```js
// @vitest-environment node
import { describe, it, expect } from "vitest";

const S = await import("./settlement.js");

describe("mapPaystackStatus", () => {
  it.each([
    ["success", "success"],
    ["failed", "failed"],
    ["reversed", "failed"],
    ["abandoned", "pending"],
    ["ongoing", "pending"],
    [undefined, "pending"],
  ])("%s → %s", (input, out) => expect(S.mapPaystackStatus(input)).toBe(out));
});

describe("checkSettlement", () => {
  const ok = { expectedMinor: 6000, expectedCurrency: "GHS", paidMinor: 6000, paidCurrency: "GHS" };
  it("settles only an exact match", () => expect(S.checkSettlement(ok)).toEqual({ ok: true }));
  it.each([
    [{ expectedMinor: 0 }, "no-expected-amount"],
    [{ paidCurrency: "USD" }, "currency-mismatch"],
    [{ paidMinor: 5999 }, "underpaid"],
    [{ paidMinor: 6001 }, "overpaid"],
  ])("%j → %s", (over, reason) =>
    expect(S.checkSettlement({ ...ok, ...over })).toEqual({ ok: false, reason }),
  );
});

describe("methodFromChannel", () => {
  it.each([
    ["card", "card"],
    ["mobile_money", "momo"],
    ["bank_transfer", "bank"],
    ["apple_pay", "apple_pay"],
    ["", "card"],
  ])("%s → %s", (channel, method) => expect(S.methodFromChannel(channel)).toBe(method));
});

describe("keyMode", () => {
  it("reads the key prefix", () => {
    expect(S.keyMode("sk_live_x")).toBe("live");
    expect(S.keyMode("sk_test_x")).toBe("test");
    expect(S.keyMode("")).toBe("unknown");
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run api/shared/tokens.test.js api/shared/quotes/settlement.test.js`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement both modules**

`api/shared/tokens.js`:

```js
// Link tokens and signatures for client-facing pages.
//
// A quote link carries a random 256-bit token; only its SHA-256 is stored, so
// a database leak does not hand out working links. Receipts use an HMAC
// instead, because they must keep working after the quote link rotates.

const crypto = require("crypto");

const TOKEN_RE = /^[A-Za-z0-9_-]{40,60}$/;

function newToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function isTokenShape(token) {
  return typeof token === "string" && TOKEN_RE.test(token);
}

function hashIp(ip) {
  return ip ? crypto.createHash("sha256").update(`ip:${ip}`).digest("hex") : "";
}

function signReceipt(reference, secret) {
  if (!secret) throw new Error("RECEIPT_SIGNING_SECRET is not configured");
  return crypto
    .createHmac("sha256", secret)
    .update(`receipt:${reference}`)
    .digest("base64url")
    .slice(0, 32);
}

function verifyReceipt(reference, sig, secret) {
  if (!secret || typeof sig !== "string" || sig.length !== 32) return false;
  const expected = Buffer.from(signReceipt(reference, secret));
  const given = Buffer.from(sig);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

// Appwrite document ids allow [a-zA-Z0-9._-] and at most 36 characters.
function lockId(key) {
  return `s_${crypto.createHash("sha256").update(key).digest("hex").slice(0, 34)}`;
}

module.exports = { newToken, hashToken, isTokenShape, hashIp, signReceipt, verifyReceipt, lockId };
```

`api/shared/quotes/settlement.js`:

```js
// Pure payment rules shared by the webhook, the return page and manual
// recording. Kept free of I/O so each decision is testable on its own.

// Paystack reports Mobile Money prompts that are still waiting as "abandoned",
// so only failed and reversed are final failures.
function mapPaystackStatus(status) {
  if (status === "success") return "success";
  if (status === "failed" || status === "reversed") return "failed";
  return "pending";
}

// A charge settles a stage only on an exact amount and currency match.
function checkSettlement({ expectedMinor, expectedCurrency, paidMinor, paidCurrency }) {
  if (!Number.isInteger(expectedMinor) || expectedMinor <= 0)
    return { ok: false, reason: "no-expected-amount" };
  if (String(paidCurrency || "").toUpperCase() !== String(expectedCurrency || "").toUpperCase()) {
    return { ok: false, reason: "currency-mismatch" };
  }
  if (paidMinor !== expectedMinor)
    return { ok: false, reason: paidMinor < expectedMinor ? "underpaid" : "overpaid" };
  return { ok: true };
}

// Apple Pay is checked first: it is a card wallet, so a card-like channel
// name containing "apple" should still be reported as Apple Pay.
function methodFromChannel(channel) {
  const c = String(channel || "").toLowerCase();
  if (c.includes("apple")) return "apple_pay";
  if (c.includes("mobile")) return "momo";
  if (c.includes("bank")) return "bank";
  return "card";
}

function keyMode(secret) {
  if (String(secret).startsWith("sk_live_")) return "live";
  if (String(secret).startsWith("sk_test_")) return "test";
  return "unknown";
}

module.exports = { mapPaystackStatus, checkSettlement, methodFromChannel, keyMode };
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx vitest run api/shared/tokens.test.js api/shared/quotes/settlement.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/shared/tokens.js api/shared/tokens.test.js api/shared/quotes/settlement.js api/shared/quotes/settlement.test.js
git commit -m "feat(OC-0): add link tokens, receipt signatures and settlement rules"
```

---

### Task 3: Appwrite collections script

**Files:**

- Create: `scripts/create-quote-collections.mjs`

**Interfaces:**

- Produces: collections `quotes` and `locks` (no browser permissions; only the server key can reach them), new optional attributes on `payments`, `"won"` added to `project_inquiries.status` if that attribute is an enum. Attribute names match `repo.js` (Task 4) exactly.

- [ ] **Step 1: Write the script**

```js
// Create the collections and attributes the quote flow needs. Idempotent: run
// it again after a partial failure and it only adds what is missing.
//
// Usage:
//   APPWRITE_API_KEY=... node scripts/create-quote-collections.mjs           # dry run
//   APPWRITE_API_KEY=... node scripts/create-quote-collections.mjs --apply
//
// The key needs collections.read, collections.write, attributes.read,
// attributes.write, indexes.read and indexes.write.
//
// `quotes` and `locks` get no permissions at all: only Azure Functions using
// the API key may read or write them. Clients see quotes through
// /api/quote-view, which returns a whitelisted view.

import { Client, Databases, IndexType } from "node-appwrite";

const endpoint = process.env.APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1";
const projectId = process.env.APPWRITE_PROJECT_ID || "6943431e00253c8f9883";
const databaseId = process.env.APPWRITE_DATABASE_ID || "6943493400018e7c314c";
const apiKey = process.env.APPWRITE_API_KEY;
const apply = process.argv.includes("--apply");

if (!apiKey) {
  console.error("APPWRITE_API_KEY is required");
  process.exit(1);
}

const databases = new Databases(
  new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey),
);

// [kind, key, ...options]. Required attributes cannot have defaults in Appwrite.
const QUOTES = [
  ["string", "quoteNumber", 20, true],
  ["int", "revision", true, 1, 1000],
  ["string", "inquiryId", 36, false],
  ["string", "clientName", 120, true],
  ["string", "clientEmail", 254, false],
  ["string", "clientPhone", 40, false],
  ["string", "clientCompany", 120, false],
  ["enum", "currency", ["GHS", "USD"], true],
  ["string", "title", 160, true],
  ["string", "overview", 5000, false],
  ["string", "scope", 5000, false],
  ["string", "timeline", 5000, false],
  ["string", "notes", 5000, false],
  ["string", "terms", 8000, false],
  ["string", "items", 60000, true],
  ["int", "discountMinor", false, 0, 100000000000],
  ["int", "subtotalMinor", false, 0, 100000000000000],
  ["int", "totalMinor", false, 0, 100000000000000],
  ["string", "schedule", 4000, true],
  ["int", "validDays", false, 1, 90],
  ["datetime", "validUntil", false],
  ["enum", "status", ["draft", "sent", "accepted", "declined", "expired", "cancelled"], true],
  ["string", "tokenHash", 64, false],
  ["datetime", "sentAt", false],
  ["datetime", "viewedAt", false],
  ["datetime", "respondedAt", false],
  ["string", "acceptedName", 120, false],
  ["string", "acceptedIpHash", 64, false],
  ["string", "acceptedUa", 300, false],
  ["string", "acceptedSnapshot", 100000, false],
  ["string", "declineReason", 500, false],
  ["string", "payState", 4000, false],
  ["string", "requirementsId", 36, false],
];
const QUOTE_INDEXES = [
  ["quoteNumber_unique", IndexType.Unique, ["quoteNumber"]],
  ["tokenHash_unique", IndexType.Unique, ["tokenHash"]],
  ["status_key", IndexType.Key, ["status"]],
];

const LOCKS = [["string", "key", 200, true]];

const PAYMENT_ADDITIONS = [
  ["string", "kind", 10, false],
  ["string", "quoteId", 36, false],
  ["string", "quoteNumber", 20, false],
  ["string", "stageId", 24, false],
  ["int", "amountMinor", false, 0, 100000000000000],
  ["string", "note", 300, false],
  ["string", "recordedBy", 254, false],
  ["string", "channel", 40, false],
  ["string", "paystackId", 40, false],
  ["string", "accessCode", 100, false],
];
const PAYMENT_INDEXES = [
  ["quoteNumber_key", IndexType.Key, ["quoteNumber"]],
  ["kind_key", IndexType.Key, ["kind"]],
  ["paystackReference_key", IndexType.Key, ["paystackReference"]],
];

const log = (msg) => console.log(`${apply ? "" : "[dry run] "}${msg}`);

async function ensureCollection(id, name) {
  const { collections } = await databases.listCollections(databaseId);
  if (collections.some((c) => c.$id === id)) return log(`collection ${id} exists`);
  log(`create collection ${id}`);
  if (apply) await databases.createCollection(databaseId, id, name, [], false, true);
}

async function ensureAttributes(collectionId, specs) {
  let existing = new Set();
  try {
    const { attributes } = await databases.listAttributes(databaseId, collectionId);
    existing = new Set(attributes.map((a) => a.key));
  } catch (err) {
    if (apply) throw err; // collection only missing in a dry run
  }
  for (const [kind, key, ...opts] of specs) {
    if (existing.has(key)) continue;
    log(`create ${kind} ${collectionId}.${key}`);
    if (!apply) continue;
    if (kind === "string")
      await databases.createStringAttribute(databaseId, collectionId, key, opts[0], opts[1]);
    if (kind === "int") {
      await databases.createIntegerAttribute(
        databaseId,
        collectionId,
        key,
        opts[0],
        opts[1],
        opts[2],
      );
    }
    if (kind === "enum")
      await databases.createEnumAttribute(databaseId, collectionId, key, opts[0], opts[1]);
    if (kind === "datetime")
      await databases.createDatetimeAttribute(databaseId, collectionId, key, opts[0]);
  }
}

// Attributes are created asynchronously; indexes fail until they are available.
async function waitForAttributes(collectionId) {
  if (!apply) return;
  for (let i = 0; i < 60; i++) {
    const { attributes } = await databases.listAttributes(databaseId, collectionId);
    const pending = attributes.filter((a) => a.status !== "available");
    if (pending.length === 0) return;
    if (pending.some((a) => a.status === "failed"))
      throw new Error(`attribute failed on ${collectionId}`);
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`attributes on ${collectionId} did not become available`);
}

async function ensureIndexes(collectionId, specs) {
  let existing = new Set();
  try {
    const { indexes } = await databases.listIndexes(databaseId, collectionId);
    existing = new Set(indexes.map((i) => i.key));
  } catch (err) {
    if (apply) throw err;
  }
  for (const [key, type, attributes] of specs) {
    if (existing.has(key)) continue;
    log(`create index ${collectionId}.${key}`);
    if (apply) await databases.createIndex(databaseId, collectionId, key, type, attributes);
  }
}

// If an attribute is an enum, make sure it allows the given values. String
// attributes need nothing.
async function ensureEnumValues(collectionId, key, values) {
  const { attributes } = await databases.listAttributes(databaseId, collectionId);
  const attr = attributes.find((a) => a.key === key);
  if (!attr || !Array.isArray(attr.elements))
    return log(`${collectionId}.${key} is not an enum, nothing to add`);
  const missing = values.filter((v) => !attr.elements.includes(v));
  if (missing.length === 0)
    return log(`${collectionId}.${key} already allows ${values.join(", ")}`);
  log(`add ${missing.join(", ")} to ${collectionId}.${key}`);
  if (apply) {
    await databases.updateEnumAttribute(
      databaseId,
      collectionId,
      key,
      [...attr.elements, ...missing],
      attr.required,
      attr.default ?? null,
    );
  }
}

async function main() {
  await ensureCollection("quotes", "Quotes");
  await ensureAttributes("quotes", QUOTES);
  await waitForAttributes("quotes");
  await ensureIndexes("quotes", QUOTE_INDEXES);

  await ensureCollection("locks", "Locks");
  await ensureAttributes("locks", LOCKS);

  await ensureAttributes("payments", PAYMENT_ADDITIONS);
  await waitForAttributes("payments");
  await ensureIndexes("payments", PAYMENT_INDEXES);
  await ensureEnumValues("payments", "status", [
    "pending",
    "success",
    "failed",
    "abandoned",
    "duplicate",
    "refunded",
  ]);
  await ensureEnumValues("payments", "method", ["card", "momo", "bank", "apple_pay", "cash"]);

  await ensureEnumValues("project_inquiries", "status", [
    "new",
    "reviewed",
    "quoted",
    "declined",
    "won",
  ]);

  if (!apply) console.log("\nDry run. Re-run with --apply to write these changes.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Dry run against Appwrite**

Ask the user to run it (the key lives in their `.env`, never paste it into chat):

```bash
set -a; source .env; set +a; node scripts/create-quote-collections.mjs
```

Expected: a list of `[dry run] create ...` lines for `quotes`, `locks`, the payments additions and the enum checks. If `paystackReference_key` already exists under another name, the create will fail with "Index already exists" on apply; remove that line from `PAYMENT_INDEXES` and re-run.

- [ ] **Step 3: Apply**

```bash
set -a; source .env; set +a; node scripts/create-quote-collections.mjs --apply
```

Expected: ends without error. Running it again prints no `create` lines.

- [ ] **Step 4: Commit**

```bash
git add scripts/create-quote-collections.mjs
git commit -m "chore(OC-0): add Appwrite setup script for quotes, locks and payment fields"
```

---

### Task 4: Data access (`appwrite.js`, `repo.js`, `locks.js`, fakes)

**Files:**

- Create: `api/shared/appwrite.js`, `api/shared/quotes/repo.js`, `api/shared/locks.js`, `api/shared/quotes/fakes.js`
- Test: `api/shared/quotes/repo.test.js`

**Interfaces:**

- Consumes: `quoteNumber` from Task 1, `lockId` from Task 2.
- Produces: `getDatabases()`, `DATABASE_ID`, `sdk` (appwrite.js); `createQuoteRepo(db)` returning `{get(id), findByTokenHash(hash), list(), create(fields, year?), update(id, patch), listPayments(quoteNumber), listQuotePayments(), findPaymentByReference(ref), createPayment(fields), updatePayment(id, patch), setInquiryStatus(id, status)}`; `createLocks(db)` returning `{take(key) → bool, release(key)}`; `createFakeRepo(seed?)` and `createFakeLocks()` (fakes.js) with the same shapes.
- Quote objects returned by the repo: all stored fields with `items`, `schedule`, `payState` parsed, plus `id`, `createdAt`, `updatedAt`. Payment objects: stored fields plus `id`, `createdAt`, and `amountMinor` (falls back to `Math.round(amount*100)`).

- [ ] **Step 1: Write the failing tests**

```js
// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

const { createQuoteRepo } = await import("./repo.js");
const { createLocks } = await import("../locks.js");

function conflict() {
  return Object.assign(new Error("exists"), { code: 409 });
}

describe("quote repo", () => {
  it("parses JSON fields and exposes id", async () => {
    const db = {
      getDocument: vi.fn().mockResolvedValue({
        $id: "q1",
        $createdAt: "2026-10-10T00:00:00Z",
        items: '[{"id":"item-1"}]',
        schedule: "[]",
        payState: null,
      }),
    };
    const q = await createQuoteRepo(db).get("q1");
    expect(q).toMatchObject({
      id: "q1",
      items: [{ id: "item-1" }],
      schedule: [],
      payState: { due: {} },
    });
  });

  it("returns null for a missing quote", async () => {
    const db = {
      getDocument: vi.fn().mockRejectedValue(Object.assign(new Error("nf"), { code: 404 })),
    };
    expect(await createQuoteRepo(db).get("nope")).toBeNull();
  });

  it("allocates the next number and retries on a unique conflict", async () => {
    const db = {
      listDocuments: vi.fn().mockResolvedValue({ documents: [{ quoteNumber: "Q-2026-0004" }] }),
      createDocument: vi
        .fn()
        .mockRejectedValueOnce(conflict())
        .mockImplementation(async (_d, _c, _id, data) => ({ $id: "new", ...data })),
    };
    const q = await createQuoteRepo(db).create(
      { items: [], schedule: [], payState: { due: {} } },
      2026,
    );
    expect(db.createDocument).toHaveBeenCalledTimes(2);
    expect(db.createDocument.mock.calls[0][3].quoteNumber).toBe("Q-2026-0005");
    expect(q.quoteNumber).toBe("Q-2026-0006");
    expect(typeof db.createDocument.mock.calls[1][3].items).toBe("string");
  });

  it("serialises JSON fields on update and never writes id fields", async () => {
    const db = {
      updateDocument: vi
        .fn()
        .mockImplementation(async (_d, _c, id, data) => ({ $id: id, ...data })),
    };
    await createQuoteRepo(db).update("q1", {
      id: "x",
      payState: { due: { b: "t" } },
      status: "accepted",
    });
    const written = db.updateDocument.mock.calls[0][3];
    expect(written).toEqual({ payState: '{"due":{"b":"t"}}', status: "accepted" });
  });

  it("fills amountMinor from amount for older payment rows", async () => {
    const db = {
      listDocuments: vi.fn().mockResolvedValue({ documents: [{ $id: "p1", amount: 12.5 }] }),
    };
    const [p] = await createQuoteRepo(db).listPayments("Q-2026-0001");
    expect(p).toMatchObject({ id: "p1", amountMinor: 1250 });
  });

  it("ignores inquiry status failures", async () => {
    const db = { updateDocument: vi.fn().mockRejectedValue(new Error("no attr")) };
    await expect(createQuoteRepo(db).setInquiryStatus("i1", "won")).resolves.toBeUndefined();
    await createQuoteRepo(db).setInquiryStatus(null, "won");
    expect(db.updateDocument).toHaveBeenCalledTimes(1);
  });
});

describe("locks", () => {
  it("takes a lock once", async () => {
    const db = {
      createDocument: vi.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(conflict()),
    };
    const locks = createLocks(db);
    expect(await locks.take("settle:R1")).toBe(true);
    expect(await locks.take("settle:R1")).toBe(false);
    expect(db.createDocument.mock.calls[0][2]).toMatch(/^s_[0-9a-f]{34}$/);
  });
  it("rethrows other errors and tolerates releasing a missing lock", async () => {
    const db = {
      createDocument: vi.fn().mockRejectedValue(new Error("down")),
      deleteDocument: vi.fn().mockRejectedValue(Object.assign(new Error("nf"), { code: 404 })),
    };
    await expect(createLocks(db).take("k")).rejects.toThrow("down");
    await expect(createLocks(db).release("k")).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run api/shared/quotes/repo.test.js`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement**

`api/shared/appwrite.js`:

```js
// Server-side Appwrite client for the quote functions. Uses the API key, which
// bypasses collection permissions, so `quotes` and `locks` can stay closed to
// browsers entirely. This file goes away at the Cosmos cutover.

const sdk = require("node-appwrite");

const ENDPOINT = process.env.APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1";
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || "6943431e00253c8f9883";
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "6943493400018e7c314c";

function getDatabases() {
  const key = process.env.APPWRITE_API_KEY;
  if (!key) throw new Error("APPWRITE_API_KEY is not configured");
  return new sdk.Databases(
    new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(key),
  );
}

module.exports = { sdk, DATABASE_ID, getDatabases };
```

`api/shared/quotes/repo.js`:

```js
// Every Appwrite read and write for quotes and quote payments. This is the
// only module that changes when the quote flow moves to Cosmos.

const { sdk, DATABASE_ID } = require("../appwrite");
const { quoteNumber } = require("./model");

const { Query, ID } = sdk;
const QUOTES = "quotes";
const PAYMENTS = "payments";
const INQUIRIES = "project_inquiries";

// Stored as JSON strings; parsed on the way out.
const JSON_FIELDS = { items: [], schedule: [], payState: { due: {} } };
const SKIP_ON_WRITE = new Set(["id", "createdAt", "updatedAt"]);

function parse(raw, fallback) {
  if (raw == null || raw === "") return fallback;
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function toQuote(doc) {
  if (!doc) return null;
  const q = { ...doc, id: doc.$id, createdAt: doc.$createdAt, updatedAt: doc.$updatedAt };
  for (const [key, fallback] of Object.entries(JSON_FIELDS)) q[key] = parse(doc[key], fallback);
  return q;
}

function toDoc(patch) {
  const out = {};
  for (const [key, value] of Object.entries(patch)) {
    if (key.startsWith("$") || SKIP_ON_WRITE.has(key)) continue;
    out[key] = key in JSON_FIELDS ? JSON.stringify(value) : value;
  }
  return out;
}

function toPayment(doc) {
  if (!doc) return null;
  const amountMinor = Number.isInteger(doc.amountMinor)
    ? doc.amountMinor
    : Math.round(Number(doc.amount || 0) * 100);
  return { ...doc, id: doc.$id, createdAt: doc.$createdAt, amountMinor };
}

const isCode = (err, code) => Boolean(err) && err.code === code;

function createQuoteRepo(db) {
  return {
    async get(id) {
      try {
        return toQuote(await db.getDocument(DATABASE_ID, QUOTES, id));
      } catch (err) {
        if (isCode(err, 404)) return null;
        throw err;
      }
    },

    async findByTokenHash(hash) {
      const r = await db.listDocuments(DATABASE_ID, QUOTES, [
        Query.equal("tokenHash", [hash]),
        Query.limit(1),
      ]);
      return toQuote(r.documents[0]);
    },

    async list() {
      const r = await db.listDocuments(DATABASE_ID, QUOTES, [
        Query.orderDesc("$createdAt"),
        Query.limit(100),
      ]);
      return r.documents.map(toQuote);
    },

    // Numbers are sequential per year. The unique index on quoteNumber turns
    // two admins creating at once into a retry instead of a duplicate.
    async create(fields, year = new Date().getFullYear()) {
      const last = await db.listDocuments(DATABASE_ID, QUOTES, [
        Query.startsWith("quoteNumber", `Q-${year}-`),
        Query.orderDesc("quoteNumber"),
        Query.limit(1),
      ]);
      const start = last.documents[0] ? Number(last.documents[0].quoteNumber.slice(-4)) + 1 : 1;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const data = toDoc({ ...fields, quoteNumber: quoteNumber(year, start + attempt) });
          return toQuote(await db.createDocument(DATABASE_ID, QUOTES, ID.unique(), data));
        } catch (err) {
          if (!isCode(err, 409)) throw err;
        }
      }
      throw new Error("Could not allocate a quote number");
    },

    async update(id, patch) {
      return toQuote(await db.updateDocument(DATABASE_ID, QUOTES, id, toDoc(patch)));
    },

    async listPayments(qn) {
      const r = await db.listDocuments(DATABASE_ID, PAYMENTS, [
        Query.equal("quoteNumber", [qn]),
        Query.orderDesc("$createdAt"),
        Query.limit(100),
      ]);
      return r.documents.map(toPayment);
    },

    async listQuotePayments() {
      const r = await db.listDocuments(DATABASE_ID, PAYMENTS, [
        Query.equal("kind", ["quote"]),
        Query.limit(500),
      ]);
      return r.documents.map(toPayment);
    },

    async findPaymentByReference(reference) {
      const r = await db.listDocuments(DATABASE_ID, PAYMENTS, [
        Query.equal("paystackReference", [reference]),
        Query.limit(1),
      ]);
      return toPayment(r.documents[0]);
    },

    async createPayment(fields) {
      return toPayment(await db.createDocument(DATABASE_ID, PAYMENTS, ID.unique(), fields));
    },

    async updatePayment(id, patch) {
      return toPayment(await db.updateDocument(DATABASE_ID, PAYMENTS, id, patch));
    },

    // Best effort: the inquiry may have been deleted, or the status attribute
    // may not allow the value yet. Neither should fail a quote action.
    async setInquiryStatus(id, status) {
      if (!id) return;
      try {
        await db.updateDocument(DATABASE_ID, INQUIRIES, id, { status });
      } catch {
        /* see comment above */
      }
    },
  };
}

module.exports = { createQuoteRepo, toQuote, toDoc };
```

`api/shared/locks.js`:

```js
// Atomic locks: a document whose id is derived from the lock key. Creating a
// document with an id that already exists fails with 409, so exactly one
// caller wins even when the webhook, the return page and polling race.

const { DATABASE_ID } = require("./appwrite");
const { lockId } = require("./tokens");

const LOCKS = "locks";

function createLocks(db) {
  return {
    async take(key) {
      try {
        await db.createDocument(DATABASE_ID, LOCKS, lockId(key), { key: key.slice(0, 200) });
        return true;
      } catch (err) {
        if (err && err.code === 409) return false;
        throw err;
      }
    },
    async release(key) {
      try {
        await db.deleteDocument(DATABASE_ID, LOCKS, lockId(key));
      } catch (err) {
        if (!(err && err.code === 404)) throw err;
      }
    },
  };
}

module.exports = { createLocks };
```

`api/shared/quotes/fakes.js` (test helper, same interfaces, in memory):

```js
// In-memory stand-ins for the quote repo and locks, used by function tests.
// Same method names and return shapes as repo.js and locks.js.

const { quoteNumber } = require("./model");

function clone(v) {
  return v == null ? v : JSON.parse(JSON.stringify(v));
}

function createFakeRepo({ quotes = [], payments = [] } = {}) {
  const q = new Map(quotes.map((x) => [x.id, clone(x)]));
  const p = new Map(payments.map((x) => [x.id, clone(x)]));
  let seq = q.size;
  let pseq = p.size;
  const inquiryStatus = {};
  const now = () => new Date().toISOString();

  return {
    quotes: q,
    payments: p,
    inquiryStatus,
    async get(id) {
      return clone(q.get(id)) || null;
    },
    async findByTokenHash(hash) {
      return clone([...q.values()].find((x) => x.tokenHash === hash)) || null;
    },
    async list() {
      return [...q.values()].map(clone);
    },
    async create(fields) {
      seq += 1;
      const doc = {
        ...clone(fields),
        id: `q${seq}`,
        quoteNumber: quoteNumber(2026, seq),
        createdAt: now(),
      };
      q.set(doc.id, doc);
      return clone(doc);
    },
    async update(id, patch) {
      const doc = { ...q.get(id), ...clone(patch), updatedAt: now() };
      q.set(id, doc);
      return clone(doc);
    },
    async listPayments(qn) {
      return [...p.values()].filter((x) => x.quoteNumber === qn).map(clone);
    },
    async listQuotePayments() {
      return [...p.values()].filter((x) => x.kind === "quote").map(clone);
    },
    async findPaymentByReference(ref) {
      return clone([...p.values()].find((x) => x.paystackReference === ref)) || null;
    },
    async createPayment(fields) {
      pseq += 1;
      const doc = { ...clone(fields), id: `p${pseq}`, createdAt: fields.createdAt || now() };
      p.set(doc.id, doc);
      return clone(doc);
    },
    async updatePayment(id, patch) {
      const doc = { ...p.get(id), ...clone(patch) };
      p.set(id, doc);
      return clone(doc);
    },
    async setInquiryStatus(id, status) {
      if (id) inquiryStatus[id] = status;
    },
  };
}

function createFakeLocks() {
  const held = new Set();
  return {
    held,
    async take(key) {
      if (held.has(key)) return false;
      held.add(key);
      return true;
    },
    async release(key) {
      held.delete(key);
    },
  };
}

module.exports = { createFakeRepo, createFakeLocks };
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx vitest run api/shared/quotes/repo.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/shared/appwrite.js api/shared/quotes/repo.js api/shared/locks.js api/shared/quotes/fakes.js api/shared/quotes/repo.test.js
git commit -m "feat(OC-0): add Appwrite repo and atomic locks for quotes"
```

---

### Task 5: Email kit

**Files:**

- Create: `api/shared/email/ui.js`, `api/shared/email/send.js`
- Test: `api/shared/email/ui.test.js`, `api/shared/email/send.test.js`

**Interfaces:**

- Produces (ui): `C` (palette), `esc(v)`, `safeUrl(u)`, `multiline(text)`, `shell({preview, body, reason})`, `heading({eyebrow, title, intro, tone})`, `p(text)`, `card({title, highlight, highlightLabel, rows})` with `rows: [label, value][]`, `button({href, label, variant})`, `buttons(...html)`, `steps(items)`, `notice({tone, text})`, `divider()`, `small(text)`, `lines(...parts)` (plain-text join).
- Produces (send): `sendEmail({to, subject, html, text, replyTo?})` → `Promise<{ok:true, id}|{ok:false, error}>`; never throws.

- [ ] **Step 1: Write the failing tests**

`api/shared/email/ui.test.js`:

```js
// @vitest-environment node
import { describe, it, expect } from "vitest";

const ui = await import("./ui.js");

describe("escaping", () => {
  it("escapes HTML special characters", () => {
    expect(ui.esc(`<b a="1">&'</b>`)).toBe("&lt;b a=&quot;1&quot;&gt;&amp;&#39;&lt;/b&gt;");
    expect(ui.esc(null)).toBe("");
  });
  it("only allows https links (and localhost for development)", () => {
    expect(ui.safeUrl("https://oceaniccoder.dev/q/abc")).toBe("https://oceaniccoder.dev/q/abc");
    expect(ui.safeUrl("http://localhost:5173/q/abc")).toBe("http://localhost:5173/q/abc");
    expect(ui.safeUrl("javascript:alert(1)")).toBe("#");
    expect(ui.safeUrl("http://evil.example")).toBe("#");
  });
  it("keeps line breaks", () => expect(ui.multiline("a\n<b>")).toBe("a<br>&lt;b&gt;"));
});

describe("blocks", () => {
  it("escapes every value it is given", () => {
    const html = ui.card({ title: "<t>", highlight: "<h>", rows: [["<l>", "<v>"]] });
    expect(html).not.toMatch(/<t>|<h>|<l>|<v>/);
  });
  it("renders a button with a safe href", () => {
    expect(ui.button({ href: "javascript:x", label: "Go" })).toContain('href="#"');
  });
  it("wraps content in the branded shell with the preview text and reason", () => {
    const html = ui.shell({ preview: "Hi <there>", body: "<p>x</p>", reason: "Because" });
    expect(html).toContain("OceanicCoder");
    expect(html).toContain("Hi &lt;there&gt;");
    expect(html).toContain("Because");
    expect(html).toContain("<p>x</p>");
  });
  it("joins plain-text lines and drops empty parts", () => {
    expect(ui.lines("a", "", null, "b")).toBe("a\nb");
  });
});
```

`api/shared/email/send.test.js`:

```js
// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { sendEmail } = await import("./send.js");

describe("sendEmail", () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.RESEND_FROM_EMAIL = "quotes@send.oceaniccoder.dev";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
  });

  it("posts to Resend with from, reply-to, html and text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "e1" }) }),
    );
    const r = await sendEmail({ to: "a@b.co", subject: "S", html: "<p>h</p>", text: "t" });
    expect(r).toEqual({ ok: true, id: "e1" });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(JSON.parse(init.body)).toMatchObject({
      from: "OceanicCoder <quotes@send.oceaniccoder.dev>",
      to: ["a@b.co"],
      reply_to: "hello@oceaniccoder.dev",
      subject: "S",
      html: "<p>h</p>",
      text: "t",
    });
  });

  it("returns an error instead of throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 422, json: async () => ({ message: "bad" }) }),
    );
    expect(await sendEmail({ to: "a@b.co", subject: "S", html: "h", text: "t" })).toEqual({
      ok: false,
      error: "bad",
    });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await sendEmail({ to: "a@b.co", subject: "S", html: "h", text: "t" })).toEqual({
      ok: false,
      error: "offline",
    });
  });

  it("skips without an API key or recipient", async () => {
    delete process.env.RESEND_API_KEY;
    vi.stubGlobal("fetch", vi.fn());
    expect((await sendEmail({ to: "a@b.co", subject: "S", html: "h", text: "t" })).ok).toBe(false);
    process.env.RESEND_API_KEY = "re_test";
    expect((await sendEmail({ to: "", subject: "S", html: "h", text: "t" })).ok).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run api/shared/email`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement**

`api/shared/email/ui.js`:

```js
// Email kit: table-based HTML with inline styles, which is what email clients
// render reliably. Ported from the Craigtec React Email kit as plain functions
// because api/ has no JSX build step. Every value passes through esc() and
// every link through safeUrl(); templates only compose these blocks.

const C = {
  navy: "#0a0f1a",
  teal: "#0C8599",
  tealDark: "#085866",
  tealLight: "#7dd3e0",
  ink: "#0f172a",
  ink2: "#334155",
  ink3: "#64748b",
  line: "#e2e8f0",
  bg: "#f1f5f9",
  footer: "#f8fafc",
  ok: "#15803d",
  okBg: "#f0fdf4",
  warn: "#b45309",
  warnBg: "#fffbeb",
  info: "#0e7490",
  infoBg: "#ecfeff",
  danger: "#b91c1c",
  dangerBg: "#fef2f2",
};
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";
const LOGO = "https://oceaniccoder.dev/images/logo/Oceaniccoder-croped.png";
const SITE = "https://oceaniccoder.dev";
const CONTACT = "hello@oceaniccoder.dev";
const TONES = {
  ok: [C.ok, C.okBg],
  warn: [C.warn, C.warnBg],
  info: [C.info, C.infoBg],
  danger: [C.danger, C.dangerBg],
};

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeUrl(u) {
  try {
    const url = new URL(String(u));
    if (url.protocol === "https:") return url.toString();
    if (url.protocol === "http:" && url.hostname === "localhost") return url.toString();
  } catch {
    /* fall through */
  }
  return "#";
}

function multiline(text) {
  return esc(text).replace(/\n/g, "<br>");
}

function shell({ preview, body, reason }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>OceanicCoder</title></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:${FONT};color:${C.ink}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
<tr><td style="background:${C.navy};border-radius:14px 14px 0 0;padding:20px 28px">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:middle"><img src="${LOGO}" width="36" height="36" alt="OceanicCoder" style="display:block;border-radius:8px;background:#ffffff"></td>
<td style="vertical-align:middle;padding-left:12px"><div style="color:#ffffff;font-size:16px;font-weight:700">OceanicCoder</div><div style="color:${C.tealLight};font-size:12px">Web and app development</div></td>
</tr></table></td></tr>
<tr><td style="background:#ffffff;border-left:1px solid ${C.line};border-right:1px solid ${C.line};padding:32px 28px;font-size:15px;line-height:1.6;color:${C.ink2}">${body}</td></tr>
<tr><td style="background:${C.footer};border:1px solid ${C.line};border-top:0;border-radius:0 0 14px 14px;padding:20px 28px;font-size:12px;line-height:1.6;color:${C.ink3}">
<a href="${SITE}" style="color:${C.tealDark};text-decoration:none">oceaniccoder.dev</a> &middot; <a href="mailto:${CONTACT}" style="color:${C.tealDark};text-decoration:none">${CONTACT}</a><br>${esc(reason)}
</td></tr></table></td></tr></table></body></html>`;
}

function heading({ eyebrow, title, intro, tone = "info" }) {
  const [color] = TONES[tone] || TONES.info;
  return (
    (eyebrow
      ? `<div style="font-family:${MONO};font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${color};margin:0 0 8px">${esc(eyebrow)}</div>`
      : "") +
    `<h1 style="font-size:24px;line-height:1.3;color:${C.ink};margin:0 0 12px;font-weight:700">${esc(title)}</h1>` +
    (intro ? `<p style="margin:0 0 20px">${multiline(intro)}</p>` : "")
  );
}

function p(text) {
  return `<p style="margin:0 0 16px">${multiline(text)}</p>`;
}

function card({ title, highlight, highlightLabel, rows = [] }) {
  const rowHtml = rows
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 0;color:${C.ink3};font-size:13px">${esc(label)}</td><td align="right" style="padding:6px 0;color:${C.ink};font-size:13px;font-family:${MONO}">${esc(value)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.line};border-radius:12px;margin:0 0 20px">
${title ? `<tr><td style="background:${C.footer};border-bottom:1px solid ${C.line};border-radius:12px 12px 0 0;padding:10px 16px;font-family:${MONO};font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${C.ink3}">${esc(title)}</td></tr>` : ""}
<tr><td style="padding:16px">
${highlight ? `${highlightLabel ? `<div style="font-size:12px;color:${C.ink3}">${esc(highlightLabel)}</div>` : ""}<div style="font-size:26px;font-weight:700;color:${C.ink};font-family:${MONO};margin:2px 0 10px">${esc(highlight)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowHtml}</table>
</td></tr></table>`;
}

function button({ href, label, variant = "primary" }) {
  const styles =
    variant === "secondary"
      ? `background:#ffffff;color:${C.tealDark};border:1px solid ${C.line}`
      : `background:${C.teal};color:#ffffff;border:1px solid ${C.teal}`;
  return `<a href="${esc(safeUrl(href))}" style="display:inline-block;${styles};border-radius:10px;padding:12px 22px;font-size:15px;font-weight:600;text-decoration:none;margin:0 8px 8px 0">${esc(label)}</a>`;
}

function buttons(...html) {
  return `<div style="margin:4px 0 20px">${html.join("")}</div>`;
}

function steps(items) {
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px">` +
    items
      .map(
        (text, i) =>
          `<tr><td style="vertical-align:top;padding:0 12px 10px 0"><div style="width:24px;height:24px;border-radius:12px;background:${C.navy};color:#ffffff;font-size:12px;font-weight:700;line-height:24px;text-align:center">${i + 1}</div></td><td style="vertical-align:top;padding:2px 0 10px;font-size:14px;color:${C.ink2}">${esc(text)}</td></tr>`,
      )
      .join("") +
    `</table>`
  );
}

function notice({ tone = "info", text }) {
  const [color, bg] = TONES[tone] || TONES.info;
  return `<div style="background:${bg};border-left:3px solid ${color};border-radius:8px;padding:12px 14px;margin:0 0 20px;font-size:14px;color:${C.ink2}">${multiline(text)}</div>`;
}

function divider() {
  return `<div style="border-top:1px solid ${C.line};margin:24px 0"></div>`;
}

function small(text) {
  return `<p style="margin:0;font-size:12px;color:${C.ink3}">${multiline(text)}</p>`;
}

function lines(...parts) {
  return parts.filter((x) => x !== undefined && x !== null && x !== "").join("\n");
}

module.exports = {
  C,
  esc,
  safeUrl,
  multiline,
  shell,
  heading,
  p,
  card,
  button,
  buttons,
  steps,
  notice,
  divider,
  small,
  lines,
};
```

`api/shared/email/send.js`:

```js
// The single Resend sender for the new email templates. Failures are returned,
// never thrown, so an email problem can't undo the state change that caused it.

const CONTACT = "hello@oceaniccoder.dev";

async function sendEmail({ to, subject, html, text, replyTo = CONTACT }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "RESEND_API_KEY is not configured" };
  if (!to) return { ok: false, error: "no recipient" };
  const from = process.env.RESEND_FROM_EMAIL || "invoices@send.oceaniccoder.dev";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `OceanicCoder <${from}>`,
        to: [to],
        reply_to: replyTo,
        subject,
        html,
        text,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: body.message || `Resend ${res.status}` };
    return { ok: true, id: body.id };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = { sendEmail };
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx vitest run api/shared/email`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/shared/email
git commit -m "feat(OC-0): add branded email kit and shared Resend sender"
```

---

### Task 6: View models, quote email templates and samples

**Files:**

- Create: `api/shared/quotes/views.js`, `api/shared/email/quoteEmails.js`, `api/shared/email/samples.js`
- Test: `api/shared/quotes/views.test.js`, `api/shared/email/quoteEmails.test.js`

**Interfaces:**

- Consumes: Task 1 (`stageStates`, `paymentSummary`, `INVOICE_DUE_DAYS`, `DAY_MS`), Task 2 (`signReceipt`), Task 5 (ui blocks).
- Produces (views): `siteBase()`, `formatMoney(minor, currency)` → `"GHS 1,234.00"`, `formatDate(iso)`, `firstName(name)`, `planSummary(schedule)`, `quoteLink(token, base?)`, `receiptPath(reference, secret)` → `string|null`, `METHOD_LABELS`, `PROBLEMS`, `clientQuoteView(quote, stages, {receiptSecret})`, `adminQuoteView(quote)`, `summarize(quote, stages)`, `paymentView(payment)`, `receiptView(quote, payment, stages)`, `quoteSentView(q, token, base)`, `acceptedView(q, token, stages, base)`, `decisionView(q, decision, base)`, `requestView(q, stage, token, stages, base)`, `receiptEmailView(q, p, stages, base, secret)`, `alertView(q, p, stages, kind, problem, base)`.
- Produces (templates): `quoteSent(v)`, `quoteAccepted(v)`, `quoteDecisionAlert(v)`, `paymentRequest(v)`, `paymentReceipt(v)`, `paymentAlert(v)`, each → `{subject, html, text}`.
- Produces (samples): `SAMPLES` object `{ [templateName]: () => {subject, html, text} }`.

- [ ] **Step 1: Write the failing tests**

`api/shared/quotes/views.test.js`:

```js
// @vitest-environment node
import { describe, it, expect } from "vitest";

const V = await import("./views.js");
const M = await import("./model.js");

const quote = {
  id: "q1",
  quoteNumber: "Q-2026-0001",
  revision: 1,
  status: "accepted",
  currency: "GHS",
  title: "Online store",
  clientName: "Kofi Mensah",
  clientEmail: "kofi@example.com",
  clientCompany: "Mensah Ltd",
  items: [{ id: "item-1", description: "Store", qty: 1, unitMinor: 1000000 }],
  subtotalMinor: 1000000,
  discountMinor: 0,
  totalMinor: 1000000,
  schedule: M.DEFAULT_SCHEDULE,
  respondedAt: "2026-10-01T10:00:00.000Z",
  sentAt: "2026-09-30T10:00:00.000Z",
  validUntil: "2026-10-14T10:00:00.000Z",
  payState: { due: {} },
  tokenHash: "secret-hash",
  acceptedIpHash: "ip-hash",
  acceptedName: "Kofi Mensah",
};

describe("formatting", () => {
  it("formats money and dates", () => {
    expect(V.formatMoney(123456, "GHS")).toBe("GHS 1,234.56");
    expect(V.formatMoney(5, "USD")).toBe("USD 0.05");
    expect(V.formatDate("2026-10-01T23:30:00.000Z")).toBe("1 Oct 2026");
    expect(V.formatDate(null)).toBe("");
  });
  it("summarises the plan", () =>
    expect(V.planSummary(M.DEFAULT_SCHEDULE)).toBe("60% deposit, 40% balance"));
  it("falls back to 'there' for a missing first name", () => expect(V.firstName("")).toBe("there"));
});

describe("clientQuoteView", () => {
  it("never exposes secrets or internal evidence", () => {
    const stages = M.stageStates(quote, [], Date.parse("2026-10-02T00:00:00Z"));
    const view = V.clientQuoteView(quote, stages, { receiptSecret: "s" });
    const json = JSON.stringify(view);
    expect(json).not.toContain("secret-hash");
    expect(json).not.toContain("ip-hash");
    expect(view).not.toHaveProperty("id");
    expect(view.items[0]).toMatchObject({ lineMinor: 1000000 });
    expect(view.summary).toMatchObject({ paidMinor: 0, balanceMinor: 1000000, complete: false });
  });
  it("adds a signed receipt path to paid stages", () => {
    const payments = [
      { stageId: "deposit", status: "success", paystackReference: "Q-2026-0001-1-AAAAAAAA" },
    ];
    const stages = M.stageStates(quote, payments);
    const view = V.clientQuoteView(quote, stages, { receiptSecret: "s" });
    expect(view.stages[0].receiptPath).toMatch(/^\/receipt\/Q-2026-0001-1-AAAAAAAA\?s=.{32}$/);
    expect(view.stages[1].receiptPath).toBeNull();
  });
});

describe("adminQuoteView", () => {
  it("drops the token hash and IP hash", () => {
    const view = V.adminQuoteView(quote);
    expect(view).not.toHaveProperty("tokenHash");
    expect(view).not.toHaveProperty("acceptedIpHash");
    expect(view).toMatchObject({ id: "q1", hasLink: true });
  });
});

describe("email views", () => {
  it("builds the accepted view with the deposit invoice card", () => {
    const stages = M.stageStates(quote, []);
    const v = V.acceptedView(quote, "TOKEN", stages, "https://oceaniccoder.dev");
    expect(v.invoice).toMatchObject({
      invoiceNumber: "Q-2026-0001-INV-1",
      amount: "GHS 6,000.00",
      payLink: "https://oceaniccoder.dev/q/TOKEN/pay/deposit",
    });
  });
});
```

`api/shared/email/quoteEmails.test.js`:

```js
// @vitest-environment node
import { describe, it, expect } from "vitest";

const { SAMPLES } = await import("./samples.js");
const T = await import("./quoteEmails.js");

describe("quote email templates", () => {
  it.each(Object.keys(SAMPLES))("%s renders subject, html and text", (name) => {
    const mail = SAMPLES[name]();
    expect(mail.subject.length).toBeGreaterThan(5);
    expect(mail.html).toContain("OceanicCoder");
    expect(mail.text.length).toBeGreaterThan(20);
    expect(mail.html).not.toMatch(/undefined|NaN|\[object Object\]/);
    expect(mail.text).not.toMatch(/undefined|NaN|\[object Object\]/);
  });

  it("escapes client-supplied text", () => {
    const mail = T.quoteDecisionAlert({
      decision: "declined",
      clientName: "<script>x</script>",
      clientEmail: "a@b.co",
      quoteNumber: "Q-2026-0001",
      title: "T",
      total: "GHS 1.00",
      acceptedName: "",
      reason: "<img src=x>",
      adminLink: "https://oceaniccoder.dev/admin/dashboard",
    });
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).not.toContain("<img src=x>");
  });

  it("covers all six templates", () => {
    expect(Object.keys(SAMPLES).sort()).toEqual(
      [
        "paymentAlert",
        "paymentAlertProblem",
        "paymentReceipt",
        "paymentRequest",
        "quoteAccepted",
        "quoteDecisionAlert",
        "quoteSent",
      ].sort(),
    );
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run api/shared/quotes/views.test.js api/shared/email/quoteEmails.test.js`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement `views.js`**

```js
// Formatting and view models. Client and admin views are whitelists: a field
// reaches the browser only if it is listed here.

const M = require("./model");
const { signReceipt } = require("../tokens");

const METHOD_LABELS = {
  card: "Card",
  momo: "Mobile Money",
  apple_pay: "Apple Pay",
  bank: "Bank transfer",
  cash: "Cash",
};
const PROBLEMS = {
  duplicate: "A second payment arrived for a stage that was already paid. Refund it in Paystack.",
  underpaid: "The amount paid is less than the stage amount, so the stage was not marked paid.",
  overpaid:
    "The amount paid is more than the stage amount, so the stage was not marked paid. Refund the difference or record it by hand.",
  "currency-mismatch":
    "The payment was made in a different currency from the quote, so the stage was not marked paid.",
  "no-expected-amount":
    "The stage amount could not be worked out, so the stage was not marked paid.",
  "mode-mismatch":
    "A test-mode payment reached the live key (or the reverse). It was not recorded as revenue.",
};

function siteBase() {
  return (process.env.SITE_URL || "https://oceaniccoder.dev").replace(/\/$/, "");
}

function formatMoney(minor, currency) {
  const major = (Number(minor) || 0) / 100;
  return `${currency} ${major.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Accra",
  }).format(new Date(iso));
}

function firstName(name) {
  return (
    String(name || "")
      .trim()
      .split(/\s+/)[0] || "there"
  );
}

function planSummary(schedule) {
  return schedule.map((s) => `${s.percent}% ${s.label.toLowerCase()}`).join(", ");
}

function quoteLink(token, base = siteBase()) {
  return `${base}/q/${token}`;
}

function receiptPath(reference, secret) {
  if (!secret || !reference) return null;
  return `/receipt/${encodeURIComponent(reference)}?s=${signReceipt(reference, secret)}`;
}

function stageDueDate(stage) {
  return stage.dueAt
    ? new Date(Date.parse(stage.dueAt) + M.INVOICE_DUE_DAYS * M.DAY_MS).toISOString()
    : null;
}

function stageView(stage, receiptSecret) {
  return {
    id: stage.id,
    label: stage.label,
    percent: stage.percent,
    amountMinor: stage.amountMinor,
    index: stage.index,
    state: stage.state,
    dueAt: stage.dueAt,
    dueBy: stageDueDate(stage),
    overdue: stage.overdue,
    invoiceNumber: stage.invoiceNumber,
    paidAt: stage.paidAt,
    receiptPath: stage.state === "paid" ? receiptPath(stage.reference, receiptSecret) : null,
  };
}

function clientQuoteView(q, stages, { receiptSecret } = {}) {
  const summary = M.paymentSummary(stages);
  return {
    quoteNumber: q.quoteNumber,
    revision: q.revision,
    status: q.status,
    currency: q.currency,
    title: q.title,
    overview: q.overview || "",
    scope: q.scope || "",
    timeline: q.timeline || "",
    notes: q.notes || "",
    terms: q.terms || "",
    clientName: q.clientName,
    clientCompany: q.clientCompany || "",
    clientEmail: q.clientEmail || "",
    items: q.items.map((i) => ({
      id: i.id,
      description: i.description,
      qty: i.qty,
      unitMinor: i.unitMinor,
      lineMinor: M.lineMinor(i),
    })),
    subtotalMinor: q.subtotalMinor,
    discountMinor: q.discountMinor || 0,
    totalMinor: q.totalMinor,
    issuedAt: q.sentAt || null,
    validUntil: q.validUntil || null,
    acceptedName: q.acceptedName || null,
    respondedAt: q.respondedAt || null,
    stages: stages.map((s) => stageView(s, receiptSecret)),
    summary: {
      paidMinor: summary.paidMinor,
      balanceMinor: summary.balanceMinor,
      complete: summary.complete,
    },
    contact: { email: "hello@oceaniccoder.dev", whatsapp: process.env.CONTACT_WHATSAPP || "" },
  };
}

function adminQuoteView(q) {
  const { tokenHash, acceptedIpHash, $permissions, $collectionId, $databaseId, ...rest } = q;
  return { ...rest, hasLink: Boolean(tokenHash) };
}

function summarize(q, stages) {
  const s = M.paymentSummary(stages);
  return {
    id: q.id,
    quoteNumber: q.quoteNumber,
    title: q.title,
    clientName: q.clientName,
    status: q.status,
    currency: q.currency,
    totalMinor: q.totalMinor,
    paidMinor: s.paidMinor,
    complete: s.complete,
    nextDue: s.nextDue
      ? { id: s.nextDue.id, label: s.nextDue.label, overdue: s.nextDue.overdue }
      : null,
    sentAt: q.sentAt || null,
    viewedAt: q.viewedAt || null,
    updatedAt: q.updatedAt || q.createdAt || null,
  };
}

function paymentView(p) {
  return {
    id: p.id,
    reference: p.paystackReference,
    stageId: p.stageId,
    amountMinor: p.amountMinor,
    currency: p.currency,
    method: p.method,
    status: p.status,
    paidAt: p.paidAt || null,
    note: p.note || "",
    recordedBy: p.recordedBy || "",
    createdAt: p.createdAt || null,
  };
}

function receiptView(q, p, stages) {
  const stage = stages.find((s) => s.id === p.stageId);
  const summary = M.paymentSummary(stages);
  return {
    quoteNumber: q.quoteNumber,
    title: q.title,
    clientName: q.clientName,
    clientCompany: q.clientCompany || "",
    stageLabel: stage ? stage.label : p.stageId,
    invoiceNumber: stage ? stage.invoiceNumber : p.invoiceNumber,
    amountMinor: p.amountMinor,
    currency: p.currency,
    method: METHOD_LABELS[p.method] || p.method,
    reference: p.paystackReference,
    paidAt: p.paidAt,
    balanceMinor: summary.balanceMinor,
  };
}

function invoiceCard(q, stage, token, base) {
  return {
    invoiceNumber: stage.invoiceNumber,
    label: `${stage.label} (${stage.percent}%)`,
    amount: formatMoney(stage.amountMinor, q.currency),
    dueDate: formatDate(stageDueDate(stage)) || "On receipt",
    payLink: `${base}/q/${token}/pay/${stage.id}`,
    invoiceLink: `${base}/q/${token}/invoice/${stage.id}`,
  };
}

function quoteSentView(q, token, base = siteBase()) {
  return {
    clientFirstName: firstName(q.clientName),
    quoteNumber: q.quoteNumber,
    revision: q.revision,
    title: q.title,
    total: formatMoney(q.totalMinor, q.currency),
    validUntil: formatDate(q.validUntil),
    planSummary: planSummary(q.schedule),
    link: quoteLink(token, base),
  };
}

function acceptedView(q, token, stages, base = siteBase()) {
  return {
    clientFirstName: firstName(q.clientName),
    quoteNumber: q.quoteNumber,
    title: q.title,
    acceptedName: q.acceptedName || q.clientName,
    invoice: invoiceCard(q, stages[0], token, base),
    link: quoteLink(token, base),
  };
}

function decisionView(q, decision, base = siteBase()) {
  return {
    decision,
    clientName: q.clientName,
    clientEmail: q.clientEmail || "",
    quoteNumber: q.quoteNumber,
    title: q.title,
    total: formatMoney(q.totalMinor, q.currency),
    acceptedName: q.acceptedName || "",
    reason: q.declineReason || "",
    adminLink: `${base}/admin/dashboard`,
  };
}

function requestView(q, stage, token, stages, base = siteBase()) {
  const s = M.paymentSummary(stages);
  return {
    clientFirstName: firstName(q.clientName),
    quoteNumber: q.quoteNumber,
    title: q.title,
    invoice: invoiceCard(q, stage, token, base),
    paidSoFar: formatMoney(s.paidMinor, q.currency),
    balanceAfter: formatMoney(s.balanceMinor - stage.amountMinor, q.currency),
  };
}

function receiptEmailView(
  q,
  p,
  stages,
  base = siteBase(),
  secret = process.env.RECEIPT_SIGNING_SECRET,
) {
  const s = M.paymentSummary(stages);
  const stage = stages.find((x) => x.id === p.stageId);
  const path = receiptPath(p.paystackReference, secret);
  return {
    clientFirstName: firstName(q.clientName),
    quoteNumber: q.quoteNumber,
    title: q.title,
    stageLabel: stage ? stage.label : p.stageId,
    amount: formatMoney(p.amountMinor, p.currency),
    method: METHOD_LABELS[p.method] || p.method,
    reference: p.paystackReference,
    paidAt: formatDate(p.paidAt),
    receiptLink: path ? `${base}${path}` : "",
    balance: formatMoney(s.balanceMinor, q.currency),
    complete: s.complete,
  };
}

function alertView(q, p, stages, kind, problem, base = siteBase()) {
  const stage = stages ? stages.find((x) => x.id === p.stageId) : null;
  return {
    kind,
    problem: problem ? PROBLEMS[problem] || problem : "",
    clientName: q.clientName,
    quoteNumber: q.quoteNumber,
    title: q.title,
    stageLabel: stage ? stage.label : p.stageId,
    amount: formatMoney(p.amountMinor, p.currency),
    method: METHOD_LABELS[p.method] || p.method || "",
    reference: p.paystackReference,
    balance: stages ? formatMoney(M.paymentSummary(stages).balanceMinor, q.currency) : "",
    adminLink: `${base}/admin/dashboard`,
  };
}

module.exports = {
  METHOD_LABELS,
  PROBLEMS,
  siteBase,
  formatMoney,
  formatDate,
  firstName,
  planSummary,
  quoteLink,
  receiptPath,
  clientQuoteView,
  adminQuoteView,
  summarize,
  paymentView,
  receiptView,
  quoteSentView,
  acceptedView,
  decisionView,
  requestView,
  receiptEmailView,
  alertView,
};
```

- [ ] **Step 4: Implement `quoteEmails.js`**

```js
// Quote and payment emails. Each takes a pre-formatted view model from
// api/shared/quotes/views.js and returns { subject, html, text }.

const { shell, heading, p, card, button, buttons, steps, notice, small, lines } = require("./ui");

const CLIENT_REASON = "You received this because you asked OceanicCoder for a quote.";
const ADMIN_REASON = "Sent to you as the OceanicCoder admin.";

function invoiceBlock(inv) {
  return card({
    title: `Invoice ${inv.invoiceNumber}`,
    highlightLabel: inv.label,
    highlight: inv.amount,
    rows: [["Due", inv.dueDate]],
  });
}

function quoteSent(v) {
  const updated = v.revision > 1;
  const subject = `${updated ? "Updated quote" : "Your quote"} from OceanicCoder: ${v.title}`;
  const html = shell({
    preview: `Quote ${v.quoteNumber} for ${v.title}, ${v.total}`,
    reason: CLIENT_REASON,
    body:
      heading({
        eyebrow: updated ? "Updated quote" : "Your quote",
        title: v.title,
        intro: `Hi ${v.clientFirstName}, here is ${updated ? "the updated" : "your"} quote. It covers the scope, timeline and payment plan.`,
      }) +
      card({
        title: `Quote ${v.quoteNumber}`,
        highlightLabel: "Total",
        highlight: v.total,
        rows: [
          ["Payment plan", v.planSummary],
          ["Valid until", v.validUntil],
        ],
      }) +
      buttons(button({ href: v.link, label: "View your quote" })) +
      steps([
        "Open the quote and read the scope and terms",
        "Accept it by typing your name",
        "Pay the deposit to book your slot",
      ]) +
      small("Questions? Reply to this email."),
  });
  const text = lines(
    `Hi ${v.clientFirstName},`,
    `Here is ${updated ? "the updated" : "your"} quote for ${v.title} (${v.quoteNumber}).`,
    `Total: ${v.total}`,
    `Payment plan: ${v.planSummary}`,
    `Valid until: ${v.validUntil}`,
    `View and accept it here: ${v.link}`,
    "Questions? Reply to this email.",
  );
  return { subject, html, text };
}

function quoteAccepted(v) {
  const subject = `Quote accepted: your deposit invoice for ${v.title}`;
  const html = shell({
    preview: `Thanks ${v.clientFirstName}. Your deposit invoice is ready.`,
    reason: CLIENT_REASON,
    body:
      heading({
        eyebrow: "Quote accepted",
        tone: "ok",
        title: "Thank you, we're on",
        intro: `Hi ${v.clientFirstName}, you accepted quote ${v.quoteNumber} as ${v.acceptedName}. The next step is the deposit.`,
      }) +
      invoiceBlock(v.invoice) +
      buttons(
        button({ href: v.invoice.payLink, label: "Pay the deposit" }),
        button({ href: v.invoice.invoiceLink, label: "View invoice", variant: "secondary" }),
      ) +
      steps([
        "Pay the deposit",
        "We schedule the work and keep you updated",
        "You pay the balance on delivery",
      ]) +
      small(`Your quote stays available at ${v.link}`),
  });
  const text = lines(
    `Hi ${v.clientFirstName},`,
    `You accepted quote ${v.quoteNumber} as ${v.acceptedName}. Thank you.`,
    `Deposit invoice ${v.invoice.invoiceNumber}: ${v.invoice.amount}, due ${v.invoice.dueDate}.`,
    `Pay here: ${v.invoice.payLink}`,
    `Invoice: ${v.invoice.invoiceLink}`,
  );
  return { subject, html, text };
}

function quoteDecisionAlert(v) {
  const accepted = v.decision === "accepted";
  const subject = `${accepted ? "Accepted" : "Declined"}: ${v.quoteNumber} from ${v.clientName}`;
  const html = shell({
    preview: `${v.clientName} ${v.decision} ${v.quoteNumber} (${v.total})`,
    reason: ADMIN_REASON,
    body:
      heading({
        eyebrow: accepted ? "Quote accepted" : "Quote declined",
        tone: accepted ? "ok" : "warn",
        title: `${v.clientName} ${v.decision} ${v.title}`,
      }) +
      card({
        title: v.quoteNumber,
        highlightLabel: "Total",
        highlight: v.total,
        rows: [
          ["Client", v.clientName],
          ["Email", v.clientEmail],
          ["Signed as", accepted ? v.acceptedName : ""],
        ],
      }) +
      (!accepted && v.reason ? notice({ tone: "warn", text: `Reason given: ${v.reason}` }) : "") +
      buttons(button({ href: v.adminLink, label: "Open the dashboard" })),
  });
  const text = lines(
    `${v.clientName} ${v.decision} ${v.quoteNumber} (${v.title}), total ${v.total}.`,
    accepted ? `Signed as: ${v.acceptedName}` : v.reason ? `Reason: ${v.reason}` : "",
    v.adminLink,
  );
  return { subject, html, text };
}

function paymentRequest(v) {
  const subject = `Invoice ${v.invoice.invoiceNumber}: ${v.invoice.label} for ${v.title}`;
  const html = shell({
    preview: `${v.invoice.label}: ${v.invoice.amount} due ${v.invoice.dueDate}`,
    reason: CLIENT_REASON,
    body:
      heading({
        eyebrow: "Payment request",
        title: `${v.invoice.label} is ready`,
        intro: `Hi ${v.clientFirstName}, here is the next invoice for ${v.title}.`,
      }) +
      invoiceBlock(v.invoice) +
      card({
        rows: [
          ["Paid so far", v.paidSoFar],
          ["Balance after this payment", v.balanceAfter],
        ],
      }) +
      buttons(
        button({ href: v.invoice.payLink, label: "Pay now" }),
        button({ href: v.invoice.invoiceLink, label: "View invoice", variant: "secondary" }),
      ) +
      small("This email contains a fresh link to your quote. Older links no longer work."),
  });
  const text = lines(
    `Hi ${v.clientFirstName},`,
    `Invoice ${v.invoice.invoiceNumber} (${v.invoice.label}) for ${v.title}: ${v.invoice.amount}, due ${v.invoice.dueDate}.`,
    `Paid so far: ${v.paidSoFar}. Balance after this payment: ${v.balanceAfter}.`,
    `Pay here: ${v.invoice.payLink}`,
  );
  return { subject, html, text };
}

function paymentReceipt(v) {
  const subject = `Receipt: ${v.amount} received for ${v.title}`;
  const html = shell({
    preview: `We received ${v.amount}. Thank you.`,
    reason: CLIENT_REASON,
    body:
      heading({
        eyebrow: "Payment received",
        tone: "ok",
        title: "Thank you, payment received",
        intro: `Hi ${v.clientFirstName}, we've received your ${v.stageLabel.toLowerCase()} payment for ${v.title}.`,
      }) +
      card({
        title: `Receipt · ${v.quoteNumber}`,
        highlightLabel: v.stageLabel,
        highlight: v.amount,
        rows: [
          ["Method", v.method],
          ["Reference", v.reference],
          ["Date", v.paidAt],
          ["Remaining balance", v.complete ? "Fully paid" : v.balance],
        ],
      }) +
      (v.receiptLink
        ? buttons(button({ href: v.receiptLink, label: "View or print receipt" }))
        : "") +
      (v.complete
        ? notice({
            tone: "ok",
            text: "This quote is now fully paid. Thank you for working with OceanicCoder.",
          })
        : ""),
  });
  const text = lines(
    `Hi ${v.clientFirstName},`,
    `We received ${v.amount} (${v.stageLabel}) for ${v.title}.`,
    `Method: ${v.method}. Reference: ${v.reference}. Date: ${v.paidAt}.`,
    v.complete ? "The quote is now fully paid." : `Remaining balance: ${v.balance}.`,
    v.receiptLink ? `Receipt: ${v.receiptLink}` : "",
  );
  return { subject, html, text };
}

function paymentAlert(v) {
  const problem = v.kind === "problem";
  const subject = problem
    ? `Action needed: payment problem on ${v.quoteNumber}`
    : `Paid: ${v.amount} from ${v.clientName} (${v.quoteNumber})`;
  const html = shell({
    preview: problem ? v.problem : `${v.clientName} paid ${v.amount}`,
    reason: ADMIN_REASON,
    body:
      heading({
        eyebrow: problem ? "Payment problem" : "Payment received",
        tone: problem ? "danger" : "ok",
        title: problem ? "A payment needs your attention" : `${v.clientName} paid ${v.amount}`,
      }) +
      (problem ? notice({ tone: "danger", text: v.problem }) : "") +
      card({
        title: v.quoteNumber,
        rows: [
          ["Quote", v.title],
          ["Stage", v.stageLabel],
          ["Amount", v.amount],
          ["Method", v.method],
          ["Reference", v.reference],
          ["Balance", v.balance],
        ],
      }) +
      buttons(button({ href: v.adminLink, label: "Open the dashboard" })),
  });
  const text = lines(
    problem
      ? `Payment problem on ${v.quoteNumber}: ${v.problem}`
      : `${v.clientName} paid ${v.amount} for ${v.stageLabel} on ${v.quoteNumber}.`,
    `Reference: ${v.reference}`,
    v.balance ? `Balance: ${v.balance}` : "",
    v.adminLink,
  );
  return { subject, html, text };
}

module.exports = {
  quoteSent,
  quoteAccepted,
  quoteDecisionAlert,
  paymentRequest,
  paymentReceipt,
  paymentAlert,
};
```

- [ ] **Step 5: Implement `samples.js`**

```js
// Sample data for every quote email: drives the Emails preview tab, the
// "send test to me" button and the template tests.

const T = require("./quoteEmails");

const invoice = {
  invoiceNumber: "Q-2026-0007-INV-1",
  label: "Deposit (60%)",
  amount: "GHS 6,000.00",
  dueDate: "17 Oct 2026",
  payLink: "https://oceaniccoder.dev/q/sample-token/pay/deposit",
  invoiceLink: "https://oceaniccoder.dev/q/sample-token/invoice/deposit",
};

const SAMPLES = {
  quoteSent: () =>
    T.quoteSent({
      clientFirstName: "Kofi",
      quoteNumber: "Q-2026-0007",
      revision: 1,
      title: "Online store with Paystack checkout",
      total: "GHS 10,000.00",
      validUntil: "24 Oct 2026",
      planSummary: "60% deposit, 40% balance",
      link: "https://oceaniccoder.dev/q/sample-token",
    }),
  quoteAccepted: () =>
    T.quoteAccepted({
      clientFirstName: "Kofi",
      quoteNumber: "Q-2026-0007",
      title: "Online store with Paystack checkout",
      acceptedName: "Kofi Mensah",
      invoice,
      link: "https://oceaniccoder.dev/q/sample-token",
    }),
  quoteDecisionAlert: () =>
    T.quoteDecisionAlert({
      decision: "accepted",
      clientName: "Kofi Mensah",
      clientEmail: "kofi@example.com",
      quoteNumber: "Q-2026-0007",
      title: "Online store with Paystack checkout",
      total: "GHS 10,000.00",
      acceptedName: "Kofi Mensah",
      reason: "",
      adminLink: "https://oceaniccoder.dev/admin/dashboard",
    }),
  paymentRequest: () =>
    T.paymentRequest({
      clientFirstName: "Kofi",
      quoteNumber: "Q-2026-0007",
      title: "Online store with Paystack checkout",
      invoice: {
        ...invoice,
        invoiceNumber: "Q-2026-0007-INV-2",
        label: "Balance (40%)",
        amount: "GHS 4,000.00",
      },
      paidSoFar: "GHS 6,000.00",
      balanceAfter: "GHS 0.00",
    }),
  paymentReceipt: () =>
    T.paymentReceipt({
      clientFirstName: "Kofi",
      quoteNumber: "Q-2026-0007",
      title: "Online store with Paystack checkout",
      stageLabel: "Deposit",
      amount: "GHS 6,000.00",
      method: "Mobile Money",
      reference: "Q-2026-0007-1-K7Q2X9PL",
      paidAt: "11 Oct 2026",
      receiptLink: "https://oceaniccoder.dev/receipt/Q-2026-0007-1-K7Q2X9PL?s=sample",
      balance: "GHS 4,000.00",
      complete: false,
    }),
  paymentAlert: () =>
    T.paymentAlert({
      kind: "paid",
      problem: "",
      clientName: "Kofi Mensah",
      quoteNumber: "Q-2026-0007",
      title: "Online store with Paystack checkout",
      stageLabel: "Deposit",
      amount: "GHS 6,000.00",
      method: "Mobile Money",
      reference: "Q-2026-0007-1-K7Q2X9PL",
      balance: "GHS 4,000.00",
      adminLink: "https://oceaniccoder.dev/admin/dashboard",
    }),
  paymentAlertProblem: () =>
    T.paymentAlert({
      kind: "problem",
      problem: "A second payment arrived for a stage that was already paid. Refund it in Paystack.",
      clientName: "Kofi Mensah",
      quoteNumber: "Q-2026-0007",
      title: "Online store with Paystack checkout",
      stageLabel: "Deposit",
      amount: "GHS 6,000.00",
      method: "Card",
      reference: "Q-2026-0007-1-ZZZZZZZZ",
      balance: "",
      adminLink: "https://oceaniccoder.dev/admin/dashboard",
    }),
};

module.exports = { SAMPLES };
```

- [ ] **Step 6: Run the tests to see them pass**

Run: `npx vitest run api/shared/quotes/views.test.js api/shared/email/quoteEmails.test.js`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add api/shared/quotes/views.js api/shared/quotes/views.test.js api/shared/email/quoteEmails.js api/shared/email/samples.js api/shared/email/quoteEmails.test.js
git commit -m "feat(OC-0): add quote view models and branded quote and payment emails"
```

---

### Task 7: Paystack client, notifier and settlement service

**Files:**

- Create: `api/shared/paystack.js`, `api/shared/quotes/notify.js`, `api/shared/quotes/settle.js`, `api/shared/quotes/service.js`
- Test: `api/shared/paystack.test.js`, `api/shared/quotes/settle.test.js`

**Interfaces:**

- Consumes: Tasks 1, 2, 4, 5, 6.
- Produces: `initializeTransaction({email, amountMinor, currency, reference, channels, callbackUrl, metadata})` → `{accessCode, authorizationUrl, reference}`; `verifyTransaction(reference)` → Paystack `data` (`{status, amount, currency, channel, id, paid_at, domain, gateway_response}`); errors carry `.status`.
- `createNotifier({send?, adminEmail?, base?, receiptSecret?})` → `{quoteSent(q, token), quoteAccepted(q, token, stages), decision(q, decision), paymentRequest(q, stage, token, stages), paymentReceived(q, payment, stages), paymentProblem(q, payment, problem)}`, each resolving `{ok, error?}` and never rejecting.
- `settleQuotePayment({repo, locks, verify, notify, reference, now?, secretKey?})` → `{state: "unknown"|"pending"|"success"|"failed"|"duplicate", payment?}`.
- `createServices()` → `{repo, locks, verify, initialize, notify, now}`; `handleQuoteCharge(reference, services?)` → same as settle.

- [ ] **Step 1: Write the failing tests**

`api/shared/paystack.test.js`:

```js
// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const P = await import("./paystack.js");

describe("paystack", () => {
  beforeEach(() => (process.env.PAYSTACK_SECRET_KEY = "sk_test_x"));
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.PAYSTACK_SECRET_KEY;
  });

  it("initialises with the amount and channels from the server", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: true,
          data: {
            access_code: "AC",
            authorization_url: "https://checkout.paystack.com/AC",
            reference: "R",
          },
        }),
      }),
    );
    const r = await P.initializeTransaction({
      email: "a@b.co",
      amountMinor: 6000,
      currency: "GHS",
      reference: "R",
      channels: ["card"],
      callbackUrl: "https://x/cb",
      metadata: { kind: "quote" },
    });
    expect(r).toEqual({
      accessCode: "AC",
      authorizationUrl: "https://checkout.paystack.com/AC",
      reference: "R",
    });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://api.paystack.co/transaction/initialize");
    expect(init.headers.Authorization).toBe("Bearer sk_test_x");
    expect(JSON.parse(init.body)).toMatchObject({
      amount: 6000,
      currency: "GHS",
      channels: ["card"],
      callback_url: "https://x/cb",
    });
  });

  it("throws with the HTTP status on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ status: false, message: "Transaction reference not found" }),
      }),
    );
    await expect(P.verifyTransaction("R")).rejects.toMatchObject({
      status: 404,
      message: "Transaction reference not found",
    });
  });

  it("refuses to run without a secret key", async () => {
    delete process.env.PAYSTACK_SECRET_KEY;
    await expect(P.verifyTransaction("R")).rejects.toThrow(/PAYSTACK_SECRET_KEY/);
  });
});
```

`api/shared/quotes/settle.test.js`:

```js
// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

const { settleQuotePayment } = await import("./settle.js");
const { createFakeRepo, createFakeLocks } = await import("./fakes.js");
const M = await import("./model.js");

const quote = {
  id: "q1",
  quoteNumber: "Q-2026-0001",
  status: "accepted",
  currency: "GHS",
  title: "Store",
  clientName: "Kofi",
  clientEmail: "kofi@example.com",
  totalMinor: 10000,
  schedule: M.DEFAULT_SCHEDULE,
  respondedAt: "2026-10-01T00:00:00Z",
  payState: { due: {} },
};
const pending = (over = {}) => ({
  id: "p1",
  kind: "quote",
  quoteId: "q1",
  quoteNumber: "Q-2026-0001",
  stageId: "deposit",
  amountMinor: 6000,
  currency: "GHS",
  status: "pending",
  paystackReference: "REF1",
  ...over,
});
const tx = (over = {}) => ({
  status: "success",
  amount: 6000,
  currency: "GHS",
  channel: "mobile_money",
  id: 99,
  paid_at: "2026-10-02T00:00:00Z",
  domain: "test",
  ...over,
});

function setup({ payments = [pending()], verifyResult = tx() } = {}) {
  const repo = createFakeRepo({ quotes: [quote], payments });
  const locks = createFakeLocks();
  const notify = {
    paymentReceived: vi.fn().mockResolvedValue({ ok: true }),
    paymentProblem: vi.fn().mockResolvedValue({ ok: true }),
  };
  const verify =
    typeof verifyResult === "function" ? verifyResult : vi.fn().mockResolvedValue(verifyResult);
  const run = (reference = "REF1") =>
    settleQuotePayment({ repo, locks, verify, notify, reference, secretKey: "sk_test_x" });
  return { repo, locks, notify, verify, run };
}

describe("settleQuotePayment", () => {
  it("marks an exact payment paid and sends the receipt once", async () => {
    const { repo, notify, run } = setup();
    expect((await run()).state).toBe("success");
    expect(repo.payments.get("p1")).toMatchObject({
      status: "success",
      method: "momo",
      paystackId: "99",
      paidAt: "2026-10-02T00:00:00Z",
    });
    expect(notify.paymentReceived).toHaveBeenCalledTimes(1);
    expect((await run()).state).toBe("success");
    expect(notify.paymentReceived).toHaveBeenCalledTimes(1);
  });

  it("keeps an abandoned Mobile Money charge pending without taking the lock", async () => {
    const { repo, locks, run } = setup({ verifyResult: tx({ status: "abandoned" }) });
    expect((await run()).state).toBe("pending");
    expect(repo.payments.get("p1").status).toBe("pending");
    expect(locks.held.size).toBe(0);
  });

  it("treats an unknown reference at Paystack as pending", async () => {
    const verify = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("not found"), { status: 404 }));
    const { run } = setup({ verifyResult: verify });
    expect((await run()).state).toBe("pending");
  });

  it("fails an underpayment and alerts the admin", async () => {
    const { repo, notify, run } = setup({ verifyResult: tx({ amount: 5999 }) });
    expect((await run()).state).toBe("failed");
    expect(repo.payments.get("p1").note).toMatch(/underpaid/);
    expect(notify.paymentProblem).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "underpaid",
    );
  });

  it("refuses a test charge on a live key", async () => {
    const { run, notify } = setup({ verifyResult: tx({ domain: "live" }) });
    expect((await run()).state).toBe("failed");
    expect(notify.paymentProblem).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "mode-mismatch",
    );
  });

  it("marks a second successful charge for a paid stage as duplicate", async () => {
    const payments = [pending(), pending({ id: "p2", paystackReference: "REF2" })];
    const { repo, notify, run } = setup({ payments });
    expect((await run("REF1")).state).toBe("success");
    expect((await run("REF2")).state).toBe("duplicate");
    expect(repo.payments.get("p2").status).toBe("duplicate");
    expect(notify.paymentProblem).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "duplicate",
    );
  });

  it("records a Paystack failure", async () => {
    const { repo, run } = setup({
      verifyResult: tx({ status: "failed", gateway_response: "Declined" }),
    });
    expect((await run()).state).toBe("failed");
    expect(repo.payments.get("p1").note).toMatch(/Declined/);
  });

  it("returns unknown for references that are not quote payments", async () => {
    const { run } = setup({ payments: [pending({ kind: "invoice" })] });
    expect((await run()).state).toBe("unknown");
  });

  it("releases the settle lock when something throws, so a retry can finish", async () => {
    const { repo, locks, run } = setup();
    const original = repo.updatePayment;
    repo.updatePayment = vi.fn().mockRejectedValueOnce(new Error("appwrite down"));
    await expect(run()).rejects.toThrow("appwrite down");
    expect(locks.held.size).toBe(0);
    repo.updatePayment = original;
    expect((await run()).state).toBe("success");
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run api/shared/paystack.test.js api/shared/quotes/settle.test.js`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement `paystack.js`**

```js
// Paystack REST calls made with the secret key. The amount always comes from
// the server; the browser only ever receives the access code.

const BASE = "https://api.paystack.co";

async function call(path, { method = "GET", body } = {}) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error("PAYSTACK_SECRET_KEY is not configured");
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.status === false) {
    throw Object.assign(new Error(json.message || `Paystack ${res.status}`), {
      status: res.status,
    });
  }
  return json.data;
}

async function initializeTransaction({
  email,
  amountMinor,
  currency,
  reference,
  channels,
  callbackUrl,
  metadata,
}) {
  const data = await call("/transaction/initialize", {
    method: "POST",
    body: {
      email,
      amount: amountMinor,
      currency,
      reference,
      channels,
      callback_url: callbackUrl,
      metadata,
    },
  });
  return {
    accessCode: data.access_code,
    authorizationUrl: data.authorization_url,
    reference: data.reference,
  };
}

function verifyTransaction(reference) {
  return call(`/transaction/verify/${encodeURIComponent(reference)}`);
}

module.exports = { initializeTransaction, verifyTransaction };
```

- [ ] **Step 4: Implement `notify.js`**

```js
// Builds and sends each quote email. Never rejects: an email failure is
// logged by the caller from the returned { ok, error }.

const T = require("../email/quoteEmails");
const V = require("./views");
const { sendEmail } = require("../email/send");

function createNotifier({
  send = sendEmail,
  adminEmail = process.env.RESEND_TO_EMAIL,
  base = V.siteBase(),
  receiptSecret = process.env.RECEIPT_SIGNING_SECRET,
} = {}) {
  const safe = async (fn) => {
    try {
      return await fn();
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };
  const to = (address, mail) =>
    address
      ? send({ to: address, ...mail })
      : Promise.resolve({ ok: false, error: "no recipient" });

  return {
    quoteSent: (q, token) =>
      safe(() => to(q.clientEmail, T.quoteSent(V.quoteSentView(q, token, base)))),
    quoteAccepted: (q, token, stages) =>
      safe(() => to(q.clientEmail, T.quoteAccepted(V.acceptedView(q, token, stages, base)))),
    decision: (q, decision) =>
      safe(() => to(adminEmail, T.quoteDecisionAlert(V.decisionView(q, decision, base)))),
    paymentRequest: (q, stage, token, stages) =>
      safe(() => to(q.clientEmail, T.paymentRequest(V.requestView(q, stage, token, stages, base)))),
    paymentReceived: (q, p, stages) =>
      safe(async () => {
        const [client, admin] = await Promise.all([
          to(
            p.clientEmail || q.clientEmail,
            T.paymentReceipt(V.receiptEmailView(q, p, stages, base, receiptSecret)),
          ),
          to(adminEmail, T.paymentAlert(V.alertView(q, p, stages, "paid", null, base))),
        ]);
        return client.ok && admin.ok
          ? { ok: true }
          : { ok: false, error: client.error || admin.error };
      }),
    paymentProblem: (q, p, problem) =>
      safe(() => to(adminEmail, T.paymentAlert(V.alertView(q, p, null, "problem", problem, base)))),
  };
}

module.exports = { createNotifier };
```

- [ ] **Step 5: Implement `settle.js`**

```js
// Settles one quote payment reference. Called by the webhook, the return-page
// check and polling, which can all arrive within the same second; the lock
// documents make sure exactly one of them records the payment and emails.

const M = require("./model");
const S = require("./settlement");

async function settleQuotePayment({
  repo,
  locks,
  verify,
  notify,
  reference,
  now = () => new Date().toISOString(),
  secretKey = process.env.PAYSTACK_SECRET_KEY || "",
}) {
  const payment = await repo.findPaymentByReference(reference);
  if (!payment || payment.kind !== "quote") return { state: "unknown" };
  if (payment.status !== "pending") return { state: payment.status, payment };

  let tx;
  try {
    tx = await verify(reference);
  } catch (err) {
    // Paystack doesn't know the reference until the customer reaches checkout.
    if (err.status === 400 || err.status === 404) return { state: "pending", payment };
    throw err;
  }

  const mapped = S.mapPaystackStatus(tx.status);
  if (mapped === "pending") return { state: "pending", payment };

  const settleKey = `settle:${reference}`;
  if (!(await locks.take(settleKey))) {
    const current = await repo.findPaymentByReference(reference);
    return { state: current.status, payment: current };
  }

  let stageKey = null;
  try {
    const quote = await repo.get(payment.quoteId);
    const gateway = {
      channel: tx.channel || "",
      method: S.methodFromChannel(tx.channel),
      paystackId: String(tx.id || ""),
    };

    if (mapped === "failed") {
      const p = await repo.updatePayment(payment.id, {
        ...gateway,
        status: "failed",
        note: `Paystack: ${tx.gateway_response || tx.status}`.slice(0, 300),
      });
      return { state: "failed", payment: p };
    }

    if (tx.domain && tx.domain !== S.keyMode(secretKey)) {
      const p = await repo.updatePayment(payment.id, {
        ...gateway,
        status: "failed",
        note: "mode-mismatch",
      });
      await notify.paymentProblem(quote, p, "mode-mismatch");
      return { state: "failed", payment: p };
    }

    const payments = await repo.listPayments(quote.quoteNumber);
    const stage = M.stageStates(quote, payments).find((s) => s.id === payment.stageId);
    const check = S.checkSettlement({
      expectedMinor: stage ? stage.amountMinor : 0,
      expectedCurrency: quote.currency,
      paidMinor: tx.amount,
      paidCurrency: tx.currency,
    });
    if (!check.ok) {
      const p = await repo.updatePayment(payment.id, {
        ...gateway,
        status: "failed",
        note: check.reason,
      });
      await notify.paymentProblem(quote, p, check.reason);
      return { state: "failed", payment: p };
    }

    stageKey = `stage:${quote.id}:${stage.id}`;
    if (!(await locks.take(stageKey))) {
      stageKey = null; // held by the earlier payment; not ours to release
      const p = await repo.updatePayment(payment.id, {
        ...gateway,
        status: "duplicate",
        note: "stage already paid",
      });
      await notify.paymentProblem(quote, p, "duplicate");
      return { state: "duplicate", payment: p };
    }

    const p = await repo.updatePayment(payment.id, {
      ...gateway,
      status: "success",
      paidAt: tx.paid_at || now(),
    });
    const after = M.stageStates(quote, [...payments.filter((x) => x.id !== p.id), p]);
    await notify.paymentReceived(quote, p, after);
    return { state: "success", payment: p };
  } catch (err) {
    if (stageKey) await locks.release(stageKey);
    await locks.release(settleKey);
    throw err;
  }
}

module.exports = { settleQuotePayment };
```

- [ ] **Step 6: Implement `service.js`**

```js
// Wires the real dependencies for the quote functions and the webhook.

const { getDatabases } = require("../appwrite");
const { createQuoteRepo } = require("./repo");
const { createLocks } = require("../locks");
const { createNotifier } = require("./notify");
const { initializeTransaction, verifyTransaction } = require("../paystack");
const { settleQuotePayment } = require("./settle");

function createServices() {
  const db = getDatabases();
  return {
    repo: createQuoteRepo(db),
    locks: createLocks(db),
    verify: verifyTransaction,
    initialize: initializeTransaction,
    notify: createNotifier(),
    now: () => new Date(),
  };
}

async function handleQuoteCharge(reference, services = createServices()) {
  return settleQuotePayment({ ...services, now: () => services.now().toISOString(), reference });
}

module.exports = { createServices, handleQuoteCharge };
```

- [ ] **Step 7: Run the tests to see them pass**

Run: `npx vitest run api/shared/paystack.test.js api/shared/quotes/settle.test.js`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add api/shared/paystack.js api/shared/paystack.test.js api/shared/quotes/notify.js api/shared/quotes/settle.js api/shared/quotes/settle.test.js api/shared/quotes/service.js
git commit -m "feat(OC-0): settle quote payments exactly once with Paystack verification"
```

---

### Task 8: HTTP helpers and the `quote-admin` function

**Files:**

- Create: `api/shared/http.js`, `api/quote-admin/index.js`, `api/quote-admin/actions.js`, `api/quote-admin/function.json`
- Test: `api/shared/http.test.js`, `api/quote-admin/quote-admin.test.js`

**Interfaces:**

- Consumes: Tasks 1, 2, 4 (fakes), 6 (`adminQuoteView`, `summarize`, `paymentView`, `quoteLink`), 7 (`createServices`, notifier shape); `requireAdmin(context, req)` from `api/shared/adminAuth.js` → `{user}` or `{status, error}`.
- Produces (http): `HttpError(status, message, extra?)`, `send(context, status, body)`, `readJson(req)` → body or throws `HttpError(413|400)`, `handleError(context, err, label)`, `str(v, max)`.
- Produces (endpoint): `POST /api/quote-admin` with `{action, ...}`. Actions and responses:
  - `list` → `{quotes: QuoteSummary[]}`
  - `get {id}`, `create {draft}`, `save {id, draft}`, `revise {id}`, `cancel {id}`, `recordManual {id, stageId, method, note}` → `{quote, stages, payments}`
  - `send {id}`, `rotate {id}`, `requestStage {id, stageId}` → `{quote, stages, payments, link, emailed}`
  - Errors: `{error, fields?}` with 400/401/404/409.
- `createHandler({requireAdmin, services})` is exported for tests.

- [ ] **Step 1: Write the failing tests**

`api/shared/http.test.js`:

```js
// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

const H = await import("./http.js");

describe("http helpers", () => {
  it("sends JSON with no-store", () => {
    const context = {};
    H.send(context, 201, { a: 1 });
    expect(context.res).toMatchObject({ status: 201, body: '{"a":1}' });
    expect(context.res.headers["Cache-Control"]).toBe("no-store");
  });
  it("rejects large and non-object bodies", () => {
    expect(() => H.readJson({ rawBody: "x".repeat(70000), body: {} })).toThrow(/too large/);
    expect(() => H.readJson({ body: "text" })).toThrow(/JSON/);
    expect(H.readJson({ body: { a: 1 } })).toEqual({ a: 1 });
  });
  it("maps HttpError to its status and hides other errors", () => {
    const context = { log: { error: vi.fn() } };
    H.handleError(context, new H.HttpError(409, "Nope", { fields: { a: "b" } }), "t");
    expect(context.res.status).toBe(409);
    expect(JSON.parse(context.res.body)).toEqual({ error: "Nope", fields: { a: "b" } });
    H.handleError(context, new Error("secret detail"), "t");
    expect(context.res.status).toBe(500);
    expect(context.res.body).not.toContain("secret detail");
  });
});
```

`api/quote-admin/quote-admin.test.js`:

```js
// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

const { createHandler } = await import("./index.js");
const { createFakeRepo, createFakeLocks } = await import("../shared/quotes/fakes.js");
const M = await import("../shared/quotes/model.js");

const NOW = new Date("2026-10-10T09:00:00.000Z");
const draft = {
  clientName: "Kofi Mensah",
  clientEmail: "kofi@example.com",
  currency: "GHS",
  title: "Online store",
  items: [{ id: "item-1", description: "Store build", qty: 1, unitMinor: 1000000 }],
  discountMinor: 0,
  schedule: M.DEFAULT_SCHEDULE,
  validDays: 14,
  inquiryId: "inq-1",
};

function setup({ admin = true, quotes = [], payments = [] } = {}) {
  const repo = createFakeRepo({ quotes, payments });
  const locks = createFakeLocks();
  const notify = {
    quoteSent: vi.fn().mockResolvedValue({ ok: true }),
    paymentRequest: vi.fn().mockResolvedValue({ ok: true }),
    paymentReceived: vi.fn().mockResolvedValue({ ok: true }),
  };
  const handler = createHandler({
    requireAdmin: async () =>
      admin ? { user: { email: "illona@oceaniccoder.dev" } } : { status: 401, error: "Sign in" },
    services: () => ({ repo, locks, notify, now: () => NOW }),
  });
  const call = async (body) => {
    const context = { log: { error: vi.fn(), info: vi.fn() } };
    await handler(context, { method: "POST", body, headers: {} });
    return { status: context.res.status, body: JSON.parse(context.res.body) };
  };
  return { repo, locks, notify, call };
}

async function sentQuote(t) {
  const created = await t.call({ action: "create", draft });
  const sent = await t.call({ action: "send", id: created.body.quote.id });
  return sent;
}

describe("quote-admin", () => {
  it("refuses callers who are not the admin", async () => {
    expect((await setup({ admin: false }).call({ action: "list" })).status).toBe(401);
  });

  it("rejects unknown actions", async () => {
    expect((await setup().call({ action: "explode" })).status).toBe(400);
  });

  it("creates a draft with server-computed totals", async () => {
    const r = await setup().call({ action: "create", draft: { ...draft, totalMinor: 1 } });
    expect(r.status).toBe(200);
    expect(r.body.quote).toMatchObject({
      status: "draft",
      revision: 1,
      totalMinor: 1000000,
      quoteNumber: "Q-2026-0001",
    });
    expect(r.body.stages.map((s) => s.amountMinor)).toEqual([600000, 400000]);
  });

  it("returns field errors for a bad draft", async () => {
    const r = await setup().call({
      action: "create",
      draft: { ...draft, schedule: [{ id: "a", label: "A", percent: 50 }] },
    });
    expect(r.status).toBe(400);
    expect(r.body.fields.schedule).toMatch(/100%/);
  });

  it("sends: issues a link, sets validity, marks the inquiry quoted and emails the client", async () => {
    const t = setup();
    const r = await sentQuote(t);
    expect(r.status).toBe(200);
    expect(r.body.link).toMatch(/^https:\/\/oceaniccoder\.dev\/q\/[A-Za-z0-9_-]{43}$/);
    expect(r.body.quote).toMatchObject({
      status: "sent",
      hasLink: true,
      validUntil: "2026-10-24T09:00:00.000Z",
    });
    expect(r.body.quote).not.toHaveProperty("tokenHash");
    expect(t.repo.inquiryStatus["inq-1"]).toBe("quoted");
    expect(t.notify.quoteSent).toHaveBeenCalledTimes(1);
    expect(r.body.emailed).toBe(true);
  });

  it("only edits drafts", async () => {
    const t = setup();
    const sent = await sentQuote(t);
    expect((await t.call({ action: "save", id: sent.body.quote.id, draft })).status).toBe(409);
  });

  it("revise returns to draft, bumps the revision and kills the link", async () => {
    const t = setup();
    const sent = await sentQuote(t);
    const r = await t.call({ action: "revise", id: sent.body.quote.id });
    expect(r.body.quote).toMatchObject({ status: "draft", revision: 2, hasLink: false });
  });

  it("will not cancel a quote with a successful payment", async () => {
    const t = setup();
    const sent = await sentQuote(t);
    const id = sent.body.quote.id;
    await t.repo.update(id, { status: "accepted", respondedAt: NOW.toISOString() });
    await t.repo.createPayment({
      kind: "quote",
      quoteNumber: "Q-2026-0001",
      stageId: "deposit",
      status: "success",
    });
    expect((await t.call({ action: "cancel", id })).status).toBe(409);
  });

  it("requests a later stage: marks it due, rotates the link and emails the invoice", async () => {
    const t = setup();
    const sent = await sentQuote(t);
    const id = sent.body.quote.id;
    await t.repo.update(id, { status: "accepted", respondedAt: NOW.toISOString() });
    expect((await t.call({ action: "requestStage", id, stageId: "deposit" })).status).toBe(409);
    const r = await t.call({ action: "requestStage", id, stageId: "balance" });
    expect(r.status).toBe(200);
    expect(r.body.stages[1].state).toBe("due");
    expect(r.body.link).not.toBe(sent.body.link);
    expect(t.notify.paymentRequest).toHaveBeenCalledTimes(1);
  });

  it("records a manual payment once per stage", async () => {
    const t = setup();
    const sent = await sentQuote(t);
    const id = sent.body.quote.id;
    await t.repo.update(id, { status: "accepted", respondedAt: NOW.toISOString() });
    const r = await t.call({
      action: "recordManual",
      id,
      stageId: "deposit",
      method: "bank",
      note: "GCB transfer",
    });
    expect(r.status).toBe(200);
    expect(r.body.stages[0].state).toBe("paid");
    expect(r.body.payments[0]).toMatchObject({
      method: "bank",
      status: "success",
      recordedBy: "illona@oceaniccoder.dev",
      amountMinor: 600000,
    });
    expect(t.notify.paymentReceived).toHaveBeenCalledTimes(1);
    expect(
      (await t.call({ action: "recordManual", id, stageId: "deposit", method: "bank" })).status,
    ).toBe(409);
    expect(
      (await t.call({ action: "recordManual", id, stageId: "balance", method: "card" })).status,
    ).toBe(400);
  });

  it("lists quotes with amounts paid", async () => {
    const t = setup();
    const sent = await sentQuote(t);
    await t.repo.update(sent.body.quote.id, { status: "accepted", respondedAt: NOW.toISOString() });
    await t.repo.createPayment({
      kind: "quote",
      quoteNumber: "Q-2026-0001",
      stageId: "deposit",
      status: "success",
    });
    const r = await t.call({ action: "list" });
    expect(r.body.quotes[0]).toMatchObject({
      quoteNumber: "Q-2026-0001",
      paidMinor: 600000,
      nextDue: null,
    });
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run api/shared/http.test.js api/quote-admin`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement `api/shared/http.js`**

```js
// Small helpers shared by the quote functions: JSON responses, a body size
// limit, and an error type that carries its HTTP status.

class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

const HEADERS = { "Content-Type": "application/json", "Cache-Control": "no-store" };
const MAX_BODY = 64 * 1024;

function send(context, status, body) {
  context.res = { status, headers: HEADERS, body: JSON.stringify(body) };
}

function readJson(req) {
  const raw =
    typeof req.rawBody === "string" && req.rawBody ? req.rawBody : JSON.stringify(req.body ?? "");
  if (raw.length > MAX_BODY) throw new HttpError(413, "Request is too large.");
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body))
    throw new HttpError(400, "Send a JSON body.");
  return req.body;
}

function handleError(context, err, label) {
  if (err instanceof HttpError)
    return send(context, err.status, { error: err.message, ...err.extra });
  context.log.error(`${label}: ${err && (err.stack || err.message)}`);
  return send(context, 500, { error: "Something went wrong on our side. Please try again." });
}

function str(v, max = 10000) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

module.exports = { HttpError, send, readJson, handleError, str };
```

- [ ] **Step 4: Implement `api/quote-admin/actions.js`**

```js
// The admin's quote actions. Each takes the services, the request input and
// the signed-in admin, and returns the response body or throws HttpError.

const { HttpError, str } = require("../shared/http");
const M = require("../shared/quotes/model");
const V = require("../shared/quotes/views");
const { newToken, hashToken } = require("../shared/tokens");

const MANUAL_METHODS = ["bank", "momo", "cash"];

async function load(svc, id) {
  const quote = typeof id === "string" && id ? await svc.repo.get(id) : null;
  if (!quote) throw new HttpError(404, "Quote not found.");
  return quote;
}

async function detail(svc, quote, extra = {}) {
  const payments = await svc.repo.listPayments(quote.quoteNumber);
  return {
    quote: V.adminQuoteView(quote),
    stages: M.stageStates(quote, payments, svc.now().getTime()),
    payments: payments.map(V.paymentView),
    ...extra,
  };
}

function validated(draft) {
  const r = M.validateDraft(draft);
  if (!r.ok) throw new HttpError(400, "Fix the highlighted fields.", { fields: r.errors });
  return { ...r.value, ...M.computeTotals(r.value.items, r.value.discountMinor) };
}

async function stageFor(svc, quote, stageId) {
  const payments = await svc.repo.listPayments(quote.quoteNumber);
  const stages = M.stageStates(quote, payments, svc.now().getTime());
  const stage = stages.find((s) => s.id === stageId);
  if (!stage) throw new HttpError(404, "That payment stage doesn't exist on this quote.");
  return { stage, stages, payments };
}

const actions = {
  async list(svc) {
    const [quotes, payments] = await Promise.all([svc.repo.list(), svc.repo.listQuotePayments()]);
    const byNumber = {};
    for (const p of payments) (byNumber[p.quoteNumber] ||= []).push(p);
    const now = svc.now().getTime();
    return {
      quotes: quotes.map((q) =>
        V.summarize(q, M.stageStates(q, byNumber[q.quoteNumber] || [], now)),
      ),
    };
  },

  async get(svc, input) {
    return detail(svc, await load(svc, input.id));
  },

  async create(svc, input) {
    const fields = validated(input.draft);
    const quote = await svc.repo.create({
      ...fields,
      status: "draft",
      revision: 1,
      payState: { due: {} },
    });
    return detail(svc, quote);
  },

  async save(svc, input) {
    const quote = await load(svc, input.id);
    if (quote.status !== "draft")
      throw new HttpError(409, "Only drafts can be edited. Revise the quote first.");
    return detail(svc, await svc.repo.update(quote.id, validated(input.draft)));
  },

  async send(svc, input) {
    const quote = await load(svc, input.id);
    if (quote.status !== "draft") throw new HttpError(409, "Only drafts can be sent.");
    const problem = M.sendError(quote);
    if (problem) throw new HttpError(400, problem);
    const token = newToken();
    const now = svc.now();
    const updated = await svc.repo.update(quote.id, {
      status: "sent",
      tokenHash: hashToken(token),
      sentAt: now.toISOString(),
      validUntil: new Date(now.getTime() + quote.validDays * M.DAY_MS).toISOString(),
      viewedAt: null,
    });
    await svc.repo.setInquiryStatus(updated.inquiryId, "quoted");
    const mail = await svc.notify.quoteSent(updated, token);
    return detail(svc, updated, { link: V.quoteLink(token), emailed: mail.ok });
  },

  async revise(svc, input) {
    const quote = await load(svc, input.id);
    if (!M.canMove(quote.status, "draft")) throw new HttpError(409, "This quote can't be revised.");
    const updated = await svc.repo.update(quote.id, {
      status: "draft",
      revision: quote.revision + 1,
      tokenHash: null,
      viewedAt: null,
      sentAt: null,
      validUntil: null,
    });
    return detail(svc, updated);
  },

  async cancel(svc, input) {
    const quote = await load(svc, input.id);
    if (!M.canMove(quote.status, "cancelled"))
      throw new HttpError(409, "This quote can't be cancelled.");
    const payments = await svc.repo.listPayments(quote.quoteNumber);
    if (payments.some((p) => p.status === "success")) {
      throw new HttpError(
        409,
        "A payment has been made on this quote, so it can't be cancelled. Refund first.",
      );
    }
    return detail(svc, await svc.repo.update(quote.id, { status: "cancelled", tokenHash: null }));
  },

  async rotate(svc, input) {
    const quote = await load(svc, input.id);
    if (!["sent", "accepted"].includes(quote.status))
      throw new HttpError(409, "Only sent or accepted quotes have a link.");
    const token = newToken();
    const updated = await svc.repo.update(quote.id, { tokenHash: hashToken(token) });
    return detail(svc, updated, { link: V.quoteLink(token), emailed: false });
  },

  async requestStage(svc, input) {
    const quote = await load(svc, input.id);
    if (quote.status !== "accepted")
      throw new HttpError(409, "The client hasn't accepted this quote yet.");
    const { stage } = await stageFor(svc, quote, input.stageId);
    if (stage.index === 0) throw new HttpError(409, "The deposit is already due from acceptance.");
    if (stage.state === "paid") throw new HttpError(409, "This stage is already paid.");
    const due = { ...((quote.payState && quote.payState.due) || {}) };
    due[stage.id] = due[stage.id] || svc.now().toISOString();
    const token = newToken();
    const updated = await svc.repo.update(quote.id, {
      payState: { due },
      tokenHash: hashToken(token),
    });
    const after = M.stageStates(
      updated,
      await svc.repo.listPayments(updated.quoteNumber),
      svc.now().getTime(),
    );
    const mail = await svc.notify.paymentRequest(updated, after[stage.index], token, after);
    return detail(svc, updated, { link: V.quoteLink(token), emailed: mail.ok });
  },

  async recordManual(svc, input, { admin }) {
    const quote = await load(svc, input.id);
    if (quote.status !== "accepted")
      throw new HttpError(409, "The client hasn't accepted this quote yet.");
    if (!MANUAL_METHODS.includes(input.method))
      throw new HttpError(400, "Method must be bank, momo or cash.");
    const { stage, payments } = await stageFor(svc, quote, input.stageId);
    if (stage.state === "paid") throw new HttpError(409, "This stage is already paid.");
    if (!(await svc.locks.take(`stage:${quote.id}:${stage.id}`)))
      throw new HttpError(409, "This stage is already paid.");
    const payment = await svc.repo.createPayment(
      M.paymentRow(quote, stage, {
        status: "success",
        method: input.method,
        paystackReference: M.paymentReference(quote.quoteNumber, stage.index),
        paidAt: svc.now().toISOString(),
        note: str(input.note, 300),
        recordedBy: (admin && (admin.email || admin.userDetails || admin.name)) || "admin",
      }),
    );
    const after = M.stageStates(quote, [...payments, payment], svc.now().getTime());
    await svc.notify.paymentReceived(quote, payment, after);
    return detail(svc, quote);
  },
};

module.exports = actions;
```

- [ ] **Step 5: Implement `api/quote-admin/index.js` and `function.json`**

```js
// POST /api/quote-admin — every admin action on quotes, behind the admin
// session. Totals, numbers, tokens and status moves are all decided here.

const { requireAdmin } = require("../shared/adminAuth");
const { send, readJson, handleError } = require("../shared/http");
const { createServices } = require("../shared/quotes/service");
const actions = require("./actions");

function createHandler(deps) {
  return async function (context, req) {
    const auth = await deps.requireAdmin(context, req);
    if (!auth || !auth.user)
      return send(context, (auth && auth.status) || 401, {
        error: (auth && auth.error) || "Sign in again.",
      });
    try {
      const { action, ...input } = readJson(req);
      const fn = Object.prototype.hasOwnProperty.call(actions, action) ? actions[action] : null;
      if (!fn) return send(context, 400, { error: `Unknown action: ${String(action)}` });
      const body = await fn(deps.services(), input, { admin: auth.user });
      return send(context, 200, body);
    } catch (err) {
      return handleError(context, err, "quote-admin");
    }
  };
}

module.exports = createHandler({ requireAdmin, services: createServices });
module.exports.createHandler = createHandler;
```

`api/quote-admin/function.json`:

```json
{
  "bindings": [
    {
      "authLevel": "anonymous",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["post"]
    },
    { "type": "http", "direction": "out", "name": "res" }
  ]
}
```

- [ ] **Step 6: Run the tests to see them pass**

Run: `npx vitest run api/shared/http.test.js api/quote-admin`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add api/shared/http.js api/shared/http.test.js api/quote-admin
git commit -m "feat(OC-0): add admin quote actions behind the admin session"
```

---

### Task 9: `quote-view` and `quote-respond`

**Files:**

- Create: `api/quote-view/index.js`, `api/quote-view/function.json`, `api/quote-respond/index.js`, `api/quote-respond/function.json`
- Test: `api/quote-view/quote-view.test.js`, `api/quote-respond/quote-respond.test.js`

**Interfaces:**

- Consumes: Tasks 1, 2, 4 (fakes), 6 (`clientQuoteView`), 8 (`http.js`); `clientIp(req)` from `api/shared/turnstile.js`.
- Produces: `GET /api/quote-view?token=&preview=1` → `200 {quote: ClientQuote}` or `404 {error, inactive: true}`. `POST /api/quote-respond {token, action: "accept"|"decline", name?, agree?, reason?}` → `200 {quote: ClientQuote}`; errors `400` (validation), `404` (inactive), `409` (expired or wrong status).

- [ ] **Step 1: Write the failing tests**

`api/quote-view/quote-view.test.js`:

```js
// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

const { createHandler } = await import("./index.js");
const { createFakeRepo } = await import("../shared/quotes/fakes.js");
const { hashToken, newToken } = await import("../shared/tokens.js");
const M = await import("../shared/quotes/model.js");

const TOKEN = newToken();
const NOW = new Date("2026-10-10T09:00:00.000Z");
const base = {
  id: "q1",
  quoteNumber: "Q-2026-0001",
  revision: 1,
  status: "sent",
  currency: "GHS",
  title: "Store",
  clientName: "Kofi",
  clientEmail: "kofi@example.com",
  items: [{ id: "item-1", description: "Build", qty: 1, unitMinor: 10000 }],
  subtotalMinor: 10000,
  discountMinor: 0,
  totalMinor: 10000,
  schedule: M.DEFAULT_SCHEDULE,
  validUntil: "2026-10-20T00:00:00.000Z",
  payState: { due: {} },
  tokenHash: hashToken(TOKEN),
};

function setup(quote = base) {
  const repo = createFakeRepo({ quotes: [quote] });
  const handler = createHandler({ services: () => ({ repo, now: () => NOW }) });
  const call = async (query) => {
    const context = { log: { error: vi.fn() } };
    await handler(context, { method: "GET", query });
    return { status: context.res.status, body: JSON.parse(context.res.body) };
  };
  return { repo, call };
}

describe("quote-view", () => {
  it("returns the client view and records the first view", async () => {
    const t = setup();
    const r = await t.call({ token: TOKEN });
    expect(r.status).toBe(200);
    expect(r.body.quote).toMatchObject({ quoteNumber: "Q-2026-0001", status: "sent" });
    expect(JSON.stringify(r.body)).not.toContain(base.tokenHash);
    expect(t.repo.quotes.get("q1").viewedAt).toBe(NOW.toISOString());
  });

  it("does not record a view for the admin preview", async () => {
    const t = setup();
    await t.call({ token: TOKEN, preview: "1" });
    expect(t.repo.quotes.get("q1").viewedAt).toBeUndefined();
  });

  it.each([{ token: "bad" }, { token: newToken() }, {}])("treats %j as inactive", async (query) => {
    const r = await setup().call(query);
    expect(r).toMatchObject({ status: 404, body: { inactive: true } });
  });

  it("treats drafts and cancelled quotes as inactive", async () => {
    expect((await setup({ ...base, status: "draft" }).call({ token: TOKEN })).status).toBe(404);
    expect((await setup({ ...base, status: "cancelled" }).call({ token: TOKEN })).status).toBe(404);
  });

  it("old token after revise is inactive", async () => {
    const t = setup();
    await t.repo.update("q1", { status: "draft", tokenHash: null });
    expect((await t.call({ token: TOKEN })).status).toBe(404);
  });

  it("flips a sent quote past its validity to expired", async () => {
    const t = setup({ ...base, validUntil: "2026-10-09T00:00:00.000Z" });
    const r = await t.call({ token: TOKEN });
    expect(r.body.quote.status).toBe("expired");
    expect(t.repo.quotes.get("q1").status).toBe("expired");
  });
});
```

`api/quote-respond/quote-respond.test.js`:

```js
// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

const { createHandler } = await import("./index.js");
const { createFakeRepo } = await import("../shared/quotes/fakes.js");
const { hashToken, newToken } = await import("../shared/tokens.js");
const M = await import("../shared/quotes/model.js");

const TOKEN = newToken();
const NOW = new Date("2026-10-10T09:00:00.000Z");
const base = {
  id: "q1",
  quoteNumber: "Q-2026-0001",
  revision: 1,
  status: "sent",
  currency: "GHS",
  title: "Store",
  clientName: "Kofi",
  clientEmail: "kofi@example.com",
  inquiryId: "inq-1",
  items: [{ id: "item-1", description: "Build", qty: 1, unitMinor: 10000 }],
  subtotalMinor: 10000,
  discountMinor: 0,
  totalMinor: 10000,
  schedule: M.DEFAULT_SCHEDULE,
  terms: "Pay on time",
  validUntil: "2026-10-20T00:00:00.000Z",
  payState: { due: {} },
  tokenHash: hashToken(TOKEN),
};

function setup(quote = base) {
  const repo = createFakeRepo({ quotes: [quote] });
  const notify = {
    quoteAccepted: vi.fn().mockResolvedValue({ ok: true }),
    decision: vi.fn().mockResolvedValue({ ok: true }),
  };
  const handler = createHandler({ services: () => ({ repo, notify, now: () => NOW }) });
  const call = async (body) => {
    const context = { log: { error: vi.fn() } };
    await handler(context, {
      method: "POST",
      body: { token: TOKEN, ...body },
      headers: { "x-forwarded-for": "1.2.3.4:555", "user-agent": "Test UA" },
    });
    return { status: context.res.status, body: JSON.parse(context.res.body) };
  };
  return { repo, notify, call };
}

describe("quote-respond accept", () => {
  it("records evidence, emails both sides and marks the inquiry won", async () => {
    const t = setup();
    const r = await t.call({ action: "accept", name: "Kofi Mensah", agree: true });
    expect(r.status).toBe(200);
    expect(r.body.quote).toMatchObject({ status: "accepted", acceptedName: "Kofi Mensah" });
    expect(r.body.quote.stages[0].state).toBe("due");
    const stored = t.repo.quotes.get("q1");
    expect(stored.acceptedIpHash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored.acceptedUa).toBe("Test UA");
    expect(JSON.parse(stored.acceptedSnapshot)).toMatchObject({
      totalMinor: 10000,
      terms: "Pay on time",
    });
    expect(t.notify.quoteAccepted).toHaveBeenCalledTimes(1);
    expect(t.notify.decision).toHaveBeenCalledWith(expect.anything(), "accepted");
    expect(t.repo.inquiryStatus["inq-1"]).toBe("won");
  });

  it("idempotent accept: a second accept returns the quote without emailing again", async () => {
    const t = setup();
    await t.call({ action: "accept", name: "Kofi Mensah", agree: true });
    const r = await t.call({ action: "accept", name: "Kofi Mensah", agree: true });
    expect(r.status).toBe(200);
    expect(t.notify.quoteAccepted).toHaveBeenCalledTimes(1);
  });

  it("requires a typed name and the agreement box", async () => {
    expect((await setup().call({ action: "accept", name: "Ko", agree: true })).status).toBe(400);
    expect(
      (await setup().call({ action: "accept", name: "Kofi Mensah", agree: false })).status,
    ).toBe(400);
  });

  it("expired: refuses after validUntil and stores the expiry", async () => {
    const t = setup({ ...base, validUntil: "2026-10-09T00:00:00.000Z" });
    const r = await t.call({ action: "accept", name: "Kofi Mensah", agree: true });
    expect(r.status).toBe(409);
    expect(r.body.error).toMatch(/expired/);
    expect(t.repo.quotes.get("q1").status).toBe("expired");
  });
});

describe("quote-respond decline", () => {
  it("stores the reason and alerts the admin", async () => {
    const t = setup();
    const r = await t.call({ action: "decline", reason: "Budget" });
    expect(r.body.quote.status).toBe("declined");
    expect(t.repo.quotes.get("q1").declineReason).toBe("Budget");
    expect(t.notify.decision).toHaveBeenCalledWith(expect.anything(), "declined");
    expect(t.repo.inquiryStatus["inq-1"]).toBe("declined");
  });

  it("can't decline an accepted quote", async () => {
    const t = setup();
    await t.call({ action: "accept", name: "Kofi Mensah", agree: true });
    expect((await t.call({ action: "decline" })).status).toBe(409);
  });

  it("rejects an unknown action and a bad token", async () => {
    expect((await setup().call({ action: "maybe" })).status).toBe(400);
    expect((await setup().call({ action: "accept", token: "bad" })).status).toBe(404);
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run api/quote-view api/quote-respond`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement `api/quote-view/index.js`**

```js
// GET /api/quote-view?token= — the client's quote page data. Public, keyed by
// the link token. Expiry is applied here, lazily, so no timer job is needed.

const { send, handleError } = require("../shared/http");
const { isTokenShape, hashToken } = require("../shared/tokens");
const M = require("../shared/quotes/model");
const V = require("../shared/quotes/views");
const { createServices } = require("../shared/quotes/service");

const INACTIVE = { error: "This link is no longer active.", inactive: true };
const VISIBLE = ["sent", "accepted", "declined", "expired"];

function createHandler(deps) {
  return async function (context, req) {
    const query = req.query || {};
    if (!isTokenShape(query.token)) return send(context, 404, INACTIVE);
    try {
      const svc = deps.services();
      let quote = await svc.repo.findByTokenHash(hashToken(query.token));
      if (!quote || !VISIBLE.includes(quote.status)) return send(context, 404, INACTIVE);
      const now = svc.now();
      if (M.isExpired(quote, now.getTime()))
        quote = await svc.repo.update(quote.id, { status: "expired" });
      if (query.preview !== "1" && quote.status === "sent" && !quote.viewedAt) {
        quote = await svc.repo.update(quote.id, { viewedAt: now.toISOString() });
      }
      const payments = await svc.repo.listPayments(quote.quoteNumber);
      const stages = M.stageStates(quote, payments, now.getTime());
      return send(context, 200, {
        quote: V.clientQuoteView(quote, stages, {
          receiptSecret: process.env.RECEIPT_SIGNING_SECRET,
        }),
      });
    } catch (err) {
      return handleError(context, err, "quote-view");
    }
  };
}

module.exports = createHandler({ services: createServices });
module.exports.createHandler = createHandler;
```

`api/quote-view/function.json`:

```json
{
  "bindings": [
    {
      "authLevel": "anonymous",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["get"]
    },
    { "type": "http", "direction": "out", "name": "res" }
  ]
}
```

- [ ] **Step 4: Implement `api/quote-respond/index.js`**

```js
// POST /api/quote-respond — the client accepts (typed name + agreement) or
// declines. Acceptance stores evidence: the name, a hashed IP, the browser
// string and a snapshot of exactly what was accepted.

const { send, readJson, handleError, HttpError, str } = require("../shared/http");
const { isTokenShape, hashToken, hashIp } = require("../shared/tokens");
const { clientIp } = require("../shared/turnstile");
const M = require("../shared/quotes/model");
const V = require("../shared/quotes/views");
const { createServices } = require("../shared/quotes/service");

const INACTIVE_MSG = "This link is no longer active.";

function view(quote, now) {
  return {
    quote: V.clientQuoteView(quote, M.stageStates(quote, [], now.getTime()), {
      receiptSecret: process.env.RECEIPT_SIGNING_SECRET,
    }),
  };
}

async function accept(svc, quote, body, req, token) {
  const name = str(body.name, 200);
  if (name.length < 3 || name.length > 120)
    throw new HttpError(400, "Type your full name to accept.");
  if (body.agree !== true)
    throw new HttpError(400, "Tick the box to agree to the scope, payment plan and terms.");
  const now = svc.now();
  if (quote.status === "accepted") return view(quote, now);
  if (!M.canMove(quote.status, "accepted"))
    throw new HttpError(409, "This quote can no longer be accepted.");

  const snapshot = JSON.stringify({
    revision: quote.revision,
    title: quote.title,
    scope: quote.scope || "",
    timeline: quote.timeline || "",
    items: quote.items,
    subtotalMinor: quote.subtotalMinor,
    discountMinor: quote.discountMinor || 0,
    totalMinor: quote.totalMinor,
    currency: quote.currency,
    schedule: quote.schedule,
    terms: quote.terms || "",
  });
  const updated = await svc.repo.update(quote.id, {
    status: "accepted",
    respondedAt: now.toISOString(),
    acceptedName: name,
    acceptedIpHash: hashIp(clientIp(req)),
    acceptedUa: String((req.headers && req.headers["user-agent"]) || "").slice(0, 300),
    acceptedSnapshot: snapshot,
  });
  const stages = M.stageStates(updated, [], now.getTime());
  await Promise.all([
    svc.notify.quoteAccepted(updated, token, stages),
    svc.notify.decision(updated, "accepted"),
    svc.repo.setInquiryStatus(updated.inquiryId, "won"),
  ]);
  return view(updated, now);
}

async function decline(svc, quote, body) {
  const reason = str(body.reason, 1000);
  if (reason.length > 500) throw new HttpError(400, "Keep the reason under 500 characters.");
  const now = svc.now();
  if (quote.status === "declined") return view(quote, now);
  if (!M.canMove(quote.status, "declined"))
    throw new HttpError(409, "This quote can no longer be declined.");
  const updated = await svc.repo.update(quote.id, {
    status: "declined",
    respondedAt: now.toISOString(),
    declineReason: reason,
  });
  await Promise.all([
    svc.notify.decision(updated, "declined"),
    svc.repo.setInquiryStatus(updated.inquiryId, "declined"),
  ]);
  return view(updated, now);
}

function createHandler(deps) {
  return async function (context, req) {
    try {
      const body = readJson(req);
      if (!isTokenShape(body.token)) throw new HttpError(404, INACTIVE_MSG, { inactive: true });
      if (body.action !== "accept" && body.action !== "decline")
        throw new HttpError(400, "Unknown action.");
      const svc = deps.services();
      const quote = await svc.repo.findByTokenHash(hashToken(body.token));
      if (!quote || ["draft", "cancelled"].includes(quote.status))
        throw new HttpError(404, INACTIVE_MSG, { inactive: true });
      if (M.isExpired(quote, svc.now().getTime()) || quote.status === "expired") {
        if (quote.status !== "expired") await svc.repo.update(quote.id, { status: "expired" });
        throw new HttpError(409, "This quote has expired. Ask for an updated quote.");
      }
      const result =
        body.action === "accept"
          ? await accept(svc, quote, body, req, body.token)
          : await decline(svc, quote, body);
      return send(context, 200, result);
    } catch (err) {
      return handleError(context, err, "quote-respond");
    }
  };
}

module.exports = createHandler({ services: createServices });
module.exports.createHandler = createHandler;
```

`api/quote-respond/function.json`: same as `quote-admin/function.json` (methods `["post"]`):

```json
{
  "bindings": [
    {
      "authLevel": "anonymous",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["post"]
    },
    { "type": "http", "direction": "out", "name": "res" }
  ]
}
```

- [ ] **Step 5: Run the tests to see them pass**

Run: `npx vitest run api/quote-view api/quote-respond`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add api/quote-view api/quote-respond
git commit -m "feat(OC-0): add client quote view and accept/decline endpoints"
```

---

### Task 10: `quote-pay` and `quote-receipt`

**Files:**

- Create: `api/quote-pay/index.js`, `api/quote-pay/function.json`, `api/quote-receipt/index.js`, `api/quote-receipt/function.json`
- Test: `api/quote-pay/quote-pay.test.js`, `api/quote-receipt/quote-receipt.test.js`

**Interfaces:**

- Consumes: Tasks 1, 2, 4, 6, 7 (`handleQuoteCharge(reference, services)`), 8.
- Produces: `POST /api/quote-pay {token, stageId, method: "card"|"momo"|"apple_pay", email}` → `{accessCode, authorizationUrl, reference}`. `GET /api/quote-pay?token=&reference=` → `{state: "paid"|"pending"|"failed"|"duplicate", receiptPath: string|null}`. `GET /api/quote-receipt?reference=&s=` → `{receipt: ReceiptView}` or 404.

- [ ] **Step 1: Write the failing tests**

`api/quote-pay/quote-pay.test.js`:

```js
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const { createHandler } = await import("./index.js");
const { createFakeRepo, createFakeLocks } = await import("../shared/quotes/fakes.js");
const { hashToken, newToken } = await import("../shared/tokens.js");
const M = await import("../shared/quotes/model.js");

const TOKEN = newToken();
const NOW = new Date("2026-10-10T09:00:00.000Z");
const accepted = {
  id: "q1",
  quoteNumber: "Q-2026-0001",
  status: "accepted",
  currency: "GHS",
  title: "Store",
  clientName: "Kofi",
  clientEmail: "kofi@example.com",
  items: [],
  totalMinor: 10000,
  schedule: M.DEFAULT_SCHEDULE,
  respondedAt: "2026-10-09T00:00:00.000Z",
  payState: { due: {} },
  tokenHash: hashToken(TOKEN),
};

function setup({ quote = accepted, payments = [], initialize, charge } = {}) {
  const repo = createFakeRepo({ quotes: [quote], payments });
  const services = {
    repo,
    locks: createFakeLocks(),
    now: () => NOW,
    initialize:
      initialize ||
      vi.fn().mockResolvedValue({
        accessCode: "AC1",
        authorizationUrl: "https://checkout.paystack.com/AC1",
        reference: "x",
      }),
  };
  const handleQuoteCharge =
    charge || vi.fn().mockResolvedValue({ state: "success", payment: { paystackReference: "R1" } });
  const handler = createHandler({ services: () => services, handleQuoteCharge });
  const call = async (req) => {
    const context = { log: { error: vi.fn() } };
    await handler(context, { headers: {}, ...req });
    return { status: context.res.status, body: JSON.parse(context.res.body) };
  };
  return { repo, services, handleQuoteCharge, call };
}

const start = (over = {}) => ({
  method: "POST",
  body: { token: TOKEN, stageId: "deposit", method: "momo", email: "kofi@example.com", ...over },
});

describe("quote-pay POST", () => {
  beforeEach(() => {
    process.env.RECEIPT_SIGNING_SECRET = "s";
  });

  it("writes a pending row and initialises Paystack with the server's amount", async () => {
    const t = setup();
    const r = await t.call(start());
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ accessCode: "AC1" });
    const args = t.services.initialize.mock.calls[0][0];
    expect(args).toMatchObject({
      amountMinor: 6000,
      currency: "GHS",
      channels: ["mobile_money"],
      email: "kofi@example.com",
    });
    expect(args.metadata).toMatchObject({
      kind: "quote",
      quoteNumber: "Q-2026-0001",
      stageId: "deposit",
    });
    expect(args.callbackUrl).toBe(
      `https://oceaniccoder.dev/q/${TOKEN}/paid?reference=${encodeURIComponent(r.body.reference)}`,
    );
    const [row] = [...t.repo.payments.values()];
    expect(row).toMatchObject({
      status: "pending",
      kind: "quote",
      amountMinor: 6000,
      accessCode: "AC1",
      paystackReference: r.body.reference,
    });
  });

  it("reuses pending: a second click within 15 minutes gets the same reference", async () => {
    const t = setup();
    const first = await t.call(start());
    const second = await t.call(start());
    expect(second.body.reference).toBe(first.body.reference);
    expect(t.services.initialize).toHaveBeenCalledTimes(1);
  });

  it("refuses stages that aren't due and quotes that aren't accepted", async () => {
    expect((await setup().call(start({ stageId: "balance" }))).status).toBe(409);
    expect((await setup({ quote: { ...accepted, status: "sent" } }).call(start())).status).toBe(
      409,
    );
    expect((await setup().call(start({ method: "bitcoin" }))).status).toBe(400);
    expect((await setup().call(start({ email: "nope" }))).status).toBe(400);
  });

  it("marks the row failed and answers 502 when Paystack refuses", async () => {
    const t = setup({ initialize: vi.fn().mockRejectedValue(new Error("Currency not supported")) });
    const r = await t.call(start());
    expect(r.status).toBe(502);
    expect([...t.repo.payments.values()][0].status).toBe("failed");
  });
});

describe("quote-pay GET", () => {
  it("only checks references that belong to this quote", async () => {
    const t = setup({
      payments: [
        { id: "p1", kind: "quote", quoteId: "other", paystackReference: "R1", status: "pending" },
      ],
    });
    expect((await t.call({ method: "GET", query: { token: TOKEN, reference: "R1" } })).status).toBe(
      404,
    );
  });

  it("settles and returns a receipt path when paid", async () => {
    process.env.RECEIPT_SIGNING_SECRET = "s";
    const t = setup({
      payments: [
        { id: "p1", kind: "quote", quoteId: "q1", paystackReference: "R1", status: "pending" },
      ],
    });
    const r = await t.call({ method: "GET", query: { token: TOKEN, reference: "R1" } });
    expect(r.body.state).toBe("paid");
    expect(r.body.receiptPath).toMatch(/^\/receipt\/R1\?s=/);
    expect(t.handleQuoteCharge).toHaveBeenCalledWith("R1", expect.anything());
  });

  it("reports pending without a receipt", async () => {
    const t = setup({
      payments: [
        { id: "p1", kind: "quote", quoteId: "q1", paystackReference: "R1", status: "pending" },
      ],
      charge: vi.fn().mockResolvedValue({ state: "pending" }),
    });
    expect(
      (await t.call({ method: "GET", query: { token: TOKEN, reference: "R1" } })).body,
    ).toEqual({ state: "pending", receiptPath: null });
  });
});
```

`api/quote-receipt/quote-receipt.test.js`:

```js
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const { createHandler } = await import("./index.js");
const { createFakeRepo } = await import("../shared/quotes/fakes.js");
const { signReceipt } = await import("../shared/tokens.js");
const M = await import("../shared/quotes/model.js");

const quote = {
  id: "q1",
  quoteNumber: "Q-2026-0001",
  status: "accepted",
  currency: "GHS",
  title: "Store",
  clientName: "Kofi",
  totalMinor: 10000,
  schedule: M.DEFAULT_SCHEDULE,
  respondedAt: "2026-10-09T00:00:00.000Z",
  payState: { due: {} },
};
const payment = {
  id: "p1",
  kind: "quote",
  quoteId: "q1",
  quoteNumber: "Q-2026-0001",
  stageId: "deposit",
  paystackReference: "R1",
  status: "success",
  amountMinor: 6000,
  currency: "GHS",
  method: "momo",
  paidAt: "2026-10-10T00:00:00.000Z",
};

function call(query, payments = [payment]) {
  const repo = createFakeRepo({ quotes: [quote], payments });
  const handler = createHandler({ services: () => ({ repo, now: () => new Date() }) });
  const context = { log: { error: vi.fn() } };
  return handler(context, { method: "GET", query }).then(() => ({
    status: context.res.status,
    body: JSON.parse(context.res.body),
  }));
}

describe("quote-receipt", () => {
  beforeEach(() => (process.env.RECEIPT_SIGNING_SECRET = "s"));

  it("returns the receipt for a valid signature", async () => {
    const r = await call({ reference: "R1", s: signReceipt("R1", "s") });
    expect(r.status).toBe(200);
    expect(r.body.receipt).toMatchObject({
      amountMinor: 6000,
      method: "Mobile Money",
      stageLabel: "Deposit",
      balanceMinor: 4000,
    });
  });

  it("404s on a bad signature or an unpaid payment", async () => {
    expect((await call({ reference: "R1", s: "x".repeat(32) })).status).toBe(404);
    expect(
      (
        await call({ reference: "R1", s: signReceipt("R1", "s") }, [
          { ...payment, status: "pending" },
        ])
      ).status,
    ).toBe(404);
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run api/quote-pay api/quote-receipt`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement `api/quote-pay/index.js`**

```js
// /api/quote-pay
//   POST — start paying a due stage. The server works out the amount, writes a
//          pending payments row, then initialises Paystack. The browser gets
//          only the access code.
//   GET  — check a reference from the return page or while the popup is open.
//          Verifies with Paystack and settles if needed (same code path as the
//          webhook), so the page never trusts a query string.

const { send, readJson, handleError, HttpError, str } = require("../shared/http");
const { isTokenShape, hashToken } = require("../shared/tokens");
const M = require("../shared/quotes/model");
const V = require("../shared/quotes/views");
const { createServices, handleQuoteCharge } = require("../shared/quotes/service");

const CHANNELS = { card: "card", momo: "mobile_money", apple_pay: "apple_pay" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REUSE_MS = 15 * 60 * 1000;
const STATE = {
  success: "paid",
  pending: "pending",
  failed: "failed",
  duplicate: "duplicate",
  unknown: "pending",
};

async function quoteFor(svc, token) {
  if (!isTokenShape(token))
    throw new HttpError(404, "This link is no longer active.", { inactive: true });
  const quote = await svc.repo.findByTokenHash(hashToken(token));
  if (!quote) throw new HttpError(404, "This link is no longer active.", { inactive: true });
  return quote;
}

async function start(svc, body) {
  const method = str(body.method, 20);
  const email = str(body.email, 254).toLowerCase();
  if (!CHANNELS[method]) throw new HttpError(400, "Choose card, Mobile Money or Apple Pay.");
  if (!EMAIL_RE.test(email)) throw new HttpError(400, "Enter a valid email for your receipt.");

  const quote = await quoteFor(svc, body.token);
  if (quote.status !== "accepted") throw new HttpError(409, "Accept the quote before paying.");
  const now = svc.now();
  const payments = await svc.repo.listPayments(quote.quoteNumber);
  const stage = M.stageStates(quote, payments, now.getTime()).find((s) => s.id === body.stageId);
  if (!stage) throw new HttpError(404, "That payment stage doesn't exist.");
  if (stage.state === "paid") throw new HttpError(409, "This stage is already paid.");
  if (stage.state !== "due") throw new HttpError(409, "This stage isn't ready for payment yet.");

  // A second click, or the same page in two tabs: hand back the open checkout
  // instead of starting another charge.
  const reuse = payments.find(
    (p) =>
      p.stageId === stage.id &&
      p.status === "pending" &&
      p.method === method &&
      p.clientEmail === email &&
      p.accessCode &&
      now.getTime() - Date.parse(p.createdAt) < REUSE_MS,
  );
  if (reuse) {
    return {
      accessCode: reuse.accessCode,
      authorizationUrl: `https://checkout.paystack.com/${reuse.accessCode}`,
      reference: reuse.paystackReference,
    };
  }

  const reference = M.paymentReference(quote.quoteNumber, stage.index);
  const row = await svc.repo.createPayment(
    M.paymentRow(quote, stage, {
      clientEmail: email,
      method,
      status: "pending",
      paystackReference: reference,
    }),
  );
  const base = V.siteBase();
  try {
    const init = await svc.initialize({
      email,
      amountMinor: stage.amountMinor,
      currency: quote.currency,
      reference,
      channels: [CHANNELS[method]],
      callbackUrl: `${base}/q/${body.token}/paid?reference=${encodeURIComponent(reference)}`,
      metadata: {
        kind: "quote",
        quoteNumber: quote.quoteNumber,
        stageId: stage.id,
        cancel_action: `${base}/q/${body.token}/pay/${stage.id}`,
      },
    });
    await svc.repo.updatePayment(row.id, { accessCode: init.accessCode });
    return { accessCode: init.accessCode, authorizationUrl: init.authorizationUrl, reference };
  } catch (err) {
    await svc.repo.updatePayment(row.id, {
      status: "failed",
      note: `initialize: ${err.message}`.slice(0, 300),
    });
    throw new HttpError(502, "Paystack couldn't start the payment. Please try again in a minute.");
  }
}

async function check(svc, query, charge) {
  const quote = await quoteFor(svc, query.token);
  const reference = str(query.reference, 80);
  const payment = reference ? await svc.repo.findPaymentByReference(reference) : null;
  if (!payment || payment.quoteId !== quote.id) throw new HttpError(404, "Payment not found.");
  const result = await charge(reference, svc);
  const state = STATE[result.state] || "pending";
  const receiptPath =
    state === "paid" ? V.receiptPath(reference, process.env.RECEIPT_SIGNING_SECRET) : null;
  return { state, receiptPath };
}

function createHandler(deps) {
  return async function (context, req) {
    try {
      const svc = deps.services();
      const body =
        req.method === "GET"
          ? await check(svc, req.query || {}, deps.handleQuoteCharge)
          : await start(svc, readJson(req));
      return send(context, 200, body);
    } catch (err) {
      return handleError(context, err, "quote-pay");
    }
  };
}

module.exports = createHandler({ services: createServices, handleQuoteCharge });
module.exports.createHandler = createHandler;
```

`api/quote-pay/function.json`:

```json
{
  "bindings": [
    {
      "authLevel": "anonymous",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["get", "post"]
    },
    { "type": "http", "direction": "out", "name": "res" }
  ]
}
```

- [ ] **Step 4: Implement `api/quote-receipt/index.js`**

```js
// GET /api/quote-receipt?reference=&s= — a printable receipt behind an HMAC
// link. Receipt links don't expire and keep working after the quote link
// rotates, because they don't depend on the quote token.

const { send, handleError, HttpError, str } = require("../shared/http");
const { verifyReceipt } = require("../shared/tokens");
const M = require("../shared/quotes/model");
const V = require("../shared/quotes/views");
const { createServices } = require("../shared/quotes/service");

function createHandler(deps) {
  return async function (context, req) {
    try {
      const query = req.query || {};
      const reference = str(query.reference, 80);
      if (!reference || !verifyReceipt(reference, query.s, process.env.RECEIPT_SIGNING_SECRET)) {
        throw new HttpError(404, "Receipt not found.");
      }
      const svc = deps.services();
      const payment = await svc.repo.findPaymentByReference(reference);
      if (!payment || payment.kind !== "quote" || payment.status !== "success")
        throw new HttpError(404, "Receipt not found.");
      const quote = await svc.repo.get(payment.quoteId);
      if (!quote) throw new HttpError(404, "Receipt not found.");
      const stages = M.stageStates(quote, await svc.repo.listPayments(quote.quoteNumber));
      return send(context, 200, { receipt: V.receiptView(quote, payment, stages) });
    } catch (err) {
      return handleError(context, err, "quote-receipt");
    }
  };
}

module.exports = createHandler({ services: createServices });
module.exports.createHandler = createHandler;
```

`api/quote-receipt/function.json`: same as `quote-view/function.json` (methods `["get"]`).

```json
{
  "bindings": [
    {
      "authLevel": "anonymous",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["get"]
    },
    { "type": "http", "direction": "out", "name": "res" }
  ]
}
```

- [ ] **Step 5: Run the tests to see them pass**

Run: `npx vitest run api/quote-pay api/quote-receipt`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add api/quote-pay api/quote-receipt
git commit -m "feat(OC-0): add server-priced stage payments and signed receipts"
```

---

### Task 11: Webhook quote branch

**Files:**

- Modify: `api/paystack-webhook/index.js` (after the mode check at about line 177, before the invoice-number extraction)
- Test: `api/paystack-webhook/quote-branch.test.js`

**Interfaces:**

- Consumes: `handleQuoteCharge(reference)` from `api/shared/quotes/service.js` (Task 7), called as `quoteService.handleQuoteCharge(...)` so the test can spy on the module object.
- Produces: `charge.success` events with `metadata.kind === "quote"` are settled through the quote service; 500 on thrown errors (Paystack retries); 200 otherwise. The invoice branch is unchanged.

- [ ] **Step 1: Write the failing test**

```js
// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import { createRequire } from "module";

// Load through Node's require so the spy and index.js share one module object
// (vi.mock does not intercept CommonJS require; see create-booking.test.js).
const require = createRequire(import.meta.url);
const quoteService = require("../shared/quotes/service.js");
const handler = require("./index.js");

const SECRET = "sk_test_webhook";

function signed(event) {
  const rawBody = JSON.stringify(event);
  const signature = crypto.createHmac("sha512", SECRET).update(rawBody).digest("hex");
  return { method: "POST", rawBody, body: event, headers: { "x-paystack-signature": signature } };
}

const quoteEvent = {
  event: "charge.success",
  data: {
    reference: "Q-2026-0001-1-ABCDEFGH",
    domain: "test",
    amount: 6000,
    currency: "GHS",
    metadata: { kind: "quote" },
  },
};

describe("paystack-webhook quote branch", () => {
  let spy;
  beforeEach(() => {
    process.env.PAYSTACK_SECRET_KEY = SECRET;
    delete process.env.RESEND_API_KEY; // keep bail() from sending email
    spy = vi.spyOn(quoteService, "handleQuoteCharge");
  });
  afterEach(() => {
    spy.mockRestore();
    delete process.env.PAYSTACK_SECRET_KEY;
  });

  const run = async (req) => {
    const context = {
      res: null,
      log: Object.assign(vi.fn(), { info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
    };
    await handler(context, req);
    return context.res;
  };

  it("settles quote charges through the quote service", async () => {
    spy.mockResolvedValue({ state: "success" });
    const res = await run(signed(quoteEvent));
    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledWith("Q-2026-0001-1-ABCDEFGH");
  });

  it("answers 500 so Paystack retries when settling throws", async () => {
    spy.mockRejectedValue(new Error("appwrite down"));
    expect((await run(signed(quoteEvent))).status).toBe(500);
  });

  it("acknowledges an unknown quote reference with 200", async () => {
    spy.mockResolvedValue({ state: "unknown" });
    expect((await run(signed(quoteEvent))).status).toBe(200);
  });

  it("leaves invoice charges on the existing path", async () => {
    const invoiceEvent = {
      event: "charge.success",
      data: {
        reference: "OC-INV-123456-1",
        domain: "test",
        metadata: { invoiceNumber: "INV-123456" },
      },
    };
    delete process.env.APPWRITE_API_KEY;
    await run(signed(invoiceEvent));
    expect(spy).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run api/paystack-webhook/quote-branch.test.js`
Expected: FAIL; the first test sees `handleQuoteCharge` never called.

- [ ] **Step 3: Add the branch**

Add near the other requires at the top of `api/paystack-webhook/index.js`:

```js
const quoteService = require("../shared/quotes/service");
```

Insert directly after the `if (data.domain && data.domain !== keyMode) { ... }` block and before `// Extract invoice number from metadata ...`:

```js
// Quote stage payments carry metadata.kind = "quote". They are settled by
// the quote service, which re-fetches the transaction from Paystack rather
// than trusting this payload, and uses lock documents so the webhook, the
// return page and polling record each payment exactly once. Unlike the
// invoice path, a transient failure answers 500 so Paystack retries.
if (metadata.kind === "quote") {
  try {
    const result = await quoteService.handleQuoteCharge(data.reference);
    if (result.state === "unknown") {
      await bail("quote payment reference not found", `reference: ${data.reference || "none"}`);
      return;
    }
    context.log.info(`paystack-webhook: quote payment ${data.reference} → ${result.state}`);
    ok();
  } catch (err) {
    context.log.error(`paystack-webhook: quote payment ${data.reference} failed: ${err.message}`);
    context.res = { status: 500, headers: CORS, body: JSON.stringify({ error: "retry" }) };
  }
  return;
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx vitest run api/paystack-webhook`
Expected: PASS (the new file and any existing webhook tests).

- [ ] **Step 5: Commit**

```bash
git add api/paystack-webhook/index.js api/paystack-webhook/quote-branch.test.js
git commit -m "feat(OC-0): settle quote payments from the Paystack webhook"
```

---

### Task 12: `email-preview` function

**Files:**

- Create: `api/email-preview/index.js`, `api/email-preview/function.json`
- Test: `api/email-preview/email-preview.test.js`

**Interfaces:**

- Consumes: `SAMPLES` (Task 6), `sendEmail` (Task 5), `requireAdmin`.
- Produces: admin-only `GET /api/email-preview` → `{templates: string[]}`; `GET ?name=` → `{name, subject, html, text}`; `POST {name}` → `{sent: true, to}` (sends to `RESEND_TO_EMAIL` with subject prefixed `[Test] `).

- [ ] **Step 1: Write the failing test**

```js
// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

const { createHandler } = await import("./index.js");

function setup(admin = true) {
  const send = vi.fn().mockResolvedValue({ ok: true, id: "e1" });
  const handler = createHandler({
    requireAdmin: async () =>
      admin ? { user: { email: "a@b.co" } } : { status: 401, error: "Sign in" },
    send,
    adminEmail: () => "admin@oceaniccoder.dev",
  });
  const call = async (req) => {
    const context = { log: { error: vi.fn() } };
    await handler(context, { headers: {}, ...req });
    return { status: context.res.status, body: JSON.parse(context.res.body) };
  };
  return { send, call };
}

describe("email-preview", () => {
  it("is admin only", async () => {
    expect((await setup(false).call({ method: "GET", query: {} })).status).toBe(401);
  });
  it("lists and renders templates", async () => {
    const t = setup();
    const list = await t.call({ method: "GET", query: {} });
    expect(list.body.templates).toContain("quoteSent");
    const one = await t.call({ method: "GET", query: { name: "quoteSent" } });
    expect(one.body.html).toContain("OceanicCoder");
    expect((await t.call({ method: "GET", query: { name: "nope" } })).status).toBe(404);
  });
  it("sends a test to the admin address", async () => {
    const t = setup();
    const r = await t.call({ method: "POST", body: { name: "paymentReceipt" } });
    expect(r.body).toEqual({ sent: true, to: "admin@oceaniccoder.dev" });
    expect(t.send.mock.calls[0][0].subject).toMatch(/^\[Test\] /);
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run api/email-preview`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

`api/email-preview/index.js`:

```js
// /api/email-preview — admin-only previews of every email template with sample
// data, plus "send a test to me".

const { requireAdmin } = require("../shared/adminAuth");
const { send, readJson, handleError, HttpError } = require("../shared/http");
const { SAMPLES } = require("../shared/email/samples");
const { sendEmail } = require("../shared/email/send");

function createHandler(deps) {
  return async function (context, req) {
    const auth = await deps.requireAdmin(context, req);
    if (!auth || !auth.user)
      return send(context, (auth && auth.status) || 401, {
        error: (auth && auth.error) || "Sign in again.",
      });
    try {
      const name = req.method === "POST" ? readJson(req).name : (req.query || {}).name;
      if (req.method !== "POST" && !name)
        return send(context, 200, { templates: Object.keys(SAMPLES) });
      if (!Object.prototype.hasOwnProperty.call(SAMPLES, name))
        throw new HttpError(404, "No such template.");
      const mail = SAMPLES[name]();
      if (req.method !== "POST") return send(context, 200, { name, ...mail });
      const to = deps.adminEmail();
      if (!to) throw new HttpError(500, "RESEND_TO_EMAIL is not configured.");
      const result = await deps.send({ to, ...mail, subject: `[Test] ${mail.subject}` });
      if (!result.ok) throw new HttpError(502, `Resend refused the email: ${result.error}`);
      return send(context, 200, { sent: true, to });
    } catch (err) {
      return handleError(context, err, "email-preview");
    }
  };
}

module.exports = createHandler({
  requireAdmin,
  send: sendEmail,
  adminEmail: () => process.env.RESEND_TO_EMAIL,
});
module.exports.createHandler = createHandler;
```

`api/email-preview/function.json`:

```json
{
  "bindings": [
    {
      "authLevel": "anonymous",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["get", "post"]
    },
    { "type": "http", "direction": "out", "name": "res" }
  ]
}
```

- [ ] **Step 4: Run the test to see it pass**

Run: `npx vitest run api/email-preview`
Expected: PASS.

- [ ] **Step 5: Run the whole api suite, then commit**

Run: `npx vitest run api`
Expected: PASS.

```bash
git add api/email-preview
git commit -m "feat(OC-0): add admin email previews and test sends"
```

---

### Task 13: Client foundations (types, math, services, Paystack loader)

**Files:**

- Create: `src/types/quote.ts`, `src/utils/quoteMath.ts`, `src/utils/paystackV2.ts`, `src/services/api/quotes.ts`
- Modify: `src/components/Payment/ApplePayPayment.tsx` (remove the local `PaystackV2`, `PaystackGlobals` and `loadPaystackV2`; import from `@/utils/paystackV2`)
- Test: `src/utils/quoteMath.test.ts`, `src/services/api/quotes.test.ts`

**Interfaces:**

- Consumes: response shapes from Tasks 8–12.
- Produces: the types below; `quoteMath` functions `lineMinor`, `computeTotals`, `stageAmounts`, `scheduleError`, `formatMinor`, `toMinor`, `fromMinor`, `newId`, `formatDate`, `DEFAULT_SCHEDULE`, `DEFAULT_TERMS`; services `QuoteApiError`, `fetchClientQuote`, `respondToQuote`, `startStagePayment`, `checkStagePayment`, `fetchReceipt`, `quoteAdmin`, `fetchEmailPreview`, `sendTestEmail`; `loadPaystackV2()` → `PaystackV2` with `resumeTransaction(accessCode, callbacks)`.

- [ ] **Step 1: Write the types (no test needed; type-check covers them)**

`src/types/quote.ts`:

```ts
export type QuoteStatus = "draft" | "sent" | "accepted" | "declined" | "expired" | "cancelled";
export type QuoteCurrency = "GHS" | "USD";
export type StageState = "paid" | "due" | "later";
export type PayMethod = "card" | "momo" | "apple_pay";
export type ManualMethod = "bank" | "momo" | "cash";

export interface QuoteItem {
  id: string;
  description: string;
  qty: number;
  unitMinor: number;
}

export interface QuoteStageDef {
  id: string;
  label: string;
  percent: number;
}

export interface QuoteDraft {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientCompany: string;
  currency: QuoteCurrency;
  title: string;
  overview: string;
  scope: string;
  timeline: string;
  notes: string;
  terms: string;
  items: QuoteItem[];
  discountMinor: number;
  schedule: QuoteStageDef[];
  validDays: number;
  inquiryId?: string | null;
}

/** A stage as the client pages see it. */
export interface ClientStage extends QuoteStageDef {
  index: number;
  amountMinor: number;
  state: StageState;
  dueAt: string | null;
  dueBy: string | null;
  overdue: boolean;
  invoiceNumber: string;
  paidAt: string | null;
  receiptPath: string | null;
}

/** A stage as the admin sees it (from model.stageStates). */
export interface AdminStage extends QuoteStageDef {
  index: number;
  amountMinor: number;
  state: StageState;
  dueAt: string | null;
  overdue: boolean;
  invoiceNumber: string;
  paidAt: string | null;
  reference: string | null;
}

export interface ClientQuote {
  quoteNumber: string;
  revision: number;
  status: QuoteStatus;
  currency: QuoteCurrency;
  title: string;
  overview: string;
  scope: string;
  timeline: string;
  notes: string;
  terms: string;
  clientName: string;
  clientCompany: string;
  clientEmail: string;
  items: (QuoteItem & { lineMinor: number })[];
  subtotalMinor: number;
  discountMinor: number;
  totalMinor: number;
  issuedAt: string | null;
  validUntil: string | null;
  acceptedName: string | null;
  respondedAt: string | null;
  stages: ClientStage[];
  summary: { paidMinor: number; balanceMinor: number; complete: boolean };
  contact: { email: string; whatsapp: string };
}

export interface AdminQuote extends QuoteDraft {
  id: string;
  quoteNumber: string;
  revision: number;
  status: QuoteStatus;
  subtotalMinor: number;
  totalMinor: number;
  sentAt?: string | null;
  viewedAt?: string | null;
  respondedAt?: string | null;
  validUntil?: string | null;
  acceptedName?: string | null;
  acceptedUa?: string | null;
  declineReason?: string | null;
  hasLink: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface QuoteSummary {
  id: string;
  quoteNumber: string;
  title: string;
  clientName: string;
  status: QuoteStatus;
  currency: QuoteCurrency;
  totalMinor: number;
  paidMinor: number;
  complete: boolean;
  nextDue: { id: string; label: string; overdue: boolean } | null;
  sentAt: string | null;
  viewedAt: string | null;
  updatedAt: string | null;
}

export interface QuotePayment {
  id: string;
  reference: string;
  stageId: string;
  amountMinor: number;
  currency: string;
  method: string;
  status: string;
  paidAt: string | null;
  note: string;
  recordedBy: string;
  createdAt: string | null;
}

export interface QuoteDetailResponse {
  quote: AdminQuote;
  stages: AdminStage[];
  payments: QuotePayment[];
  link?: string;
  emailed?: boolean;
}

export interface ReceiptView {
  quoteNumber: string;
  title: string;
  clientName: string;
  clientCompany: string;
  stageLabel: string;
  invoiceNumber: string;
  amountMinor: number;
  currency: string;
  method: string;
  reference: string;
  paidAt: string;
  balanceMinor: number;
}

export type PaymentCheckState = "paid" | "pending" | "failed" | "duplicate";
```

- [ ] **Step 2: Write the failing tests**

`src/utils/quoteMath.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect } from "vitest";
import * as Q from "./quoteMath";

// The server rules are CommonJS outside src/; load them dynamically so tsc
// doesn't try to type them. This test keeps the editor and the server in step.
const modelPath = "../../api/shared/quotes/model.js";
const server = (await import(/* @vite-ignore */ modelPath)) as {
  computeTotals: typeof Q.computeTotals;
  stageAmounts: typeof Q.stageAmounts;
  scheduleError: typeof Q.scheduleError;
  DEFAULT_SCHEDULE: typeof Q.DEFAULT_SCHEDULE;
  DEFAULT_TERMS: string;
};

const items = [
  { id: "a", description: "A", qty: 1.5, unitMinor: 333 },
  { id: "b", description: "B", qty: 3, unitMinor: 9999 },
];

describe("parity with api/shared/quotes/model.js", () => {
  it.each([0, 1, 10001, 123457, 99999999])("splits %i the same way", (total) => {
    expect(Q.stageAmounts(total, Q.DEFAULT_SCHEDULE)).toEqual(
      server.stageAmounts(total, server.DEFAULT_SCHEDULE),
    );
  });
  it("totals the same way", () => {
    expect(Q.computeTotals(items, 250)).toEqual(server.computeTotals(items, 250));
  });
  it.each([[[]], [[{ id: "a", label: "A", percent: 50 }]], [Q.DEFAULT_SCHEDULE]])(
    "validates %j the same way",
    (schedule) => {
      expect(Q.scheduleError(schedule)).toBe(server.scheduleError(schedule));
    },
  );
  it("shares the defaults", () => {
    expect(Q.DEFAULT_SCHEDULE).toEqual(server.DEFAULT_SCHEDULE);
    expect(Q.DEFAULT_TERMS).toBe(server.DEFAULT_TERMS);
  });
});

describe("money input", () => {
  it.each([
    ["1,234.5", 123450],
    ["0.05", 5],
    ["100", 10000],
    ["12.345", null],
    ["abc", null],
    ["", null],
  ])("toMinor(%j) → %j", (input, out) => expect(Q.toMinor(input)).toBe(out));
  it("formats and converts back", () => {
    expect(Q.formatMinor(123456, "GHS")).toBe("GHS 1,234.56");
    expect(Q.fromMinor(123450)).toBe("1234.50");
  });
  it("makes ids the server accepts", () => {
    expect(Q.newId("stage")).toMatch(/^[a-z0-9-]{1,24}$/);
  });
});
```

`src/services/api/quotes.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("./adminHeaders", () => ({
  adminHeaders: vi
    .fn()
    .mockResolvedValue({ "Content-Type": "application/json", Authorization: "Bearer jwt" }),
}));

import { fetchClientQuote, quoteAdmin, QuoteApiError, checkStagePayment } from "./quotes";

afterEach(() => vi.unstubAllGlobals());

describe("quote services", () => {
  it("throws QuoteApiError with the status and server message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: "This link is no longer active.", inactive: true }),
      }),
    );
    const err = await fetchClientQuote("tok").catch((e) => e);
    expect(err).toBeInstanceOf(QuoteApiError);
    expect(err).toMatchObject({ status: 404, message: "This link is no longer active." });
  });

  it("encodes the token and reference", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ state: "pending", receiptPath: null }),
      }),
    );
    await checkStagePayment("a/b", "R 1");
    expect(fetch).toHaveBeenCalledWith("/api/quote-pay?token=a%2Fb&reference=R%201", undefined);
  });

  it("sends admin actions with the admin headers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ quotes: [] }) }),
    );
    await quoteAdmin("list");
    const [url, init] = (fetch as unknown as { mock: { calls: [string, RequestInit][] } }).mock
      .calls[0];
    expect(url).toBe("/api/quote-admin");
    expect(JSON.parse(init.body as string)).toEqual({ action: "list" });
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer jwt");
  });

  it("passes field errors through", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: "Fix the highlighted fields.",
          fields: { title: "Required" },
        }),
      }),
    );
    const err = (await quoteAdmin("create", { draft: {} }).catch((e) => e)) as QuoteApiError;
    expect(err.fields).toEqual({ title: "Required" });
  });
});
```

- [ ] **Step 3: Run the tests to see them fail**

Run: `npx vitest run src/utils/quoteMath.test.ts src/services/api/quotes.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 4: Implement `src/utils/quoteMath.ts`**

```ts
import type { QuoteCurrency, QuoteItem, QuoteStageDef } from "@/types/quote";

// Editor-side copy of the server's quote rules (api/shared/quotes/model.js),
// so totals and stage amounts update as the admin types. quoteMath.test.ts
// checks the two stay identical.

export const DEFAULT_SCHEDULE: QuoteStageDef[] = [
  { id: "deposit", label: "Deposit", percent: 60 },
  { id: "balance", label: "Balance", percent: 40 },
];

export const DEFAULT_TERMS = [
  "- Work starts once the deposit is received.",
  "- The balance is due on delivery, before final files, source code and credentials are handed over.",
  "- This quote covers the scope above. New features or changes are quoted separately.",
  "- Third-party costs (domains, hosting, app store fees, paid APIs) are paid by the client unless listed above.",
  "- Each payment stage is invoiced separately and is due within 7 days of its invoice.",
].join("\n");

const ID_RE = /^[a-z0-9-]{1,24}$/;

export function lineMinor(item: Pick<QuoteItem, "qty" | "unitMinor">): number {
  return Math.round(Number(item.qty) * Number(item.unitMinor));
}

export function computeTotals(items: Pick<QuoteItem, "qty" | "unitMinor">[], discountMinor = 0) {
  const subtotalMinor = items.reduce((sum, i) => sum + lineMinor(i), 0);
  const discount = Math.min(Math.max(0, Math.round(Number(discountMinor) || 0)), subtotalMinor);
  return { subtotalMinor, discountMinor: discount, totalMinor: subtotalMinor - discount };
}

export function stageAmounts(totalMinor: number, schedule: QuoteStageDef[]) {
  let allocated = 0;
  return schedule.map((stage, i) => {
    const last = i === schedule.length - 1;
    const amountMinor = last
      ? totalMinor - allocated
      : Math.floor((totalMinor * stage.percent) / 100);
    allocated += amountMinor;
    return { ...stage, amountMinor };
  });
}

export function scheduleError(schedule: QuoteStageDef[]): string | null {
  if (!Array.isArray(schedule) || schedule.length < 1 || schedule.length > 8)
    return "Use between 1 and 8 payment stages.";
  const ids = new Set<string>();
  for (const s of schedule) {
    if (!s || !ID_RE.test(s.id) || ids.has(s.id)) return "Each stage needs a unique id.";
    ids.add(s.id);
    if (!s.label || s.label.length > 40) return "Give every stage a name (up to 40 characters).";
    if (!Number.isInteger(s.percent) || s.percent < 1 || s.percent > 100)
      return "Each stage must be a whole percentage from 1 to 100.";
  }
  const sum = schedule.reduce((t, s) => t + s.percent, 0);
  if (sum !== 100) return `Stages add up to ${sum}%. They must add up to 100%.`;
  return null;
}

export function formatMinor(minor: number, currency: QuoteCurrency | string): string {
  const major = (Number(minor) || 0) / 100;
  return `${currency} ${major.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** "1,234.5" → 123450. Returns null for anything that isn't a plain amount with at most 2 decimals. */
export function toMinor(input: string): number | null {
  const clean = input.replace(/,/g, "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  const [whole, frac = ""] = clean.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

export function fromMinor(minor: number): string {
  return (minor / 100).toFixed(2);
}

export function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formatDate(iso?: string | null): string {
  return iso
    ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(
        new Date(iso),
      )
    : "";
}
```

- [ ] **Step 5: Implement `src/services/api/quotes.ts`**

```ts
import { apiUrl } from "@/utils/apiUrl";
import { adminHeaders } from "./adminHeaders";
import type { ClientQuote, PayMethod, PaymentCheckState, ReceiptView } from "@/types/quote";

export class QuoteApiError extends Error {
  status: number;
  fields?: Record<string, string>;
  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message);
    this.name = "QuoteApiError";
    this.status = status;
    this.fields = fields;
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(apiUrl(path), init);
  } catch {
    throw new QuoteApiError(
      "We couldn't reach the server. Check your connection and try again.",
      0,
    );
  }
  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    fields?: Record<string, string>;
  };
  if (!res.ok)
    throw new QuoteApiError(
      body.error || "Something went wrong. Please try again.",
      res.status,
      body.fields,
    );
  return body as T;
}

const postJson = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export function fetchClientQuote(token: string, preview = false) {
  return call<{ quote: ClientQuote }>(
    `/api/quote-view?token=${encodeURIComponent(token)}${preview ? "&preview=1" : ""}`,
  );
}

export function respondToQuote(
  token: string,
  body: { action: "accept"; name: string; agree: boolean } | { action: "decline"; reason: string },
) {
  return call<{ quote: ClientQuote }>("/api/quote-respond", postJson({ token, ...body }));
}

export function startStagePayment(body: {
  token: string;
  stageId: string;
  method: PayMethod;
  email: string;
}) {
  return call<{ accessCode: string; authorizationUrl: string; reference: string }>(
    "/api/quote-pay",
    postJson(body),
  );
}

export function checkStagePayment(token: string, reference: string) {
  return call<{ state: PaymentCheckState; receiptPath: string | null }>(
    `/api/quote-pay?token=${encodeURIComponent(token)}&reference=${encodeURIComponent(reference)}`,
    undefined,
  );
}

export function fetchReceipt(reference: string, sig: string) {
  return call<{ receipt: ReceiptView }>(
    `/api/quote-receipt?reference=${encodeURIComponent(reference)}&s=${encodeURIComponent(sig)}`,
  );
}

export async function quoteAdmin<T>(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const headers = await adminHeaders();
  return call<T>("/api/quote-admin", {
    method: "POST",
    headers,
    body: JSON.stringify({ action, ...payload }),
  });
}

export async function fetchEmailPreview(name?: string) {
  const headers = await adminHeaders();
  const path = name ? `/api/email-preview?name=${encodeURIComponent(name)}` : "/api/email-preview";
  return call<{ templates?: string[]; subject?: string; html?: string; text?: string }>(path, {
    headers,
  });
}

export async function sendTestEmail(name: string) {
  const headers = await adminHeaders();
  return call<{ sent: boolean; to: string }>("/api/email-preview", {
    method: "POST",
    headers,
    body: JSON.stringify({ name }),
  });
}
```

- [ ] **Step 6: Move the Paystack v2 loader**

Create `src/utils/paystackV2.ts` with the code below, then in `src/components/Payment/ApplePayPayment.tsx` delete the `PaystackV2` and `PaystackGlobals` interfaces and the whole `loadPaystackV2` function (and its comment block), and add `import { loadPaystackV2 } from "@/utils/paystackV2";` with the other imports.

```ts
// Loads Paystack Inline JS v2 without disturbing v1.
//
// CardPayment and MomoPayment use Inline v1, whose entry point is the
// `PaystackPop` global with a static `.setup()`. v2 ALSO defines `PaystackPop`,
// but as a class with `newTransaction()` and no `.setup()`. If v2 were left in
// place, CardPayment's `if (window.PaystackPop) resolve()` short-circuit would
// skip loading v1 and then call an undefined `.setup()`, breaking the card flow
// for anyone who opened a v2 page first.
//
// So: snapshot `PaystackPop`, load v2, keep only v2's `Paystack` global, and
// put `PaystackPop` back exactly as it was (deleting it if it was never there).

export interface PaystackTransactionCallbacks {
  onSuccess?: (transaction: { reference?: string }) => void;
  onCancel?: () => void;
  onError?: (error: { message?: string }) => void;
}

export interface PaystackV2 {
  paymentRequest: (options: Record<string, unknown>) => Promise<unknown>;
  /** Opens checkout for a transaction initialised on the server. */
  resumeTransaction: (accessCode: string, callbacks?: PaystackTransactionCallbacks) => unknown;
}

interface PaystackGlobals {
  Paystack?: new () => PaystackV2;
  PaystackPop?: unknown;
}

export function loadPaystackV2(): Promise<PaystackV2> {
  const w = window as unknown as PaystackGlobals;

  return new Promise((resolve, reject) => {
    if (w.Paystack) {
      resolve(new w.Paystack());
      return;
    }

    const hadPaystackPop = "PaystackPop" in w;
    const previousPaystackPop = w.PaystackPop;
    const restorePaystackPop = () => {
      if (hadPaystackPop) w.PaystackPop = previousPaystackPop;
      else delete w.PaystackPop;
    };

    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v2/inline.js";
    script.onload = () => {
      const Ctor = w.Paystack;
      restorePaystackPop();
      if (!Ctor) {
        reject(new Error("Paystack v2 loaded but exposed no Paystack global"));
        return;
      }
      resolve(new Ctor());
    };
    script.onerror = () => {
      restorePaystackPop();
      reject(new Error("Failed to load Paystack v2"));
    };
    document.body.appendChild(script);
  });
}
```

- [ ] **Step 7: Run tests and type-check**

Run: `npx vitest run src/utils/quoteMath.test.ts src/services/api/quotes.test.ts src/components/Payment && npm run type-check`
Expected: PASS; the existing `ApplePayPayment.test.tsx` still passes.

- [ ] **Step 8: Commit**

```bash
git add src/types/quote.ts src/utils/quoteMath.ts src/utils/quoteMath.test.ts src/utils/paystackV2.ts src/services/api/quotes.ts src/services/api/quotes.test.ts src/components/Payment/ApplePayPayment.tsx
git commit -m "feat(OC-0): add quote types, editor math and quote API client"
```

---

### Task 14: Client quote page `/q/:token`

**Files:**

- Create: `src/components/Quote/QuoteShell.tsx`, `TextBlock.tsx`, `journey.ts`, `JourneyBar.tsx`, `QuoteDocument.tsx`, `StagePlan.tsx`, `QuoteActions.tsx`, `InactiveLink.tsx`, `useClientQuote.ts`, `QuotePage.tsx` (all in `src/components/Quote/`)
- Modify: `src/routes/lazyComponents.ts`, `src/routes/publicRoutes.tsx`, `src/components/MainLayout.tsx`, `src/components/TerminalLoader/useTerminalAnimation.ts`
- Test: `src/components/Quote/journey.test.ts`, `src/components/Quote/TextBlock.test.tsx`, `src/components/Quote/QuotePage.test.tsx`

**Interfaces:**

- Consumes: `ClientQuote`, `ClientStage` (Task 13); `fetchClientQuote`, `respondToQuote`, `QuoteApiError`; `formatMinor`, `formatDate`.
- Produces: `QuoteShell({title, width?, children})`, `QuoteLoading`, `QuoteError({message, onRetry?})`; `TextBlock({text})`; `journeySteps(quote)` → `{key, label, done, current}[]`; `useClientQuote(token, preview?)` → `{state, reload, setQuote}`; routes `/q/:token` (and the lazy exports `QuotePage`, `CheckoutPage`, `PaidPage`, `StageInvoicePage`, `ReceiptPage`, which Task 15 fills in).

- [ ] **Step 1: Write the failing tests**

`src/components/Quote/journey.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { journeySteps } from "./journey";
import type { ClientQuote, ClientStage } from "@/types/quote";

const stage = (id: string, state: ClientStage["state"]): ClientStage => ({
  id,
  label: id === "deposit" ? "Deposit" : "Balance",
  percent: 50,
  index: 0,
  amountMinor: 1,
  state,
  dueAt: null,
  dueBy: null,
  overdue: false,
  invoiceNumber: "x",
  paidAt: null,
  receiptPath: null,
});
const quote = (status: ClientQuote["status"], states: ClientStage["state"][]) =>
  ({
    status,
    stages: [stage("deposit", states[0]), stage("balance", states[1])],
  }) as unknown as ClientQuote;

describe("journeySteps", () => {
  it("points at Accept while the quote is open", () => {
    const steps = journeySteps(quote("sent", ["later", "later"]));
    expect(steps.map((s) => s.label)).toEqual(["Review", "Accept", "Deposit", "Balance"]);
    expect(steps.find((s) => s.current)?.key).toBe("accept");
  });
  it("points at the deposit after acceptance, then the balance", () => {
    expect(journeySteps(quote("accepted", ["due", "later"])).find((s) => s.current)?.key).toBe(
      "deposit",
    );
    expect(journeySteps(quote("accepted", ["paid", "due"])).find((s) => s.current)?.key).toBe(
      "balance",
    );
  });
  it("has no current step when everything is paid", () => {
    expect(journeySteps(quote("accepted", ["paid", "paid"])).some((s) => s.current)).toBe(false);
  });
});
```

`src/components/Quote/TextBlock.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TextBlock from "./TextBlock";

describe("TextBlock", () => {
  it("renders bullets as a list and paragraphs as text", () => {
    render(<TextBlock text={"Intro line\n- One\n- Two\n\nAfter"} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Intro line")).toBeInTheDocument();
    expect(screen.getByText("After")).toBeInTheDocument();
  });
  it("links https URLs and never renders HTML", () => {
    const { container } = render(<TextBlock text={"See https://example.com/a <b>bold</b>"} />);
    expect(screen.getByRole("link", { name: "https://example.com/a" })).toHaveAttribute(
      "href",
      "https://example.com/a",
    );
    expect(container.querySelector("b")).toBeNull();
  });
});
```

`src/components/Quote/QuotePage.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import type { ClientQuote } from "@/types/quote";

const fetchClientQuote = vi.fn();
const respondToQuote = vi.fn();
vi.mock("@/services/api/quotes", async () => {
  const actual =
    await vi.importActual<typeof import("@/services/api/quotes")>("@/services/api/quotes");
  return {
    ...actual,
    fetchClientQuote: (...a: unknown[]) => fetchClientQuote(...a),
    respondToQuote: (...a: unknown[]) => respondToQuote(...a),
  };
});

import QuotePage from "./QuotePage";
import { QuoteApiError } from "@/services/api/quotes";

const baseQuote: ClientQuote = {
  quoteNumber: "Q-2026-0001",
  revision: 1,
  status: "sent",
  currency: "GHS",
  title: "Online store",
  overview: "We build your store.",
  scope: "- Catalogue\n- Checkout",
  timeline: "",
  notes: "",
  terms: "- Pay on time",
  clientName: "Kofi Mensah",
  clientCompany: "",
  clientEmail: "kofi@example.com",
  items: [
    { id: "item-1", description: "Store build", qty: 1, unitMinor: 1000000, lineMinor: 1000000 },
  ],
  subtotalMinor: 1000000,
  discountMinor: 0,
  totalMinor: 1000000,
  issuedAt: "2026-10-01T00:00:00Z",
  validUntil: "2026-10-15T00:00:00Z",
  acceptedName: null,
  respondedAt: null,
  stages: [
    {
      id: "deposit",
      label: "Deposit",
      percent: 60,
      index: 0,
      amountMinor: 600000,
      state: "later",
      dueAt: null,
      dueBy: null,
      overdue: false,
      invoiceNumber: "Q-2026-0001-INV-1",
      paidAt: null,
      receiptPath: null,
    },
    {
      id: "balance",
      label: "Balance",
      percent: 40,
      index: 1,
      amountMinor: 400000,
      state: "later",
      dueAt: null,
      dueBy: null,
      overdue: false,
      invoiceNumber: "Q-2026-0001-INV-2",
      paidAt: null,
      receiptPath: null,
    },
  ],
  summary: { paidMinor: 0, balanceMinor: 1000000, complete: false },
  contact: { email: "hello@oceaniccoder.dev", whatsapp: "" },
};

const renderAt = (path = "/q/tok") =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/q/:token" element={<QuotePage />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );

beforeEach(() => {
  fetchClientQuote.mockReset();
  respondToQuote.mockReset();
});

describe("QuotePage", () => {
  it("shows the full quote document", async () => {
    fetchClientQuote.mockResolvedValue({ quote: baseQuote });
    renderAt();
    expect(await screen.findByRole("heading", { name: "Online store" })).toBeInTheDocument();
    expect(screen.getByText("Store build")).toBeInTheDocument();
    expect(screen.getAllByText("GHS 10,000.00").length).toBeGreaterThan(0);
    expect(screen.getByText("Catalogue")).toBeInTheDocument();
    expect(screen.getByText(/GHS 6,000.00/)).toBeInTheDocument();
  });

  it("shows the inactive screen for a dead link", async () => {
    fetchClientQuote.mockRejectedValue(new QuoteApiError("This link is no longer active.", 404));
    renderAt();
    expect(await screen.findByText(/no longer active/i)).toBeInTheDocument();
  });

  it("accepts with a typed name and agreement, then offers the deposit", async () => {
    fetchClientQuote.mockResolvedValue({ quote: baseQuote });
    const accepted: ClientQuote = {
      ...baseQuote,
      status: "accepted",
      acceptedName: "Kofi Mensah",
      respondedAt: "2026-10-02T00:00:00Z",
      stages: [
        { ...baseQuote.stages[0], state: "due", dueAt: "2026-10-02T00:00:00Z" },
        baseQuote.stages[1],
      ],
    };
    respondToQuote.mockResolvedValue({ quote: accepted });
    renderAt();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/full name/i), "Kofi Mensah");
    const button = screen.getByRole("button", { name: /accept quote/i });
    expect(button).toBeDisabled();
    await user.click(screen.getByRole("checkbox"));
    await user.click(button);
    await waitFor(() =>
      expect(respondToQuote).toHaveBeenCalledWith("tok", {
        action: "accept",
        name: "Kofi Mensah",
        agree: true,
      }),
    );
    expect((await screen.findAllByRole("link", { name: /pay the deposit/i }))[0]).toHaveAttribute(
      "href",
      "/q/tok/pay/deposit",
    );
  });

  it("passes preview=1 through without counting a view", async () => {
    fetchClientQuote.mockResolvedValue({ quote: baseQuote });
    renderAt("/q/tok?preview=1");
    await screen.findByRole("heading", { name: "Online store" });
    expect(fetchClientQuote).toHaveBeenCalledWith("tok", true);
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/components/Quote`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement the small pieces**

`src/components/Quote/journey.ts`:

```ts
import type { ClientQuote } from "@/types/quote";

export interface JourneyStep {
  key: string;
  label: string;
  done: boolean;
  current: boolean;
}

/** Review → Accept → one step per payment stage. The current step is the first one not done. */
export function journeySteps(quote: ClientQuote): JourneyStep[] {
  const accepted = quote.status === "accepted";
  const steps = [
    { key: "review", label: "Review", done: true },
    { key: "accept", label: "Accept", done: accepted },
    ...quote.stages.map((s) => ({ key: s.id, label: s.label, done: s.state === "paid" })),
  ];
  const current = steps.findIndex((s) => !s.done);
  return steps.map((s, i) => ({ ...s, current: i === current }));
}
```

`src/components/Quote/TextBlock.tsx`:

```tsx
import React from "react";

// Quote text is plain text written by the admin: blank lines split
// paragraphs, "- " starts a bullet, and https links become clickable. Nothing
// is ever rendered as HTML.

function linkify(line: string) {
  return line.split(/(https:\/\/[^\s<]+)/g).map((part, i) =>
    part.startsWith("https://") ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="underline break-all"
        style={{ color: "var(--accent-teal)" }}
      >
        {part}
      </a>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    ),
  );
}

export default function TextBlock({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="list-disc pl-5 space-y-1 mb-3">
          {bullets.map((b, i) => (
            <li key={i}>{linkify(b)}</li>
          ))}
        </ul>,
      );
      bullets = [];
    }
  };
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    if (line.startsWith("- ")) {
      bullets.push(line.slice(2));
      continue;
    }
    flush();
    if (line.trim())
      blocks.push(
        <p key={`p-${blocks.length}`} className="mb-3">
          {linkify(line)}
        </p>,
      );
  }
  flush();
  return (
    <div className="text-[15px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
      {blocks}
    </div>
  );
}
```

`src/components/Quote/QuoteShell.tsx`:

```tsx
import React from "react";
import { Helmet } from "react-helmet-async";

const WIDTHS = { narrow: "max-w-2xl", quote: "max-w-4xl", wide: "max-w-5xl" } as const;

/** Frame for every client-facing quote page: slim brand bar, noindex, print-friendly. */
export default function QuoteShell({
  title,
  width = "quote",
  children,
}: {
  title: string;
  width?: keyof typeof WIDTHS;
  children: React.ReactNode;
}) {
  const max = WIDTHS[width];
  return (
    <div className="min-h-dvh print:bg-white" style={{ background: "var(--bg-primary)" }}>
      <Helmet>
        <title>{`${title} · OceanicCoder`}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <header className="print:hidden border-b" style={{ borderColor: "var(--border-subtle)" }}>
        <div className={`${max} mx-auto px-4 h-14 flex items-center justify-between`}>
          <a href="/" className="flex items-center gap-2">
            <img src="/images/logo/Oceaniccoder-croped.png" alt="" className="h-7 w-7 rounded" />
            <span className="font-heading font-semibold" style={{ color: "var(--text-primary)" }}>
              OceanicCoder
            </span>
          </a>
          <a
            href="mailto:hello@oceaniccoder.dev"
            className="text-sm hidden sm:inline"
            style={{ color: "var(--text-secondary)" }}
          >
            hello@oceaniccoder.dev
          </a>
        </div>
      </header>
      <main className={`${max} mx-auto px-4 py-8 sm:py-12 space-y-6 print:py-0`}>{children}</main>
    </div>
  );
}

export function QuoteCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border p-5 sm:p-7 print:border-gray-300 print:break-inside-avoid ${className}`}
      style={{ background: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}
    >
      {children}
    </section>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="font-mono text-[11px] uppercase tracking-[0.12em] mb-3"
      style={{ color: "var(--text-secondary)" }}
    >
      {children}
    </h2>
  );
}

export function QuoteLoading() {
  return (
    <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-40 rounded-2xl" style={{ background: "var(--bg-secondary)" }} />
      <div className="h-64 rounded-2xl" style={{ background: "var(--bg-secondary)" }} />
    </div>
  );
}

export function QuoteError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <QuoteCard className="text-center">
      <p className="mb-4" style={{ color: "var(--text-primary)" }}>
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-5 py-2.5 rounded-xl font-semibold text-white"
          style={{ background: "var(--accent-teal)" }}
        >
          Try again
        </button>
      )}
    </QuoteCard>
  );
}
```

`src/components/Quote/InactiveLink.tsx`:

```tsx
import { QuoteCard } from "./QuoteShell";

export default function InactiveLink() {
  return (
    <QuoteCard className="text-center">
      <h1 className="font-heading text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
        This link is no longer active
      </h1>
      <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
        The quote may have been updated, replaced or withdrawn. Ask for the latest link and we'll
        send it straight over.
      </p>
      <a
        href="mailto:hello@oceaniccoder.dev?subject=Quote%20link"
        className="inline-block px-5 py-3 rounded-xl font-semibold text-white"
        style={{ background: "var(--accent-teal)" }}
      >
        Email hello@oceaniccoder.dev
      </a>
    </QuoteCard>
  );
}
```

`src/components/Quote/useClientQuote.ts`:

```ts
import { useCallback, useEffect, useState } from "react";
import { fetchClientQuote, QuoteApiError } from "@/services/api/quotes";
import type { ClientQuote } from "@/types/quote";

export type ClientQuoteState =
  | { kind: "loading" }
  | { kind: "inactive" }
  | { kind: "error"; message: string }
  | { kind: "ok"; quote: ClientQuote };

export function useClientQuote(token: string, preview = false) {
  const [state, setState] = useState<ClientQuoteState>({ kind: "loading" });

  const reload = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const { quote } = await fetchClientQuote(token, preview);
      setState({ kind: "ok", quote });
    } catch (err) {
      if (err instanceof QuoteApiError && err.status === 404) setState({ kind: "inactive" });
      else
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "We couldn't load the quote.",
        });
    }
  }, [token, preview]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const setQuote = useCallback((quote: ClientQuote) => setState({ kind: "ok", quote }), []);
  return { state, reload, setQuote };
}
```

- [ ] **Step 4: Implement the quote page parts**

`src/components/Quote/JourneyBar.tsx`:

```tsx
import { FaCheck } from "react-icons/fa";
import { journeySteps } from "./journey";
import type { ClientQuote } from "@/types/quote";

export default function JourneyBar({ quote }: { quote: ClientQuote }) {
  if (quote.status === "declined" || quote.status === "expired") return null;
  const steps = journeySteps(quote);
  return (
    <nav aria-label="Progress" className="print:hidden overflow-x-auto">
      <ol className="flex items-center gap-2 min-w-max">
        {steps.map((s, i) => (
          <li key={s.key} className="flex items-center gap-2">
            <span
              aria-current={s.current ? "step" : undefined}
              className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium border"
              style={{
                borderColor: s.current ? "var(--accent-teal)" : "var(--border-subtle)",
                background: s.done ? "var(--accent-teal-subtle)" : "transparent",
                color: s.done || s.current ? "var(--text-primary)" : "var(--text-secondary)",
              }}
            >
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold"
                style={{
                  background: s.done ? "var(--accent-teal)" : "var(--bg-tertiary)",
                  color: s.done ? "#fff" : "var(--text-secondary)",
                }}
              >
                {s.done ? <FaCheck aria-hidden /> : i + 1}
              </span>
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className="w-4 h-px"
                style={{ background: "var(--border-subtle)" }}
              />
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
```

`src/components/Quote/QuoteDocument.tsx`:

```tsx
import TextBlock from "./TextBlock";
import { QuoteCard, SectionLabel } from "./QuoteShell";
import { formatDate, formatMinor } from "@/utils/quoteMath";
import type { ClientQuote } from "@/types/quote";

export default function QuoteDocument({ quote }: { quote: ClientQuote }) {
  const money = (m: number) => formatMinor(m, quote.currency);
  const sections = [
    ["Overview", quote.overview],
    ["Scope and deliverables", quote.scope],
    ["Timeline", quote.timeline],
  ].filter(([, text]) => text.trim());

  return (
    <>
      <section className="rounded-2xl p-6 sm:p-8 text-white bg-[linear-gradient(135deg,#04333B_0%,#0a0f1a_100%)] print:bg-none print:text-black print:border print:border-gray-300">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#7dd3e0] print:text-gray-600">
              Quote {quote.quoteNumber}
              {quote.revision > 1 ? ` · revision ${quote.revision}` : ""}
            </p>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold mt-2">{quote.title}</h1>
          </div>
          <div className="text-right font-mono text-sm">
            <p className="text-white/60 print:text-gray-600">Total</p>
            <p className="text-2xl font-bold tabular-nums">{money(quote.totalMinor)}</p>
          </div>
        </div>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 text-sm">
          <div>
            <dt className="text-white/60 print:text-gray-600">Prepared for</dt>
            <dd className="font-medium">
              {quote.clientName}
              {quote.clientCompany ? `, ${quote.clientCompany}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-white/60 print:text-gray-600">Issued</dt>
            <dd className="font-medium">{formatDate(quote.issuedAt) || "Draft"}</dd>
          </div>
          <div>
            <dt className="text-white/60 print:text-gray-600">Valid until</dt>
            <dd className="font-medium">{formatDate(quote.validUntil) || "Not set"}</dd>
          </div>
        </dl>
      </section>

      {sections.map(([label, text]) => (
        <QuoteCard key={label}>
          <SectionLabel>{label}</SectionLabel>
          <TextBlock text={text} />
        </QuoteCard>
      ))}

      <QuoteCard>
        <SectionLabel>What's included</SectionLabel>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left" style={{ color: "var(--text-secondary)" }}>
              <th className="py-2 font-medium">Item</th>
              <th className="py-2 font-medium text-right hidden sm:table-cell">Qty</th>
              <th className="py-2 font-medium text-right hidden sm:table-cell">Unit price</th>
              <th className="py-2 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((item) => (
              <tr
                key={item.id}
                className="border-t"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <td className="py-3 pr-3" style={{ color: "var(--text-primary)" }}>
                  {item.description}
                  <span
                    className="block sm:hidden text-xs font-mono mt-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {item.qty} × {money(item.unitMinor)}
                  </span>
                </td>
                <td className="py-3 text-right font-mono tabular-nums hidden sm:table-cell">
                  {item.qty}
                </td>
                <td className="py-3 text-right font-mono tabular-nums hidden sm:table-cell">
                  {money(item.unitMinor)}
                </td>
                <td
                  className="py-3 text-right font-mono tabular-nums"
                  style={{ color: "var(--text-primary)" }}
                >
                  {money(item.lineMinor)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="mt-4 ml-auto max-w-xs text-sm font-mono tabular-nums space-y-1">
          <div className="flex justify-between">
            <dt style={{ color: "var(--text-secondary)" }}>Subtotal</dt>
            <dd>{money(quote.subtotalMinor)}</dd>
          </div>
          {quote.discountMinor > 0 && (
            <div className="flex justify-between">
              <dt style={{ color: "var(--text-secondary)" }}>Discount</dt>
              <dd>−{money(quote.discountMinor)}</dd>
            </div>
          )}
          <div
            className="flex justify-between border-t-2 pt-2 text-base font-bold"
            style={{ borderColor: "var(--text-primary)", color: "var(--text-primary)" }}
          >
            <dt>Total</dt>
            <dd>{money(quote.totalMinor)}</dd>
          </div>
        </dl>
      </QuoteCard>
    </>
  );
}

export function TermsAndNotes({ quote }: { quote: ClientQuote }) {
  return (
    <>
      {quote.notes.trim() && (
        <QuoteCard>
          <SectionLabel>Notes</SectionLabel>
          <TextBlock text={quote.notes} />
        </QuoteCard>
      )}
      {quote.terms.trim() && (
        <QuoteCard>
          <SectionLabel>Terms</SectionLabel>
          <TextBlock text={quote.terms} />
        </QuoteCard>
      )}
    </>
  );
}
```

`src/components/Quote/StagePlan.tsx`:

```tsx
import type React from "react";
import { Link } from "react-router-dom";
import { QuoteCard, SectionLabel } from "./QuoteShell";
import { formatDate, formatMinor } from "@/utils/quoteMath";
import type { ClientQuote, ClientStage } from "@/types/quote";

const PILL: Record<ClientStage["state"], { label: string; style: React.CSSProperties }> = {
  paid: {
    label: "Paid",
    style: { background: "var(--status-success-bg)", color: "var(--status-success-text)" },
  },
  due: {
    label: "Due",
    style: { background: "var(--status-pending-bg)", color: "var(--status-pending-text)" },
  },
  later: {
    label: "Later",
    style: { background: "var(--bg-tertiary)", color: "var(--text-secondary)" },
  },
};

export default function StagePlan({ quote, token }: { quote: ClientQuote; token: string }) {
  return (
    <QuoteCard>
      <SectionLabel>How you pay</SectionLabel>
      <ol className="space-y-3">
        {quote.stages.map((s) => (
          <li
            key={s.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border p-4"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full font-mono text-sm font-bold text-white"
              style={{ background: "#0a0f1a" }}
            >
              {s.index + 1}
            </span>
            <div className="flex-1 min-w-[10rem]">
              <p className="font-medium" style={{ color: "var(--text-primary)" }}>
                {s.label} <span style={{ color: "var(--text-secondary)" }}>· {s.percent}%</span>
              </p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {s.state === "paid" && s.paidAt
                  ? `Paid ${formatDate(s.paidAt)}`
                  : s.state === "due" && s.dueBy
                    ? `Due by ${formatDate(s.dueBy)}`
                    : s.index === 0
                      ? "Due when you accept"
                      : "Requested when this stage is reached"}
                {s.overdue && (
                  <span
                    className="ml-2 font-semibold"
                    style={{ color: "var(--status-failed-text)" }}
                  >
                    Overdue
                  </span>
                )}
              </p>
            </div>
            <span
              className="font-mono font-semibold tabular-nums"
              style={{ color: "var(--text-primary)" }}
            >
              {formatMinor(s.amountMinor, quote.currency)}
            </span>
            <span
              className="rounded-full px-2.5 py-1 text-xs font-semibold"
              style={PILL[s.state].style}
            >
              {PILL[s.state].label}
            </span>
            <div className="flex gap-2 w-full sm:w-auto print:hidden">
              {s.state === "due" && quote.status === "accepted" && (
                <Link
                  to={`/q/${token}/pay/${s.id}`}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                  style={{ background: "var(--accent-teal)" }}
                >
                  Pay now
                </Link>
              )}
              {s.state !== "later" && (
                <Link
                  to={`/q/${token}/invoice/${s.id}`}
                  className="px-4 py-2 rounded-lg text-sm border"
                  style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
                >
                  Invoice
                </Link>
              )}
              {s.receiptPath && (
                <Link
                  to={s.receiptPath}
                  className="px-4 py-2 rounded-lg text-sm border"
                  style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
                >
                  Receipt
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-sm font-mono tabular-nums" style={{ color: "var(--text-secondary)" }}>
        Paid {formatMinor(quote.summary.paidMinor, quote.currency)} · Balance{" "}
        {formatMinor(quote.summary.balanceMinor, quote.currency)}
      </p>
    </QuoteCard>
  );
}
```

`src/components/Quote/QuoteActions.tsx`:

```tsx
import { useState } from "react";
import { respondToQuote } from "@/services/api/quotes";
import { QuoteCard, SectionLabel } from "./QuoteShell";
import type { ClientQuote } from "@/types/quote";

export default function QuoteActions({
  token,
  quote,
  onChange,
}: {
  token: string;
  quote: ClientQuote;
  onChange: (q: ClientQuote) => void;
}) {
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (body: Parameters<typeof respondToQuote>[1]) => {
    setBusy(true);
    setError(null);
    try {
      const { quote: updated } = await respondToQuote(token, body);
      onChange(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const whatsapp = quote.contact.whatsapp
    ? `https://wa.me/${quote.contact.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi, I have a question about quote ${quote.quoteNumber}.`)}`
    : null;

  return (
    <QuoteCard className="print:hidden">
      <SectionLabel>Your decision</SectionLabel>
      {!declining ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit({ action: "accept", name: name.trim(), agree });
          }}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="accept-name"
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--text-primary)" }}
            >
              Type your full name to accept
            </label>
            <input
              id="accept-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="glass-input w-full rounded-xl px-4 py-3"
              placeholder={quote.clientName}
            />
          </div>
          <label
            className="flex items-start gap-3 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-1"
            />
            I agree to the scope, payment plan and terms in this quote.
          </label>
          {error && (
            <p role="alert" className="text-sm" style={{ color: "var(--status-failed-text)" }}>
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={busy || name.trim().length < 3 || !agree}
              className="min-h-12 px-6 rounded-xl font-semibold text-white disabled:opacity-50"
              style={{ background: "var(--accent-teal)" }}
            >
              {busy ? "Accepting…" : "Accept quote"}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="min-h-12 px-5 rounded-xl border"
              style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
            >
              Print or save PDF
            </button>
            <a
              href={`mailto:${quote.contact.email}?subject=${encodeURIComponent(`Question about ${quote.quoteNumber}`)}`}
              className="min-h-12 px-5 rounded-xl border inline-flex items-center"
              style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
            >
              Ask a question
            </a>
            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-12 px-5 rounded-xl border inline-flex items-center"
                style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
              >
                WhatsApp
              </a>
            )}
            <button
              type="button"
              onClick={() => setDeclining(true)}
              className="min-h-12 px-5 text-sm underline"
              style={{ color: "var(--text-secondary)" }}
            >
              Decline
            </button>
          </div>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit({ action: "decline", reason: reason.trim() });
          }}
          className="space-y-4"
        >
          <label
            htmlFor="decline-reason"
            className="block text-sm font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            Anything we should know? (optional)
          </label>
          <textarea
            id="decline-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={3}
            className="glass-input w-full rounded-xl px-4 py-3"
          />
          {error && (
            <p role="alert" className="text-sm" style={{ color: "var(--status-failed-text)" }}>
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={busy}
              className="min-h-12 px-6 rounded-xl font-semibold border"
              style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
            >
              {busy ? "Sending…" : "Decline quote"}
            </button>
            <button
              type="button"
              onClick={() => setDeclining(false)}
              className="min-h-12 px-5 text-sm underline"
              style={{ color: "var(--text-secondary)" }}
            >
              Back
            </button>
          </div>
        </form>
      )}
    </QuoteCard>
  );
}
```

`src/components/Quote/QuotePage.tsx`:

```tsx
import { Link, useParams, useSearchParams } from "react-router-dom";
import QuoteShell, { QuoteCard, QuoteError, QuoteLoading } from "./QuoteShell";
import QuoteDocument, { TermsAndNotes } from "./QuoteDocument";
import JourneyBar from "./JourneyBar";
import StagePlan from "./StagePlan";
import QuoteActions from "./QuoteActions";
import InactiveLink from "./InactiveLink";
import { useClientQuote } from "./useClientQuote";
import { formatDate, formatMinor } from "@/utils/quoteMath";
import type { ClientQuote } from "@/types/quote";

function StatusBanner({ quote }: { quote: ClientQuote }) {
  const banners: Partial<Record<ClientQuote["status"], [string, string]>> = {
    accepted: [
      `Accepted by ${quote.acceptedName} on ${formatDate(quote.respondedAt)}.`,
      "var(--status-success-bg)",
    ],
    declined: [
      "You declined this quote. If that was a mistake, get in touch and we'll reopen it.",
      "var(--status-pending-bg)",
    ],
    expired: [
      "This quote has expired. Ask us for an updated one and we'll send it over.",
      "var(--status-pending-bg)",
    ],
  };
  const banner = banners[quote.status];
  if (!banner) return null;
  return (
    <div
      role="status"
      className="rounded-xl px-4 py-3 text-sm"
      style={{ background: banner[1], color: "var(--text-primary)" }}
    >
      {banner[0]}
    </div>
  );
}

function NextStep({ quote, token }: { quote: ClientQuote; token: string }) {
  const next = quote.stages.find((s) => s.state === "due");
  if (quote.summary.complete) {
    return (
      <QuoteCard className="print:hidden">
        <p className="font-medium" style={{ color: "var(--text-primary)" }}>
          Fully paid. Thank you for working with OceanicCoder.
        </p>
      </QuoteCard>
    );
  }
  if (!next) return null;
  return (
    <QuoteCard className="print:hidden">
      <p
        className="font-mono text-[11px] uppercase tracking-[0.12em] mb-1"
        style={{ color: "var(--accent-teal)" }}
      >
        Next step
      </p>
      <p className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
        {next.index === 0 ? "Your deposit is ready to pay" : `${next.label} is ready to pay`}:{" "}
        {formatMinor(next.amountMinor, quote.currency)}
      </p>
      <Link
        to={`/q/${token}/pay/${next.id}`}
        className="inline-flex min-h-12 items-center px-6 rounded-xl font-semibold text-white"
        style={{ background: "var(--accent-teal)" }}
      >
        {next.index === 0 ? "Pay the deposit" : `Pay the ${next.label.toLowerCase()}`}
      </Link>
    </QuoteCard>
  );
}

export default function QuotePage() {
  const { token = "" } = useParams();
  const [params] = useSearchParams();
  const { state, reload, setQuote } = useClientQuote(token, params.get("preview") === "1");

  if (state.kind === "loading")
    return (
      <QuoteShell title="Your quote">
        <QuoteLoading />
      </QuoteShell>
    );
  if (state.kind === "inactive")
    return (
      <QuoteShell title="Link not active" width="narrow">
        <InactiveLink />
      </QuoteShell>
    );
  if (state.kind === "error")
    return (
      <QuoteShell title="Your quote">
        <QuoteError message={state.message} onRetry={reload} />
      </QuoteShell>
    );

  const { quote } = state;
  return (
    <QuoteShell title={`${quote.title} · ${quote.quoteNumber}`}>
      <JourneyBar quote={quote} />
      <StatusBanner quote={quote} />
      {quote.status === "accepted" && <NextStep quote={quote} token={token} />}
      <QuoteDocument quote={quote} />
      <StagePlan quote={quote} token={token} />
      <TermsAndNotes quote={quote} />
      {quote.status === "sent" && <QuoteActions token={token} quote={quote} onChange={setQuote} />}
    </QuoteShell>
  );
}
```

- [ ] **Step 5: Wire the routes and hide the site chrome**

In `src/routes/lazyComponents.ts`, after the `PaymentPage` line, add:

```ts
const QuotePage = lazyWithReload("QuotePage", () => import("@/components/Quote/QuotePage"));
const CheckoutPage = lazyWithReload(
  "CheckoutPage",
  () => import("@/components/Quote/CheckoutPage"),
);
const PaidPage = lazyWithReload("PaidPage", () => import("@/components/Quote/PaidPage"));
const StageInvoicePage = lazyWithReload(
  "StageInvoicePage",
  () => import("@/components/Quote/StageInvoicePage"),
);
const ReceiptPage = lazyWithReload("ReceiptPage", () => import("@/components/Quote/ReceiptPage"));
```

Add `() => import("@/components/Quote/QuotePage"),` as the second entry of `PREFETCHABLE_ROUTES` (right after `PaymentPage`), and add `QuotePage, CheckoutPage, PaidPage, StageInvoicePage, ReceiptPage,` to the final `export { ... }` list.

So the build passes before Task 15, create the four remaining pages as one-line placeholders now; Task 15 replaces each file entirely:

```tsx
// src/components/Quote/CheckoutPage.tsx (same one line for PaidPage, StageInvoicePage, ReceiptPage)
export default function CheckoutPage() {
  return null;
}
```

In `src/routes/publicRoutes.tsx`, add `QuotePage, CheckoutPage, PaidPage, StageInvoicePage, ReceiptPage,` to the import list, and insert before the `path="*"` route:

```tsx
    <Route path="/q/:token" element={<React.Suspense fallback={<Fallback />}><QuotePage /></React.Suspense>} />
    <Route path="/q/:token/pay/:stageId" element={<React.Suspense fallback={<Fallback />}><CheckoutPage /></React.Suspense>} />
    <Route path="/q/:token/paid" element={<React.Suspense fallback={<Fallback />}><PaidPage /></React.Suspense>} />
    <Route path="/q/:token/invoice/:stageId" element={<React.Suspense fallback={<Fallback />}><StageInvoicePage /></React.Suspense>} />
    <Route path="/receipt/:reference" element={<React.Suspense fallback={<Fallback />}><ReceiptPage /></React.Suspense>} />
```

In `src/components/MainLayout.tsx`, replace the `isAdminRoute` line with:

```tsx
// Admin pages and client documents (quotes, invoices, receipts) bring their
// own frame; the marketing navbar, banner and footer would only distract.
const isAdminRoute =
  location.pathname.startsWith("/admin") ||
  location.pathname === "/dashboard" ||
  location.pathname.startsWith("/q/") ||
  location.pathname.startsWith("/receipt/");
```

In `src/components/TerminalLoader/useTerminalAnimation.ts`, change `SKIP_PATHS` to:

```ts
const SKIP_PATHS = ["/pay/", "/q/", "/receipt/", "/dashboard", "/admin"];
```

- [ ] **Step 6: Run the tests, type-check and lint**

Run: `npx vitest run src/components/Quote && npm run type-check && npm run lint`
Expected: PASS, no errors.

- [ ] **Step 7: Visual check is deferred**

The page needs a real sent quote to look at, which the admin editor (Task 17) creates. The browser check for this page is part of Task 17 Step 7.

- [ ] **Step 8: Commit**

```bash
git add src/components/Quote src/routes src/components/MainLayout.tsx src/components/TerminalLoader/useTerminalAnimation.ts
git commit -m "feat(OC-0): add the client quote page with accept and decline"
```

---

### Task 15: Checkout, return, invoice and receipt pages

**Files:**

- Replace: `src/components/Quote/CheckoutPage.tsx`, `PaidPage.tsx`, `StageInvoicePage.tsx`, `ReceiptPage.tsx`
- Test: `src/components/Quote/CheckoutPage.test.tsx`, `src/components/Quote/PaidPage.test.tsx`

**Interfaces:**

- Consumes: `useClientQuote`, `QuoteShell`/`QuoteCard`/`SectionLabel`/`QuoteLoading`/`QuoteError`, `InactiveLink` (Task 14); `startStagePayment`, `checkStagePayment`, `fetchReceipt` (Task 13); `loadPaystackV2` (Task 13).
- Produces: the four route components. `PaidPage` polls every 5 s for up to 5 minutes; `CheckoutPage` polls every 4 s for up to 4 minutes while the popup is open.

- [ ] **Step 1: Write the failing tests**

`src/components/Quote/CheckoutPage.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import type { ClientQuote } from "@/types/quote";

const fetchClientQuote = vi.fn();
const startStagePayment = vi.fn();
const checkStagePayment = vi.fn();
vi.mock("@/services/api/quotes", async () => {
  const actual =
    await vi.importActual<typeof import("@/services/api/quotes")>("@/services/api/quotes");
  return {
    ...actual,
    fetchClientQuote: (...a: unknown[]) => fetchClientQuote(...a),
    startStagePayment: (...a: unknown[]) => startStagePayment(...a),
    checkStagePayment: (...a: unknown[]) => checkStagePayment(...a),
  };
});
const resumeTransaction = vi.fn();
vi.mock("@/utils/paystackV2", () => ({
  loadPaystackV2: vi
    .fn()
    .mockResolvedValue({ resumeTransaction: (...a: unknown[]) => resumeTransaction(...a) }),
}));

import CheckoutPage from "./CheckoutPage";

const quote = {
  quoteNumber: "Q-2026-0001",
  status: "accepted",
  currency: "GHS",
  title: "Store",
  clientEmail: "kofi@example.com",
  stages: [
    {
      id: "deposit",
      label: "Deposit",
      percent: 60,
      index: 0,
      amountMinor: 600000,
      state: "due",
      invoiceNumber: "Q-2026-0001-INV-1",
    },
    {
      id: "balance",
      label: "Balance",
      percent: 40,
      index: 1,
      amountMinor: 400000,
      state: "later",
      invoiceNumber: "Q-2026-0001-INV-2",
    },
  ],
  summary: { paidMinor: 0, balanceMinor: 1000000, complete: false },
  contact: { email: "hello@oceaniccoder.dev", whatsapp: "" },
} as unknown as ClientQuote;

const renderAt = (path: string) =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/q/:token/pay/:stageId" element={<CheckoutPage />} />
          <Route path="/q/:token/paid" element={<p>paid page</p>} />
          <Route path="/q/:token" element={<p>quote page</p>} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  fetchClientQuote.mockResolvedValue({ quote });
  checkStagePayment.mockResolvedValue({ state: "pending", receiptPath: null });
});

describe("CheckoutPage", () => {
  it("shows the stage amount and the balance after it", async () => {
    renderAt("/q/tok/pay/deposit");
    expect((await screen.findAllByText("GHS 6,000.00")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("GHS 4,000.00").length).toBeGreaterThanOrEqual(2); // balance stage + balance after
  });

  it("starts the payment on the server and opens Paystack with the access code", async () => {
    startStagePayment.mockResolvedValue({
      accessCode: "AC1",
      authorizationUrl: "https://checkout.paystack.com/AC1",
      reference: "R1",
    });
    renderAt("/q/tok/pay/deposit");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("tab", { name: /mobile money/i }));
    await user.click(screen.getByRole("button", { name: /pay ghs 6,000.00/i }));
    await waitFor(() =>
      expect(startStagePayment).toHaveBeenCalledWith({
        token: "tok",
        stageId: "deposit",
        method: "momo",
        email: "kofi@example.com",
      }),
    );
    expect(resumeTransaction).toHaveBeenCalledWith(
      "AC1",
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    resumeTransaction.mock.calls[0][1].onSuccess({ reference: "R1" });
    expect(await screen.findByText("paid page")).toBeInTheDocument();
  });

  it("sends a stage that isn't due back to the quote", async () => {
    renderAt("/q/tok/pay/balance");
    expect(await screen.findByText("quote page")).toBeInTheDocument();
  });

  it("shows the server's error and lets the client retry", async () => {
    startStagePayment.mockRejectedValue(
      new Error("Paystack couldn't start the payment. Please try again in a minute."),
    );
    renderAt("/q/tok/pay/deposit");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /pay ghs/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't start/);
    expect(screen.getByRole("button", { name: /pay ghs/i })).toBeEnabled();
  });
});
```

`src/components/Quote/PaidPage.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

const checkStagePayment = vi.fn();
vi.mock("@/services/api/quotes", async () => {
  const actual =
    await vi.importActual<typeof import("@/services/api/quotes")>("@/services/api/quotes");
  return { ...actual, checkStagePayment: (...a: unknown[]) => checkStagePayment(...a) };
});

import PaidPage from "./PaidPage";

const renderAt = () =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={["/q/tok/paid?reference=R1"]}>
        <Routes>
          <Route path="/q/:token/paid" element={<PaidPage />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  checkStagePayment.mockReset();
});
afterEach(() => vi.useRealTimers());

describe("PaidPage", () => {
  it("shows paid with a receipt link", async () => {
    checkStagePayment.mockResolvedValue({ state: "paid", receiptPath: "/receipt/R1?s=x" });
    renderAt();
    expect(await screen.findByText(/payment received/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /receipt/i })).toHaveAttribute(
      "href",
      "/receipt/R1?s=x",
    );
  });

  it("pending keeps polling until Paystack confirms", async () => {
    checkStagePayment
      .mockResolvedValueOnce({ state: "pending", receiptPath: null })
      .mockResolvedValue({ state: "paid", receiptPath: "/receipt/R1?s=x" });
    renderAt();
    expect(await screen.findByText(/confirming/i)).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(await screen.findByText(/payment received/i)).toBeInTheDocument();
  });

  it("shows failure with a way back", async () => {
    checkStagePayment.mockResolvedValue({ state: "failed", receiptPath: null });
    renderAt();
    expect(await screen.findByText(/didn't go through/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to your quote/i })).toHaveAttribute(
      "href",
      "/q/tok",
    );
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/components/Quote/CheckoutPage.test.tsx src/components/Quote/PaidPage.test.tsx`
Expected: FAIL (the placeholder components render nothing).

- [ ] **Step 3: Implement `CheckoutPage.tsx`**

```tsx
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { FaCheck, FaCreditCard, FaMobileAlt, FaApple, FaLock } from "react-icons/fa";
import QuoteShell, { QuoteCard, QuoteError, QuoteLoading, SectionLabel } from "./QuoteShell";
import InactiveLink from "./InactiveLink";
import { useClientQuote } from "./useClientQuote";
import { startStagePayment, checkStagePayment } from "@/services/api/quotes";
import { loadPaystackV2 } from "@/utils/paystackV2";
import { formatMinor } from "@/utils/quoteMath";
import type { PayMethod } from "@/types/quote";

const METHODS: { id: PayMethod; label: string; hint: string; Icon: typeof FaCreditCard }[] = [
  { id: "card", label: "Card", hint: "Visa, Mastercard, Verve", Icon: FaCreditCard },
  { id: "momo", label: "Mobile Money", hint: "MTN, Telecel, AirtelTigo", Icon: FaMobileAlt },
  { id: "apple_pay", label: "Apple Pay", hint: "Face ID or Touch ID", Icon: FaApple },
];
const APPLE_PAY = import.meta.env.VITE_APPLE_PAY_ENABLED === "true";
const TEST_MODE = String(import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "").startsWith("pk_test_");

export default function CheckoutPage() {
  const { token = "", stageId = "" } = useParams();
  const navigate = useNavigate();
  const { state, reload } = useClientQuote(token, true);
  const [method, setMethod] = useState<PayMethod>("card");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const stopRef = useRef(false);

  useEffect(() => {
    if (state.kind === "ok" && !email) setEmail(state.quote.clientEmail);
  }, [state, email]);
  useEffect(() => () => void (stopRef.current = true), []);

  if (state.kind === "loading")
    return (
      <QuoteShell title="Payment" width="wide">
        <QuoteLoading />
      </QuoteShell>
    );
  if (state.kind === "inactive")
    return (
      <QuoteShell title="Link not active" width="narrow">
        <InactiveLink />
      </QuoteShell>
    );
  if (state.kind === "error")
    return (
      <QuoteShell title="Payment">
        <QuoteError message={state.message} onRetry={reload} />
      </QuoteShell>
    );

  const { quote } = state;
  const stage = quote.stages.find((s) => s.id === stageId);
  if (!stage || stage.state !== "due" || quote.status !== "accepted")
    return <Navigate to={`/q/${token}`} replace />;

  const money = (m: number) => formatMinor(m, quote.currency);
  const methods = METHODS.filter((m) => m.id !== "apple_pay" || APPLE_PAY);
  const paidUrl = (reference: string) =>
    `/q/${token}/paid?reference=${encodeURIComponent(reference)}`;

  const pay = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNote(null);
    stopRef.current = false;
    let started: Awaited<ReturnType<typeof startStagePayment>>;
    try {
      started = await startStagePayment({ token, stageId: stage.id, method, email: email.trim() });
    } catch (err) {
      setBusy(false);
      setNote({
        tone: "error",
        text: err instanceof Error ? err.message : "We couldn't start the payment.",
      });
      return;
    }
    // Safety net: if Paystack's success callback is slow or never fires, notice the payment ourselves.
    const watch = async (tries = 0): Promise<void> => {
      if (stopRef.current || tries > 60) return;
      await new Promise((r) => setTimeout(r, 4000));
      if (stopRef.current) return;
      const result = await checkStagePayment(token, started.reference).catch(() => null);
      if (result && result.state === "paid") {
        stopRef.current = true;
        navigate(paidUrl(started.reference));
        return;
      }
      return watch(tries + 1);
    };
    void watch();
    try {
      const popup = await loadPaystackV2();
      popup.resumeTransaction(started.accessCode, {
        onSuccess: () => {
          stopRef.current = true;
          navigate(paidUrl(started.reference));
        },
        onCancel: () => {
          stopRef.current = true;
          setBusy(false);
          setNote({
            tone: "info",
            text: "Payment window closed. Nothing was charged. You can try again when you're ready.",
          });
        },
        onError: () => {
          stopRef.current = true;
          setBusy(false);
          setNote({ tone: "error", text: "The payment window had a problem. Please try again." });
        },
      });
    } catch {
      // The popup script was blocked or offline: use Paystack's hosted page instead.
      window.location.assign(started.authorizationUrl);
    }
  };

  return (
    <QuoteShell title={`Pay ${stage.label} · ${quote.quoteNumber}`} width="wide">
      {TEST_MODE && (
        <div
          role="note"
          className="rounded-xl px-4 py-2 text-sm"
          style={{ background: "var(--status-pending-bg)", color: "var(--status-pending-text)" }}
        >
          Test mode: no real money will move.
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <aside className="lg:sticky lg:top-6 self-start rounded-2xl p-6 text-white bg-[linear-gradient(135deg,#04333B_0%,#0a0f1a_100%)]">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#7dd3e0]">
            {quote.quoteNumber} · {stage.invoiceNumber}
          </p>
          <p className="mt-2 text-white/70">{quote.title}</p>
          <p className="mt-4 text-sm text-white/70">
            {stage.label} ({stage.percent}%)
          </p>
          <p className="font-mono text-3xl font-bold tabular-nums">{money(stage.amountMinor)}</p>
          <ol className="mt-6 space-y-2 text-sm">
            {quote.stages.map((s) => (
              <li key={s.id} className="flex items-center gap-2">
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[10px]"
                  style={{
                    background:
                      s.state === "paid"
                        ? "#0C8599"
                        : s.id === stage.id
                          ? "#ffffff"
                          : "rgba(255,255,255,.15)",
                    color: s.id === stage.id ? "#0a0f1a" : "#fff",
                  }}
                >
                  {s.state === "paid" ? <FaCheck aria-hidden /> : s.index + 1}
                </span>
                <span className="flex-1">{s.label}</span>
                <span className="font-mono tabular-nums">{money(s.amountMinor)}</span>
              </li>
            ))}
          </ol>
          <dl className="mt-6 border-t border-white/15 pt-4 text-sm font-mono tabular-nums space-y-1">
            <div className="flex justify-between">
              <dt className="text-white/70">Paid so far</dt>
              <dd>{money(quote.summary.paidMinor)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/70">Balance after this payment</dt>
              <dd>{money(quote.summary.balanceMinor - stage.amountMinor)}</dd>
            </div>
          </dl>
        </aside>

        <QuoteCard>
          <form onSubmit={pay} className="space-y-5">
            <SectionLabel>Choose how to pay</SectionLabel>
            <div role="tablist" aria-label="Payment method" className="grid gap-3 sm:grid-cols-3">
              {methods.map(({ id, label, hint, Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={method === id}
                  onClick={() => setMethod(id)}
                  className="rounded-xl border p-4 text-left transition"
                  style={{
                    borderColor: method === id ? "var(--accent-teal)" : "var(--border-subtle)",
                    background: method === id ? "var(--accent-teal-subtle)" : "transparent",
                  }}
                >
                  <Icon aria-hidden className="mb-2" style={{ color: "var(--accent-teal)" }} />
                  <span className="block font-semibold" style={{ color: "var(--text-primary)" }}>
                    {label}
                  </span>
                  <span className="block text-xs" style={{ color: "var(--text-secondary)" }}>
                    {hint}
                  </span>
                </button>
              ))}
            </div>
            <div>
              <label
                htmlFor="pay-email"
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--text-primary)" }}
              >
                Email for your receipt
              </label>
              <input
                id="pay-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="glass-input w-full rounded-xl px-4 py-3"
              />
            </div>
            {note && (
              <p
                role={note.tone === "error" ? "alert" : "status"}
                className="text-sm"
                style={{
                  color:
                    note.tone === "error" ? "var(--status-failed-text)" : "var(--text-secondary)",
                }}
              >
                {note.text}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full min-h-12 py-3.5 rounded-xl font-semibold text-white disabled:opacity-60"
              style={{ background: "var(--accent-teal)" }}
            >
              {busy ? "Waiting for Paystack…" : `Pay ${money(stage.amountMinor)}`}
            </button>
            <p
              className="flex items-center gap-2 text-xs"
              style={{ color: "var(--text-secondary)" }}
            >
              <FaLock aria-hidden /> Paystack handles your card and Mobile Money details. We never
              see them.
            </p>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Prefer a bank transfer? Email{" "}
              <a
                className="underline"
                href={`mailto:hello@oceaniccoder.dev?subject=${encodeURIComponent(`Bank transfer for ${stage.invoiceNumber}`)}`}
              >
                hello@oceaniccoder.dev
              </a>{" "}
              and we'll send the details and confirm it by hand.
            </p>
          </form>
        </QuoteCard>
      </div>
    </QuoteShell>
  );
}
```

- [ ] **Step 4: Implement `PaidPage.tsx`**

```tsx
import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import QuoteShell, { QuoteCard } from "./QuoteShell";
import { checkStagePayment } from "@/services/api/quotes";
import type { PaymentCheckState } from "@/types/quote";

const POLL_MS = 5000;
const GIVE_UP_MS = 5 * 60 * 1000;

export default function PaidPage() {
  const { token = "" } = useParams();
  const [params] = useSearchParams();
  const reference = params.get("reference") || "";
  const [state, setState] = useState<PaymentCheckState | "slow" | "checking">("checking");
  const [receiptPath, setReceiptPath] = useState<string | null>(null);

  useEffect(() => {
    let stop = false;
    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      const result = await checkStagePayment(token, reference).catch(() => null);
      if (stop) return;
      if (result && result.state !== "pending") {
        setState(result.state);
        setReceiptPath(result.receiptPath);
        return;
      }
      if (Date.now() - startedAt > GIVE_UP_MS) {
        setState("slow");
        return;
      }
      setState("pending");
      timer = setTimeout(tick, POLL_MS);
    };
    void tick();
    return () => {
      stop = true;
      if (timer) clearTimeout(timer);
    };
  }, [token, reference]);

  const back = (
    <Link
      to={`/q/${token}`}
      className="inline-block mt-6 px-5 py-3 rounded-xl border"
      style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
    >
      Back to your quote
    </Link>
  );

  return (
    <QuoteShell title="Payment" width="narrow">
      <QuoteCard className="text-center">
        {state === "paid" && (
          <>
            <h1
              className="font-heading text-2xl font-bold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              Payment received. Thank you!
            </h1>
            <p style={{ color: "var(--text-secondary)" }}>
              We've emailed your receipt. You'll hear from us shortly about next steps.
            </p>
            {receiptPath && (
              <Link
                to={receiptPath}
                className="inline-block mt-6 mr-3 px-5 py-3 rounded-xl font-semibold text-white"
                style={{ background: "var(--accent-teal)" }}
              >
                View receipt
              </Link>
            )}
            {back}
          </>
        )}
        {(state === "checking" || state === "pending") && (
          <>
            <h1
              className="font-heading text-2xl font-bold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              Confirming your payment…
            </h1>
            <p style={{ color: "var(--text-secondary)" }}>
              This usually takes a few seconds. For Mobile Money, approve the prompt on your phone.
              Keep this page open.
            </p>
          </>
        )}
        {state === "slow" && (
          <>
            <h1
              className="font-heading text-2xl font-bold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              Still waiting for Paystack
            </h1>
            <p style={{ color: "var(--text-secondary)" }}>
              If you approved the payment, you don't need to do anything. We'll email your receipt
              as soon as Paystack confirms it.
            </p>
            {back}
          </>
        )}
        {(state === "failed" || state === "duplicate") && (
          <>
            <h1
              className="font-heading text-2xl font-bold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              {state === "duplicate"
                ? "This stage was already paid"
                : "The payment didn't go through"}
            </h1>
            <p style={{ color: "var(--text-secondary)" }}>
              {state === "duplicate"
                ? "We've flagged the extra payment and will refund it. No action needed."
                : "Nothing was recorded against your quote. You can try again from your quote page."}
            </p>
            {back}
          </>
        )}
      </QuoteCard>
    </QuoteShell>
  );
}
```

- [ ] **Step 5: Implement `StageInvoicePage.tsx` and `ReceiptPage.tsx`**

`src/components/Quote/StageInvoicePage.tsx`:

```tsx
import { Link, Navigate, useParams } from "react-router-dom";
import QuoteShell, { QuoteCard, QuoteError, QuoteLoading } from "./QuoteShell";
import InactiveLink from "./InactiveLink";
import { useClientQuote } from "./useClientQuote";
import { formatDate, formatMinor } from "@/utils/quoteMath";

export default function StageInvoicePage() {
  const { token = "", stageId = "" } = useParams();
  const { state, reload } = useClientQuote(token, true);
  if (state.kind === "loading")
    return (
      <QuoteShell title="Invoice" width="narrow">
        <QuoteLoading />
      </QuoteShell>
    );
  if (state.kind === "inactive")
    return (
      <QuoteShell title="Link not active" width="narrow">
        <InactiveLink />
      </QuoteShell>
    );
  if (state.kind === "error")
    return (
      <QuoteShell title="Invoice" width="narrow">
        <QuoteError message={state.message} onRetry={reload} />
      </QuoteShell>
    );

  const { quote } = state;
  const stage = quote.stages.find((s) => s.id === stageId);
  if (!stage || stage.state === "later") return <Navigate to={`/q/${token}`} replace />;
  const money = (m: number) => formatMinor(m, quote.currency);

  return (
    <QuoteShell title={`Invoice ${stage.invoiceNumber}`} width="narrow">
      <QuoteCard>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p
              className="font-mono text-[11px] uppercase tracking-[0.12em]"
              style={{ color: "var(--text-secondary)" }}
            >
              Invoice
            </p>
            <h1
              className="font-heading text-2xl font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              {stage.invoiceNumber}
            </h1>
          </div>
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={
              stage.state === "paid"
                ? { background: "var(--status-success-bg)", color: "var(--status-success-text)" }
                : { background: "var(--status-pending-bg)", color: "var(--status-pending-text)" }
            }
          >
            {stage.state === "paid" ? "Paid" : stage.overdue ? "Overdue" : "Due"}
          </span>
        </div>
        <dl className="grid grid-cols-2 gap-4 mt-6 text-sm">
          <div>
            <dt style={{ color: "var(--text-secondary)" }}>Billed to</dt>
            <dd style={{ color: "var(--text-primary)" }}>
              {quote.clientName}
              {quote.clientCompany ? `, ${quote.clientCompany}` : ""}
            </dd>
          </div>
          <div>
            <dt style={{ color: "var(--text-secondary)" }}>From</dt>
            <dd style={{ color: "var(--text-primary)" }}>OceanicCoder · hello@oceaniccoder.dev</dd>
          </div>
          <div>
            <dt style={{ color: "var(--text-secondary)" }}>Issued</dt>
            <dd style={{ color: "var(--text-primary)" }}>{formatDate(stage.dueAt)}</dd>
          </div>
          <div>
            <dt style={{ color: "var(--text-secondary)" }}>Due by</dt>
            <dd style={{ color: "var(--text-primary)" }}>{formatDate(stage.dueBy)}</dd>
          </div>
        </dl>
        <table className="w-full mt-6 text-sm">
          <tbody>
            <tr className="border-t" style={{ borderColor: "var(--border-subtle)" }}>
              <td className="py-3" style={{ color: "var(--text-primary)" }}>
                {stage.label} ({stage.percent}%) for {quote.title}
                <span className="block text-xs" style={{ color: "var(--text-secondary)" }}>
                  Quote {quote.quoteNumber}
                </span>
              </td>
              <td
                className="py-3 text-right font-mono tabular-nums"
                style={{ color: "var(--text-primary)" }}
              >
                {money(stage.amountMinor)}
              </td>
            </tr>
            <tr className="border-t-2" style={{ borderColor: "var(--text-primary)" }}>
              <td className="py-3 font-bold" style={{ color: "var(--text-primary)" }}>
                Amount {stage.state === "paid" ? "paid" : "due"}
              </td>
              <td
                className="py-3 text-right font-mono font-bold tabular-nums"
                style={{ color: "var(--text-primary)" }}
              >
                {money(stage.amountMinor)}
              </td>
            </tr>
          </tbody>
        </table>
        <div className="flex flex-wrap gap-3 mt-6 print:hidden">
          {stage.state === "due" && (
            <Link
              to={`/q/${token}/pay/${stage.id}`}
              className="px-5 py-3 rounded-xl font-semibold text-white"
              style={{ background: "var(--accent-teal)" }}
            >
              Pay now
            </Link>
          )}
          {stage.receiptPath && (
            <Link
              to={stage.receiptPath}
              className="px-5 py-3 rounded-xl border"
              style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
            >
              Receipt
            </Link>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="px-5 py-3 rounded-xl border"
            style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
          >
            Print or save PDF
          </button>
          <Link
            to={`/q/${token}`}
            className="px-5 py-3 text-sm underline"
            style={{ color: "var(--text-secondary)" }}
          >
            Back to quote
          </Link>
        </div>
      </QuoteCard>
    </QuoteShell>
  );
}
```

`src/components/Quote/ReceiptPage.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import QuoteShell, { QuoteCard, QuoteError, QuoteLoading } from "./QuoteShell";
import { fetchReceipt } from "@/services/api/quotes";
import { formatDate, formatMinor } from "@/utils/quoteMath";
import type { ReceiptView } from "@/types/quote";

export default function ReceiptPage() {
  const { reference = "" } = useParams();
  const [params] = useSearchParams();
  const [receipt, setReceipt] = useState<ReceiptView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReceipt(reference, params.get("s") || "")
      .then((r) => setReceipt(r.receipt))
      .catch((err) => setError(err instanceof Error ? err.message : "Receipt not found."));
  }, [reference, params]);

  if (error)
    return (
      <QuoteShell title="Receipt" width="narrow">
        <QuoteError message={error} />
      </QuoteShell>
    );
  if (!receipt)
    return (
      <QuoteShell title="Receipt" width="narrow">
        <QuoteLoading />
      </QuoteShell>
    );
  const money = (m: number) => formatMinor(m, receipt.currency);
  const rows: [string, string][] = [
    [
      "Received from",
      `${receipt.clientName}${receipt.clientCompany ? `, ${receipt.clientCompany}` : ""}`,
    ],
    ["For", `${receipt.stageLabel}, ${receipt.title}`],
    ["Invoice", receipt.invoiceNumber],
    ["Method", receipt.method],
    ["Reference", receipt.reference],
    ["Date", formatDate(receipt.paidAt)],
    ["Remaining balance", receipt.balanceMinor > 0 ? money(receipt.balanceMinor) : "Fully paid"],
  ];

  return (
    <QuoteShell title={`Receipt ${receipt.reference}`} width="narrow">
      <QuoteCard>
        <p
          className="font-mono text-[11px] uppercase tracking-[0.12em]"
          style={{ color: "var(--status-success-text)" }}
        >
          Payment received
        </p>
        <h1
          className="font-heading text-3xl font-bold font-mono tabular-nums mt-1"
          style={{ color: "var(--text-primary)" }}
        >
          {money(receipt.amountMinor)}
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Quote {receipt.quoteNumber} · OceanicCoder · hello@oceaniccoder.dev
        </p>
        <dl className="mt-6 divide-y text-sm" style={{ borderColor: "var(--border-subtle)" }}>
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 py-2.5">
              <dt style={{ color: "var(--text-secondary)" }}>{label}</dt>
              <dd className="text-right font-mono" style={{ color: "var(--text-primary)" }}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <button
          type="button"
          onClick={() => window.print()}
          className="mt-6 px-5 py-3 rounded-xl border print:hidden"
          style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
        >
          Print or save PDF
        </button>
      </QuoteCard>
    </QuoteShell>
  );
}
```

- [ ] **Step 6: Run the tests, type-check and lint**

Run: `npx vitest run src/components/Quote && npm run type-check && npm run lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/Quote
git commit -m "feat(OC-0): add stage checkout, payment confirmation, invoice and receipt pages"
```

---

### Task 16: Admin Quotes tab (list and detail)

**Files:**

- Create: `src/components/AdminDashboard/tabs/Quotes/QuotesTab.tsx`, `QuoteDetail.tsx`
- Modify: `src/components/AdminDashboard/SidebarParts/types.ts`, `SidebarParts/tabs.ts`, `Sidebar.tsx`, `TabContentExtra.tsx`
- Test: `src/components/AdminDashboard/tabs/Quotes/QuotesTab.test.tsx`

**Interfaces:**

- Consumes: `quoteAdmin` (Task 13); `QuoteSummary`, `QuoteDetailResponse`, `AdminStage`, `ManualMethod`; `formatMinor`, `formatDate`; `QuoteEditor` (a stand-in created in Step 6, replaced in Task 17; tests here mock it).
- Produces: `QuotesTab({theme})`; `QuoteDetail({id, onClose, onEdit, onChanged})`; tab ids `"quotes"` and `"emails"` registered (Emails tab content comes in Task 18).

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const quoteAdmin = vi.fn();
vi.mock("@/services/api/quotes", async () => {
  const actual =
    await vi.importActual<typeof import("@/services/api/quotes")>("@/services/api/quotes");
  return { ...actual, quoteAdmin: (...a: unknown[]) => quoteAdmin(...a) };
});
vi.mock("./QuoteEditor", () => ({ default: () => <div>editor open</div> }));

import QuotesTab from "./QuotesTab";

const summary = {
  id: "q1",
  quoteNumber: "Q-2026-0001",
  title: "Online store",
  clientName: "Kofi Mensah",
  status: "accepted",
  currency: "GHS",
  totalMinor: 1000000,
  paidMinor: 600000,
  complete: false,
  nextDue: { id: "balance", label: "Balance", overdue: false },
  sentAt: "2026-10-01T00:00:00Z",
  viewedAt: "2026-10-01T01:00:00Z",
  updatedAt: null,
};
const detail = {
  quote: {
    ...summary,
    revision: 1,
    hasLink: true,
    items: [],
    schedule: [],
    acceptedName: "Kofi Mensah",
    respondedAt: "2026-10-02T00:00:00Z",
    clientEmail: "kofi@example.com",
  },
  stages: [
    {
      id: "deposit",
      label: "Deposit",
      percent: 60,
      index: 0,
      amountMinor: 600000,
      state: "paid",
      dueAt: null,
      overdue: false,
      invoiceNumber: "Q-2026-0001-INV-1",
      paidAt: "2026-10-02T00:00:00Z",
      reference: "R1",
    },
    {
      id: "balance",
      label: "Balance",
      percent: 40,
      index: 1,
      amountMinor: 400000,
      state: "later",
      dueAt: null,
      overdue: false,
      invoiceNumber: "Q-2026-0001-INV-2",
      paidAt: null,
      reference: null,
    },
  ],
  payments: [],
};

beforeEach(() => {
  quoteAdmin.mockReset();
  quoteAdmin.mockImplementation(async (action: string) => {
    if (action === "list") return { quotes: [summary] };
    if (action === "get") return detail;
    if (action === "requestStage")
      return { ...detail, link: "https://oceaniccoder.dev/q/NEW", emailed: true };
    throw new Error(`unexpected ${action}`);
  });
});

describe("QuotesTab", () => {
  it("lists quotes with amount paid and next stage", async () => {
    render(<QuotesTab theme="dark" />);
    expect(await screen.findByText("Online store")).toBeInTheDocument();
    expect(screen.getByText(/GHS 6,000.00 of GHS 10,000.00/)).toBeInTheDocument();
    expect(screen.getByText(/Next: Balance/)).toBeInTheDocument();
  });

  it("opens the detail and requests the balance", async () => {
    const user = userEvent.setup();
    render(<QuotesTab theme="dark" />);
    await user.click(await screen.findByText("Online store"));
    await user.click(await screen.findByRole("button", { name: /request balance/i }));
    await waitFor(() =>
      expect(quoteAdmin).toHaveBeenCalledWith("requestStage", { id: "q1", stageId: "balance" }),
    );
    expect(await screen.findByDisplayValue("https://oceaniccoder.dev/q/NEW")).toBeInTheDocument();
  });

  it("opens the editor for a new quote", async () => {
    const user = userEvent.setup();
    render(<QuotesTab theme="dark" />);
    await user.click(await screen.findByRole("button", { name: /new quote/i }));
    expect(screen.getByText("editor open")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run src/components/AdminDashboard/tabs/Quotes`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `QuoteDetail.tsx`**

```tsx
import { useCallback, useEffect, useState } from "react";
import { FaTimes, FaCopy, FaWhatsapp, FaExternalLinkAlt } from "react-icons/fa";
import { quoteAdmin } from "@/services/api/quotes";
import { formatDate, formatMinor } from "@/utils/quoteMath";
import { useConfirm } from "../../ConfirmContext";
import type { ManualMethod, QuoteDetailResponse } from "@/types/quote";

const btn =
  "px-3 py-2 rounded-lg text-sm font-medium border transition hover:opacity-90 disabled:opacity-50";
const btnStyle = { borderColor: "var(--border-subtle)", color: "var(--text-primary)" };
const primary = {
  background: "linear-gradient(135deg, var(--accent-teal) 0%, #0d7a6e 100%)",
  color: "#fff",
  borderColor: "transparent",
};

export default function QuoteDetail({
  id,
  onClose,
  onEdit,
  onChanged,
}: {
  id: string;
  onClose: () => void;
  onEdit: (d: QuoteDetailResponse) => void;
  onChanged: () => void;
}) {
  const confirm = useConfirm();
  const [data, setData] = useState<QuoteDetailResponse | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [manual, setManual] = useState<{
    stageId: string;
    method: ManualMethod;
    note: string;
  } | null>(null);

  const load = useCallback(
    async () => setData(await quoteAdmin<QuoteDetailResponse>("get", { id })),
    [id],
  );
  useEffect(() => {
    load().catch((e) => setMessage({ tone: "error", text: e.message }));
  }, [load]);

  const run = async (action: string, payload: Record<string, unknown> = {}, success?: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await quoteAdmin<QuoteDetailResponse>(action, { id, ...payload });
      setData(result);
      if (result.link) setLink(result.link);
      const emailNote =
        result.emailed === false && action !== "rotate"
          ? " The email didn't send; copy the link below and share it yourself."
          : "";
      setMessage({
        tone: result.emailed === false && action !== "rotate" ? "error" : "ok",
        text: `${success || "Done."}${emailNote}`,
      });
      onChanged();
    } catch (e) {
      setMessage({ tone: "error", text: e instanceof Error ? e.message : "Something went wrong." });
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    return (
      <div className="glass-card rounded-2xl p-6">
        {message ? (
          <p style={{ color: "var(--status-failed-text)" }}>{message.text}</p>
        ) : (
          <p style={{ color: "var(--text-secondary)" }}>Loading…</p>
        )}
      </div>
    );
  }
  const { quote, stages, payments } = data;
  const money = (m: number) => formatMinor(m, quote.currency);

  return (
    <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
            {quote.quoteNumber} · rev {quote.revision} · {quote.status}
          </p>
          <h3 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            {quote.title}
          </h3>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {quote.clientName} · {quote.clientEmail} · {money(quote.totalMinor)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="p-2"
          style={{ color: "var(--text-secondary)" }}
        >
          <FaTimes />
        </button>
      </div>

      <ul className="text-sm space-y-1" style={{ color: "var(--text-secondary)" }}>
        {quote.sentAt && (
          <li>
            Sent {formatDate(quote.sentAt)} · valid until {formatDate(quote.validUntil)}
          </li>
        )}
        <li>
          {quote.viewedAt
            ? `Viewed ${formatDate(quote.viewedAt)}`
            : quote.status === "sent"
              ? "Not opened yet"
              : null}
        </li>
        {quote.acceptedName && (
          <li>
            Accepted by “{quote.acceptedName}” on {formatDate(quote.respondedAt)}
          </li>
        )}
        {quote.declineReason && <li>Declined: {quote.declineReason}</li>}
      </ul>

      {message && (
        <p
          role="status"
          className="text-sm rounded-lg px-3 py-2"
          style={{
            background:
              message.tone === "ok" ? "var(--status-success-bg)" : "var(--status-failed-bg)",
            color:
              message.tone === "ok" ? "var(--status-success-text)" : "var(--status-failed-text)",
          }}
        >
          {message.text}
        </p>
      )}

      {link && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            readOnly
            value={link}
            className="glass-input flex-1 min-w-[16rem] rounded-lg px-3 py-2 text-sm font-mono"
            onFocus={(e) => e.target.select()}
          />
          <button
            type="button"
            className={btn}
            style={btnStyle}
            onClick={() => void navigator.clipboard.writeText(link)}
          >
            <FaCopy className="inline mr-1" />
            Copy
          </button>
          <a
            className={btn}
            style={btnStyle}
            target="_blank"
            rel="noopener noreferrer"
            href={`https://wa.me/?text=${encodeURIComponent(`Hi ${quote.clientName.split(" ")[0]}, here is your quote from OceanicCoder: ${link}`)}`}
          >
            <FaWhatsapp className="inline mr-1" />
            WhatsApp
          </a>
          <a
            className={btn}
            style={btnStyle}
            target="_blank"
            rel="noopener noreferrer"
            href={`${link}?preview=1`}
          >
            <FaExternalLinkAlt className="inline mr-1" />
            Preview
          </a>
        </div>
      )}

      <div>
        <h4 className="font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
          Payment stages
        </h4>
        <ul className="space-y-2">
          {stages.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border p-3"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <span className="flex-1 min-w-[10rem]" style={{ color: "var(--text-primary)" }}>
                {s.label} ({s.percent}%) <span className="font-mono">{money(s.amountMinor)}</span>
                <span className="block text-xs" style={{ color: "var(--text-secondary)" }}>
                  {s.state === "paid"
                    ? `Paid ${formatDate(s.paidAt)} · ${s.reference}`
                    : s.state === "due"
                      ? `Due since ${formatDate(s.dueAt)}${s.overdue ? " · overdue" : ""}`
                      : "Not requested yet"}
                </span>
              </span>
              {quote.status === "accepted" && s.state === "later" && (
                <button
                  type="button"
                  disabled={busy}
                  className={btn}
                  style={primary}
                  onClick={() =>
                    void run("requestStage", { stageId: s.id }, `${s.label} requested and emailed.`)
                  }
                >
                  Request {s.label.toLowerCase()}
                </button>
              )}
              {quote.status === "accepted" && s.state === "due" && s.index > 0 && (
                <button
                  type="button"
                  disabled={busy}
                  className={btn}
                  style={btnStyle}
                  onClick={() =>
                    void run("requestStage", { stageId: s.id }, "Reminder sent with a fresh link.")
                  }
                >
                  Resend request
                </button>
              )}
              {quote.status === "accepted" && s.state !== "paid" && (
                <button
                  type="button"
                  disabled={busy}
                  className={btn}
                  style={btnStyle}
                  onClick={() => setManual({ stageId: s.id, method: "bank", note: "" })}
                >
                  Record payment
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {manual && (
        <form
          className="rounded-xl border p-4 space-y-3"
          style={{ borderColor: "var(--border-subtle)" }}
          onSubmit={(e) => {
            e.preventDefault();
            void run("recordManual", manual, "Payment recorded and receipt emailed.").then(() =>
              setManual(null),
            );
          }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            Record a payment received outside Paystack (amount is fixed to the stage amount)
          </p>
          <select
            aria-label="Method"
            value={manual.method}
            onChange={(e) => setManual({ ...manual, method: e.target.value as ManualMethod })}
            className="glass-input rounded-lg px-3 py-2"
          >
            <option value="bank">Bank transfer</option>
            <option value="momo">Mobile Money (direct)</option>
            <option value="cash">Cash</option>
          </select>
          <input
            aria-label="Note"
            placeholder="Note, e.g. bank reference"
            maxLength={300}
            value={manual.note}
            onChange={(e) => setManual({ ...manual, note: e.target.value })}
            className="glass-input w-full rounded-lg px-3 py-2"
          />
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className={btn} style={primary}>
              Record payment
            </button>
            <button type="button" className={btn} style={btnStyle} onClick={() => setManual(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {payments.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm" style={{ color: "var(--text-secondary)" }}>
            Payment attempts ({payments.length})
          </summary>
          <ul
            className="mt-2 text-xs font-mono space-y-1"
            style={{ color: "var(--text-secondary)" }}
          >
            {payments.map((p) => (
              <li key={p.id}>
                {p.reference} · {p.stageId} · {p.method} · {p.status}
                {p.note ? ` · ${p.note}` : ""}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div
        className="flex flex-wrap gap-2 border-t pt-4"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        {quote.status === "draft" && (
          <>
            <button type="button" className={btn} style={btnStyle} onClick={() => onEdit(data)}>
              Edit
            </button>
            <button
              type="button"
              disabled={busy}
              className={btn}
              style={primary}
              onClick={() => void run("send", {}, "Quote sent to the client.")}
            >
              Send to client
            </button>
          </>
        )}
        {(quote.status === "sent" || quote.status === "accepted") && (
          <button
            type="button"
            disabled={busy}
            className={btn}
            style={btnStyle}
            onClick={async () => {
              if (
                await confirm({
                  title: "Make a new link?",
                  message: "The link the client has now will stop working.",
                  confirmText: "New link",
                })
              )
                void run("rotate", {}, "New link ready. The old one no longer works.");
            }}
          >
            New link
          </button>
        )}
        {["sent", "declined", "expired"].includes(quote.status) && (
          <button
            type="button"
            disabled={busy}
            className={btn}
            style={btnStyle}
            onClick={async () => {
              if (
                await confirm({
                  title: "Revise this quote?",
                  message:
                    "It goes back to draft and the client's link stops working until you send it again.",
                  confirmText: "Revise",
                })
              )
                void run("revise", {}, "Back to draft. Edit it, then send again.");
            }}
          >
            Revise
          </button>
        )}
        {["draft", "sent", "accepted"].includes(quote.status) && (
          <button
            type="button"
            disabled={busy}
            className={btn}
            style={{ ...btnStyle, color: "var(--status-failed-text)" }}
            onClick={async () => {
              if (
                await confirm({
                  title: "Cancel this quote?",
                  message: "The client's link stops working. This can't be undone.",
                  confirmText: "Cancel quote",
                  danger: true,
                })
              )
                void run("cancel", {}, "Quote cancelled.");
            }}
          >
            Cancel quote
          </button>
        )}
      </div>
    </div>
  );
}
```

Before writing this file, open `src/components/AdminDashboard/ConfirmContext.tsx` and check the options `useConfirm()` accepts. If its option names differ from `{title, message, confirmText, danger}`, use its names in the four `confirm(...)` calls above; the behaviour (resolve `true` on confirm) is what matters.

- [ ] **Step 4: Implement `QuotesTab.tsx`**

```tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaPlus, FaEye } from "react-icons/fa";
import { quoteAdmin } from "@/services/api/quotes";
import { formatDate, formatMinor } from "@/utils/quoteMath";
import { FilterPills } from "@/components/ui/FilterPills";
import QuoteDetail from "./QuoteDetail";
import QuoteEditor from "./QuoteEditor";
import type { QuoteDetailResponse, QuoteDraft, QuoteStatus, QuoteSummary } from "@/types/quote";

type Filter = "all" | QuoteStatus;
const FILTERS: Filter[] = ["all", "draft", "sent", "accepted", "declined", "expired", "cancelled"];

export default function QuotesTab({ theme }: { theme: string }) {
  const [quotes, setQuotes] = useState<QuoteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id?: string; draft?: Partial<QuoteDraft> } | null>(null);

  const load = useCallback(async () => {
    try {
      const { quotes: list } = await quoteAdmin<{ quotes: QuoteSummary[] }>("list");
      setQuotes(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load quotes.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const shown = useMemo(
    () => (filter === "all" ? quotes : quotes.filter((q) => q.status === filter)),
    [quotes, filter],
  );

  const openEditor = (d?: QuoteDetailResponse) =>
    setEditing(d ? { id: d.quote.id, draft: d.quote } : {});

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Quotes
          </h2>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Send a quote, collect the deposit, request the balance.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openEditor()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: "linear-gradient(135deg, var(--accent-teal) 0%, #0d7a6e 100%)" }}
        >
          <FaPlus /> New quote
        </button>
      </div>

      <FilterPills
        options={FILTERS.map((f) => ({
          value: f,
          label: f === "all" ? "All" : f[0].toUpperCase() + f.slice(1),
          count: f === "all" ? quotes.length : quotes.filter((q) => q.status === f).length,
        }))}
        value={filter}
        onChange={(v: string) => setFilter(v as Filter)}
      />

      {error && (
        <p role="alert" style={{ color: "var(--status-failed-text)" }}>
          {error}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <ul className="space-y-3">
          {loading && <li style={{ color: "var(--text-secondary)" }}>Loading…</li>}
          {!loading && shown.length === 0 && (
            <li style={{ color: "var(--text-secondary)" }}>No quotes here yet.</li>
          )}
          {shown.map((q) => (
            <li key={q.id}>
              <button
                type="button"
                onClick={() => setSelected(q.id)}
                className="glass-card w-full rounded-xl p-4 text-left transition"
                style={{ outline: selected === q.id ? "2px solid var(--accent-teal)" : "none" }}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                    {q.title}
                  </span>
                  <span
                    className="text-xs rounded-full px-2 py-0.5 border"
                    style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}
                  >
                    {q.status}
                  </span>
                </div>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {q.quoteNumber} · {q.clientName}
                  {q.viewedAt && (
                    <FaEye
                      className="inline ml-2"
                      title={`Viewed ${formatDate(q.viewedAt)}`}
                      aria-label="Viewed"
                    />
                  )}
                </p>
                <p className="text-sm font-mono mt-1" style={{ color: "var(--text-primary)" }}>
                  {formatMinor(q.paidMinor, q.currency)} of {formatMinor(q.totalMinor, q.currency)}
                  {q.complete && " · fully paid"}
                  {q.nextDue && (
                    <span
                      style={{
                        color: q.nextDue.overdue
                          ? "var(--status-failed-text)"
                          : "var(--text-secondary)",
                      }}
                    >
                      {" "}
                      · Next: {q.nextDue.label}
                      {q.nextDue.overdue ? " (overdue)" : ""}
                    </span>
                  )}
                </p>
              </button>
            </li>
          ))}
        </ul>
        {selected && (
          <QuoteDetail
            key={selected}
            id={selected}
            onClose={() => setSelected(null)}
            onEdit={(d) => openEditor(d)}
            onChanged={() => void load()}
          />
        )}
      </div>

      {editing && (
        <QuoteEditor
          theme={theme}
          quoteId={editing.id}
          initial={editing.draft}
          onClose={() => setEditing(null)}
          onSaved={(id) => {
            setEditing(null);
            setSelected(id);
            void load();
          }}
        />
      )}
    </div>
  );
}
```

Check `src/components/ui/FilterPills.tsx` for its exact prop names before running; if they differ from `{options: {value,label,count}[], value, onChange}`, adapt the call (keep the same behaviour).

- [ ] **Step 5: Register the tabs**

`src/components/AdminDashboard/SidebarParts/types.ts`: add `| "quotes"` and `| "emails"` to `TabType`.

`src/components/AdminDashboard/SidebarParts/tabs.ts`: import `FaFileSignature, FaEnvelopeOpenText` from `react-icons/fa`; in the `business` group insert `{ id: "quotes", label: "Quotes", icon: FaFileSignature },` after the `client-work` entry and `{ id: "emails", label: "Emails", icon: FaEnvelopeOpenText },` after `analytics`; change "nineteen destinations" in the comment to "twenty-one destinations".

`src/components/AdminDashboard/Sidebar.tsx`: add `"quotes", "emails",` to `PRIVATE_TABS`.

`src/components/AdminDashboard/TabContentExtra.tsx`: add `import QuotesTab from "./tabs/Quotes/QuotesTab";` and below the `client-work` line:

```tsx
{
  activeTab === "quotes" && !isReadOnly && <QuotesTab theme={theme} />;
}
```

- [ ] **Step 6: Add a stand-in editor so the build type-checks**

Task 17 replaces this file entirely. `src/components/AdminDashboard/tabs/Quotes/QuoteEditor.tsx`:

```tsx
import type { QuoteDraft } from "@/types/quote";

// Replaced by the real wizard in Task 17.
export default function QuoteEditor(_props: {
  theme: string;
  quoteId?: string;
  initial?: Partial<QuoteDraft>;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  return null;
}
```

- [ ] **Step 7: Run the tests and the whole suite**

Run: `npx vitest run src/components/AdminDashboard && npm run type-check && npm run lint`
Expected: PASS. If a sidebar test counts tabs, update its expected count to include the two new tabs.

- [ ] **Step 8: Commit**

```bash
git add src/components/AdminDashboard
git commit -m "feat(OC-0): add the admin Quotes tab with stage requests and manual payments"
```

Note: until Task 17 lands, "New quote" opens nothing. Do Task 17 next without deploying in between.

---

### Task 17: Quote editor wizard and "Create quote" from an inquiry

**Files:**

- Create: `src/components/AdminDashboard/tabs/Quotes/editorSteps.tsx`, `draftFromInquiry.ts`
- Replace: `src/components/AdminDashboard/tabs/Quotes/QuoteEditor.tsx` (the Task 16 stand-in)
- Modify: `src/types/index.ts` (inquiry status gains `"won"`)
- Modify: `src/components/AdminDashboard/tabs/ClientWorkTab.tsx` (add a "Create quote" button next to each "Generate Invoice" button and render the editor)
- Test: `src/components/AdminDashboard/tabs/Quotes/draftFromInquiry.test.ts`, `QuoteEditor.test.tsx`

**Interfaces:**

- Consumes: `quoteAdmin`, `QuoteApiError` (with `fields`); `quoteMath`; `ProjectInquiry` from `@/types`.
- Produces: `QuoteEditor({theme, quoteId?, initial?, onClose, onSaved(id)})`; `emptyDraft()` → `QuoteDraft`; `draftFromInquiry(inquiry)` → `QuoteDraft`; step components `ClientStep`, `ContentStep`, `ItemsStep`, `StagesStep`, `TermsStep`, `ReviewStep` each `({draft, setDraft, errors})`.

- [ ] **Step 1: Write the failing tests**

`draftFromInquiry.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { draftFromInquiry, emptyDraft } from "./draftFromInquiry";
import type { ProjectInquiry } from "@/types";

describe("draftFromInquiry", () => {
  it("copies the client and seeds items from the inquiry", () => {
    const inquiry = {
      $id: "inq-1",
      name: "Kofi Mensah",
      email: "kofi@example.com",
      phone: "+233200000000",
      projectType: "E-commerce website",
      description: "Sell shoes online",
      timeline: "1-2 months",
      features: ["Payments", "Inventory"],
      needsDomain: true,
      domainExtension: ".com",
      needsHosting: true,
      status: "new",
    } as unknown as ProjectInquiry;
    const d = draftFromInquiry(inquiry);
    expect(d).toMatchObject({
      clientName: "Kofi Mensah",
      clientEmail: "kofi@example.com",
      inquiryId: "inq-1",
      title: "E-commerce website",
      currency: "GHS",
    });
    expect(d.items.map((i) => i.description)).toEqual([
      "E-commerce website",
      "Domain registration (.com), 1 year",
      "Hosting setup",
    ]);
    expect(d.overview).toContain("Sell shoes online");
    expect(d.scope).toContain("- Payments");
    expect(d.items.every((i) => /^[a-z0-9-]{1,24}$/.test(i.id))).toBe(true);
  });
  it("gives a blank draft the defaults", () => {
    expect(emptyDraft()).toMatchObject({
      currency: "GHS",
      validDays: 14,
      schedule: [{ percent: 60 }, { percent: 40 }],
    });
  });
});
```

`QuoteEditor.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const quoteAdmin = vi.fn();
vi.mock("@/services/api/quotes", async () => {
  const actual =
    await vi.importActual<typeof import("@/services/api/quotes")>("@/services/api/quotes");
  return { ...actual, quoteAdmin: (...a: unknown[]) => quoteAdmin(...a) };
});

import QuoteEditor from "./QuoteEditor";
import { QuoteApiError } from "@/services/api/quotes";

beforeEach(() => quoteAdmin.mockReset());

async function fillClient(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/client name/i), "Kofi Mensah");
  await user.type(screen.getByLabelText(/client email/i), "kofi@example.com");
}

describe("QuoteEditor", () => {
  it("walks the steps and shows live stage amounts", async () => {
    const user = userEvent.setup();
    render(<QuoteEditor theme="dark" onClose={vi.fn()} onSaved={vi.fn()} />);
    await fillClient(user);
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.type(screen.getByLabelText(/project title/i), "Online store");
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.type(screen.getByLabelText(/description for item 1/i), "Store build");
    await user.clear(screen.getByLabelText(/price for item 1/i));
    await user.type(screen.getByLabelText(/price for item 1/i), "10000");
    expect(screen.getByText(/Total GHS 10,000.00/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText("GHS 6,000.00")).toBeInTheDocument();
    await user.clear(screen.getByLabelText(/percent for stage 1/i));
    await user.type(screen.getByLabelText(/percent for stage 1/i), "50");
    expect(screen.getByRole("alert")).toHaveTextContent(/add up to 90%/);
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });

  it("saves a new draft and reports the new id", async () => {
    quoteAdmin.mockResolvedValue({ quote: { id: "q9" }, stages: [], payments: [] });
    const onSaved = vi.fn();
    const user = userEvent.setup();
    render(
      <QuoteEditor
        theme="dark"
        initial={{
          clientName: "Kofi",
          clientEmail: "kofi@example.com",
          title: "Store",
          items: [{ id: "item-a", description: "Build", qty: 1, unitMinor: 100000 }],
        }}
        onClose={vi.fn()}
        onSaved={onSaved}
      />,
    );
    await user.click(screen.getByRole("button", { name: /save draft/i }));
    await waitFor(() =>
      expect(quoteAdmin).toHaveBeenCalledWith(
        "create",
        expect.objectContaining({ draft: expect.objectContaining({ title: "Store" }) }),
      ),
    );
    expect(onSaved).toHaveBeenCalledWith("q9");
  });

  it("shows server field errors", async () => {
    quoteAdmin.mockRejectedValue(
      new QuoteApiError("Fix the highlighted fields.", 400, {
        clientEmail: "Enter a valid email address.",
      }),
    );
    const user = userEvent.setup();
    render(
      <QuoteEditor
        theme="dark"
        initial={{ clientName: "Kofi", title: "Store" }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: /save draft/i }));
    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/components/AdminDashboard/tabs/Quotes`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement `draftFromInquiry.ts`**

```ts
import { DEFAULT_SCHEDULE, DEFAULT_TERMS, newId } from "@/utils/quoteMath";
import type { ProjectInquiry } from "@/types";
import type { QuoteDraft } from "@/types/quote";

export function emptyDraft(): QuoteDraft {
  return {
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    clientCompany: "",
    currency: "GHS",
    title: "",
    overview: "",
    scope: "",
    timeline: "",
    notes: "",
    terms: DEFAULT_TERMS,
    items: [{ id: newId("item"), description: "", qty: 1, unitMinor: 0 }],
    discountMinor: 0,
    schedule: DEFAULT_SCHEDULE.map((s) => ({ ...s })),
    validDays: 14,
    inquiryId: null,
  };
}

/** Seed a quote from an inquiry: client details, the project as the first line, domain and hosting if asked for. Prices start at 0. */
export function draftFromInquiry(inquiry: ProjectInquiry): QuoteDraft {
  const items: QuoteDraft["items"] = [
    { id: newId("item"), description: inquiry.projectType, qty: 1, unitMinor: 0 },
  ];
  if (inquiry.needsDomain && inquiry.domainExtension) {
    items.push({
      id: newId("item"),
      description: `Domain registration (${inquiry.domainExtension}), 1 year`,
      qty: 1,
      unitMinor: 0,
    });
  }
  if (inquiry.needsHosting)
    items.push({ id: newId("item"), description: "Hosting setup", qty: 1, unitMinor: 0 });
  return {
    ...emptyDraft(),
    clientName: inquiry.name,
    clientEmail: inquiry.email,
    clientPhone: inquiry.phone || "",
    title: inquiry.projectType,
    overview: inquiry.description || "",
    scope: (inquiry.features || []).map((f) => `- ${f}`).join("\n"),
    timeline: inquiry.timeline ? `Target: ${inquiry.timeline}` : "",
    items,
    inquiryId: inquiry.$id,
  };
}
```

- [ ] **Step 4: Implement `editorSteps.tsx`**

```tsx
import type React from "react";
import { FaPlus, FaTrash } from "react-icons/fa";
import {
  computeTotals,
  formatMinor,
  fromMinor,
  newId,
  scheduleError,
  stageAmounts,
  toMinor,
} from "@/utils/quoteMath";
import type { QuoteDraft } from "@/types/quote";

export interface StepProps {
  draft: QuoteDraft;
  setDraft: (next: QuoteDraft) => void;
  errors: Record<string, string>;
}

const inputCls = "glass-input w-full rounded-lg px-3 py-2";
const labelCls = "block text-sm font-medium mb-1";

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelCls} style={{ color: "var(--text-primary)" }}>
        {label}
      </label>
      {children}
      {error && (
        <p className="text-xs mt-1" style={{ color: "var(--status-failed-text)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

export function ClientStep({ draft, setDraft, errors }: StepProps) {
  const set =
    (k: keyof QuoteDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setDraft({ ...draft, [k]: e.target.value });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id="q-name" label="Client name" error={errors.clientName}>
        <input
          id="q-name"
          className={inputCls}
          value={draft.clientName}
          onChange={set("clientName")}
        />
      </Field>
      <Field id="q-email" label="Client email" error={errors.clientEmail}>
        <input
          id="q-email"
          type="email"
          className={inputCls}
          value={draft.clientEmail}
          onChange={set("clientEmail")}
        />
      </Field>
      <Field id="q-phone" label="Phone (optional)" error={errors.clientPhone}>
        <input
          id="q-phone"
          className={inputCls}
          value={draft.clientPhone}
          onChange={set("clientPhone")}
        />
      </Field>
      <Field id="q-company" label="Company (optional)" error={errors.clientCompany}>
        <input
          id="q-company"
          className={inputCls}
          value={draft.clientCompany}
          onChange={set("clientCompany")}
        />
      </Field>
      <Field id="q-currency" label="Currency" error={errors.currency}>
        <select
          id="q-currency"
          className={inputCls}
          value={draft.currency}
          onChange={set("currency")}
        >
          <option value="GHS">GHS (Ghana cedi)</option>
          <option value="USD">USD (check USD is enabled on Paystack)</option>
        </select>
      </Field>
    </div>
  );
}

export function ContentStep({ draft, setDraft, errors }: StepProps) {
  const set =
    (k: keyof QuoteDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft({ ...draft, [k]: e.target.value });
  return (
    <div className="space-y-4">
      <Field id="q-title" label="Project title" error={errors.title}>
        <input id="q-title" className={inputCls} value={draft.title} onChange={set("title")} />
      </Field>
      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
        Plain text. Start a line with “- ” for a bullet. Blank sections are hidden from the client.
      </p>
      <Field id="q-overview" label="Overview" error={errors.overview}>
        <textarea
          id="q-overview"
          rows={4}
          className={inputCls}
          value={draft.overview}
          onChange={set("overview")}
        />
      </Field>
      <Field id="q-scope" label="Scope and deliverables" error={errors.scope}>
        <textarea
          id="q-scope"
          rows={6}
          className={inputCls}
          value={draft.scope}
          onChange={set("scope")}
        />
      </Field>
      <Field id="q-timeline" label="Timeline" error={errors.timeline}>
        <textarea
          id="q-timeline"
          rows={3}
          className={inputCls}
          value={draft.timeline}
          onChange={set("timeline")}
        />
      </Field>
    </div>
  );
}

export function ItemsStep({ draft, setDraft, errors }: StepProps) {
  const totals = computeTotals(draft.items, draft.discountMinor);
  const update = (i: number, patch: Partial<QuoteDraft["items"][number]>) =>
    setDraft({ ...draft, items: draft.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });
  return (
    <div className="space-y-3">
      {errors.items && (
        <p className="text-sm" style={{ color: "var(--status-failed-text)" }}>
          {errors.items}
        </p>
      )}
      {draft.items.map((item, i) => (
        <div key={item.id} className="grid gap-2 sm:grid-cols-[1fr_5rem_8rem_auto] items-start">
          <div>
            <input
              aria-label={`Description for item ${i + 1}`}
              className={inputCls}
              placeholder="What's included"
              value={item.description}
              onChange={(e) => update(i, { description: e.target.value })}
            />
            {errors[`items.${i}.description`] && (
              <p className="text-xs mt-1" style={{ color: "var(--status-failed-text)" }}>
                {errors[`items.${i}.description`]}
              </p>
            )}
          </div>
          <input
            aria-label={`Quantity for item ${i + 1}`}
            type="number"
            min="0"
            step="any"
            className={inputCls}
            value={item.qty}
            onChange={(e) => update(i, { qty: Number(e.target.value) })}
          />
          <PriceInput
            label={`Price for item ${i + 1}`}
            minor={item.unitMinor}
            onChange={(m) => update(i, { unitMinor: m })}
            error={errors[`items.${i}.unitMinor`]}
          />
          <button
            type="button"
            aria-label={`Remove item ${i + 1}`}
            disabled={draft.items.length === 1}
            className="p-2.5 disabled:opacity-30"
            style={{ color: "var(--text-secondary)" }}
            onClick={() => setDraft({ ...draft, items: draft.items.filter((_, j) => j !== i) })}
          >
            <FaTrash />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="text-sm flex items-center gap-2"
        style={{ color: "var(--accent-teal)" }}
        onClick={() =>
          setDraft({
            ...draft,
            items: [...draft.items, { id: newId("item"), description: "", qty: 1, unitMinor: 0 }],
          })
        }
      >
        <FaPlus /> Add item
      </button>
      <div
        className="flex flex-wrap items-center justify-end gap-3 border-t pt-3"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <PriceInput
          label="Discount"
          minor={draft.discountMinor}
          onChange={(m) => setDraft({ ...draft, discountMinor: m })}
          error={errors.discountMinor}
        />
        <p className="font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
          Total {formatMinor(totals.totalMinor, draft.currency)}
        </p>
      </div>
    </div>
  );
}

function PriceInput({
  label,
  minor,
  onChange,
  error,
}: {
  label: string;
  minor: number;
  onChange: (m: number) => void;
  error?: string;
}) {
  return (
    <div>
      <input
        aria-label={label}
        inputMode="decimal"
        placeholder={label === "Discount" ? "Discount" : "0.00"}
        className={inputCls}
        defaultValue={minor ? fromMinor(minor) : ""}
        onChange={(e) => {
          const m = e.target.value === "" ? 0 : toMinor(e.target.value);
          if (m !== null) onChange(m);
        }}
      />
      {error && (
        <p className="text-xs mt-1" style={{ color: "var(--status-failed-text)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

export function StagesStep({ draft, setDraft }: StepProps) {
  const { totalMinor } = computeTotals(draft.items, draft.discountMinor);
  const amounts = stageAmounts(totalMinor, draft.schedule);
  const problem = scheduleError(draft.schedule);
  const update = (i: number, patch: Partial<QuoteDraft["schedule"][number]>) =>
    setDraft({
      ...draft,
      schedule: draft.schedule.map((s, j) => (j === i ? { ...s, ...patch } : s)),
    });
  return (
    <div className="space-y-3">
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        The first stage is due when the client accepts. You request each later stage when you're
        ready.
      </p>
      {draft.schedule.map((s, i) => (
        <div key={s.id} className="grid gap-2 grid-cols-[1fr_5.5rem_8rem_auto] items-center">
          <input
            aria-label={`Name for stage ${i + 1}`}
            className={inputCls}
            value={s.label}
            onChange={(e) => update(i, { label: e.target.value })}
          />
          <input
            aria-label={`Percent for stage ${i + 1}`}
            type="number"
            min="1"
            max="100"
            step="1"
            className={inputCls}
            value={s.percent}
            onChange={(e) => update(i, { percent: Number(e.target.value) })}
          />
          <span className="font-mono text-sm text-right" style={{ color: "var(--text-primary)" }}>
            {formatMinor(amounts[i]?.amountMinor ?? 0, draft.currency)}
          </span>
          <button
            type="button"
            aria-label={`Remove stage ${i + 1}`}
            disabled={draft.schedule.length === 1}
            className="p-2.5 disabled:opacity-30"
            style={{ color: "var(--text-secondary)" }}
            onClick={() =>
              setDraft({ ...draft, schedule: draft.schedule.filter((_, j) => j !== i) })
            }
          >
            <FaTrash />
          </button>
        </div>
      ))}
      {draft.schedule.length < 8 && (
        <button
          type="button"
          className="text-sm flex items-center gap-2"
          style={{ color: "var(--accent-teal)" }}
          onClick={() =>
            setDraft({
              ...draft,
              schedule: [...draft.schedule, { id: newId("stage"), label: "Milestone", percent: 0 }],
            })
          }
        >
          <FaPlus /> Add stage
        </button>
      )}
      {problem && (
        <p role="alert" className="text-sm" style={{ color: "var(--status-failed-text)" }}>
          {problem}
        </p>
      )}
    </div>
  );
}

export function TermsStep({ draft, setDraft, errors }: StepProps) {
  return (
    <div className="space-y-4">
      <Field id="q-terms" label="Terms" error={errors.terms}>
        <textarea
          id="q-terms"
          rows={8}
          className={inputCls}
          value={draft.terms}
          onChange={(e) => setDraft({ ...draft, terms: e.target.value })}
        />
      </Field>
      <Field id="q-notes" label="Notes for the client (optional)" error={errors.notes}>
        <textarea
          id="q-notes"
          rows={3}
          className={inputCls}
          value={draft.notes}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
        />
      </Field>
      <Field id="q-valid" label="Valid for (days)" error={errors.validDays}>
        <input
          id="q-valid"
          type="number"
          min="1"
          max="90"
          className={inputCls}
          value={draft.validDays}
          onChange={(e) => setDraft({ ...draft, validDays: Number(e.target.value) })}
        />
      </Field>
    </div>
  );
}

export function ReviewStep({ draft }: StepProps) {
  const { totalMinor } = computeTotals(draft.items, draft.discountMinor);
  return (
    <div className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
      <p>
        <strong style={{ color: "var(--text-primary)" }}>{draft.title || "Untitled"}</strong> for{" "}
        {draft.clientName || "no client"} ({draft.clientEmail || "no email"})
      </p>
      <p>
        {draft.items.length} item(s) · total{" "}
        <span className="font-mono">{formatMinor(totalMinor, draft.currency)}</span>
      </p>
      <p>
        Payment plan:{" "}
        {stageAmounts(totalMinor, draft.schedule)
          .map((s) => `${s.label} ${s.percent}% (${formatMinor(s.amountMinor, draft.currency)})`)
          .join(", ")}
      </p>
      <p>Valid for {draft.validDays} days after sending.</p>
      <p>
        Save the draft, then use “Send to client” in the quote detail. You can preview the client
        page from there first.
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Implement `QuoteEditor.tsx`**

```tsx
import { useState, type JSX } from "react";
import { FaTimes } from "react-icons/fa";
import { quoteAdmin, QuoteApiError } from "@/services/api/quotes";
import { scheduleError } from "@/utils/quoteMath";
import { emptyDraft } from "./draftFromInquiry";
import {
  ClientStep,
  ContentStep,
  ItemsStep,
  StagesStep,
  TermsStep,
  ReviewStep,
  type StepProps,
} from "./editorSteps";
import type { QuoteDetailResponse, QuoteDraft } from "@/types/quote";

const STEPS: { label: string; Component: (p: StepProps) => JSX.Element; fields: string[] }[] = [
  {
    label: "Client",
    Component: ClientStep,
    fields: ["clientName", "clientEmail", "clientPhone", "clientCompany", "currency"],
  },
  {
    label: "Page content",
    Component: ContentStep,
    fields: ["title", "overview", "scope", "timeline"],
  },
  { label: "Line items", Component: ItemsStep, fields: ["items", "discountMinor"] },
  { label: "Payment stages", Component: StagesStep, fields: ["schedule"] },
  { label: "Terms", Component: TermsStep, fields: ["terms", "notes", "validDays"] },
  { label: "Review", Component: ReviewStep, fields: [] },
];

const DRAFT_KEYS = Object.keys(emptyDraft()) as (keyof QuoteDraft)[];

function toDraft(initial?: Partial<QuoteDraft>): QuoteDraft {
  const base = emptyDraft();
  if (!initial) return base;
  const picked = Object.fromEntries(
    DRAFT_KEYS.filter((k) => initial[k] !== undefined && initial[k] !== null).map((k) => [
      k,
      initial[k],
    ]),
  );
  return { ...base, ...picked } as QuoteDraft;
}

export default function QuoteEditor({
  quoteId,
  initial,
  onClose,
  onSaved,
}: {
  theme: string;
  quoteId?: string;
  initial?: Partial<QuoteDraft>;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const [draft, setDraftState] = useState<QuoteDraft>(() => toDraft(initial));
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const setDraft = (next: QuoteDraft) => {
    setDraftState(next);
    setDirty(true);
  };
  const { Component } = STEPS[step];
  const blocked = step === 3 && scheduleError(draft.schedule) !== null;

  const save = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const result = quoteId
        ? await quoteAdmin<QuoteDetailResponse>("save", { id: quoteId, draft })
        : await quoteAdmin<QuoteDetailResponse>("create", { draft });
      setDirty(false);
      onSaved(result.quote.id);
    } catch (err) {
      if (err instanceof QuoteApiError && err.fields) {
        setErrors(err.fields);
        const first = STEPS.findIndex((s) =>
          s.fields.some((f) =>
            Object.keys(err.fields || {}).some((k) => k === f || k.startsWith(`${f}.`)),
          ),
        );
        if (first >= 0) setStep(first);
      }
      setMessage(err instanceof Error ? err.message : "Couldn't save the quote.");
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    if (dirty && !window.confirm("Discard your unsaved changes?")) return;
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Quote editor"
    >
      <div
        className="glass-card w-full max-w-3xl rounded-2xl p-5 sm:p-6 my-8"
        style={{ background: "var(--bg-secondary)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            {quoteId ? "Edit quote" : "New quote"}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close editor"
            className="p-2"
            style={{ color: "var(--text-secondary)" }}
          >
            <FaTimes />
          </button>
        </div>
        <ol className="flex flex-wrap gap-2 mb-6">
          {STEPS.map((s, i) => (
            <li key={s.label}>
              <button
                type="button"
                onClick={() => setStep(i)}
                aria-current={i === step ? "step" : undefined}
                className="rounded-full px-3 py-1 text-xs border"
                style={{
                  borderColor: i === step ? "var(--accent-teal)" : "var(--border-subtle)",
                  color: i === step ? "var(--text-primary)" : "var(--text-secondary)",
                }}
              >
                {i + 1}. {s.label}
                {s.fields.some((f) =>
                  Object.keys(errors).some((k) => k === f || k.startsWith(`${f}.`)),
                ) && (
                  <span aria-label="has errors" style={{ color: "var(--status-failed-text)" }}>
                    {" "}
                    •
                  </span>
                )}
              </button>
            </li>
          ))}
        </ol>
        <Component draft={draft} setDraft={setDraft} errors={errors} />
        {message && (
          <p role="status" className="mt-4 text-sm" style={{ color: "var(--status-failed-text)" }}>
            {message}
          </p>
        )}
        <div
          className="flex flex-wrap justify-between gap-2 mt-6 border-t pt-4"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep(step - 1)}
            className="px-4 py-2 rounded-lg border disabled:opacity-40"
            style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
          >
            Back
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void save()}
              className="px-4 py-2 rounded-lg border"
              style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
            >
              {busy ? "Saving…" : "Save draft"}
            </button>
            {step < STEPS.length - 1 && (
              <button
                type="button"
                disabled={blocked}
                onClick={() => setStep(step + 1)}
                className="px-4 py-2 rounded-lg font-semibold text-white disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, var(--accent-teal) 0%, #0d7a6e 100%)",
                }}
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Add "Create quote" to Client Work**

In `src/components/AdminDashboard/tabs/ClientWorkTab.tsx`:

1. Add imports:

```tsx
import { FaFileSignature } from "react-icons/fa";
import QuoteEditor from "./Quotes/QuoteEditor";
import { draftFromInquiry } from "./Quotes/draftFromInquiry";
```

(merge `FaFileSignature` into the existing `react-icons/fa` import).

2. Next to the `invoiceTarget` state, add:

```tsx
const [quoteFor, setQuoteFor] = useState<ProjectInquiry | null>(null);
const [quoteSaved, setQuoteSaved] = useState<string | null>(null);
```

3. Immediately after the `<a href={`mailto:${inq.email}`} ...>` button's preceding invoice-actions block (the `{(() => { ... })()}` that renders "Generate Invoice"/"Edit & Resend"/"New Invoice"), insert:

```tsx
<button
  type="button"
  onClick={() => setQuoteFor(inq)}
  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition hover:opacity-90"
  style={{ background: "linear-gradient(135deg, var(--accent-teal) 0%, #0d7a6e 100%)" }}
>
  <FaFileSignature /> Create quote
</button>
```

4. After the `{invoiceTarget && (<InvoiceModal ... />)}` block, add:

```tsx
{
  quoteFor && (
    <QuoteEditor
      theme={theme}
      initial={draftFromInquiry(quoteFor)}
      onClose={() => setQuoteFor(null)}
      onSaved={() => {
        setQuoteFor(null);
        setQuoteSaved("Quote saved as a draft. Open the Quotes tab to preview and send it.");
      }}
    />
  );
}
{
  quoteSaved && (
    <div
      role="status"
      className="fixed bottom-6 right-6 z-[110] rounded-xl px-4 py-3 text-sm shadow-lg"
      style={{ background: "var(--status-success-bg)", color: "var(--status-success-text)" }}
    >
      {quoteSaved}
      <button type="button" className="ml-3 underline" onClick={() => setQuoteSaved(null)}>
        Dismiss
      </button>
    </div>
  );
}
```

`ProjectInquiry` is already imported in this file (check the `@/types` import; add it if not).

5. In `src/types/index.ts`, change the `ProjectInquiry` status to `status: "new" | "reviewed" | "quoted" | "declined" | "won";`. Then search `ClientWorkTab.tsx` for its status lists (filter pills, status dropdown, colour map) and add a `won` entry next to `quoted` with the label "Won" and the success colours (`var(--status-success-*)`). `api/send-inquiry-status` returns `{skipped:true}` for statuses it has no template for, so choosing "Won" sends no email.

- [ ] **Step 7: Run tests, gates, then try it in the browser**

Run: `npx vitest run src/components/AdminDashboard && npm run type-check && npm run lint && npm run build`
Expected: PASS and a successful build.

Then run the app against local Functions (see CLAUDE.md "Running Locally"; the user's `api/local.settings.json` must contain `APPWRITE_API_KEY`, `PAYSTACK_SECRET_KEY` (test key), `RESEND_*`, `RECEIPT_SIGNING_SECRET` and `SITE_URL=http://localhost:5173`). Sign in to `/admin/dashboard`, open Client Work, click **Create quote** on an inquiry, fill every step, save, open the Quotes tab, **Preview** the client page, then **Send to client** to your own email. Check the editor at 375px wide too. Also do the Task 14 Step 7 visual check now.

- [ ] **Step 8: Commit**

```bash
git add src/components/AdminDashboard
git commit -m "feat(OC-0): add the quote editor wizard and create quotes from inquiries"
```

---

### Task 18: Emails tab and quote revenue in Analytics

**Files:**

- Create: `src/components/AdminDashboard/tabs/EmailsTab.tsx`
- Modify: `src/components/AdminDashboard/TabContentExtra.tsx`, `src/components/AdminDashboard/tabs/AnalyticsTab.tsx`, `src/services/api/payments.ts`
- Test: `src/components/AdminDashboard/tabs/EmailsTab.test.tsx`, `src/components/AdminDashboard/tabs/quoteRevenue.test.ts`
- Create: `src/components/AdminDashboard/tabs/quoteRevenue.ts`

**Interfaces:**

- Consumes: `fetchEmailPreview`, `sendTestEmail` (Task 13); `getPayments()` and `Payment` from `src/services/api/payments.ts`.
- Produces: `EmailsTab({theme})`; `quotePaymentsAsRevenue(payments)` → `Invoice`-shaped rows (`{status: "paid", total, currency, $createdAt}`) merged into the Analytics revenue charts.

- [ ] **Step 1: Write the failing tests**

`quoteRevenue.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { quotePaymentsAsRevenue } from "./quoteRevenue";

describe("quotePaymentsAsRevenue", () => {
  it("turns successful quote payments into paid revenue rows", () => {
    const rows = quotePaymentsAsRevenue([
      {
        kind: "quote",
        status: "success",
        amount: 60,
        currency: "GHS",
        paidAt: "2026-10-02T00:00:00Z",
        invoiceNumber: "Q-1-INV-1",
      },
      { kind: "quote", status: "pending", amount: 40, currency: "GHS", invoiceNumber: "Q-1-INV-2" },
      { status: "success", amount: 99, currency: "GHS", invoiceNumber: "INV-1" },
    ] as never);
    expect(rows).toEqual([
      expect.objectContaining({
        status: "paid",
        total: 60,
        currency: "GHS",
        $createdAt: "2026-10-02T00:00:00Z",
      }),
    ]);
  });
});
```

`EmailsTab.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const fetchEmailPreview = vi.fn(async (name?: string) =>
  name
    ? { subject: `Subject ${name}`, html: "<p>hi</p>", text: "hi" }
    : { templates: ["quoteSent", "paymentReceipt"] },
);
const sendTestEmail = vi.fn().mockResolvedValue({ sent: true, to: "admin@oceaniccoder.dev" });
vi.mock("@/services/api/quotes", () => ({
  fetchEmailPreview: (n?: string) => fetchEmailPreview(n),
  sendTestEmail: (n: string) => sendTestEmail(n),
}));

import EmailsTab from "./EmailsTab";

describe("EmailsTab", () => {
  it("previews the selected template and sends a test", async () => {
    const user = userEvent.setup();
    render(<EmailsTab theme="dark" />);
    expect(await screen.findByText("Subject quoteSent")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "paymentReceipt" }));
    expect(await screen.findByText("Subject paymentReceipt")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /send test to me/i }));
    await waitFor(() => expect(sendTestEmail).toHaveBeenCalledWith("paymentReceipt"));
    expect(await screen.findByText(/sent to admin@oceaniccoder.dev/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/components/AdminDashboard/tabs/EmailsTab.test.tsx src/components/AdminDashboard/tabs/quoteRevenue.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement**

In `src/services/api/payments.ts`, extend `PaymentRecord` so quote rows type-check (all optional, existing callers unaffected):

```ts
  method: "card" | "momo" | "bank" | "apple_pay" | "cash";
  paystackReference?: string;
  paidAt?: string;
  status?: "success" | "pending" | "failed" | "abandoned" | "duplicate" | "refunded";
  kind?: "invoice" | "quote";
  quoteNumber?: string;
  stageId?: string;
```

(replace the existing `method`, `paystackReference`, `paidAt` and `status` lines with these and add the three new ones).

`src/components/AdminDashboard/tabs/quoteRevenue.ts`:

```ts
import type { Payment } from "@/services/api/payments";
import type { Invoice } from "@/types";

/**
 * Revenue charts read paid invoices. Quote stages are paid without an invoice
 * row, so successful quote payments are mapped into the same shape and merged.
 */
export function quotePaymentsAsRevenue(payments: Payment[]): Invoice[] {
  return payments
    .filter((p) => p.kind === "quote" && p.status === "success")
    .map(
      (p) =>
        ({
          $id: p.$id,
          invoiceNumber: p.invoiceNumber,
          clientName: p.clientName,
          clientEmail: p.clientEmail,
          items: "[]",
          currency: p.currency,
          subtotal: p.amount,
          tax: 0,
          total: p.amount,
          status: "paid",
          $createdAt: p.paidAt || p.$createdAt,
        }) as unknown as Invoice,
    );
}
```

Check that `Payment` in `payments.ts` exposes `$id` and `$createdAt` (it extends `PaymentRecord` at line 41); if it names them differently, use those names.

In `src/components/AdminDashboard/tabs/AnalyticsTab.tsx`:

- add `import { getPayments } from "@/services/api/payments";` and `import { quotePaymentsAsRevenue } from "./quoteRevenue";`
- change the loader at about line 225 to:

```tsx
const [invs, exps, pays] = await Promise.all([
  getInvoices(),
  getExpenses(),
  getPayments().catch(() => []),
]);
setInvoices([...invs, ...quotePaymentsAsRevenue(pays)]);
```

(keep the rest of that function unchanged; `exps` is used as before).

`src/components/AdminDashboard/tabs/EmailsTab.tsx`:

```tsx
import { useEffect, useState } from "react";
import { fetchEmailPreview, sendTestEmail } from "@/services/api/quotes";

export default function EmailsTab(_props: { theme: string }) {
  const [templates, setTemplates] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ subject?: string; html?: string; text?: string } | null>(
    null,
  );
  const [status, setStatus] = useState<string | null>(null);
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    fetchEmailPreview()
      .then((r) => {
        setTemplates(r.templates || []);
        setSelected((r.templates || [])[0] || null);
      })
      .catch((e) => setStatus(e.message));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setPreview(null);
    fetchEmailPreview(selected)
      .then(setPreview)
      .catch((e) => setStatus(e.message));
  }, [selected]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Emails
        </h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Every client and admin email, with sample data.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[14rem_1fr]">
        <ul className="space-y-1">
          {templates.map((t) => (
            <li key={t}>
              <button
                type="button"
                onClick={() => setSelected(t)}
                className="w-full text-left rounded-lg px-3 py-2 text-sm"
                style={{
                  background: selected === t ? "var(--accent-teal-subtle)" : "transparent",
                  color: "var(--text-primary)",
                }}
              >
                {t}
              </button>
            </li>
          ))}
        </ul>
        <div className="glass-card rounded-2xl p-4 space-y-3">
          {preview && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium" style={{ color: "var(--text-primary)" }}>
                  {preview.subject}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowText(!showText)}
                    className="px-3 py-1.5 rounded-lg border text-sm"
                    style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
                  >
                    {showText ? "HTML" : "Plain text"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      selected &&
                      sendTestEmail(selected)
                        .then((r) => setStatus(`Sent to ${r.to}.`))
                        .catch((e) => setStatus(e.message))
                    }
                    className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white"
                    style={{
                      background: "linear-gradient(135deg, var(--accent-teal) 0%, #0d7a6e 100%)",
                    }}
                  >
                    Send test to me
                  </button>
                </div>
              </div>
              {showText ? (
                <pre
                  className="whitespace-pre-wrap text-sm p-3 rounded-lg"
                  style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
                >
                  {preview.text}
                </pre>
              ) : (
                <iframe
                  title={`${selected} preview`}
                  srcDoc={preview.html}
                  sandbox=""
                  className="w-full h-[720px] rounded-lg bg-white"
                />
              )}
            </>
          )}
          {status && (
            <p role="status" className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {status}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

In `TabContentExtra.tsx`, add `import EmailsTab from "./tabs/EmailsTab";` and:

```tsx
{
  activeTab === "emails" && !isReadOnly && <EmailsTab theme={theme} />;
}
```

- [ ] **Step 4: Run tests and gates**

Run: `npx vitest run src/components/AdminDashboard && npm run type-check && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/AdminDashboard src/services/api/payments.ts
git commit -m "feat(OC-0): add email previews and count quote payments as revenue"
```

---

### Task 19: Configuration, end-to-end test with Paystack test keys, and the PR

**Files:**

- Modify: `CLAUDE.md` (env tables and project structure), `docs/plans/2026-10-01-appwrite-to-azure-migration.md` (new collections), `api/local.settings.json` is the user's local file (not committed)

**Interfaces:**

- Consumes: everything above.
- Produces: documented settings, a verified flow, an open PR.

- [ ] **Step 1: Document the settings**

In `CLAUDE.md`, add to the Azure Function runtime vars table:

```md
| `RECEIPT_SIGNING_SECRET` | Signs receipt links (`/receipt/<ref>?s=`); any long random string |
| `SITE_URL` | Base URL in quote emails and Paystack callbacks (default `https://oceaniccoder.dev`) |
| `CONTACT_WHATSAPP` | Optional WhatsApp number shown on client quote pages (digits, with country code) |
```

and to the payments section, after the `RESEND_TO_EMAIL` row, a note:

```md
Quote payments (`/api/quote-pay`, `/api/paystack-webhook` quote branch) also need
`PAYSTACK_SECRET_KEY` and `APPWRITE_API_KEY`. Collections are created by
`node scripts/create-quote-collections.mjs --apply`.
```

In the Project Structure block, change the `api/` comment to `# Azure Functions (bookings, invoices, quotes, payments, email)`.

In `docs/plans/2026-10-01-appwrite-to-azure-migration.md`, under step 3.2.5 (server functions on Cosmos), add:

```md
- Quotes (added 2026-10-10): containers `quotes`, `locks` and the new `payments`
  fields. Only `api/shared/quotes/repo.js` and `api/shared/locks.js` talk to
  the database; swap those two modules (and `api/shared/appwrite.js`) at cutover.
```

- [ ] **Step 2: Full local quality gates**

Run: `npm run type-check && npm run lint && npm run format:check && npx vitest run && npm run build`
Expected: all pass. Fix any Prettier issues with `npx prettier --write <files>`.

- [ ] **Step 3: End-to-end with Paystack test keys (before merge)**

Set in `api/local.settings.json` (user's machine): Paystack **test** secret key, `RECEIPT_SIGNING_SECRET`, `SITE_URL=http://localhost:5173`, `RESEND_*`, `APPWRITE_API_KEY`. Start Functions and the app (CLAUDE.md "Running Locally"). For the webhook, expose the local Functions host with a tunnel (`npx localtunnel --port 7071` or `cloudflared tunnel --url http://localhost:7071`) and set that URL + `/api/paystack-webhook` as the **test** webhook URL in the Paystack dashboard.

Walk through and tick each:

1. Create a quote from an inquiry (GHS, 60/40, total e.g. 100.01 to exercise rounding). Save. Preview shows the full page; the preview does not set "Viewed".
2. Send. The client email arrives with the branded layout and a working link. The inquiry is now `quoted`.
3. Open the link in a private window: Viewed appears in the admin. Accept with a typed name. Deposit email arrives; admin alert arrives; inquiry is `won`.
4. Pay the deposit with a Paystack **test card**. The return page shows Confirming then Paid; the receipt link works; the receipt email arrives once; the admin alert arrives once; the stage shows Paid in the admin and in the Payments tab.
5. Repeat a payment attempt with **test Mobile Money**, close the popup: "Payment window closed. Nothing was charged."
6. Request the balance. The email has a fresh link; the old link shows "no longer active". Pay the balance. The quote shows fully paid; Analytics revenue includes both stages.
7. Revise a sent quote: the client link dies; send again: a new link works.
8. Record a manual payment on a separate test quote; a second record on the same stage is refused.
9. Emails tab: every template previews; "Send test to me" arrives.
10. Check the client pages at 375px and 1280px, light and dark, and the print preview.

Record any failure, fix it with a test first, and repeat the affected steps.

- [ ] **Step 4: Production settings**

Ask the user to:

1. Run `node scripts/create-quote-collections.mjs --apply` against production Appwrite (Task 3) if not done.
2. Add `RECEIPT_SIGNING_SECRET` (and optionally `CONTACT_WHATSAPP`) in Azure Portal → Static Web App → Configuration.
3. Confirm the **live** webhook URL in Paystack is `https://oceaniccoder.dev/api/paystack-webhook` (unchanged).
4. Confirm USD is enabled on the Paystack account before sending any USD quote.

- [ ] **Step 5: PR (and ask about Jira)**

The user's global Jira rules create AOMS tickets for their own untracked work, but this is their personal portfolio repo, which uses `OC-<n>` keys. Before pushing, ask the user whether they want a Jira ticket for this work; do not create one unasked.

Then push and open the PR using `.github/PULL_REQUEST_TEMPLATE.md` with every section filled, title:

```text
feat(OC-0): client quotes with staged Paystack payments
```

No `Co-Authored-By` trailer and no "Generated with Claude Code" footer (CLAUDE.md overrides the default).
