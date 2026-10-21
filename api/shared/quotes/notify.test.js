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

  it("sends the stage invoice, not the deposit email, once the deposit is paid", async () => {
    const send = vi.fn().mockResolvedValue({ ok: true });
    const q = {
      ...quote("accepted"),
      respondedAt: "2026-10-11T09:00:00.000Z",
      payState: { due: { balance: "2026-11-01T09:00:00.000Z" } },
    };
    const paid = [{ stageId: "deposit", status: "success", paidAt: "2026-10-12T09:00:00.000Z" }];
    const stages = M.stageStates(q, paid, Date.parse("2026-11-02T09:00:00.000Z"));
    await createNotifier({ send, base: "https://oceaniccoder.dev" }).quoteEmailAgain(
      q,
      "tok",
      stages,
      "prince_ofori@hotmail.com",
    );
    const mail = send.mock.calls[0][0];
    expect(mail.subject).toMatch(/^Invoice Q-2026-0001-INV-2: Balance/);
    expect(mail.text).not.toMatch(/pay the deposit/i);
  });

  it("sends nothing for an accepted quote with nothing due", async () => {
    const send = vi.fn();
    const q = { ...quote("accepted"), respondedAt: "2026-10-11T09:00:00.000Z" };
    const paid = [{ stageId: "deposit", status: "success", paidAt: "2026-10-12T09:00:00.000Z" }];
    const stages = M.stageStates(q, paid, Date.parse("2026-11-02T09:00:00.000Z"));
    const r = await createNotifier({ send }).quoteEmailAgain(q, "tok", stages, "a@b.co");
    expect(r.ok).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  it("returns a failure instead of throwing when sending fails", async () => {
    const send = vi.fn().mockRejectedValue(new Error("network down"));
    const r = await createNotifier({ send }).quoteEmailAgain(quote("sent"), "tok", [], "a@b.co");
    expect(r).toEqual({ ok: false, error: "network down" });
  });
});

describe("one-time link codes", () => {
  const BASE = "https://oceaniccoder.dev";
  const links = (text) => text.match(/https:\/\/oceaniccoder\.dev\/q\/\S+/g) || [];

  it("puts the code on the quote link, in the html and the text", async () => {
    const send = vi.fn().mockResolvedValue({ ok: true });
    await createNotifier({ send, base: BASE }).quoteSent(quote("sent"), "tok", "CODE1");
    const mail = send.mock.calls[0][0];
    expect(mail.html).toContain(`${BASE}/q/tok#k=CODE1`);
    expect(links(mail.text)).toEqual([`${BASE}/q/tok#k=CODE1`]);
  });

  it("puts the code on the pay and invoice links of a payment request", async () => {
    const send = vi.fn().mockResolvedValue({ ok: true });
    const q = {
      ...quote("accepted"),
      respondedAt: "2026-10-11T09:00:00.000Z",
      payState: { due: { balance: "2026-11-01T09:00:00.000Z" } },
    };
    const stages = M.stageStates(q, [], Date.parse("2026-11-02T09:00:00.000Z"));
    await createNotifier({ send, base: BASE }).paymentRequest(q, stages[1], "tok", stages, "C2");
    const { html, text } = send.mock.calls[0][0];
    expect(html).toContain(`${BASE}/q/tok/pay/balance#k=C2`);
    expect(html).toContain(`${BASE}/q/tok/invoice/balance#k=C2`);
    expect(links(text).length).toBeGreaterThan(0);
    expect(links(text).every((l) => l.endsWith("#k=C2"))).toBe(true);
  });

  it("puts the code on every link of an accepted quote emailed again", async () => {
    const send = vi.fn().mockResolvedValue({ ok: true });
    const q = quote("accepted");
    const stages = M.stageStates(q, [], Date.parse("2026-10-11T09:00:00.000Z"));
    await createNotifier({ send, base: BASE }).quoteEmailAgain(q, "tok", stages, "a@b.co", "C3");
    const { text } = send.mock.calls[0][0];
    expect(links(text).length).toBeGreaterThan(0);
    expect(links(text).every((l) => l.endsWith("#k=C3"))).toBe(true);
  });

  it("leaves the links bare without a code", async () => {
    const send = vi.fn().mockResolvedValue({ ok: true });
    await createNotifier({ send, base: BASE }).quoteEmailAgain(quote("sent"), "tok", [], "a@b.co");
    expect(send.mock.calls[0][0].text).not.toContain("#k=");
  });

  it("tells the client's own copy it opens straight away", async () => {
    const send = vi.fn().mockResolvedValue({ ok: true });
    const n = createNotifier({ send, base: BASE });
    await n.quoteEmailAgain(quote("sent"), "tok", [], "kofi@example.com", "C4");
    expect(send.mock.calls[0][0].text).toContain("Nothing else is needed to open it");
  });

  it("tells an extra address the link asks for a code sent to the client", async () => {
    const send = vi.fn().mockResolvedValue({ ok: true });
    const n = createNotifier({ send, base: BASE });
    await n.quoteEmailAgain(quote("sent"), "tok", [], "a@b.co", null, true);
    const { html, text } = send.mock.calls[0][0];
    for (const body of [html, text]) {
      expect(body).toContain("This link asks for a short code that we email to Prince.");
      expect(body).not.toContain("Nothing else is needed");
      expect(body).not.toContain("kofi@example.com");
    }
  });
});
