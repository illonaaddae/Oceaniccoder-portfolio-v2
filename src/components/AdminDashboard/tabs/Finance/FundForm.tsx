import { useRef, useState } from "react";
import type { Fund, FundGroup, FundInput, FundItem } from "@/types/finance";
import {
  Button,
  FormError,
  MoneyField,
  Select,
  TextField,
  DateField,
  focusField,
  inputToMinor,
  minorToInput,
  muted,
  useFocusAfterRender,
  useFocusFirstField,
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

  const formRef = useFocusFirstField<HTMLFormElement>();
  const focusLater = useFocusAfterRender();
  const addItemRef = useRef<HTMLButtonElement>(null);
  const field = (name: string) => () => {
    const el = formRef.current?.elements.namedItem(name);
    return el instanceof HTMLElement ? el : null;
  };
  /** Shows a refusal and moves focus to the field it is about. */
  const refuse = (message: string, name: string) => {
    setError(message);
    focusField(formRef.current, name);
  };

  const setItem = (id: string, patch: Partial<ItemDraft>) =>
    setItems((list) => list.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  function addItem() {
    const id = newItemId();
    setItems((l) => [...l, { id, name: "", budget: "", ceiling: "", bought: "", boughtOn: "" }]);
    focusLater(field(`item-${id}-name`));
  }

  /** Removes an item; focus goes to the next item, else the one before, else Add item. */
  function removeItem(index: number) {
    const next = items[index + 1] ?? items[index - 1];
    setItems((l) => l.filter((_, i) => i !== index));
    focusLater(next ? field(`item-${next.id}-name`) : () => addItemRef.current);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const targetMinor = inputToMinor(target);
    const monthlyMinor = inputToMinor(monthly);
    if (targetMinor === null || monthlyMinor === null)
      return refuse(
        "Amounts must be numbers like 2500 or 2,500.50.",
        targetMinor === null ? "target" : "monthly",
      );
    const parsedItems: FundItem[] = [];
    for (const it of items) {
      const budgetMinor = inputToMinor(it.budget);
      const ceilingMinor = it.ceiling.trim() ? inputToMinor(it.ceiling) : budgetMinor;
      const boughtMinor = it.bought.trim() ? inputToMinor(it.bought) : null;
      const at = (part: string) => `item-${it.id}-${part}`;
      if (!it.name.trim()) return refuse("Every item needs a name.", at("name"));
      if (budgetMinor === null) return refuse(`Check the amounts for ${it.name}.`, at("budget"));
      if (ceilingMinor === null) return refuse(`Check the amounts for ${it.name}.`, at("ceiling"));
      if (it.bought.trim() && boughtMinor === null)
        return refuse(`Check the amounts for ${it.name}.`, at("bought"));
      if (ceilingMinor < budgetMinor)
        return refuse(`${it.name}: the most you'll pay can't be below the budget.`, at("ceiling"));
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
      ref={formRef}
      onSubmit={submit}
      className="space-y-4"
      aria-label={fund ? `Edit ${fund.name}` : "New fund"}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextField label="Name" value={name} onChange={setName} required maxLength={60} />
        <Select label="Kind" value={group} options={GROUP_OPTIONS} onChange={setGroup} required />
        <MoneyField
          label="Target (GH₵)"
          name="target"
          value={target}
          onChange={setTarget}
          hint={items.length ? "Leave empty to use the items' total" : "Leave empty for no target"}
        />
        <DateField label="Target date" value={targetDate} onChange={setTargetDate} />
        <MoneyField
          label="Monthly contribution (GH₵)"
          name="monthly"
          value={monthly}
          onChange={setMonthly}
        />
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
                name={`item-${it.id}-name`}
                value={it.name}
                onChange={(v) => setItem(it.id, { name: v })}
                maxLength={60}
              />
            </div>
            <MoneyField
              label="Budget"
              name={`item-${it.id}-budget`}
              value={it.budget}
              onChange={(v) => setItem(it.id, { budget: v })}
            />
            <MoneyField
              label="Most I'll pay"
              name={`item-${it.id}-ceiling`}
              value={it.ceiling}
              onChange={(v) => setItem(it.id, { ceiling: v })}
            />
            <MoneyField
              label="Paid"
              name={`item-${it.id}-bought`}
              value={it.bought}
              onChange={(v) => setItem(it.id, { bought: v })}
            />
            <div className="flex items-end gap-2">
              <DateField
                label="Bought on"
                value={it.boughtOn}
                onChange={(v) => setItem(it.id, { boughtOn: v })}
              />
              <Button
                variant="danger"
                label={`Remove ${it.name || `item ${index + 1}`}`}
                onClick={() => removeItem(index)}
              >
                ×
              </Button>
            </div>
          </div>
        ))}
        <Button ref={addItemRef} onClick={addItem}>
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
