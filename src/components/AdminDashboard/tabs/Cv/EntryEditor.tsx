// Edits one CV entry, or adds a CV-only one: the section's field overrides
// and, for work experience and projects, the approved role line and bullets
// written by hand. Text written here counts as approved.
import { useRef, useState } from "react";
import { cvApi } from "@/services/api/cv";
import type { CvEntryFields, CvEntryInput, CvSection } from "@/types/cv";
import { Button, FormError, TextField, focusField, muted, useFocusFirstField } from "../Finance/ui";
import { TextAreaField } from "./fields";
import type { CvState } from "./useCv";
import {
  REQUIRED_FIELD,
  SECTION_COLLECTION,
  SECTION_FIELDS,
  SECTION_LABEL,
  TEXT_SECTIONS,
  linesOf,
  siteValues,
  type SectionRow,
} from "./cvItems";

const MAX_BULLETS = 6;

export function EntryEditor({
  section,
  row,
  state,
  onDone,
}: {
  section: CvSection;
  /** The item being edited; null adds a CV-only entry. */
  row: SectionRow | null;
  state: CvState;
  onDone: () => void;
}) {
  const entry = row?.entry ?? null;
  const linked = Boolean(row?.record);
  const defs = SECTION_FIELDS[section];
  const [fields, setFields] = useState<Record<string, string>>(() =>
    Object.fromEntries(defs.map((d) => [d.key, entry?.fields[d.key] ?? ""])),
  );
  const [roleLine, setRoleLine] = useState(entry?.approved?.roleLine ?? "");
  const [bullets, setBullets] = useState((entry?.approved?.bullets ?? []).join("\n"));
  const [sourceNotes, setSourceNotes] = useState(entry?.sourceNotes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const formRef = useFocusFirstField<HTMLFormElement>();
  // The store version the form opened on; see `basedOn` in useCv.
  const basedOn = useRef(state.data.version);
  const hasText = TEXT_SECTIONS.has(section);
  const cvOnlyProject = section === "projects" && !linked;
  const site = siteValues(section, row?.record ?? null);

  function refuse(message: string, field: string) {
    setError(message);
    focusField(formRef.current, field);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const required = REQUIRED_FIELD[section];
    if (!linked && !fields[required].trim()) {
      const label = defs.find((d) => d.key === required)?.label ?? required;
      return refuse(`Enter the ${label.toLowerCase()}.`, required);
    }
    const bulletList = linesOf(bullets);
    if (bulletList.length > MAX_BULLETS)
      return refuse(`Keep it to ${MAX_BULLETS} bullets or fewer.`, "bullets");
    if (roleLine.trim() && bulletList.length === 0)
      return refuse("Add at least one bullet, or clear the role line.", "bullets");
    const approved =
      hasText && bulletList.length > 0 ? { roleLine: roleLine.trim(), bullets: bulletList } : null;
    // Overrides of fields the form doesn't show are kept as they were.
    const merged: CvEntryFields = { ...(entry?.fields ?? {}), ...fields };
    const input: CvEntryInput = {
      section,
      fields: merged,
      approved,
      show: row ? row.show : true,
      ...(linked && row?.record
        ? { source: { collection: SECTION_COLLECTION[section], id: row.record.$id } }
        : { source: null, ...(entry ? { id: entry.id } : {}) }),
      ...(cvOnlyProject ? { sourceNotes } : {}),
    };
    setSaving(true);
    setError(null);
    try {
      await state.mutate((version) => cvApi.saveEntry(input, version), {
        basedOn: basedOn.current,
      });
      state.announce(`Saved ${merged.title || merged.org || row?.name || "the entry"}`);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the entry.");
      setSaving(false);
    }
  }

  const title = row ? `Edit ${row.name}` : `Add to ${SECTION_LABEL[section]}`;
  return (
    <form
      ref={formRef}
      onSubmit={submit}
      className="mt-3 space-y-3 rounded-lg border p-4"
      style={{ borderColor: "var(--analytics-line)" }}
      aria-label={title}
    >
      {linked && (
        <p className="text-xs" style={muted}>
          Empty fields use the site&apos;s text, shown in grey. What you type here changes the CV
          only, not the site.
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {defs.map((d) => (
          <TextField
            key={d.key}
            label={d.label}
            name={d.key}
            value={fields[d.key]}
            onChange={(v) => setFields((f) => ({ ...f, [d.key]: v }))}
            required={!linked && d.key === REQUIRED_FIELD[section]}
            maxLength={160}
            placeholder={site[d.key] || undefined}
            hint={d.hint}
          />
        ))}
      </div>
      {hasText && (
        <>
          <TextField
            label="Role line"
            name="roleLine"
            value={roleLine}
            onChange={setRoleLine}
            maxLength={160}
            hint={
              section === "projects"
                ? "Such as Team project | Web app | Frontend lead."
                : "Replaces the role on the CV when set."
            }
          />
          <TextAreaField
            label="Bullets"
            name="bullets"
            value={bullets}
            onChange={setBullets}
            rows={5}
            hint={
              section === "projects"
                ? `One per line, up to ${MAX_BULLETS}. A project goes on the CV once it has bullets.`
                : `One per line, up to ${MAX_BULLETS}. Leave empty to use the job's achievements from the site.`
            }
          />
        </>
      )}
      {cvOnlyProject && (
        <TextAreaField
          label="Notes for drafting"
          name="sourceNotes"
          value={sourceNotes}
          onChange={setSourceNotes}
          maxLength={8000}
          hint="What the project was, your part in it and the tools used. Not printed on the CV."
        />
      )}
      <FormError message={error} />
      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}
