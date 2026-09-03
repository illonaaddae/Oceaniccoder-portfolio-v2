import React, { useEffect, useState } from "react";
import {
  FaKeyboard,
  FaPlus,
  FaTimes,
  FaArrowUp,
  FaArrowDown,
  FaSave,
  FaGripVertical,
} from "react-icons/fa";
import { getHeroRoles, setHeroRoles } from "@/services/api/settings";
import { roles as DEFAULT_ROLES } from "@/components/Hero/heroData";
import { moveItem } from "@/utils/reorder";
import { getCardClass, getHeadingClass, getInputClass, getLabelClass } from "./styles";

interface Props {
  theme: "light" | "dark";
  isReadOnly: boolean;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

/**
 * The rotating titles typed out under the hero name. Order is meaningful (the
 * animation cycles top to bottom), so the list is reorderable: drag a row by
 * its grip, or use the arrow buttons. The arrows stay because HTML5 drag
 * events don't fire on touch devices and can't be driven from the keyboard.
 */
export const HeroRolesSection: React.FC<Props> = ({ theme, isReadOnly, onSuccess, onError }) => {
  const [roles, setRoles] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  useEffect(() => {
    getHeroRoles()
      .then((saved) => setRoles(saved.length > 0 ? saved : DEFAULT_ROLES))
      .catch(() => setRoles(DEFAULT_ROLES))
      .finally(() => setLoading(false));
  }, []);

  const update = (next: string[]) => {
    setRoles(next);
    setDirty(true);
  };

  const handleAdd = () => {
    const trimmed = draft.trim();
    if (!trimmed || roles.includes(trimmed)) return;
    update([...roles, trimmed]);
    setDraft("");
  };

  const handleRemove = (role: string) => update(roles.filter((r) => r !== role));

  const handleMove = (index: number, delta: number) => {
    const next = moveItem(roles, index, index + delta);
    if (next !== roles) update(next);
  };

  const handleDrop = (targetIndex: number) => {
    if (dragIndex === null) return;
    const next = moveItem(roles, dragIndex, targetIndex);
    if (next !== roles) update(next);
    setDragIndex(null);
    setOverIndex(null);
  };

  const handleSave = async () => {
    if (roles.length === 0) {
      onError?.("Add at least one role. The hero animation needs something to type.");
      return;
    }
    setSaving(true);
    try {
      await setHeroRoles(roles);
      setDirty(false);
      onSuccess?.("Hero roles updated");
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "Failed to save hero roles");
    } finally {
      setSaving(false);
    }
  };

  const rowClass =
    theme === "dark"
      ? "bg-gray-800/60 border-gray-700 text-white"
      : "bg-white/60 border-oceanic-200/50 text-slate-900";
  const iconBtnClass =
    theme === "dark"
      ? "text-slate-400 hover:text-white hover:bg-white/10"
      : "text-slate-500 hover:text-slate-900 hover:bg-slate-900/10";
  const mutedClass = theme === "dark" ? "text-slate-400" : "text-slate-500";

  return (
    <div className={getCardClass(theme)}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className={getHeadingClass(theme)}>
            <FaKeyboard className="text-brand-link dark:text-oceanic-400" />
            Hero Roles
          </h3>
          <p className={`mt-1 text-sm ${mutedClass}`}>
            The titles typed out and cycled under your name on the home hero, in this order. Drag a
            row to rearrange it. Changes apply immediately, no redeploy needed.
          </p>
        </div>
        {!isReadOnly && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !dirty}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition duration-200 disabled:opacity-50 bg-gradient-to-r from-oceanic-600 to-oceanic-900 text-white hover:from-oceanic-500 hover:to-oceanic-900 shrink-0"
          >
            <FaSave />
            {saving ? "Saving…" : "Save Roles"}
          </button>
        )}
      </div>

      {loading ? (
        <p className={theme === "dark" ? "text-slate-300" : "text-slate-600"}>Loading…</p>
      ) : (
        <>
          {!isReadOnly && (
            <div className="flex gap-2 mb-4">
              <label htmlFor="hero-role-input" className="sr-only">
                New role
              </label>
              <input
                id="hero-role-input"
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
                className={getInputClass(theme, false)}
                placeholder="e.g., Cloud Engineer"
              />
              <button
                type="button"
                onClick={handleAdd}
                className="px-4 rounded-xl bg-oceanic-600 text-white hover:bg-oceanic-500 transition shrink-0"
                aria-label="Add role"
              >
                <FaPlus />
              </button>
            </div>
          )}

          {roles.length === 0 ? (
            <p className={`text-sm ${mutedClass}`}>No roles yet. Add one above.</p>
          ) : (
            <ul className="space-y-2">
              {roles.map((role, index) => {
                const isDragging = dragIndex === index;
                const isDropTarget = overIndex === index && dragIndex !== null && !isDragging;

                return (
                  <li
                    key={role}
                    draggable={!isReadOnly}
                    onDragStart={(e) => {
                      setDragIndex(index);
                      e.dataTransfer.effectAllowed = "move";
                      // Firefox refuses to start a drag without transfer data.
                      e.dataTransfer.setData("text/plain", role);
                    }}
                    onDragOver={(e) => {
                      if (dragIndex === null) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      setOverIndex(index);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDrop(index);
                    }}
                    onDragEnd={() => {
                      setDragIndex(null);
                      setOverIndex(null);
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition ${rowClass} ${
                      isDragging ? "opacity-40" : ""
                    } ${isDropTarget ? "border-oceanic-500 ring-2 ring-oceanic-500/40" : ""} ${
                      isReadOnly ? "" : "cursor-grab active:cursor-grabbing"
                    }`}
                  >
                    {!isReadOnly && (
                      <FaGripVertical
                        className={`text-xs shrink-0 ${mutedClass}`}
                        aria-hidden="true"
                      />
                    )}
                    <span className={`text-xs font-mono w-6 shrink-0 ${mutedClass}`}>
                      {index + 1}
                    </span>
                    <span className="flex-1 text-sm truncate">{role}</span>
                    {!isReadOnly && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMove(index, -1)}
                          disabled={index === 0}
                          className={`p-1.5 rounded-lg transition disabled:opacity-30 ${iconBtnClass}`}
                          aria-label={`Move ${role} up`}
                        >
                          <FaArrowUp className="text-xs" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(index, 1)}
                          disabled={index === roles.length - 1}
                          className={`p-1.5 rounded-lg transition disabled:opacity-30 ${iconBtnClass}`}
                          aria-label={`Move ${role} down`}
                        >
                          <FaArrowDown className="text-xs" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(role)}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition"
                          aria-label={`Remove ${role}`}
                        >
                          <FaTimes className="text-xs" />
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {dirty && !isReadOnly && (
            <p className={`mt-3 text-xs ${theme === "dark" ? "text-amber-400" : "text-amber-600"}`}>
              Unsaved changes. Hit Save Roles to publish them.
            </p>
          )}
          {isReadOnly && (
            <p className={`mt-3 text-xs ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}>
              View-only mode. Editing is disabled.
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default HeroRolesSection;
