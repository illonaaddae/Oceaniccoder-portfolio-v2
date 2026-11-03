// The CV sections kept in the profile: awards, co-curricular activities and
// skills lines. They are only on the CV, so each item can be added, edited,
// moved and deleted; list order is CV order. Every change saves the whole
// profile, as /api/cv saveProfile takes it.
import { useRef, useState } from "react";
import { cvApi } from "@/services/api/cv";
import type { CvProfile, CvProfileInput } from "@/types/cv";
import { newId } from "@/utils/quoteMath";
import { useConfirm } from "../../ConfirmContext";
import {
  Button,
  Card,
  FormError,
  TextField,
  focusField,
  muted,
  strong,
  useFocusAfterRender,
  useFocusFirstField,
} from "../Finance/ui";
import { TextAreaField } from "./fields";
import { linesOf, moveId } from "./cvItems";
import type { CvState } from "./useCv";

export type ListKey = "awards" | "coCurricular" | "skills";

type Item = CvProfile[ListKey][number];
/** An item's fields as the form edits them; bullets as one per line. */
type Values = Record<string, string>;

interface ListField {
  key: string;
  label: string;
  required?: boolean;
  /** Stored as a list of lines. */
  lines?: boolean;
  maxLength: number;
  hint?: string;
}

const LISTS: Record<
  ListKey,
  { title: string; noun: string; fields: ListField[]; name: (v: Values) => string }
> = {
  awards: {
    title: "Achievements and awards",
    noun: "award",
    fields: [
      { key: "title", label: "Award", required: true, maxLength: 160 },
      { key: "issuer", label: "Given by", maxLength: 160 },
      { key: "year", label: "Year", maxLength: 40 },
    ],
    name: (v) => v.title,
  },
  coCurricular: {
    title: "Co-curricular activities",
    noun: "activity",
    fields: [
      { key: "org", label: "Organisation", required: true, maxLength: 160 },
      { key: "location", label: "Location", maxLength: 160 },
      { key: "title", label: "Role", maxLength: 160 },
      { key: "period", label: "Period", maxLength: 80 },
      {
        key: "bullets",
        label: "Bullets",
        lines: true,
        maxLength: 1900,
        hint: "One per line, up to 6.",
      },
    ],
    name: (v) => v.org,
  },
  skills: {
    title: "Skills",
    noun: "skills line",
    fields: [
      { key: "label", label: "Label", required: true, maxLength: 60, hint: "Such as Languages." },
      {
        key: "items",
        label: "Skills",
        required: true,
        maxLength: 600,
        hint: "Such as TypeScript, Python, SQL.",
      },
    ],
    name: (v) => v.label,
  },
};

function valuesOf(list: ListKey, item: Item | null): Values {
  const raw = (item ?? {}) as unknown as Record<string, unknown>;
  return Object.fromEntries(
    LISTS[list].fields.map((f) => {
      const value = raw[f.key];
      return [
        f.key,
        Array.isArray(value) ? value.join("\n") : typeof value === "string" ? value : "",
      ];
    }),
  );
}

function itemOf(list: ListKey, id: string, values: Values): Item {
  const out: Record<string, unknown> = { id };
  for (const f of LISTS[list].fields)
    out[f.key] = f.lines ? linesOf(values[f.key]) : values[f.key].trim();
  return out as unknown as Item;
}

/** The profile as saveProfile takes it, with one list replaced. */
export function profileInput(
  profile: CvProfileInput,
  patch: Partial<CvProfileInput>,
): CvProfileInput {
  return {
    header: profile.header,
    awards: profile.awards,
    coCurricular: profile.coCurricular,
    skills: profile.skills,
    references: profile.references,
    footnotes: profile.footnotes,
    ...patch,
  };
}

function ItemForm({
  list,
  item,
  onSave,
  onCancel,
}: {
  list: ListKey;
  item: Item | null;
  onSave: (values: Values) => Promise<void>;
  onCancel: () => void;
}) {
  const def = LISTS[list];
  const [values, setValues] = useState(() => valuesOf(list, item));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const formRef = useFocusFirstField<HTMLFormElement>();
  const set = (key: string) => (v: string) => setValues((s) => ({ ...s, [key]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const missing = def.fields.find((f) => f.required && !values[f.key].trim());
    if (missing) {
      setError(`Enter the ${missing.label.toLowerCase()}.`);
      return focusField(formRef.current, missing.key);
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that.");
      setSaving(false);
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      className="mt-3 space-y-3 rounded-lg border p-4"
      style={{ borderColor: "var(--analytics-line)" }}
      aria-label={item ? `Edit ${def.name(valuesOf(list, item))}` : `Add ${def.noun}`}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {def.fields
          .filter((f) => !f.lines)
          .map((f) => (
            <TextField
              key={f.key}
              label={f.label}
              name={f.key}
              value={values[f.key]}
              onChange={set(f.key)}
              required={f.required}
              maxLength={f.maxLength}
              hint={f.hint}
            />
          ))}
      </div>
      {def.fields
        .filter((f) => f.lines)
        .map((f) => (
          <TextAreaField
            key={f.key}
            label={f.label}
            name={f.key}
            value={values[f.key]}
            onChange={set(f.key)}
            maxLength={f.maxLength}
            hint={f.hint}
          />
        ))}
      <FormError message={error} />
      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

function ItemRow({
  list,
  item,
  index,
  items,
  profile,
  state,
}: {
  list: ListKey;
  item: Item;
  index: number;
  items: Item[];
  profile: CvProfile;
  state: CvState;
}) {
  const def = LISTS[list];
  const values = valuesOf(list, item);
  const name = def.name(values);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rowRef = useRef<HTMLLIElement>(null);
  const editRef = useRef<HTMLButtonElement>(null);
  const upRef = useRef<HTMLButtonElement>(null);
  const downRef = useRef<HTMLButtonElement>(null);
  // The store version the edit form opened on; see `basedOn` in useCv.
  const editBasedOn = useRef<string | null>(null);
  const focusLater = useFocusAfterRender();
  const confirm = useConfirm();

  const save = (next: Item[], options?: { row?: HTMLElement | null; basedOn?: string | null }) =>
    state.mutate(
      (version) => cvApi.saveProfile(profileInput(profile, { [list]: next }), version),
      options,
    );

  async function run(change: () => Promise<void>, fallback: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await change();
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback);
    } finally {
      setBusy(false);
    }
  }

  const move = (by: -1 | 1) =>
    run(async () => {
      const order = moveId(
        items.map((i) => i.id),
        index,
        by,
      );
      await save(order.map((id) => items.find((i) => i.id === id)!));
      state.announce(`Moved ${name} ${by < 0 ? "up" : "down"}`);
      focusLater(() => (by < 0 ? upRef : downRef).current);
    }, "Couldn't move that.");

  async function remove() {
    const ok = await confirm({
      message: `Delete ${name}?`,
      description: "It is only on the CV, so this can't be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    await run(async () => {
      await save(
        items.filter((i) => i.id !== item.id),
        { row: rowRef.current },
      );
      state.announce(`Deleted ${name}`);
    }, "Couldn't delete that.");
  }

  const closeEditor = () => {
    setEditing(false);
    focusLater(() => editRef.current);
  };

  const detail = def.fields
    .filter((f) => !f.required && !f.lines)
    .map((f) => values[f.key])
    .filter(Boolean)
    .join(" · ");

  return (
    <li ref={rowRef} className="py-4 first:pt-0 last:pb-0" aria-label={name}>
      <h3 data-row-name tabIndex={-1} className="text-sm font-bold outline-none" style={strong}>
        {name}
      </h3>
      {list === "skills" ? (
        <p className="text-xs" style={muted}>
          {values.items}
        </p>
      ) : (
        detail && (
          <p className="text-xs" style={muted}>
            {detail}
          </p>
        )
      )}
      {editing ? (
        <ItemForm
          list={list}
          item={item}
          onCancel={closeEditor}
          onSave={async (v) => {
            await save(
              items.map((i) => (i.id === item.id ? itemOf(list, item.id, v) : i)),
              { basedOn: editBasedOn.current },
            );
            state.announce(`Saved ${def.name(v)}`);
            closeEditor();
          }}
        />
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <Button
            ref={upRef}
            variant="quiet"
            label={`Move ${name} up`}
            disabled={busy || index === 0}
            onClick={() => void move(-1)}
          >
            Up
          </Button>
          <Button
            ref={downRef}
            variant="quiet"
            label={`Move ${name} down`}
            disabled={busy || index === items.length - 1}
            onClick={() => void move(1)}
          >
            Down
          </Button>
          <Button
            ref={editRef}
            variant="quiet"
            label={`Edit ${name}`}
            onClick={() => {
              editBasedOn.current = state.data.version;
              setEditing(true);
            }}
          >
            Edit
          </Button>
          <Button
            variant="quiet"
            label={`Delete ${name}`}
            disabled={busy}
            onClick={() => void remove()}
          >
            Delete
          </Button>
        </div>
      )}
      <FormError message={error} />
    </li>
  );
}

export function ProfileList({ list, state }: { list: ListKey; state: CvState }) {
  const def = LISTS[list];
  const profile = state.data.profile;
  const items: Item[] = profile ? profile[list] : [];
  const [adding, setAdding] = useState(false);
  const addRef = useRef<HTMLButtonElement>(null);
  const addBasedOn = useRef<string | null>(null);
  const focusLater = useFocusAfterRender();
  const closeAdd = () => {
    setAdding(false);
    focusLater(() => addRef.current);
  };

  return (
    <Card
      title={def.title}
      action={
        profile &&
        !adding && (
          <Button
            ref={addRef}
            label={`Add to ${def.title}`}
            onClick={() => {
              addBasedOn.current = state.data.version;
              setAdding(true);
            }}
          >
            Add
          </Button>
        )
      }
    >
      {!profile ? (
        <p className="text-sm" style={muted}>
          Save your name in Profile first. This list is saved with it.
        </p>
      ) : (
        <>
          {adding && (
            <ItemForm
              list={list}
              item={null}
              onCancel={closeAdd}
              onSave={async (v) => {
                // New items go to the top, as entries do.
                const next = [itemOf(list, newId("cv"), v), ...items];
                await state.mutate(
                  (version) => cvApi.saveProfile(profileInput(profile, { [list]: next }), version),
                  { basedOn: addBasedOn.current },
                );
                state.announce(`Added ${def.name(v)}`);
                closeAdd();
              }}
            />
          )}
          {items.length === 0 ? (
            <p className="text-sm" style={muted}>
              Nothing here yet.
            </p>
          ) : (
            <ul
              data-row-list
              tabIndex={-1}
              className="divide-y divide-[var(--analytics-line)] outline-none"
            >
              {items.map((item, index) => (
                <ItemRow
                  key={item.id}
                  list={list}
                  item={item}
                  index={index}
                  items={items}
                  profile={profile}
                  state={state}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </Card>
  );
}
