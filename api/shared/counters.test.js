// @vitest-environment node
import { describe, it, expect } from "vitest";

const {
  Invalid,
  checkPostId,
  checkVisitorId,
  checkReaction,
  aggregateViews,
  countReactions,
  reactionChange,
} = await import("./counters.js");

describe("input checks", () => {
  it("accepts ids in the shapes the site uses", () => {
    expect(checkPostId("6a9770d00035a5a1de46")).toBe("6a9770d00035a5a1de46");
    expect(checkPostId("getting-started-react")).toBe("getting-started-react");
    expect(checkVisitorId("visitor_rylhh8inajmrzq1uhx")).toBe("visitor_rylhh8inajmrzq1uhx");
    expect(checkReaction("like")).toBe("like");
  });

  it.each([
    () => checkPostId("../etc"),
    () => checkPostId(""),
    () => checkVisitorId("someone"),
    () => checkVisitorId("visitor_UPPER"),
    () => checkReaction("love"),
  ])("rejects bad input %#", (fn) => {
    expect(fn).toThrow(Invalid);
  });
});

describe("aggregateViews", () => {
  it("counts rows as readers and sums reads, a missing count being one read", () => {
    const stats = aggregateViews([
      { postId: "a", reads: 3 },
      { postId: "a", reads: 1 },
      { postId: "b" },
    ]);
    expect(stats).toEqual({ a: { readers: 2, reads: 4 }, b: { readers: 1, reads: 1 } });
  });
});

describe("countReactions", () => {
  it("counts likes and dislikes", () => {
    expect(
      countReactions([{ reaction: "like" }, { reaction: "dislike" }, { reaction: "like" }]),
    ).toEqual({ likes: 2, dislikes: 1 });
  });
});

describe("reactionChange", () => {
  it("adds, replaces or removes like the old client logic", () => {
    expect(reactionChange(null, "like")).toBe("create");
    expect(reactionChange("like", "like")).toBe("delete");
    expect(reactionChange("dislike", "like")).toBe("replace");
  });
});
