// @vitest-environment node
import { describe, it, expect } from "vitest";
import { applyPlan, isMissingContainer } from "./apply-plan.mjs";

const conflict = () => Object.assign(new Error("Conflict"), { code: 409 });

/**
 * A container stub: `rows` are stored by id; `uniqueOf(doc)` gives the
 * unique-key value, and a write whose value another row holds answers 409,
 * as Cosmos does. Queries answer with `holders`.
 */
function stubContainer(rows, { uniqueOf = () => null, holders = [] } = {}) {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const clashes = (doc) => {
    const key = uniqueOf(doc);
    return key !== null && [...byId.values()].some((r) => r.id !== doc.id && uniqueOf(r) === key);
  };
  const calls = [];
  return {
    calls,
    byId,
    items: {
      async create(doc) {
        calls.push(["create", doc.id]);
        if (byId.has(doc.id) || clashes(doc)) throw conflict();
        byId.set(doc.id, doc);
      },
      async upsert(doc) {
        calls.push(["upsert", doc.id]);
        if (clashes(doc)) throw conflict();
        byId.set(doc.id, doc);
      },
      query() {
        return { fetchAll: async () => ({ resources: holders.map((id) => ({ id })) }) };
      },
    },
    item(id) {
      return {
        async delete() {
          calls.push(["delete", id]);
          byId.delete(id);
        },
      };
    },
  };
}

const emptyPlan = { prune: [], create: [], overwrite: [] };
const reaction = (id, visitorId) => ({ id, postId: "p1", visitorId });
const uniqueOf = (doc) => `${doc.postId}|${doc.visitorId}`;

describe("applyPlan", () => {
  it("prunes before it creates, so a stale row can't hold a needed key", async () => {
    const container = stubContainer([reaction("old", "v1")], { uniqueOf });
    const outcome = await applyPlan("blog_reactions", container, {
      ...emptyPlan,
      prune: [{ id: "old", pk: "p1" }],
      create: [reaction("new", "v1")],
    });
    expect(container.calls).toEqual([
      ["delete", "old"],
      ["create", "new"],
    ]);
    expect(outcome).toEqual({ raced: 0, clashes: [] });
  });

  it("names the row holding the key when a create clashes", async () => {
    const container = stubContainer([reaction("live", "v1")], { uniqueOf, holders: ["live"] });
    const outcome = await applyPlan("blog_reactions", container, {
      ...emptyPlan,
      create: [reaction("b1", "v1")],
    });
    expect(outcome.clashes).toEqual([{ id: "b1", holders: ["live"], write: "create" }]);
  });

  it("reports a clash without querying when the backup row lacks its key", async () => {
    const container = stubContainer([{ id: "live", postId: "p1" }], {
      uniqueOf: (doc) => doc.postId,
    });
    container.items.query = () => {
      throw new Error("queried");
    };
    const outcome = await applyPlan("blog_reactions", container, {
      ...emptyPlan,
      create: [{ id: "b1", postId: "p1" }],
    });
    expect(outcome.clashes).toEqual([{ id: "b1", missingFields: ["visitorId"], write: "create" }]);
  });

  it("counts a create whose id appeared meanwhile as raced", async () => {
    const container = stubContainer([{ id: "m1" }]);
    const outcome = await applyPlan("messages", container, {
      ...emptyPlan,
      create: [{ id: "m1" }],
    });
    expect(outcome).toEqual({ raced: 1, clashes: [] });
  });

  it("reports an overwrite that clashes and carries on with the rest", async () => {
    const container = stubContainer([reaction("a", "v1"), reaction("b", "v2")], {
      uniqueOf,
      holders: ["b"],
    });
    const outcome = await applyPlan("blog_reactions", container, {
      ...emptyPlan,
      overwrite: [reaction("a", "v2"), { ...reaction("c", "v3") }],
    });
    expect(outcome.clashes).toEqual([{ id: "a", holders: ["b"], write: "overwrite" }]);
    expect(container.byId.get("c")).toEqual(reaction("c", "v3"));
  });

  it("reports an overwrite 409 even when no holder is found", async () => {
    const container = stubContainer([reaction("a", "v1"), reaction("b", "v2")], { uniqueOf });
    const outcome = await applyPlan("blog_reactions", container, {
      ...emptyPlan,
      overwrite: [reaction("a", "v2")],
    });
    expect(outcome.clashes).toEqual([{ id: "a", holders: [], write: "overwrite" }]);
  });

  it("still throws on errors other than 409", async () => {
    const container = stubContainer([]);
    container.items.upsert = async () => {
      throw Object.assign(new Error("boom"), { code: 500 });
    };
    await expect(
      applyPlan("projects", container, { ...emptyPlan, overwrite: [{ id: "x" }] }),
    ).rejects.toThrow("boom");
  });
});

describe("isMissingContainer", () => {
  it("accepts 404, and 400 with substatus 1003 (the emulator)", () => {
    expect(isMissingContainer({ code: 404 })).toBe(true);
    expect(isMissingContainer({ code: 400, substatus: 1003 })).toBe(true);
    expect(isMissingContainer({ code: 400 })).toBe(false);
    expect(isMissingContainer({ code: 400, substatus: 1001 })).toBe(false);
    expect(isMissingContainer(null)).toBe(false);
  });
});
