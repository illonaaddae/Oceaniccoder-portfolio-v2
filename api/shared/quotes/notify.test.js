// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

const M = await import("./model.js");
const { createNotifier } = await import("./notify.js");

const quote = (status) => ({
  id: "q1",
  quoteNumber: "Q-2026-0001",
  status,
  revision: 1,
  clientName: "Prince Ofori",
  clientEmail: "kofi@example.com",
  currency: "GHS",
  title: "Tour site",
  items: [{ id: "item-1", description: "Website", qty: 1, unitMinor: 100000 }],
  discountMinor: 0,
  subtotalMinor: 100000,
  totalMinor: 100000,
  schedule: M.DEFAULT_SCHEDULE,
  validDays: 14,
  sentAt: "2026-10-10T09:00:00.000Z",
  validUntil: "2026-10-24T09:00:00.000Z",
  payState: { due: {} },
});

describe("notify.quoteEmailAgain", () => {
  it("sends the quote email to the given address, not the client's", async () => {
    const send = vi.fn().mockResolvedValue({ ok: true });
    const n = createNotifier({ send, base: "https://oceaniccoder.dev" });
    const r = await n.quoteEmailAgain(quote("sent"), "tok", [], "prince_ofori@hotmail.com");
    expect(r.ok).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    const mail = send.mock.calls[0][0];
    expect(mail.to).toBe("prince_ofori@hotmail.com");
    expect(mail.subject).toMatch(/quote from OceanicCoder: Tour site/i);
    expect(mail.html).toContain("https://oceaniccoder.dev/q/tok");
  });

  it("uses the accepted-quote email once the client has accepted", async () => {
    const send = vi.fn().mockResolvedValue({ ok: true });
    const n = createNotifier({ send, base: "https://oceaniccoder.dev" });
    const q = quote("accepted");
    const stages = M.stageStates(q, [], Date.parse("2026-10-11T09:00:00.000Z"));
    await n.quoteEmailAgain(q, "tok", stages, "prince_ofori@hotmail.com");
    const expected = vi.fn().mockResolvedValue({ ok: true });
    await createNotifier({ send: expected, base: "https://oceaniccoder.dev" }).quoteAccepted(
      { ...q, clientEmail: "prince_ofori@hotmail.com" },
      "tok",
      stages,
    );
    expect(send.mock.calls[0][0].subject).toBe(expected.mock.calls[0][0].subject);
  });

  it("returns a failure instead of throwing when sending fails", async () => {
    const send = vi.fn().mockRejectedValue(new Error("network down"));
    const r = await createNotifier({ send }).quoteEmailAgain(quote("sent"), "tok", [], "a@b.co");
    expect(r).toEqual({ ok: false, error: "network down" });
  });
});
