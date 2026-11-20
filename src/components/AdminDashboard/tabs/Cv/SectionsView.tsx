// Every CV section in CV order. Education, work experience, projects and
// certifications list site items and CV-only entries; awards, co-curricular
// activities and skills are lists in the profile (ProfileLists).
import { useRef, useState } from "react";
import { cvApi } from "@/services/api/cv";
import type { CvSection } from "@/types/cv";
import { useConfirm } from "../../ConfirmContext";
import { Button, Card, FormError, muted, strong, useFocusAfterRender } from "../Finance/ui";
import { Badge, ShowSwitch } from "./fields";
import { EntryEditor } from "./EntryEditor";
import { ProfileList } from "./ProfileLists";
import { SECTION_LABEL, moveId, sectionRows, type SectionRow } from "./cvItems";
import type { CvState } from "./useCv";

const domId = (id: string) => `cv-row-${id}`;

function detailOf(row: SectionRow): string {
  const v = row.values;
  const other = (value?: string) => (value !== row.name ? value : "");
  return [other(v.title), other(v.org), v.subtitle, v.issuer, v.period || v.date]
    .filter(Boolean)
    .join(" · ");
}

function EntryRow({
  row,
  index,
  ids,
  state,
}: {
  row: SectionRow;
  index: number;
  /** Every id of the section in CV order, for reorder. */
  ids: string[];
  state: CvState;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rowRef = useRef<HTMLLIElement>(null);
  const editRef = useRef<HTMLButtonElement>(null);
  const upRef = useRef<HTMLButtonElement>(null);
  const downRef = useRef<HTMLButtonElement>(null);
  const focusLater = useFocusAfterRender();
  const confirm = useConfirm();
  const deletable = row.orphan || (row.entry !== null && row.entry.source === null);

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

  const setShown = (show: boolean) =>
    run(async () => {
      await state.mutate((version) => cvApi.setShown(row.id, show, version));
      state.announce(`${row.name} ${show ? "shown on" : "hidden from"} the CV`);
    }, "Couldn't change that.");

  const move = (by: -1 | 1) =>
    run(async () => {
      await state.mutate((version) => cvApi.reorder(row.section, moveId(ids, index, by), version));
      state.announce(`Moved ${row.name} ${by < 0 ? "up" : "down"}`);
      // The row moves in the list, which can take focus with it.
      focusLater(() => (by < 0 ? upRef : downRef).current);
    }, "Couldn't move that.");

  async function remove() {
    const ok = await confirm({
      message: `Delete ${row.name} from the CV?`,
      description: row.orphan
        ? "Its site item is gone, so this only removes what the CV kept for it."
        : "It is only on the CV, so this can't be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    await run(async () => {
      await state.mutate((version) => cvApi.deleteEntry(row.id, version), {
        row: rowRef.current,
      });
      state.announce(`Deleted ${row.name}`);
    }, "Couldn't delete that.");
  }

  const closeEditor = () => {
    setEditing(false);
    focusLater(() => editRef.current);
  };

  return (
    <li
      ref={rowRef}
      id={domId(row.id)}
      className="py-4 first:pt-0 last:pb-0"
      aria-labelledby={`${domId(row.id)}-name`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              id={`${domId(row.id)}-name`}
              data-row-name
              tabIndex={-1}
              className="text-sm font-bold outline-none"
              style={strong}
            >
              {row.name}
            </h3>
            {row.orphan ? (
              <Badge tone="warning">Site item deleted</Badge>
            ) : (
              <Badge>{row.record ? "Site" : "CV only"}</Badge>
            )}
            {row.waiting && <Badge tone="warning">Waiting for approval</Badge>}
          </div>
          {detailOf(row) && (
            <p className="text-xs" style={muted}>
              {detailOf(row)}
            </p>
          )}
        </div>
        {!row.orphan && (
          <ShowSwitch
            checked={row.show}
            name={row.name}
            busy={busy}
            onChange={(show) => void setShown(show)}
          />
        )}
      </div>
      {editing ? (
        <EntryEditor section={row.section} row={row} state={state} onDone={closeEditor} />
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <Button
            ref={upRef}
            variant="quiet"
            label={`Move ${row.name} up`}
            disabled={busy || index === 0}
            onClick={() => void move(-1)}
          >
            Up
          </Button>
          <Button
            ref={downRef}
            variant="quiet"
            label={`Move ${row.name} down`}
            disabled={busy || index === ids.length - 1}
            onClick={() => void move(1)}
          >
            Down
          </Button>
          {!row.orphan && (
            <Button
              ref={editRef}
              variant="quiet"
              label={`Edit ${row.name}`}
              onClick={() => setEditing(true)}
            >
              Edit
            </Button>
          )}
          {deletable && (
            <Button
              variant="quiet"
              label={`Delete ${row.name}`}
              disabled={busy}
              onClick={() => void remove()}
            >
              Delete
            </Button>
          )}
        </div>
      )}
      <FormError message={error} />
    </li>
  );
}

function EntrySection({ section, state }: { section: CvSection; state: CvState }) {
  const rows = sectionRows(state.data, section);
  const ids = rows.map((r) => r.id);
  const [adding, setAdding] = useState(false);
  const addRef = useRef<HTMLButtonElement>(null);
  const focusLater = useFocusAfterRender();
  const label = SECTION_LABEL[section];
  const closeAdd = () => {
    setAdding(false);
    focusLater(() => addRef.current);
  };
  return (
    <Card
      title={label}
      action={
        !adding && (
          <Button ref={addRef} label={`Add to ${label}`} onClick={() => setAdding(true)}>
            Add
          </Button>
        )
      }
    >
      {adding && <EntryEditor section={section} row={null} state={state} onDone={closeAdd} />}
      {rows.length === 0 ? (
        <p className="text-sm" style={muted}>
          Nothing here yet. Items you add on the site appear here, or use Add for one that is only
          on the CV.
        </p>
      ) : (
        <ul
          data-row-list
          tabIndex={-1}
          className="divide-y divide-[var(--analytics-line)] outline-none"
        >
          {rows.map((row, index) => (
            <EntryRow key={row.id} row={row} index={index} ids={ids} state={state} />
          ))}
        </ul>
      )}
    </Card>
  );
}

export function SectionsView({ state }: { state: CvState }) {
  return (
    <div className="space-y-4">
      <EntrySection section="education" state={state} />
      <ProfileList list="awards" state={state} />
      <EntrySection section="experience" state={state} />
      <EntrySection section="projects" state={state} />
      <EntrySection section="certifications" state={state} />
      <ProfileList list="coCurricular" state={state} />
      <ProfileList list="skills" state={state} />
    </div>
  );
}
