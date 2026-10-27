import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import CardPayment from "./CardPayment";

const invoice = {
  invoiceNumber: "INV-2026-0042",
  clientEmail: "ama@example.com",
  total: 1500,
  currency: "GHS",
  clientName: "Ama Owusu",
};

describe("CardPayment card preview", () => {
  it("shows what is being paid instead of a blank card", () => {
    const { container } = render(<CardPayment invoice={invoice} onSuccess={() => {}} />);
    // The holder and invoice number appear only on the card; the amount is
    // also on the Pay button, so it is checked alongside them.
    const card = container.textContent;
    expect(card).toContain("₵1,500.00");
    expect(card).toContain("Amount due");
    expect(card).toContain("Ama Owusu");
    expect(card).toContain("Invoice");
    expect(card).toContain("INV-2026-0042");
  });

  it("draws no card network mark or expiry placeholder", () => {
    const { container } = render(<CardPayment invoice={invoice} onSuccess={() => {}} />);
    expect(container.textContent).not.toContain("VISA");
    expect(container.textContent).not.toContain("MM/YY");
  });
});
