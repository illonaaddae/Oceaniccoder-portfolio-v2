import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const createInvoice = vi.fn();
const updateInvoice = vi.fn();
vi.mock("@/services/api/invoices", () => ({
  createInvoice: (...args: unknown[]) => createInvoice(...args),
  updateInvoice: (...args: unknown[]) => updateInvoice(...args),
}));
vi.mock("@/services/api/adminHeaders", () => ({ adminHeaders: async () => ({}) }));

import InvoiceModal from "./InvoiceModal";
import type { Invoice, ProjectInquiry } from "@/types";

const inquiry = {
  $id: "inq1",
  name: "Ama Owusu",
  email: "ama@example.com",
  phone: "0241234567",
  projectType: "Online store",
} as ProjectInquiry;

function sentInvoiceNumber() {
  const [, init] = vi.mocked(global.fetch).mock.calls[0];
  return JSON.parse(String(init?.body)).invoiceNumber;
}

beforeEach(() => {
  createInvoice.mockReset();
  updateInvoice.mockReset();
  global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
});

describe("InvoiceModal", () => {
  it("sends a new invoice under the number the server assigned", async () => {
    createInvoice.mockResolvedValue({ $id: "inv9", invoiceNumber: "INV-2026-0008" });
    render(<InvoiceModal inquiry={inquiry} onClose={vi.fn()} theme="dark" />);
    const [, price] = screen.getAllByRole("spinbutton");
    await userEvent.clear(price);
    await userEvent.type(price, "500");
    await userEvent.click(screen.getByRole("button", { name: /send invoice to ama owusu/i }));

    expect(await screen.findByText("Invoice sent!")).toBeInTheDocument();
    expect(createInvoice).toHaveBeenCalledTimes(1);
    expect(createInvoice.mock.calls[0][0]).not.toHaveProperty("invoiceNumber");
    expect(sentInvoiceNumber()).toBe("INV-2026-0008");
  });

  it("resends an edited invoice under its own number", async () => {
    updateInvoice.mockResolvedValue({});
    const existing = {
      $id: "inv1",
      invoiceNumber: "INV-948213",
      items: JSON.stringify([{ description: "Online store", quantity: 1, unitPrice: 500 }]),
      currency: "GHS",
      subtotal: 500,
      tax: 0,
      total: 500,
      status: "sent",
    } as Invoice;
    render(
      <InvoiceModal inquiry={inquiry} onClose={vi.fn()} theme="dark" existingInvoice={existing} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /update & resend/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    expect(createInvoice).not.toHaveBeenCalled();
    expect(updateInvoice.mock.calls[0][1]).not.toHaveProperty("invoiceNumber");
    expect(sentInvoiceNumber()).toBe("INV-948213");
  });
});
