import { describe, it, expect } from "vitest";
import { draftFromInquiry, emptyDraft } from "./draftFromInquiry";
import type { ProjectInquiry } from "@/types";

describe("draftFromInquiry", () => {
  it("copies the client and seeds items from the inquiry", () => {
    const inquiry = {
      $id: "inq-1",
      name: "Kofi Mensah",
      email: "kofi@example.com",
      phone: "+233200000000",
      projectType: "E-commerce website",
      description: "Sell shoes online",
      timeline: "1-2 months",
      features: ["Payments", "Inventory"],
      needsDomain: true,
      domainExtension: ".com",
      needsHosting: true,
      status: "new",
    } as unknown as ProjectInquiry;
    const d = draftFromInquiry(inquiry);
    expect(d).toMatchObject({
      clientName: "Kofi Mensah",
      clientEmail: "kofi@example.com",
      inquiryId: "inq-1",
      title: "E-commerce website",
      currency: "GHS",
    });
    expect(d.items.map((i) => i.description)).toEqual([
      "E-commerce website",
      "Domain registration (.com), 1 year",
      "Hosting setup",
    ]);
    expect(d.overview).toContain("Sell shoes online");
    expect(d.scope).toContain("- Payments");
    expect(d.items.every((i) => /^[a-z0-9-]{1,24}$/.test(i.id))).toBe(true);
  });
  it("gives a blank draft the defaults", () => {
    expect(emptyDraft()).toMatchObject({
      currency: "GHS",
      validDays: 14,
      schedule: [{ percent: 60 }, { percent: 40 }],
    });
  });
});
