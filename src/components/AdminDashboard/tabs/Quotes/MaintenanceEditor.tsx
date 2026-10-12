import { FaArrowDown, FaArrowUp, FaPlus, FaTrash } from "react-icons/fa";
import type {
  MaintenancePeriod,
  MaintenancePlan,
  MaintenanceSection,
  QuoteDraft,
} from "@/types/quote";
import {
  MAINTENANCE_MAX as MAX,
  defaultMaintenance,
  newId,
  standardMaintenancePlans,
} from "@/utils/quoteMath";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { useConfirm } from "../../ConfirmContext";
import { PriceInput } from "./PriceInput";

const inputCls = "glass-input w-full rounded-lg px-3 py-2 min-h-11";
const labelCls = "block text-sm font-medium mb-1";
const iconBtn =
  "min-h-11 min-w-11 flex shrink-0 items-center justify-center rounded-lg disabled:opacity-30";
const textBtn = "text-sm flex items-center gap-2 min-h-11 disabled:opacity-40";
const hint = { color: "var(--text-secondary)" };
const teal = { color: "var(--accent-teal)" };
const primaryText = { color: "var(--text-primary)" };
/** Brand fill behind white text (see BRAND_FILL in editorSteps). */
const BRAND_FILL = "#085866";

function move<T>(list: T[], i: number, by: -1 | 1): T[] {
  const j = i + by;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

const emptyPlan = (): MaintenancePlan => ({
  id: newId("plan"),
  name: "",
  priceMinor: 0,
  period: "month",
  includes: "",
});

const isBlankPlan = (p: MaintenancePlan) => !p.name.trim() && !p.priceMinor && !p.includes.trim();

/**
 * "Maintenance and support" (`draft.extras.maintenance`): a free period after
 * launch and up to four optional paid plans. Off (null) unless "Include in
 * this quote" is switched on. Nothing here changes the quote total.
 */
export function MaintenanceEditor({
  draft,
  setDraft,
  errors,
  onValidity,
  theme,
}: {
  draft: QuoteDraft;
  setDraft: (next: QuoteDraft) => void;
  errors: Record<string, string>;
  onValidity?: (id: string, ok: boolean) => void;
  theme?: string;
}) {
  const confirm = useConfirm();
  const m = draft.extras.maintenance ?? null;
  const on = m !== null;

  const setM = (next: MaintenanceSection | null) =>
    setDraft({ ...draft, extras: { ...draft.extras, maintenance: next } });
  const patch = (p: Partial<MaintenanceSection>) => m && setM({ ...m, ...p });
  const setPlans = (plans: MaintenancePlan[]) => patch({ plans });
  const setPlan = (i: number, p: Partial<MaintenancePlan>) =>
    m && setPlans(m.plans.map((x, j) => (j === i ? { ...x, ...p } : x)));

  const fillStandardPlans = async () => {
    if (!m) return;
    if (m.plans.some((p) => !isBlankPlan(p))) {
      const ok = await confirm({
        message: "Replace these plans with your standard plans?",
        description: "The plans you've entered here will be replaced.",
        confirmLabel: "Replace",
      });
      if (!ok) return;
    }
    setPlans(standardMaintenancePlans());
  };

  const err = (key: string) =>
    errors[key] && (
      <p className="text-xs mt-1" style={{ color: "var(--status-failed-text)" }}>
        {errors[key]}
      </p>
    );

  return (
    <section
      className="space-y-3 rounded-xl border p-4"
      style={{ borderColor: "var(--border-subtle)" }}
      aria-labelledby="q-maint-heading"
      data-testid="maintenance-editor"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h4 id="q-maint-heading" className="text-sm font-semibold" style={primaryText}>
          Maintenance and support
        </h4>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          className="flex min-h-11 items-center gap-2 text-sm disabled:opacity-60"
          style={primaryText}
          onClick={() => setM(on ? null : defaultMaintenance())}
        >
          <span
            aria-hidden
            className="relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border transition-colors"
            style={
              on
                ? { background: BRAND_FILL, borderColor: "var(--accent-teal)" }
                : { borderColor: "var(--border-subtle)" }
            }
          >
            <span
              className={`absolute h-4 w-4 rounded-full transition-transform ${on ? "translate-x-5" : "translate-x-1"}`}
              style={{ background: on ? "#ffffff" : "var(--text-secondary)" }}
            />
          </span>
          Include in this quote
        </button>
      </div>
      <p className="text-xs" style={hint}>
        A free period after launch and optional monthly plans. Shown after Running costs; not part
        of the total or the payments.
      </p>

      {m && (
        <>
          <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
            <div>
              <label htmlFor="q-maint-days" className={labelCls} style={primaryText}>
                Free period (days)
              </label>
              <input
                id="q-maint-days"
                type="number"
                min="0"
                max={MAX.freeDays}
                step="1"
                className={inputCls}
                value={m.freeDays}
                onChange={(e) =>
                  patch({ freeDays: e.target.value === "" ? 0 : Number(e.target.value) })
                }
              />
              {err("maintenance.freeDays")}
            </div>
            <div>
              <label htmlFor="q-maint-free-text" className={labelCls} style={primaryText}>
                Free period text
              </label>
              <input
                id="q-maint-free-text"
                className={inputCls}
                maxLength={MAX.freeText}
                placeholder="Any defect found is fixed at no cost."
                value={m.freeText}
                onChange={(e) => patch({ freeText: e.target.value })}
              />
              {err("maintenance.freeText")}
            </div>
          </div>
          <p className="text-xs" style={hint}>
            Set the days to 0 for no free period.
          </p>

          <div className="flex flex-wrap items-center justify-between gap-x-4">
            <span className="text-sm font-semibold" style={primaryText}>
              Plans
            </span>
            <button
              type="button"
              className={textBtn}
              style={teal}
              onClick={() => void fillStandardPlans()}
            >
              Use my standard plans
            </button>
          </div>
          {err("maintenance.plans")}
          {err("extras")}

          {m.plans.map((p, i) => {
            const n = i + 1;
            const key = `maintenance.plans.${i}`;
            return (
              <fieldset
                key={p.id}
                className="min-w-0 space-y-2 rounded-lg border p-3"
                style={{ borderColor: "var(--border-subtle)" }}
                aria-label={`Plan ${n}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold" style={primaryText}>
                    Plan {n}
                  </span>
                  <div className="flex items-center">
                    <button
                      type="button"
                      aria-label={`Move plan ${n} up`}
                      className={iconBtn}
                      style={hint}
                      disabled={i === 0}
                      onClick={() => setPlans(move(m.plans, i, -1))}
                    >
                      <FaArrowUp />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move plan ${n} down`}
                      className={iconBtn}
                      style={hint}
                      disabled={i === m.plans.length - 1}
                      onClick={() => setPlans(move(m.plans, i, 1))}
                    >
                      <FaArrowDown />
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove plan ${n}`}
                      className={iconBtn}
                      style={{ color: "var(--status-failed-text)" }}
                      onClick={() => setPlans(m.plans.filter((_, j) => j !== i))}
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_9rem] items-start">
                  <div className="min-w-0">
                    <input
                      aria-label={`Name for plan ${n}`}
                      className={inputCls}
                      maxLength={MAX.name}
                      placeholder="e.g. Care"
                      value={p.name}
                      onChange={(e) => setPlan(i, { name: e.target.value })}
                    />
                    {err(`${key}.name`)}
                  </div>
                  <PriceInput
                    id={`${p.id}-price`}
                    label={`Price for plan ${n}`}
                    minor={p.priceMinor}
                    onValidity={onValidity}
                    onChange={(minor) => setPlan(i, { priceMinor: minor })}
                    error={errors[`${key}.priceMinor`]}
                  />
                  <div className="min-w-0">
                    <CustomSelect
                      value={p.period}
                      onChange={(value) => setPlan(i, { period: value as MaintenancePeriod })}
                      options={[
                        { value: "month", label: "per month" },
                        { value: "year", label: "per year" },
                      ]}
                      theme={theme === "light" ? "light" : "dark"}
                      ariaLabel={`Period for plan ${n}`}
                    />
                    {err(`${key}.period`)}
                  </div>
                </div>
                <div>
                  <textarea
                    aria-label={`What plan ${n} includes`}
                    rows={4}
                    maxLength={MAX.includes}
                    className={inputCls}
                    placeholder="What it includes, one item per line"
                    value={p.includes}
                    onChange={(e) => setPlan(i, { includes: e.target.value })}
                  />
                  {err(`${key}.includes`)}
                </div>
              </fieldset>
            );
          })}

          <button
            type="button"
            className={textBtn}
            style={teal}
            disabled={m.plans.length >= MAX.plans}
            onClick={() => setPlans([...m.plans, emptyPlan()])}
          >
            <FaPlus /> Add plan
          </button>

          <div>
            <label htmlFor="q-maint-note" className={labelCls} style={primaryText}>
              Note (optional)
            </label>
            <textarea
              id="q-maint-note"
              rows={2}
              maxLength={MAX.note}
              className={inputCls}
              placeholder="e.g. Plans are optional. You can start or stop at any time. Unused hours don’t roll over."
              value={m.note}
              onChange={(e) => patch({ note: e.target.value })}
            />
            {err("maintenance.note")}
          </div>
        </>
      )}
    </section>
  );
}
