import { useState } from "react";
import { FaArrowDown, FaArrowUp, FaPlus, FaTrash } from "react-icons/fa";
import type {
  NeedsDetailLabel,
  NeedsGroup,
  NeedsRow,
  NeedsTables,
  QuoteDraft,
} from "@/types/quote";
import {
  emptyNeedsGroup,
  emptyNeedsRow,
  isNeedsBlank,
  legacyToNeedsTables,
  needsRowCount,
  parsePastedRows,
} from "@/utils/needsTables";
import { useConfirm } from "../../ConfirmContext";
import { needsTemplate } from "./needsTemplate";

// Mirrors LIMITS in api/shared/quotes/model.js; the server has the final say.
const MAX = {
  intro: 600,
  groups: 8,
  title: 80,
  groupIntro: 600,
  rows: 30,
  item: 240,
  detail: 240,
  when: 40,
  footnote: 600,
};
const DETAIL_LABELS: NeedsDetailLabel[] = ["Used for", "Notes"];

const inputCls = "glass-input w-full rounded-lg px-3 py-2 min-h-11";
const labelCls = "block text-sm font-medium mb-1";
const iconBtn =
  "min-h-11 min-w-11 flex shrink-0 items-center justify-center rounded-lg disabled:opacity-30";
const textBtn = "text-sm flex items-center gap-2 min-h-11 disabled:opacity-40";
const hint = { color: "var(--text-secondary)" };
const teal = { color: "var(--accent-teal)" };

const EMPTY: NeedsTables = { intro: "", groups: [] };

function move<T>(list: T[], i: number, by: -1 | 1): T[] {
  const j = i + by;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

const isBlankRow = (r: NeedsRow) => !r.item.trim() && !r.detail.trim() && !r.when.trim();

/**
 * Structured editor for "What I'll need from you" (`draft.extras.needs`):
 * an intro, then groups that each hold a small table of Item | Used for or
 * Notes | When, with optional intro and footnote. Rows keep stable ids, so
 * typing never jumps between inputs.
 */
export function NeedsTablesEditor({
  draft,
  setDraft,
  errors,
}: {
  draft: QuoteDraft;
  setDraft: (next: QuoteDraft) => void;
  errors: Record<string, string>;
}) {
  const needs = draft.extras.needs ?? EMPTY;
  const confirm = useConfirm();
  const [pasteFor, setPasteFor] = useState<string | null>(null);
  const [pasted, setPasted] = useState("");

  const setNeeds = (next: NeedsTables) =>
    setDraft({ ...draft, extras: { ...draft.extras, needs: next } });
  const setGroups = (groups: NeedsGroup[]) => setNeeds({ ...needs, groups });
  const setGroup = (gi: number, patch: Partial<NeedsGroup>) =>
    setGroups(needs.groups.map((g, j) => (j === gi ? { ...g, ...patch } : g)));
  const setRow = (gi: number, ri: number, patch: Partial<NeedsRow>) =>
    setGroup(gi, {
      rows: needs.groups[gi].rows.map((r, j) => (j === ri ? { ...r, ...patch } : r)),
    });

  const blank = isNeedsBlank(draft.extras.needs);
  const rowCount = needsRowCount(needs);
  const legacy = draft.assumptions.trim() && blank ? draft.assumptions : "";

  const fillTemplate = async () => {
    if (!blank) {
      const ok = await confirm({
        message: "Replace these tables with the template?",
        description: "What you've entered in “What I'll need from you” will be replaced.",
        confirmLabel: "Replace",
      });
      if (!ok) return;
    }
    setNeeds(needsTemplate());
  };
  const convertLegacy = () =>
    setDraft({
      ...draft,
      assumptions: "",
      extras: { ...draft.extras, needs: legacyToNeedsTables(draft.assumptions) },
    });
  const addPasted = (gi: number) => {
    const kept = needs.groups[gi].rows.filter((r) => !isBlankRow(r));
    setGroup(gi, { rows: [...kept, ...parsePastedRows(pasted)].slice(0, MAX.rows) });
    setPasted("");
    setPasteFor(null);
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
      aria-labelledby="q-needs-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h3
          id="q-needs-heading"
          className="text-sm font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          What I&apos;ll need from you
        </h3>
        {rowCount === 0 && (
          <button
            type="button"
            className={textBtn}
            style={teal}
            onClick={() => void fillTemplate()}
          >
            Start from template
          </button>
        )}
      </div>
      <p className="text-xs" style={hint}>
        Things the client must send you, like access, documents and content. Shown as tables on
        their quote, one per group.
      </p>

      {legacy && (
        <div
          className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}
        >
          <span>This quote still uses the old one-line-per-item list.</span>
          <button type="button" className={textBtn} style={teal} onClick={convertLegacy}>
            Convert the old list
          </button>
        </div>
      )}

      <div>
        <label
          htmlFor="q-needs-intro"
          className={labelCls}
          style={{ color: "var(--text-primary)" }}
        >
          Intro (optional)
        </label>
        <textarea
          id="q-needs-intro"
          rows={2}
          maxLength={MAX.intro}
          className={inputCls}
          placeholder="e.g. The timeline depends on these items arriving on time."
          value={needs.intro}
          onChange={(e) => setNeeds({ ...needs, intro: e.target.value })}
        />
        {err("needs.intro")}
      </div>

      {err("needs.groups")}
      {err("extras")}

      {needs.groups.map((g, gi) => {
        const n = gi + 1;
        const base = `needs.groups.${gi}`;
        const fid = (f: string) => `q-needs-${g.id}-${f}`;
        return (
          <fieldset
            key={g.id}
            className="min-w-0 space-y-3 rounded-lg border p-3"
            style={{ borderColor: "var(--border-subtle)" }}
            aria-label={`Group ${n}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Group {n}
              </span>
              <div className="flex items-center">
                <button
                  type="button"
                  aria-label={`Move group ${n} up`}
                  className={iconBtn}
                  style={hint}
                  disabled={gi === 0}
                  onClick={() => setGroups(move(needs.groups, gi, -1))}
                >
                  <FaArrowUp />
                </button>
                <button
                  type="button"
                  aria-label={`Move group ${n} down`}
                  className={iconBtn}
                  style={hint}
                  disabled={gi === needs.groups.length - 1}
                  onClick={() => setGroups(move(needs.groups, gi, 1))}
                >
                  <FaArrowDown />
                </button>
                <button
                  type="button"
                  aria-label={`Remove group ${n}`}
                  className={iconBtn}
                  style={{ color: "var(--status-failed-text)" }}
                  onClick={() => setGroups(needs.groups.filter((_, j) => j !== gi))}
                >
                  <FaTrash />
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor={fid("title")}
                className={labelCls}
                style={{ color: "var(--text-primary)" }}
              >
                Group {n} title
              </label>
              <input
                id={fid("title")}
                className={inputCls}
                maxLength={MAX.title}
                placeholder="e.g. Content and media"
                value={g.title}
                onChange={(e) => setGroup(gi, { title: e.target.value })}
              />
              {err(`${base}.title`)}
            </div>

            <div>
              <label
                htmlFor={fid("intro")}
                className={labelCls}
                style={{ color: "var(--text-primary)" }}
              >
                Group {n} intro (optional)
              </label>
              <textarea
                id={fid("intro")}
                rows={2}
                maxLength={MAX.groupIntro}
                className={inputCls}
                value={g.intro}
                onChange={(e) => setGroup(gi, { intro: e.target.value })}
              />
              {err(`${base}.intro`)}
            </div>

            <div role="group" aria-labelledby={fid("col")}>
              <span id={fid("col")} className={labelCls} style={{ color: "var(--text-primary)" }}>
                Second column
              </span>
              <div
                className="inline-flex rounded-lg border p-0.5"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                {DETAIL_LABELS.map((label) => {
                  const on = g.detailLabel === label;
                  return (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={on}
                      className="min-h-11 rounded-md px-4 text-sm font-medium"
                      style={
                        on
                          ? { background: "var(--accent-teal)", color: "var(--bg-primary)" }
                          : { color: "var(--text-secondary)" }
                      }
                      onClick={() => setGroup(gi, { detailLabel: label })}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {err(`${base}.rows`)}
            <div className="space-y-2">
              <div
                aria-hidden
                className="hidden gap-2 px-1 text-xs font-semibold sm:grid sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_8rem_8.25rem]"
                style={hint}
              >
                <span>Item</span>
                <span>{g.detailLabel}</span>
                <span>When</span>
              </div>
              {g.rows.map((r, ri) => {
                const rn = ri + 1;
                const rk = `${base}.rows.${ri}`;
                return (
                  <div
                    key={r.id}
                    className="grid gap-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_8rem_8.25rem] items-start"
                  >
                    <div className="min-w-0">
                      <input
                        aria-label={`Item ${rn} in group ${n}`}
                        className={inputCls}
                        maxLength={MAX.item}
                        placeholder="Item"
                        value={r.item}
                        onChange={(e) => setRow(gi, ri, { item: e.target.value })}
                      />
                      {err(`${rk}.item`)}
                    </div>
                    <div className="min-w-0">
                      <input
                        aria-label={`${g.detailLabel} ${rn} in group ${n}`}
                        className={inputCls}
                        maxLength={MAX.detail}
                        placeholder={g.detailLabel}
                        value={r.detail}
                        onChange={(e) => setRow(gi, ri, { detail: e.target.value })}
                      />
                      {err(`${rk}.detail`)}
                    </div>
                    <div className="min-w-0">
                      <input
                        aria-label={`When ${rn} in group ${n}`}
                        className={inputCls}
                        maxLength={MAX.when}
                        placeholder="e.g. Week 1"
                        value={r.when}
                        onChange={(e) => setRow(gi, ri, { when: e.target.value })}
                      />
                      {err(`${rk}.when`)}
                    </div>
                    <div className="flex">
                      <button
                        type="button"
                        aria-label={`Move row ${rn} in group ${n} up`}
                        className={iconBtn}
                        style={hint}
                        disabled={ri === 0}
                        onClick={() => setGroup(gi, { rows: move(g.rows, ri, -1) })}
                      >
                        <FaArrowUp />
                      </button>
                      <button
                        type="button"
                        aria-label={`Move row ${rn} in group ${n} down`}
                        className={iconBtn}
                        style={hint}
                        disabled={ri === g.rows.length - 1}
                        onClick={() => setGroup(gi, { rows: move(g.rows, ri, 1) })}
                      >
                        <FaArrowDown />
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove row ${rn} in group ${n}`}
                        className={iconBtn}
                        style={{ color: "var(--status-failed-text)" }}
                        onClick={() => setGroup(gi, { rows: g.rows.filter((_, j) => j !== ri) })}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-x-4">
              <button
                type="button"
                className={textBtn}
                style={teal}
                disabled={g.rows.length >= MAX.rows}
                onClick={() => setGroup(gi, { rows: [...g.rows, emptyNeedsRow()] })}
              >
                <FaPlus /> Add row to group {n}
              </button>
              {pasteFor !== g.id && (
                <button
                  type="button"
                  className={textBtn}
                  style={teal}
                  onClick={() => {
                    setPasted("");
                    setPasteFor(g.id);
                  }}
                >
                  Paste a table into group {n}
                </button>
              )}
            </div>
            {pasteFor === g.id && (
              <div className="space-y-2">
                <textarea
                  aria-label={`Paste rows into group ${n}`}
                  rows={5}
                  className={inputCls}
                  placeholder={
                    "Copy rows from a table in Google Docs or Word and paste them here.\nOr type one row per line: Item | Used for | When"
                  }
                  value={pasted}
                  onChange={(e) => setPasted(e.target.value)}
                />
                <div className="flex gap-4">
                  <button
                    type="button"
                    className={textBtn}
                    style={teal}
                    disabled={!pasted.trim()}
                    onClick={() => addPasted(gi)}
                  >
                    Add these rows
                  </button>
                  <button
                    type="button"
                    className={textBtn}
                    style={hint}
                    onClick={() => setPasteFor(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor={fid("footnote")}
                className={labelCls}
                style={{ color: "var(--text-primary)" }}
              >
                Group {n} footnote (optional)
              </label>
              <textarea
                id={fid("footnote")}
                rows={2}
                maxLength={MAX.footnote}
                className={inputCls}
                placeholder="e.g. How to send photos and videos"
                value={g.footnote}
                onChange={(e) => setGroup(gi, { footnote: e.target.value })}
              />
              {err(`${base}.footnote`)}
            </div>
          </fieldset>
        );
      })}

      <button
        type="button"
        className={textBtn}
        style={teal}
        disabled={needs.groups.length >= MAX.groups}
        onClick={() => setGroups([...needs.groups, emptyNeedsGroup()])}
      >
        <FaPlus /> Add group
      </button>
    </section>
  );
}
