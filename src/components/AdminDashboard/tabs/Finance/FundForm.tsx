import { useState } from "react";
import type { Fund, FundGroup, FundInput, FundItem } from "@/types/finance";
import {
  Button,
  FormError,
  MoneyField,
  Select,
  TextField,
  inputToMinor,
  minorToInput,
  muted,
} from "./ui";

export const GROUP_OPTIONS: { value: FundGroup; label: string }[] = [
  { value: "wealth", label: "Personal wealth (never spent)" },
  { value: "emergency", label: "Emergency fund" },
  { value: "rent", label: "Rent" },
  { value: "goal", label: "Purchase goal" },
];

interface ItemDraft {
  id: string;
  name: string;
  budget: string;
  ceiling: string;
  bought: string;
  boughtOn: string;
}

const newItemId = () => `i${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function toDraft(item: FundItem): ItemDraft {
  return {
    id: item.id,
    name: item.name,
    budget: minorToInput(item.budgetMinor),
    ceiling: minorToInput(item.ceilingMinor),
    bought: item.boughtMinor === null ? "" : minorToInput(item.boughtMinor),
    boughtOn: item.boughtOn,
  };
}

/** Create or edit a fund. Amounts are typed in cedis and sent as pesewas. */
export function FundForm({
  fund,
  onSave,
  onCancel,
}: {
  fund?: Fund;
  onSave: (input: FundInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(fund?.name ?? "");
  const [group, setGroup] = useState<FundGroup>(fund?.group ?? "goal");
  const [target, setTarget] = useState(minorToInput(fund?.targetMinor ?? 0));
  const [targetDate, setTargetDate] = useState(fund?.targetDate ?? "");
  const [monthly, setMonthly] = useState(minorToInput(fund?.monthlyMinor ?? 0));
  const [institution, setInstitution] = useState(fund?.institution ?? "");
  const [notes, setNotes] = useState(fund?.notes ?? "");
  const [sort, setSort] = useState(String(fund?.sort ?? 0));
  const [items, setItems] = useState<ItemDraft[]>((fund?.items ?? []).map(toDraft));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setItem = (id: string, patch: Partial<ItemDraft>) =>
    setItems((list) => list.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const targetMinor = inputToMinor(target);
    const monthlyMinor = inputToMinor(monthly);
    if (targetMinor === null || monthlyMinor === null)
      return setError("Amounts must be numbers like 2500 or 2,500.50.");
    const parsedItems: FundItem[] = [];
    for (const it of items) {
      const budgetMinor = inputToMinor(it.budget);
      const ceilingMinor = it.ceiling.trim() ? inputToMinor(it.ceiling) : budgetMinor;
      const boughtMinor = it.bought.trim() ? inputToMinor(it.bought) : null;
      if (!it.name.trim()) return setError("Every item needs a name.");
      if (
        budgetMinor === null ||
        ceilingMinor === null ||
        (it.bought.trim() && boughtMinor === null)
      )
        return setError(`Check the amounts for ${it.name}.`);
      if (ceilingMinor < budgetMinor)
        return setError(`${it.name}: the most you'll pay can't be below the budget.`);
      parsedItems.push({
        id: it.id,
        name: it.name.trim(),
        budgetMinor,
        ceilingMinor,
        boughtMinor,
        boughtOn: it.boughtOn,
      });
    }
    // With items, the target is their total budget unless one was typed.
    const itemsTotal = parsedItems.reduce((acc, it) => acc + it.budgetMinor, 0);
    setSaving(true);
    setError(null);
    try {
      await onSave({
        id: fund?.id,
        name: name.trim(),
        group,
        targetMinor: targetMinor || itemsTotal,
        targetDate,
        monthlyMinor,
        institution: institution.trim(),
        notes: notes.trim(),
        archived: fund?.archived ?? false,
        sort: Number.parseInt(sort, 10) || 0,
        items: parsedItems,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the fund.");
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4"
      aria-label={fund ? `Edit ${fund.name}` : "New fund"}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextField label="Name" value={name} onChange={setName} required maxLength={60} />
        <Select label="Kind" value={group} options={GROUP_OPTIONS} onChange={setGroup} required />
        <MoneyField
          label="Target (GH₵)"
          value={target}
          onChange={setTarget}
          hint={items.length ? "Leave empty to use the items' total" : "Leave empty for no target"}
        />
        <TextField label="Target date" type="date" value={targetDate} onChange={setTargetDate} />
        <MoneyField label="Monthly contribution (GH₵)" value={monthly} onChange={setMonthly} />
        <TextField
          label="Held at"
          value={institution}
          onChange={setInstitution}
          maxLength={60}
          placeholder="Bank, app or account"
        />
        <TextField label="Order on the page" value={sort} onChange={setSort} maxLength={4} />
        <TextField label="Notes" value={notes} onChange={setNotes} maxLength={500} />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold" style={muted}>
          Things to buy from this fund (optional)
        </legend>
        {items.map((it, index) => (
          <div
            key={it.id}
            className="grid grid-cols-2 gap-2 rounded-lg border p-3 sm:grid-cols-5"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <div className="col-span-2 sm:col-span-1">
              <TextField
                label={`Item ${index + 1}`}
                value={it.name}
                onChange={(v) => setItem(it.id, { name: v })}
                maxLength={60}
              />
            </div>
            <MoneyField
              label="Budget"
              value={it.budget}
              onChange={(v) => setItem(it.id, { budget: v })}
            />
            <MoneyField
              label="Most I'll pay"
              value={it.ceiling}
              onChange={(v) => setItem(it.id, { ceiling: v })}
            />
            <MoneyField
              label="Paid"
              value={it.bought}
              onChange={(v) => setItem(it.id, { bought: v })}
            />
            <div className="flex items-end gap-2">
              <TextField
                label="Bought on"
                type="date"
                value={it.boughtOn}
                onChange={(v) => setItem(it.id, { boughtOn: v })}
              />
              <Button
                variant="danger"
                label={`Remove ${it.name || `item ${index + 1}`}`}
                onClick={() => setItems((l) => l.filter((x) => x.id !== it.id))}
              >
                ×
              </Button>
            </div>
          </div>
        ))}
        <Button
          onClick={() =>
            setItems((l) => [
              ...l,
              { id: newItemId(), name: "", budget: "", ceiling: "", bought: "", boughtOn: "" },
            ])
          }
        >
          Add item
        </Button>
      </fieldset>

      <FormError message={error} />
      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Saving…" : "Save fund"}
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
