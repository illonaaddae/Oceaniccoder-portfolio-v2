import { describe, expect, it, beforeEach } from "vitest";
import { allTabs, TAB_GROUPS } from "./tabs";
import {
  COLLAPSED_GROUPS_KEY,
  groupIdForTab,
  groupTabs,
  isGroupCollapsed,
  readCollapsedGroups,
  toggleGroup,
  writeCollapsedGroups,
} from "./sidebarGroups";

describe("tab groups", () => {
  it("covers every tab exactly once", () => {
    const ids = TAB_GROUPS.flatMap((g) => g.tabs.map((t) => t.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort()).toEqual(allTabs.map((t) => t.id).sort());
  });

  it("keeps the client-work flow together and at the same depth", () => {
    // The whole point of grouping rather than nesting: these three are one
    // flow and none of them may end up a click deeper than the others.
    const business = TAB_GROUPS.find((g) => g.id === "business");
    const ids = business?.tabs.map((t) => t.id) ?? [];
    expect(ids).toEqual(expect.arrayContaining(["client-work", "invoices", "payments"]));
  });
});

describe("groupTabs", () => {
  it("drops groups the viewer cannot see anything in", () => {
    // The public dashboard hides every Business and System tab, so those
    // headings must not render empty.
    const publicTabs = allTabs.filter(
      (t) =>
        ![
          "settings",
          "bookings",
          "client-work",
          "invoices",
          "payments",
          "analytics",
          "storage",
        ].includes(t.id),
    );

    const groups = groupTabs(publicTabs);
    const labels = groups.map((g) => g.id);

    expect(labels).not.toContain("system");
    expect(groups.every((g) => g.tabs.length > 0)).toBe(true);
    expect(groups.flatMap((g) => g.tabs).length).toBe(publicTabs.length);
  });

  it("preserves the declared order", () => {
    const groups = groupTabs(allTabs);
    expect(groups.map((g) => g.id)).toEqual(["business", "content", "profile", "system"]);
  });
});

describe("isGroupCollapsed", () => {
  it("collapses a group the user closed", () => {
    expect(isGroupCollapsed("content", ["content"], "overview")).toBe(true);
  });

  it("never collapses the group holding the active tab", () => {
    // Otherwise the page you are looking at vanishes from the nav.
    expect(isGroupCollapsed("content", ["content"], "blog")).toBe(false);
  });

  it("leaves untouched groups open", () => {
    expect(isGroupCollapsed("profile", ["content"], "overview")).toBe(false);
  });
});

describe("groupIdForTab", () => {
  it("finds the owning group", () => {
    expect(groupIdForTab("invoices")).toBe("business");
    expect(groupIdForTab("journey")).toBe("profile");
  });

  it("returns undefined for an unknown tab", () => {
    expect(groupIdForTab("nope")).toBeUndefined();
  });
});

describe("toggleGroup", () => {
  it("adds and removes", () => {
    expect(toggleGroup([], "content")).toEqual(["content"]);
    expect(toggleGroup(["content"], "content")).toEqual([]);
    expect(toggleGroup(["content"], "profile")).toEqual(["content", "profile"]);
  });
});

describe("collapsed-group persistence", () => {
  beforeEach(() => window.localStorage.clear());

  it("round-trips", () => {
    writeCollapsedGroups(["content", "system"]);
    expect(readCollapsedGroups()).toEqual(["content", "system"]);
  });

  it("returns an empty list when nothing is stored", () => {
    expect(readCollapsedGroups()).toEqual([]);
  });

  it("ignores corrupt or unexpected stored values", () => {
    window.localStorage.setItem(COLLAPSED_GROUPS_KEY, "{not json");
    expect(readCollapsedGroups()).toEqual([]);

    window.localStorage.setItem(COLLAPSED_GROUPS_KEY, JSON.stringify({ content: true }));
    expect(readCollapsedGroups()).toEqual([]);

    window.localStorage.setItem(COLLAPSED_GROUPS_KEY, JSON.stringify(["content", 7, null]));
    expect(readCollapsedGroups()).toEqual(["content"]);
  });
});
