// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

const { createStandaloneInvoice, standaloneInvoiceNumber } = await import("./numbers.js");
const { createCosmosLocks } = await import("../locks.js");
const { createFakeCosmos } = await import("../fakeCosmos.js");
const { lockId } = await import("../tokens.js");

function setup() {
  const db = createFakeCosmos();
  const locks = createCosmosLocks(db);
  const invoices = db.container("invoices");
  let n = 0;
  const create = (fields = {}, year = 2026) =>
    createStandaloneInvoice(invoices, locks, { id: `new${++n}`, ...fields }, year);
  return { db, locks, invoices, create };
}

describe("standaloneInvoiceNumber", () => {
  it("pads the count to four digits", () => {
    expect(standaloneInvoiceNumber(2026, 8)).toBe("INV-2026-0008");
    expect(standaloneInvoiceNumber(2027, 1234)).toBe("INV-2027-1234");
  });
});

describe("createStandaloneInvoice", () => {
  it("numbers the first invoice of a year 0001 and reserves it with a lock", async () => {
    const { db, create } = setup();
    const inv = await create({ clientName: "Ama" });
    expect(inv).toMatchObject({ id: "new1", clientName: "Ama", invoiceNumber: "INV-2026-0001" });
    expect(db.container("locks").docs.has(lockId("invoiceNumber:INV-2026-0001"))).toBe(true);
  });

  it("counts on from the highest number that year", async () => {
    const { invoices, create } = setup();
    invoices.seed({ id: "a", invoiceNumber: "INV-2026-0007" });
    invoices.seed({ id: "b", invoiceNumber: "INV-2026-0003" });
    expect((await create()).invoiceNumber).toBe("INV-2026-0008");
    expect((await create()).invoiceNumber).toBe("INV-2026-0009");
  });

  it("ignores old six-digit numbers and quote stage numbers", async () => {
    const { invoices, create } = setup();
    invoices.seed({ id: "old", invoiceNumber: "INV-948213" });
    invoices.seed({ id: "stage", invoiceNumber: "Q-2026-0004-INV-2" });
    expect((await create()).invoiceNumber).toBe("INV-2026-0001");
  });

  it("starts again at 0001 in a new year", async () => {
    const { invoices, create } = setup();
    invoices.seed({ id: "a", invoiceNumber: "INV-2026-0042" });
    expect((await create({}, 2027)).invoiceNumber).toBe("INV-2027-0001");
    expect((await create({}, 2026)).invoiceNumber).toBe("INV-2026-0043");
  });

  it("replaces a number sent with the row", async () => {
    const { create } = setup();
    expect((await create({ invoiceNumber: "INV-123456" })).invoiceNumber).toBe("INV-2026-0001");
  });

  it("never gives two invoices created at once the same number", async () => {
    const { invoices, create } = setup();
    invoices.seed({ id: "a", invoiceNumber: "INV-2026-0007" });
    const created = await Promise.all([create(), create(), create()]);
    expect(created.map((inv) => inv.invoiceNumber).sort()).toEqual([
      "INV-2026-0008",
      "INV-2026-0009",
      "INV-2026-0010",
    ]);
    expect(invoices.docs.size).toBe(4);
  });

  it("skips a number whose reservation is already taken", async () => {
    const { locks, create } = setup();
    await locks.take("invoiceNumber:INV-2026-0001");
    expect((await create()).invoiceNumber).toBe("INV-2026-0002");
  });

  it("gives up after 50 held numbers and writes nothing", async () => {
    const { locks, invoices, create } = setup();
    for (let n = 1; n <= 50; n++) {
      await locks.take(`invoiceNumber:INV-2026-${String(n).padStart(4, "0")}`);
    }
    await expect(create()).rejects.toThrow("Could not allocate an invoice number");
    expect(invoices.docs.size).toBe(0);
  });

  it("frees the number when the invoice write fails", async () => {
    const { locks, invoices, create } = setup();
    invoices.hooks.beforeCreate = async () => {
      throw Object.assign(new Error("throttled"), { code: 429 });
    };
    await expect(create()).rejects.toThrow("throttled");
    expect(await locks.take("invoiceNumber:INV-2026-0001")).toBe(true);
  });

  it("keeps working after five unclear failures in a row", async () => {
    const { locks, invoices, create } = setup();
    let failures = 5;
    invoices.hooks.beforeCreate = async () => {
      if (failures-- > 0) throw Object.assign(new Error("service unavailable"), { code: 503 });
    };
    for (let n = 0; n < 5; n++) await expect(create()).rejects.toThrow("service unavailable");
    expect((await create()).invoiceNumber).toBe("INV-2026-0006");
    expect(await locks.take("invoiceNumber:INV-2026-0005")).toBe(false);
  });

  it.each([
    ["a missing container (404)", 404],
    ["a bad key (401)", 401],
  ])("frees the number after %s", async (_label, code) => {
    const { locks, invoices, create } = setup();
    invoices.hooks.beforeCreate = async () => {
      throw Object.assign(new Error("refused"), { code });
    };
    await expect(create()).rejects.toThrow("refused");
    expect(await locks.take("invoiceNumber:INV-2026-0001")).toBe(true);
  });

  it("keeps the number reserved when the write may have been saved", async () => {
    const { locks, invoices, create } = setup();
    invoices.hooks.beforeCreate = async () => {
      throw Object.assign(new Error("service unavailable"), { code: 503 });
    };
    await expect(create()).rejects.toThrow("service unavailable");
    expect(await locks.take("invoiceNumber:INV-2026-0001")).toBe(false);
  });

  it("reports the write error even when freeing the number fails", async () => {
    const db = createFakeCosmos();
    const invoices = db.container("invoices");
    invoices.hooks.beforeCreate = async () => {
      throw Object.assign(new Error("write failed"), { code: 400 });
    };
    const locks = {
      take: vi.fn().mockResolvedValue(true),
      release: vi.fn().mockRejectedValue(new Error("release failed")),
    };
    await expect(createStandaloneInvoice(invoices, locks, { id: "x" }, 2026)).rejects.toThrow(
      "write failed",
    );
    expect(locks.release).toHaveBeenCalledWith("invoiceNumber:INV-2026-0001");
  });
});
