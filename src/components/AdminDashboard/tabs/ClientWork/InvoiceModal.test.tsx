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

  describe("when send-invoice refuses", () => {
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
    const resend = async (status: number, error: string) => {
      updateInvoice.mockResolvedValue({});
      global.fetch = vi
        .fn()
        .mockResolvedValue({ ok: false, status, json: async () => ({ error }) });
      render(
        <InvoiceModal
          inquiry={inquiry}
          onClose={vi.fn()}
          theme="dark"
          existingInvoice={existing}
        />,
      );
      await userEvent.click(screen.getByRole("button", { name: /update & resend/i }));
      return screen.findByRole("alert");
    };

    it("passes on why the saved invoice can't be sent (409) and where to send it again", async () => {
      const error =
        "Two invoices share the number INV-948213, so its pay link can't open. Nothing was sent.";
      const alert = await resend(409, error);
      expect(alert).toHaveTextContent(
        `Invoice INV-948213 was saved but not emailed. ${error} Fix that, then send it again with Edit & Resend in Client Work.`,
      );
      expect(screen.queryByText("Invoice sent!")).toBeNull();
    });

    it("says sending is unavailable for now (503) and that the client wasn't told", async () => {
      const error = "Invoice links are unavailable right now. Please try again later.";
      const alert = await resend(503, error);
      expect(alert).toHaveTextContent(
        `Invoice INV-948213 was saved but not emailed, because sending is unavailable right now: ${error} The client has NOT been notified. Send it again later with Edit & Resend in Client Work.`,
      );
    });

    it("ends a server reason that has no full stop with one", async () => {
      const alert = await resend(503, "Not configured");
      expect(alert).toHaveTextContent(
        "right now: Not configured. The client has NOT been notified.",
      );
    });

    it("keeps the general message for other failures", async () => {
      const alert = await resend(502, "Failed to send invoice");
      expect(alert).toHaveTextContent(
        "Invoice INV-948213 was saved, but the email failed to send (502: Failed to send invoice).",
      );
    });
  });

  it("never creates a second invoice when the email fails after the first was saved", async () => {
    createInvoice.mockResolvedValue({
      $id: "inv9",
      invoiceNumber: "INV-2026-0008",
      status: "sent",
    });
    updateInvoice.mockResolvedValue({});
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: "Not configured" }),
    });
    render(<InvoiceModal inquiry={inquiry} onClose={vi.fn()} theme="dark" />);
    const [, price] = screen.getAllByRole("spinbutton");
    await userEvent.clear(price);
    await userEvent.type(price, "500");
    await userEvent.click(screen.getByRole("button", { name: /send invoice to ama owusu/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("INV-2026-0008 was saved");

    // Trying again updates and resends the invoice that was saved.
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    await userEvent.click(screen.getByRole("button", { name: /update & resend to ama owusu/i }));
    // The client gets it for the first time, so it reads as sent.
    expect(await screen.findByText("Invoice sent!")).toBeInTheDocument();
    expect(createInvoice).toHaveBeenCalledTimes(1);
    expect(updateInvoice).toHaveBeenCalledWith("inv9", expect.objectContaining({ total: 500 }));
    expect(sentInvoiceNumber()).toBe("INV-2026-0008");
  });
});
