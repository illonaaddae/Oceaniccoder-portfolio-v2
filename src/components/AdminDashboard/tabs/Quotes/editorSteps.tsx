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
import type { QuoteDraft } from "@/types/quote";

export interface StepProps {
  draft: QuoteDraft;
  setDraft: (next: QuoteDraft) => void;
  errors: Record<string, string>;
  /** Price boxes report whether their text is a valid amount; the editor blocks Next/Save while any is not. */
  onValidity?: (id: string, ok: boolean) => void;
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
          <div>
            <input
              aria-label={`Quantity for item ${i + 1}`}
              type="number"
              min="0"
              step="any"
              className={inputCls}
              value={item.qty}
              onChange={(e) => update(i, { qty: Number(e.target.value) })}
            />
            {(errors[`items.${i}.qty`] || !(item.qty > 0)) && (
              <p className="text-xs mt-1" style={{ color: "var(--status-failed-text)" }}>
                {!(item.qty > 0) ? "Quantity must be more than 0." : errors[`items.${i}.qty`]}
              </p>
            )}
          </div>
          <PriceInput
            id={`${item.id}-price`}
            label={`Price for item ${i + 1}`}
            onValidity={onValidity}
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
