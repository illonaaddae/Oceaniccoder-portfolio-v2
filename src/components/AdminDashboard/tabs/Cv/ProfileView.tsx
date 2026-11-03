// The CV header (name, title, contact lines, links), the footnotes, and the
// references line, which stays "Available upon request" (owner decision D1).
// Awards, co-curricular activities and skills are CV sections, edited in
// Sections.
import type React from "react";
import { useRef, useState } from "react";
import { cvApi } from "@/services/api/cv";
import type { CvLink, CvProfileInput } from "@/types/cv";
import {
  Button,
  Card,
  FormError,
  TextField,
  focusField,
  muted,
  strong,
  useFocusAfterRender,
} from "../Finance/ui";
import { TextAreaField } from "./fields";
import { newId } from "@/utils/quoteMath";
import { linesOf } from "./cvItems";
import { profileInput } from "./ProfileLists";
import type { CvState } from "./useCv";

const MAX_LINKS = 6;

type EditedLink = CvLink & { key: string };
const REFERENCES = "Available upon request";

function ProfileForm({
  state,
  saveRef,
  onSaved,
}: {
  state: CvState;
  saveRef: React.Ref<HTMLButtonElement>;
  onSaved: () => void;
}) {
  const profile = state.data.profile;
  const header = profile?.header;
  const [name, setName] = useState(header?.name ?? "");
  const [title, setTitle] = useState(header?.title ?? "");
  const [lines, setLines] = useState((header?.lines ?? []).join("\n"));
  // `key` only tells the rows apart while editing; it is not saved.
  const [links, setLinks] = useState<EditedLink[]>(() =>
    (header?.links ?? []).map((l) => ({ ...l, key: newId("link") })),
  );
  const [footnotes, setFootnotes] = useState((profile?.footnotes ?? []).join("\n"));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const addLinkRef = useRef<HTMLButtonElement>(null);
  const focusLater = useFocusAfterRender();
  // The store version the form was filled from; see `basedOn` in useCv.
  const basedOn = useRef(state.data.version);

  const setLink = (index: number, patch: Partial<CvLink>) =>
    setLinks((all) => all.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  function addLink() {
    setLinks((all) => [...all, { label: "", url: "", key: newId("link") }]);
    focusLater(() =>
      formRef.current?.querySelector<HTMLElement>(`[name="link-label-${links.length}"]`),
    );
  }

  function removeLink(index: number) {
    setLinks((all) => all.filter((_, i) => i !== index));
    focusLater(() => addLinkRef.current);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!name.trim()) {
      setError("Enter your name.");
      return focusField(formRef.current, "name");
    }
    const header = {
      name: name.trim(),
      title: title.trim(),
      lines: linesOf(lines),
      links: links
        .map((l) => ({ label: l.label.trim(), url: l.url.trim() }))
        .filter((l) => l.label || l.url),
    };
    const footnoteList = linesOf(footnotes);
    const base: CvProfileInput = profile ?? {
      header,
      awards: [],
      coCurricular: [],
      skills: [],
      references: { mode: "on-request", text: REFERENCES },
      footnotes: [],
    };
    setSaving(true);
    setError(null);
    try {
      await state.mutate(
        (version) =>
          cvApi.saveProfile(profileInput(base, { header, footnotes: footnoteList }), version),
        { basedOn: basedOn.current },
      );
      state.announce("Saved your CV profile");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your profile.");
      setSaving(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={submit} className="space-y-4" aria-label="CV profile">
      <Card title="Header">
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextField
              label="Name"
              name="name"
              value={name}
              onChange={setName}
              required
              maxLength={80}
            />
            <TextField
              label="Title"
              name="title"
              value={title}
              onChange={setTitle}
              maxLength={120}
              hint="Such as Software Engineer."
            />
          </div>
          <TextAreaField
            label="Contact lines"
            name="lines"
            value={lines}
            onChange={setLines}
            rows={3}
            hint="One per line, up to 6, centred under the title: location; phone and nationality; email."
          />
          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold" style={muted}>
              Links
            </legend>
            <p className="text-xs" style={muted}>
              Printed on one line under the contact lines. Links must start with https: or mailto:.
            </p>
            {links.map((link, index) => (
              <div
                key={link.key}
                className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_2fr_auto]"
              >
                <TextField
                  label={`Link ${index + 1} label`}
                  name={`link-label-${index}`}
                  value={link.label}
                  onChange={(v) => setLink(index, { label: v })}
                  maxLength={60}
                  placeholder="LinkedIn Profile"
                />
                <TextField
                  label={`Link ${index + 1} address`}
                  name={`link-url-${index}`}
                  value={link.url}
                  onChange={(v) => setLink(index, { url: v })}
                  maxLength={300}
                  placeholder="https://"
                />
                <Button
                  variant="quiet"
                  label={`Remove link ${index + 1}`}
                  onClick={() => removeLink(index)}
                >
                  Remove
                </Button>
              </div>
            ))}
            {links.length < MAX_LINKS && (
              <Button ref={addLinkRef} onClick={addLink}>
                Add link
              </Button>
            )}
          </fieldset>
        </div>
      </Card>
      <Card title="References">
        <p className="text-sm" style={strong}>
          {REFERENCES}
        </p>
        <p className="mt-1 text-xs" style={muted}>
          Referee details are never stored or printed.
        </p>
      </Card>
      <Card title="Footnotes">
        <TextAreaField
          label="Footnotes"
          name="footnotes"
          value={footnotes}
          onChange={setFootnotes}
          rows={2}
          hint="One per line, printed at the end of the CV. Such as *WASSCE: West African Senior School Certificate Examination."
        />
      </Card>
      <FormError message={error} />
      <Button ref={saveRef} type="submit" variant="primary" disabled={saving}>
        {saving ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}

export function ProfileView({ state }: { state: CvState }) {
  const focusLater = useFocusAfterRender();
  const saveRef = useRef<HTMLButtonElement>(null);
  // Bumped by a save so this view renders and the focus move runs.
  const [, setSaves] = useState(0);
  return (
    <div className="space-y-4">
      <p className="text-sm" style={muted}>
        Awards, co-curricular activities and skills are CV sections; edit them in Sections.
      </p>
      {/* Refilled from the store after every change, so it never saves over
          a newer profile; focus goes back to Save once the new form is in. */}
      <ProfileForm
        key={state.data.version ?? "new"}
        state={state}
        saveRef={saveRef}
        onSaved={() => {
          focusLater(() => saveRef.current);
          setSaves((n) => n + 1);
        }}
      />
    </div>
  );
}
