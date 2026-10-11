import { useEffect, useState } from "react";
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
import { CustomSelect } from "@/components/ui/CustomSelect";
import type { QuoteDraft } from "@/types/quote";

export interface StepProps {
  draft: QuoteDraft;
  setDraft: (next: QuoteDraft) => void;
  errors: Record<string, string>;
  /** Price boxes report whether their text is a valid amount; the editor blocks Next/Save while any is not. */
  onValidity?: (id: string, ok: boolean) => void;
  /** Admin theme, so the currency dropdown draws in matching colours. */
  theme?: string;
}

const inputCls = "glass-input w-full rounded-lg px-3 py-2 min-h-11";
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

export function ClientStep({ draft, setDraft, errors, theme }: StepProps) {
  // eslint-disable-next-line no-undef -- DOM global type, not a runtime value
  type Field = HTMLInputElement | HTMLSelectElement;
  const set = (k: keyof QuoteDraft) => (e: React.ChangeEvent<Field>) =>
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
        <CustomSelect
          value={draft.currency}
          onChange={(value) => setDraft({ ...draft, currency: value as QuoteDraft["currency"] })}
          options={[
            { value: "GHS", label: "GHS (Ghana cedi)" },
            { value: "USD", label: "USD (check USD is enabled on Paystack)" },
          ]}
          theme={theme === "light" ? "light" : "dark"}
          ariaLabel="Currency"
        />
      </Field>
    </div>
  );
}

export function ContentStep({ draft, setDraft, errors }: StepProps) {
  const set =
    (k: keyof QuoteDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft({ ...draft, [k]: e.target.value });
  // Raw box values live here so blanks keep their place; the draft gets only the non-empty ones.
  const [slots, setSlots] = useState<string[]>(() =>
    [0, 1, 2, 3].map((n) => draft.highlights[n] ?? ""),
  );
  // Server errors index the compacted list: the i-th error belongs to the i-th non-empty box.
  const filled = slots.flatMap((v, n) => (v.trim() !== "" ? [n] : []));
  const highlightError = (n: number) => {
    const i = filled.indexOf(n);
    return i >= 0 ? errors[`highlights.${i}`] : undefined;
  };
  return (
    <div className="space-y-4">
      <Field id="q-title" label="Project title" error={errors.title}>
        <input id="q-title" className={inputCls} value={draft.title} onChange={set("title")} />
      </Field>
      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
        Plain text. Start a line with “- ” for a bullet. Blank sections are hidden from the client.
      </p>
      <fieldset className="space-y-2">
        <legend className={labelCls} style={{ color: "var(--text-primary)" }}>
          At a glance (optional)
        </legend>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Up to four short facts shown at the top of the quote, such as "Live in 14 weeks".
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((n) => (
            <Field
              key={n}
              id={`q-hl-${n + 1}`}
              label={`At a glance fact ${n + 1}`}
              error={highlightError(n)}
            >
              <input
                id={`q-hl-${n + 1}`}
                className={inputCls}
                maxLength={80}
                value={slots[n]}
                onChange={(e) => {
                  const next = [...slots];
                  next[n] = e.target.value;
                  setSlots(next);
                  setDraft({
                    ...draft,
                    highlights: next.map((v) => v.trim()).filter(Boolean),
                  });
                }}
              />
            </Field>
          ))}
        </div>
      </fieldset>
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

export function ItemsStep({ draft, setDraft, errors, onValidity }: StepProps) {
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
        <ItemRow
          key={item.id}
          noun="item"
          index={i}
          item={item}
          errors={errors}
          errorPrefix="items"
          onValidity={onValidity}
          canRemove={draft.items.length > 1}
          onChange={(patch) => update(i, patch)}
          onRemove={() => setDraft({ ...draft, items: draft.items.filter((_, j) => j !== i) })}
        />
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
        <Field id="q-discount-label" label="Discount label" error={errors.discountLabel}>
          <input
            id="q-discount-label"
            className={inputCls}
            maxLength={60}
            placeholder="First-client discount"
            value={draft.discountLabel}
            onChange={(e) => setDraft({ ...draft, discountLabel: e.target.value })}
          />
        </Field>
        <PriceInput
          id="discount"
          label="Discount"
          onValidity={onValidity}
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

/** One line-item row: description, quantity, price, remove, and the optional "what it includes" note. */
function ItemRow({
  noun,
  index: i,
  item,
  errors,
  errorPrefix,
  onValidity,
  canRemove,
  onChange,
  onRemove,
}: {
  noun: "item" | "optional item";
  index: number;
  item: QuoteDraft["items"][number];
  errors: Record<string, string>;
  errorPrefix: "items" | "optionalItems";
  onValidity?: (id: string, ok: boolean) => void;
  canRemove: boolean;
  onChange: (patch: Partial<QuoteDraft["items"][number]>) => void;
  onRemove: () => void;
}) {
  const err = (field: string) => errors[`${errorPrefix}.${i}.${field}`];
  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-[1fr_5rem_8rem_auto] items-start">
        <div>
          <input
            aria-label={`Description for ${noun} ${i + 1}`}
            className={inputCls}
            placeholder="What's included"
            value={item.description}
            onChange={(e) => onChange({ description: e.target.value })}
          />
          {err("description") && (
            <p className="text-xs mt-1" style={{ color: "var(--status-failed-text)" }}>
              {err("description")}
            </p>
          )}
        </div>
        <div>
          <input
            aria-label={`Quantity for ${noun} ${i + 1}`}
            type="number"
            min="0"
            step="any"
            className={inputCls}
            value={item.qty}
            onChange={(e) => onChange({ qty: Number(e.target.value) })}
          />
          {(err("qty") || !(item.qty > 0)) && (
            <p className="text-xs mt-1" style={{ color: "var(--status-failed-text)" }}>
              {!(item.qty > 0) ? "Quantity must be more than 0." : err("qty")}
            </p>
          )}
        </div>
        <PriceInput
          id={`${item.id}-price`}
          label={`Price for ${noun} ${i + 1}`}
          onValidity={onValidity}
          minor={item.unitMinor}
          onChange={(m) => onChange({ unitMinor: m })}
          error={err("unitMinor")}
        />
        <button
          type="button"
          aria-label={`Remove ${noun} ${i + 1}`}
          disabled={!canRemove}
          className="p-2.5 disabled:opacity-30"
          style={{ color: "var(--text-secondary)" }}
          onClick={onRemove}
        >
          <FaTrash />
        </button>
      </div>
      <ItemDetail
        noun={noun}
        n={i + 1}
        value={item.detail ?? ""}
        error={err("detail")}
        onChange={(v) => onChange({ detail: v })}
      />
    </div>
  );
}

function ItemDetail({
  noun,
  n,
  value,
  error,
  onChange,
}: {
  noun: string;
  n: number;
  value: string;
  error?: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(value !== "");
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        className="text-sm"
        style={{ color: "var(--accent-teal)" }}
        onClick={() => setOpen(!open)}
      >
        {open ? "Hide what it includes" : "Add what it includes"}
      </button>
      {open && (
        <textarea
          aria-label={`What ${noun} ${n} includes`}
          rows={3}
          maxLength={600}
          className={`${inputCls} mt-1`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {error && (
        <p className="text-xs mt-1" style={{ color: "var(--status-failed-text)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

function PriceInput({
  id,
  label,
  minor,
  onChange,
  onValidity,
  error,
}: {
  id: string;
  label: string;
  minor: number;
  onChange: (m: number) => void;
  onValidity?: (id: string, ok: boolean) => void;
  error?: string;
}) {
  const [text, setText] = useState(minor ? fromMinor(minor) : "");
  const [bad, setBad] = useState(false);
  // A box that disappears (item removed) must not keep blocking the editor.
  useEffect(() => () => onValidity?.(id, true), [id, onValidity]);
  const shown = bad ? "Enter a valid amount, e.g. 1,250.00" : error;
  return (
    <div>
      <input
        aria-label={label}
        aria-invalid={bad || undefined}
        inputMode="decimal"
        placeholder={label === "Discount" ? "Discount" : "0.00"}
        className={inputCls}
        value={text}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          const m = v.trim() === "" ? 0 : toMinor(v);
          setBad(m === null);
          onValidity?.(id, m !== null);
          if (m !== null) onChange(m);
        }}
      />
      {shown && (
        <p className="text-xs mt-1" style={{ color: "var(--status-failed-text)" }}>
          {shown}
        </p>
      )}
    </div>
  );
}

/**
 * Fill for controls with white text. Fixed brand teal rather than --accent-teal:
 * dark mode's #26a9c5 gives white text only 2.8:1, #085866 gives 8.1:1.
 */
export const BRAND_FILL = "#085866";

type StageDef = QuoteDraft["schedule"][number];

/** One-click payment plans. Ids are stable so a preset re-applied keeps the same stages. */
export const PAYMENT_PRESETS: { name: string; schedule: StageDef[] }[] = [
  { name: "100% upfront", schedule: [{ id: "full", label: "Full payment", percent: 100 }] },
  {
    name: "50 / 50",
    schedule: [
      { id: "deposit", label: "Deposit", percent: 50 },
      { id: "balance", label: "Balance", percent: 50 },
    ],
  },
  {
    name: "60 / 40",
    schedule: [
      { id: "deposit", label: "Deposit", percent: 60 },
      { id: "balance", label: "Balance", percent: 40 },
    ],
  },
  {
    name: "70 / 30",
    schedule: [
      { id: "deposit", label: "Deposit", percent: 70 },
      { id: "balance", label: "Balance", percent: 30 },
    ],
  },
  {
    name: "40 / 30 / 30",
    schedule: [
      { id: "deposit", label: "Deposit", percent: 40 },
      { id: "milestone", label: "Milestone", percent: 30 },
      { id: "balance", label: "Balance", percent: 30 },
    ],
  },
];

const samePlan = (a: StageDef[], b: StageDef[]) =>
  a.length === b.length && a.every((s, i) => s.percent === b[i].percent);

export function StagesStep({ draft, setDraft, errors }: StepProps) {
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
      <div role="group" aria-label="Payment plan presets" className="flex flex-wrap gap-2">
        {PAYMENT_PRESETS.map((p) => {
          const on = samePlan(draft.schedule, p.schedule);
          return (
            <button
              key={p.name}
              type="button"
              aria-pressed={on}
              onClick={() => setDraft({ ...draft, schedule: p.schedule.map((s) => ({ ...s })) })}
              className="min-h-10 rounded-full border px-4 text-sm font-semibold transition-colors"
              style={
                on
                  ? {
                      background: BRAND_FILL,
                      borderColor: "var(--accent-teal)",
                      color: "#fff",
                    }
                  : { borderColor: "var(--border-subtle)", color: "var(--text-primary)" }
              }
            >
              {p.name}
            </button>
          );
        })}
      </div>
      {draft.schedule.map((s, i) => (
        <div key={s.id} className="space-y-2">
          <div className="grid gap-2 grid-cols-[minmax(0,1fr)_4.5rem_auto] sm:grid-cols-[1fr_5.5rem_8rem_auto] items-center">
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
            {/* On phones the live summary below the form carries the amounts. */}
            <span
              className="hidden sm:block font-mono text-sm text-right"
              style={{ color: "var(--text-primary)" }}
            >
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
          <input
            aria-label={`When stage ${i + 1} is due`}
            className={inputCls}
            maxLength={80}
            placeholder={
              i === 0
                ? "To start the project"
                : i === draft.schedule.length - 1
                  ? "When the project is live"
                  : "When this stage is done"
            }
            value={s.note ?? ""}
            onChange={(e) => update(i, { note: e.target.value })}
          />
          {errors[`schedule.${i}.note`] && (
            <p className="text-xs" style={{ color: "var(--status-failed-text)" }}>
              {errors[`schedule.${i}.note`]}
            </p>
          )}
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

const subCard = "space-y-3 rounded-xl border p-4";
const subCardStyle = { borderColor: "var(--border-subtle)" };
const hintCls = "text-xs";
const hintStyle = { color: "var(--text-secondary)" };

export function ExtrasStep({ draft, setDraft, errors, onValidity }: StepProps) {
  const setCost = (i: number, patch: Partial<QuoteDraft["runningCosts"][number]>) =>
    setDraft({
      ...draft,
      runningCosts: draft.runningCosts.map((c, j) => (j === i ? { ...c, ...patch } : c)),
    });
  const setOpt = (i: number, patch: Partial<QuoteDraft["optionalItems"][number]>) =>
    setDraft({
      ...draft,
      optionalItems: draft.optionalItems.map((it, j) => (j === i ? { ...it, ...patch } : it)),
    });
  const errorText = (key: string) =>
    errors[key] && (
      <p className="text-xs mt-1" style={{ color: "var(--status-failed-text)" }}>
        {errors[key]}
      </p>
    );
  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        Nothing here changes the price or the payments.
      </p>

      <section className={subCard} style={subCardStyle}>
        <h4 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Running costs
        </h4>
        {errorText("runningCosts")}
        {draft.runningCosts.map((c, i) => (
          // eslint-disable-next-line react/no-array-index-key -- running costs have no id; the inputs are controlled
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_10rem_auto] items-start">
            <div>
              <input
                aria-label={`Service for running cost ${i + 1}`}
                className={inputCls}
                placeholder="Service"
                value={c.service}
                onChange={(e) => setCost(i, { service: e.target.value })}
              />
              {errorText(`runningCosts.${i}.service`)}
            </div>
            <div>
              <input
                aria-label={`What running cost ${i + 1} is for`}
                className={inputCls}
                placeholder="What it is for"
                value={c.purpose}
                onChange={(e) => setCost(i, { purpose: e.target.value })}
              />
              {errorText(`runningCosts.${i}.purpose`)}
            </div>
            <div>
              <input
                aria-label={`Estimated cost ${i + 1}`}
                className={inputCls}
                placeholder="USD 25 / month"
                value={c.cost}
                onChange={(e) => setCost(i, { cost: e.target.value })}
              />
              {errorText(`runningCosts.${i}.cost`)}
            </div>
            <button
              type="button"
              aria-label={`Remove running cost ${i + 1}`}
              className="p-2.5"
              style={{ color: "var(--text-secondary)" }}
              onClick={() =>
                setDraft({ ...draft, runningCosts: draft.runningCosts.filter((_, j) => j !== i) })
              }
            >
              <FaTrash />
            </button>
          </div>
        ))}
        {draft.runningCosts.length < 12 && (
          <button
            type="button"
            className="text-sm flex items-center gap-2"
            style={{ color: "var(--accent-teal)" }}
            onClick={() =>
              setDraft({
                ...draft,
                runningCosts: [...draft.runningCosts, { service: "", purpose: "", cost: "" }],
              })
            }
          >
            <FaPlus /> Add running cost
          </button>
        )}
      </section>

      <section className={subCard} style={subCardStyle}>
        <p className={hintCls} style={hintStyle}>
          One item per line.
        </p>
        <Field id="q-exclusions" label="Not included" error={errors.exclusions}>
          <textarea
            id="q-exclusions"
            rows={4}
            maxLength={3000}
            className={inputCls}
            value={draft.exclusions}
            onChange={(e) => setDraft({ ...draft, exclusions: e.target.value })}
          />
        </Field>
        <Field id="q-assumptions" label="What I need from you" error={errors.assumptions}>
          <textarea
            id="q-assumptions"
            rows={4}
            maxLength={3000}
            className={inputCls}
            value={draft.assumptions}
            onChange={(e) => setDraft({ ...draft, assumptions: e.target.value })}
          />
        </Field>
      </section>

      <section className={subCard} style={subCardStyle}>
        <p className={hintCls} style={hintStyle}>
          One step per line.
        </p>
        <Field id="q-next-steps" label="Next steps" error={errors.nextSteps}>
          <textarea
            id="q-next-steps"
            rows={4}
            maxLength={1500}
            className={inputCls}
            value={draft.nextSteps}
            onChange={(e) => setDraft({ ...draft, nextSteps: e.target.value })}
          />
        </Field>
      </section>

      <section className={subCard} style={subCardStyle}>
        <Field id="q-optional-title" label="Optional section title" error={errors.optionalTitle}>
          <input
            id="q-optional-title"
            className={inputCls}
            maxLength={80}
            placeholder="Optional extras for later"
            value={draft.optionalTitle}
            onChange={(e) => setDraft({ ...draft, optionalTitle: e.target.value })}
          />
        </Field>
        {errorText("optionalItems")}
        {draft.optionalItems.map((item, i) => (
          <ItemRow
            key={item.id}
            noun="optional item"
            index={i}
            item={item}
            errors={errors}
            errorPrefix="optionalItems"
            onValidity={onValidity}
            canRemove
            onChange={(patch) => setOpt(i, patch)}
            onRemove={() =>
              setDraft({ ...draft, optionalItems: draft.optionalItems.filter((_, j) => j !== i) })
            }
          />
        ))}
        {draft.optionalItems.length < 30 && (
          <button
            type="button"
            className="text-sm flex items-center gap-2"
            style={{ color: "var(--accent-teal)" }}
            onClick={() =>
              setDraft({
                ...draft,
                optionalItems: [
                  ...draft.optionalItems,
                  { id: newId("opt"), description: "", qty: 1, unitMinor: 0 },
                ],
              })
            }
          >
            <FaPlus /> Add optional item
          </button>
        )}
      </section>
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
        “Save and send” emails the client their link and gives you a WhatsApp button for their
        number. To check the client page first, save the draft and use Preview in the quote detail.
      </p>
    </div>
  );
}
