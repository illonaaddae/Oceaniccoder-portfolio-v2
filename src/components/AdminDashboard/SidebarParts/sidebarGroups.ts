import { TAB_GROUPS, TabDef, TabGroup } from "./tabs";
import type { TabType } from "./types";

export const COLLAPSED_GROUPS_KEY = "admin-sidebar-collapsed-groups";

/**
 * Rebuilds the group structure from a flat, already-filtered list of tabs.
 *
 * Sidebar decides which tabs a viewer may see (the public dashboard hides the
 * private ones), so grouping happens after that filter rather than before it.
 * Groups left with nothing in them are dropped, which is why the public
 * dashboard does not show an empty "Business" heading.
 */
export function groupTabs(visible: TabDef[]): TabGroup[] {
  const allowed = new Set(visible.map((tab) => tab.id));
  return TAB_GROUPS.map((group) => ({
    ...group,
    tabs: group.tabs.filter((tab) => allowed.has(tab.id)),
  })).filter((group) => group.tabs.length > 0);
}

/** The group a tab belongs to, or undefined if it is not in any. */
export function groupIdForTab(tabId: string): string | undefined {
  return TAB_GROUPS.find((group) => group.tabs.some((tab) => tab.id === tabId))?.id;
}

/**
 * Whether a group renders collapsed.
 *
 * A group is never collapsed while it holds the active tab — otherwise the
 * page you are looking at disappears from the nav and the sidebar looks
 * broken.
 */
export function isGroupCollapsed(groupId: string, collapsed: string[], activeTab: string): boolean {
  if (!collapsed.includes(groupId)) return false;
  return groupIdForTab(activeTab) !== groupId;
}

export function readCollapsedGroups(): string[] {
  try {
    const raw = window.localStorage.getItem(COLLAPSED_GROUPS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    // Private windows and blocked site data both throw here.
    return [];
  }
}

export function writeCollapsedGroups(ids: string[]): void {
  try {
    window.localStorage.setItem(COLLAPSED_GROUPS_KEY, JSON.stringify(ids));
  } catch {
    // Preference only — losing it is not worth breaking navigation over.
  }
}

export function toggleGroup(collapsed: string[], groupId: string): string[] {
  return collapsed.includes(groupId)
    ? collapsed.filter((id) => id !== groupId)
    : [...collapsed, groupId];
}

export type { TabType };
