import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const getInvoices = vi.fn();
vi.mock("@/services/api/inquiries", () => ({
  getInquiries: vi.fn(async () => [inquiry]),
  updateInquiry: vi.fn(async () => ({})),
  deleteInquiry: vi.fn(async () => ({})),
}));
vi.mock("@/services/api/invoices", () => ({ getInvoices: () => getInvoices() }));
vi.mock("@/services/api/adminHeaders", () => ({ adminHeaders: async () => ({}) }));

import ClientWorkTab from "./ClientWorkTab";

const inquiry = {
  $id: "inq1",
  $createdAt: "2026-10-10T00:00:00Z",
  name: "Ama Owusu",
  email: "ama@example.com",
  phone: "0241234567",
  projectType: "Online store",
  status: "quoted",
  timeline: "1 month",
  budget: "GHS 9,000",
  description: "A store",
};

beforeEach(() => {
  getInvoices.mockResolvedValue([]);
  global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
});

describe("ClientWorkTab", () => {
  it("offers Create quote as the action, with no Generate Invoice", async () => {
    const onCreateQuote = vi.fn();
    render(<ClientWorkTab theme="dark" onCreateQuote={onCreateQuote} />);
    await userEvent.click(await screen.findByRole("button", { name: /create quote/i }));
    expect(onCreateQuote).toHaveBeenCalledWith(expect.objectContaining({ $id: "inq1" }));
    expect(screen.queryByText(/generate invoice/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/new invoice/i)).not.toBeInTheDocument();
  });

  it("keeps Edit & Resend for an inquiry that already has an invoice", async () => {
    getInvoices.mockResolvedValue([
      { $id: "i1", inquiryId: "inq1", invoiceNumber: "INV-2026-0001", status: "sent" },
    ]);
    render(<ClientWorkTab theme="dark" onCreateQuote={vi.fn()} />);
    expect(await screen.findByText("INV-2026-0001")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /edit & resend/i })).toBeInTheDocument();
  });

  it("skips an archived invoice when showing an inquiry's latest invoice", async () => {
    getInvoices.mockResolvedValue([
      {
        $id: "i2",
        inquiryId: "inq1",
        invoiceNumber: "INV-2026-0002",
        status: "sent",
        archivedAt: "2026-10-11T00:00:00Z",
      },
      { $id: "i1", inquiryId: "inq1", invoiceNumber: "INV-2026-0001", status: "sent" },
    ]);
    render(<ClientWorkTab theme="dark" onCreateQuote={vi.fn()} />);
    expect(await screen.findByText("INV-2026-0001")).toBeInTheDocument();
    expect(screen.queryByText("INV-2026-0002")).toBeNull();
  });

  it("emails the client when an inquiry is marked won", async () => {
    render(<ClientWorkTab theme="dark" onCreateQuote={vi.fn()} />);
    await userEvent.click(await screen.findByRole("combobox", { name: /change status/i }));
    await userEvent.click(await screen.findByRole("option", { name: "Won" }));
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/send-inquiry-status"),
        expect.objectContaining({ body: expect.stringContaining('"status":"won"') }),
      ),
    );
  });
});
