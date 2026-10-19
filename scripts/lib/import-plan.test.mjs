// @vitest-environment node
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import {
  IMPORTED_CONTAINERS,
  afterPlan,
  CUTOVER_MARKER_ID,
  UsageError,
  canPrune,
  cutoverMarker,
  dataChecks,
  isNewerInCosmos,
  parseArgs,
  planContainer,
  quoteNumberLock,
  refusalAfterCutover,
} from "./import-plan.mjs";

const require = createRequire(import.meta.url);
const { MIGRATED_SETTINGS_KEYS } = require("../../api/shared/cosmos.js");
const { lockId } = require("../../api/shared/tokens.js");

const OLD = "2026-10-01T00:00:00.000Z";
const NEW = "2026-10-02T00:00:00.000Z";
const flags = (argv = []) => parseArgs(argv);
const doc = (id, updatedAt = OLD) => ({ id, updatedAt });
const row = (id, updatedAt = OLD) => ({ id, pk: id, updatedAt });
const ids = (list) => list.map((d) => d.id);

describe("parseArgs", () => {
  it("defaults to a full upsert of every imported container", () => {
    expect(flags()).toMatchObject({ only: null, dryRun: false, insertOnly: false, prune: false });
  });

  it("limits the run to the --only containers", () => {
    expect(flags(["--only", "bookings, messages,bookings"]).only).toEqual(["bookings", "messages"]);
  });

  it("fails on an unknown container, analytics, or an empty --only", () => {
    expect(() => flags(["--only", "bookings,nope"])).toThrow("unknown container: nope");
    expect(() => flags(["--only", "analytics"])).toThrow("no Appwrite table");
    expect(() => flags(["--only", ","])).toThrow(UsageError);
    expect(() => flags(["--only"])).toThrow("--only needs a value");
    expect(() => flags(["--only", "--dry-run"])).toThrow("--only needs a value");
  });

  it("fails on an unknown argument", () => {
    expect(() => flags(["--prnue"])).toThrow("unknown argument: --prnue");
  });

  it("refuses --prune without --pre-cutover", () => {
    expect(() => flags(["--prune"])).toThrow("--pre-cutover");
    expect(flags(["--prune", "--pre-cutover"]).prune).toBe(true);
  });

  it("refuses --prune on containers it never deletes from", () => {
    for (const id of ["bookings", "messages", "project_inquiries", "comments", "testimonials"]) {
      expect(() => flags(["--prune", "--pre-cutover", "--only", id])).toThrow("never deletes");
    }
    for (const id of ["payments", "invoices", "quotes", "locks"]) {
      expect(() => flags(["--prune", "--pre-cutover", "--only", id])).toThrow("never deletes");
    }
    expect(flags(["--prune", "--pre-cutover", "--only", "projects"]).only).toEqual(["projects"]);
  });

  it("refuses contradicting flags", () => {
    expect(() => flags(["--prune", "--pre-cutover", "--insert-only"])).toThrow("can't be combined");
    expect(() => flags(["--force-overwrite", "--insert-only"])).toThrow("can't be combined");
  });

  it("runs --mark-cutover only on its own", () => {
    expect(flags(["--mark-cutover"]).markCutover).toBe(true);
    expect(() => flags(["--mark-cutover", "--dry-run"])).toThrow("on its own");
    expect(() => flags(["--mark-cutover", "--pre-cutover"])).toThrow("on its own");
  });
});

describe("canPrune", () => {
  it("protects money, quote state and visitor submissions", () => {
    const never = [
      "payments",
      "invoices",
      "quotes",
      "locks",
      "bookings",
      "messages",
      "project_inquiries",
      "comments",
      "testimonials",
    ];
    for (const id of never) expect(canPrune(id)).toBe(false);
    expect(canPrune("projects")).toBe(true);
    expect(IMPORTED_CONTAINERS).not.toContain("analytics");
  });
});

describe("cutover marker", () => {
  it("refuses --prune and --pre-cutover once the marker exists", () => {
    const marker = cutoverMarker(NEW);
    expect(refusalAfterCutover(flags(["--prune", "--pre-cutover"]), marker)).toMatch(/refused/);
    expect(refusalAfterCutover(flags(["--pre-cutover"]), marker)).toMatch(/refused/);
    expect(refusalAfterCutover(flags(["--insert-only"]), marker)).toBeNull();
    expect(refusalAfterCutover(flags(["--prune", "--pre-cutover"]), null)).toBeNull();
  });

  it("is a private settings row", () => {
    expect(cutoverMarker(NEW)).toMatchObject({
      id: "cutover",
      key: "cutover",
      by: "import-to-cosmos",
    });
    expect(MIGRATED_SETTINGS_KEYS.has(CUTOVER_MARKER_ID)).toBe(false);
  });

  it("is never a prune candidate", () => {
    const plan = planContainer(
      "settings",
      [],
      [row(CUTOVER_MARKER_ID)],
      flags(["--prune", "--pre-cutover"]),
    );
    expect(plan.prune).toEqual([]);
    expect(plan.kept).toEqual([]);
  });
});

describe("isNewerInCosmos", () => {
  it("compares times, and treats an unreadable time as newer", () => {
    expect(isNewerInCosmos(NEW, OLD)).toBe(true);
    expect(isNewerInCosmos(OLD, OLD)).toBe(false);
    expect(isNewerInCosmos(OLD, NEW)).toBe(false);
    expect(isNewerInCosmos(undefined, OLD)).toBe(true);
  });
});

describe("planContainer", () => {
  it("creates missing rows and overwrites rows that are not newer in Cosmos", () => {
    const plan = planContainer("projects", [doc("a"), doc("b", NEW)], [row("b", OLD)], flags());
    expect(plan.mode).toBe("upsert");
    expect(ids(plan.create)).toEqual(["a"]);
    expect(ids(plan.overwrite)).toEqual(["b"]);
  });

  it("skips a row edited in Cosmos after the backup", () => {
    const plan = planContainer("projects", [doc("a", OLD)], [row("a", NEW)], flags());
    expect(plan.overwrite).toEqual([]);
    expect(ids(plan.skipNewer)).toEqual(["a"]);
  });

  it("overwrites it with --force-overwrite and flags it", () => {
    const plan = planContainer(
      "projects",
      [doc("a", OLD)],
      [row("a", NEW)],
      flags(["--force-overwrite"]),
    );
    expect(ids(plan.overwrite)).toEqual(["a"]);
    expect(ids(plan.forcedNewer)).toEqual(["a"]);
  });

  it("never overwrites existing rows with --insert-only", () => {
    const plan = planContainer(
      "bookings",
      [doc("a"), doc("b", NEW)],
      [row("b")],
      flags(["--insert-only"]),
    );
    expect(plan.mode).toBe("insert-only");
    expect(ids(plan.create)).toEqual(["a"]);
    expect(ids(plan.skipExisting)).toEqual(["b"]);
    expect(plan.overwrite).toEqual([]);
  });

  it.each(["payments", "invoices", "quotes", "locks"])(
    "only creates in %s, whatever the flags",
    (id) => {
      const argv = ["--force-overwrite", "--prune", "--pre-cutover"];
      const plan = planContainer(id, [doc("a"), doc("b", NEW)], [row("b"), row("x")], flags(argv));
      expect(plan.mode).toBe("create-only");
      expect(ids(plan.create)).toEqual(["a"]);
      expect(ids(plan.skipExisting)).toEqual(["b"]);
      expect(plan.overwrite).toEqual([]);
      expect(plan.prune).toEqual([]);
      expect(ids(plan.kept)).toEqual(["x"]);
    },
  );

  it("prunes rows missing from the backup only with --prune", () => {
    const pruning = flags(["--prune", "--pre-cutover"]);
    expect(ids(planContainer("projects", [doc("a")], [row("a"), row("x")], pruning).prune)).toEqual(
      ["x"],
    );
    const plain = planContainer("projects", [doc("a")], [row("a"), row("x")], flags());
    expect(plain.prune).toEqual([]);
    expect(ids(plain.kept)).toEqual(["x"]);
  });

  it("keeps visitor submissions that are not in the backup, even with --prune", () => {
    const plan = planContainer("bookings", [], [row("x")], flags(["--prune", "--pre-cutover"]));
    expect(plan.prune).toEqual([]);
    expect(ids(plan.kept)).toEqual(["x"]);
  });
});

describe("afterPlan", () => {
  it("applies creates, overwrites and prunes to the current rows", () => {
    // b and x are not in the backup, so --prune removes them.
    const current = [
      { id: "a", v: 1 },
      { id: "b", v: 1 },
      { id: "x", v: 1 },
    ];
    const plan = planContainer(
      "projects",
      [doc("a", NEW), doc("c")],
      current.map((r) => row(r.id)),
      flags(["--prune", "--pre-cutover"]),
    );
    expect(afterPlan(current, plan)).toEqual([
      { id: "a", updatedAt: NEW },
      { id: "c", updatedAt: OLD },
    ]);
  });
});

describe("dataChecks", () => {
  const empty = { invoices: [], payments: [], quotes: [], locks: [], backupPayments: null };

  it("finds duplicate invoice numbers and unusable totals or currencies", () => {
    const result = dataChecks({
      ...empty,
      invoices: [
        { id: "i1", invoiceNumber: "INV-1", total: 100, currency: "GHS" },
        { id: "i2", invoiceNumber: "INV-1", total: 100, currency: "GHS" },
        { id: "i3", invoiceNumber: "INV-2", total: 0, currency: "GHS" },
        { id: "i4", invoiceNumber: "INV-3", total: "50", currency: "" },
      ],
    });
    expect(result.duplicateInvoiceNumbers).toEqual([{ invoiceNumber: "INV-1", ids: ["i1", "i2"] }]);
    expect(result.badInvoices).toEqual([
      { id: "i3", problems: ["total 0"] },
      { id: "i4", problems: ["total 50", "no currency"] },
    ]);
  });

  it("checks payments kept their Appwrite ids and references", () => {
    const result = dataChecks({
      ...empty,
      payments: [
        { id: "p1", paystackReference: "R1" },
        { id: "p2", paystackReference: "R9" },
      ],
      backupPayments: [
        { id: "p1", paystackReference: "R1" },
        { id: "p2", paystackReference: "R2" },
        { id: "p3", paystackReference: "R3" },
      ],
    });
    expect(result.paymentProblems.map((p) => p.id)).toEqual(["p2", "p3"]);
    expect(dataChecks(empty).paymentProblems).toBeNull();
  });

  it("finds quotes whose number has no lock row", () => {
    const result = dataChecks({
      ...empty,
      quotes: [
        { id: "q1", quoteNumber: "Q-2026-0001" },
        { id: "q2", quoteNumber: "Q-2026-0002" },
      ],
      locks: [{ id: lockId("quoteNumber:Q-2026-0001") }],
    });
    expect(result.quotesWithoutLock).toEqual([{ id: "q2", quoteNumber: "Q-2026-0002" }]);
  });

  it("builds the lock row the Cosmos quote repo would take", () => {
    expect(quoteNumberLock("Q-2026-0002", NEW)).toEqual({
      id: lockId("quoteNumber:Q-2026-0002"),
      key: "quoteNumber:Q-2026-0002",
      createdAt: NEW,
    });
  });
});
