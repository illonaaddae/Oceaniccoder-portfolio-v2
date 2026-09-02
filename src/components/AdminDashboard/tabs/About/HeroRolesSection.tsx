import React, { useEffect, useState } from "react";
import { FaKeyboard, FaPlus, FaTimes, FaArrowUp, FaArrowDown, FaSave } from "react-icons/fa";
import { getHeroRoles, setHeroRoles } from "@/services/api/settings";
import { roles as DEFAULT_ROLES } from "@/components/Hero/heroData";
import { getCardClass, getHeadingClass, getInputClass, getLabelClass } from "./styles";

interface Props {
  theme: "light" | "dark";
  isReadOnly: boolean;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

/**
 * The rotating titles typed out under the hero name. Order is meaningful — the
 * animation cycles top to bottom — so the list is reorderable rather than a
 * plain comma-separated string.
 */
export const HeroRolesSection: React.FC<Props> = ({ theme, isReadOnly, onSuccess, onError }) => {
  const [roles, setRoles] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

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
    const target = index + delta;
    if (target < 0 || target >= roles.length) return;
    const next = [...roles];
    [next[index], next[target]] = [next[target], next[index]];
    update(next);
  };

  const handleSave = async () => {
    if (roles.length === 0) {
      onError?.("Add at least one role — the hero animation needs something to type.");
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

  return (
    <div className={getCardClass(theme)}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className={getHeadingClass(theme)}>
            <FaKeyboard className="text-brand-link dark:text-oceanic-400" />
            Hero Roles
          </h3>
          <p className={`mt-1 text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
            The titles typed out and cycled under your name on the home hero, in this order. Changes
            apply immediately, no redeploy needed.
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
            <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
              No roles yet — add one above.
            </p>
          ) : (
            <ul className="space-y-2">
              {roles.map((role, index) => (
                <li
                  key={role}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${rowClass}`}
                >
                  <span
                    className={`text-xs font-mono w-6 shrink-0 ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}
                  >
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
              ))}
            </ul>
          )}

          {dirty && !isReadOnly && (
            <p className={`mt-3 text-xs ${theme === "dark" ? "text-amber-400" : "text-amber-600"}`}>
              Unsaved changes — hit Save Roles to publish them.
            </p>
          )}
          {isReadOnly && (
            <p className={`mt-3 text-xs ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}>
              View-only mode — editing is disabled.
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default HeroRolesSection;
