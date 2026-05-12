import React, { useState } from "react";
import { FaTimes, FaPlus, FaTrash, FaPaperPlane } from "react-icons/fa";
import { createInvoice, updateInvoice } from "@/services/api/invoices";
import { apiUrl } from "@/utils/apiUrl";
import type { ProjectInquiry, InvoiceItem, Invoice } from "@/types";

const CURRENCIES = [
  { code: "GHS", symbol: "₵", label: "Ghanaian Cedi (GHS)" },
  { code: "USD", symbol: "$", label: "US Dollar (USD)" },
  { code: "GBP", symbol: "£", label: "British Pound (GBP)" },
  { code: "EUR", symbol: "€", label: "Euro (EUR)" },
  { code: "NGN", symbol: "₦", label: "Nigerian Naira (NGN)" },
  { code: "KES", symbol: "KSh", label: "Kenyan Shilling (KES)" },
];

interface Props {
  inquiry: ProjectInquiry;
  onClose: () => void;
  theme: "light" | "dark";
  existingInvoice?: Invoice;
}

const emptyItem = (): InvoiceItem => ({ description: "", quantity: 1, unitPrice: 0 });

export default function InvoiceModal({ inquiry, onClose, theme, existingInvoice }: Props) {
  const isUpdate = !!existingInvoice;

  const parseExistingItems = (): InvoiceItem[] => {
    if (!existingInvoice) return [{ description: inquiry.projectType, quantity: 1, unitPrice: 0 }];
    try {
      return typeof existingInvoice.items === "string"
        ? (JSON.parse(existingInvoice.items) as InvoiceItem[])
        : [{ description: inquiry.projectType, quantity: 1, unitPrice: 0 }];
    } catch {
      return [{ description: inquiry.projectType, quantity: 1, unitPrice: 0 }];
    }
  };

  const [currency, setCurrency] = useState(existingInvoice?.currency ?? "GHS");
  const [items, setItems] = useState<InvoiceItem[]>(parseExistingItems);
  const [taxRate, setTaxRate] = useState(
    existingInvoice && existingInvoice.subtotal > 0
      ? Math.round((existingInvoice.tax / existingInvoice.subtotal) * 100)
      : 0,
  );
  const [dueDate, setDueDate] = useState(existingInvoice?.dueDate ?? "");
  const [estimatedDelivery, setEstimatedDelivery] = useState(
    existingInvoice?.estimatedDelivery ?? "",
  );
  const [notes, setNotes] = useState(existingInvoice?.notes ?? "");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const sym = CURRENCIES.find((c) => c.code === currency)?.symbol || currency;

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  const updateItem = (idx: number, field: keyof InvoiceItem, value: string | number) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  const handleSend = async () => {
    if (items.some((i) => !i.description.trim())) {
      setError("All line items need a description.");
      return;
    }
    if (total <= 0) {
      setError("Total must be greater than 0.");
      return;
    }
    setSending(true);
    setError("");

    const invoiceNumber = isUpdate
      ? existingInvoice!.invoiceNumber
      : `INV-${Date.now().toString().slice(-6)}`;

    try {
      if (isUpdate) {
        await updateInvoice(existingInvoice!.$id, {
          items: JSON.stringify(items),
          currency,
          subtotal,
          tax,
          total,
          notes,
          dueDate,
          estimatedDelivery,
          status: existingInvoice!.status,
        });
      } else {
        await createInvoice({
          inquiryId: inquiry.$id,
          invoiceNumber,
          clientName: inquiry.name,
          clientEmail: inquiry.email,
          clientPhone: inquiry.phone,
          items: JSON.stringify(items),
          currency,
          subtotal,
          tax,
          total,
          notes,
          dueDate,
          estimatedDelivery,
          status: "sent",
        });
      }

      await fetch(apiUrl("/api/send-invoice"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber,
          clientName: inquiry.name,
          clientEmail: inquiry.email,
          clientPhone: inquiry.phone,
          items,
          currency,
          currencySymbol: sym,
          subtotal,
          tax,
          taxRate,
          total,
          dueDate,
          estimatedDelivery,
          notes,
          isUpdate,
        }),
      });

      setSent(true);
    } catch {
      setError(
        isUpdate
          ? "Failed to update invoice. Please try again."
          : "Failed to send invoice. Please try again.",
      );
    } finally {
      setSending(false);
    }
  };

  const inputClass =
    "px-3 py-2 rounded-lg text-[var(--text-primary)] outline-none text-sm transition-all focus:ring-1 focus:ring-oceanic-400/50";
  const inputStyle = {
    background: "var(--bg-primary)",
    border: "1px solid var(--border-subtle)",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
        style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-6"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              {isUpdate ? "Edit & Resend Invoice" : "Generate Invoice"}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              For {inquiry.name} &middot; {inquiry.email}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
          >
            <FaTimes />
          </button>
        </div>

        {sent ? (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
              <FaPaperPlane className="text-2xl text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
              {isUpdate ? "Invoice updated!" : "Invoice sent!"}
            </h3>
            <p className="text-[var(--text-secondary)] mb-6">
              {inquiry.name} will receive the {isUpdate ? "updated " : ""}invoice at {inquiry.email}
              .
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-xl font-semibold text-white"
              style={{ background: "linear-gradient(135deg, var(--accent-teal) 0%, #0d7a6e 100%)" }}
            >
              Done
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Currency */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className={`${inputClass} w-full`}
                style={inputStyle}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Line Items */}
            <div>
              <div className="mb-2">
                <label className="block text-sm font-medium text-[var(--text-primary)]">
                  Line Items
                </label>
                <p className={`text-xs mt-0.5`} style={{ color: "var(--text-secondary)" }}>
                  Each row is one service or deliverable. Qty × Price = Line Total.
                </p>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-[var(--text-secondary)] px-1">
                  <span className="col-span-5">What you're charging for</span>
                  <span className="col-span-2 text-center">Qty</span>
                  <span className="col-span-2 text-right">Price ({sym})</span>
                  <span className="col-span-2 text-right">Line Total</span>
                  <span className="col-span-1" />
                </div>
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <input
                      className={`${inputClass} col-span-5`}
                      style={inputStyle}
                      placeholder="e.g. Website Design"
                      value={item.description}
                      onChange={(e) => updateItem(idx, "description", e.target.value)}
                    />
                    <input
                      className={`${inputClass} col-span-2 text-center`}
                      style={inputStyle}
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))}
                    />
                    <input
                      className={`${inputClass} col-span-2 text-right`}
                      style={inputStyle}
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(idx, "unitPrice", Number(e.target.value))}
                    />
                    <div
                      className="col-span-2 text-right text-sm font-semibold px-1"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {sym}
                      {(item.quantity * item.unitPrice).toFixed(2)}
                    </div>
                    <button
                      onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                      className="col-span-1 flex justify-center text-red-400 hover:text-red-300 transition"
                      disabled={items.length === 1}
                    >
                      <FaTrash className="text-xs" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setItems((prev) => [...prev, emptyItem()])}
                  className="flex items-center gap-1.5 text-sm text-oceanic-400 hover:text-oceanic-300 transition mt-1"
                >
                  <FaPlus className="text-xs" /> Add another item
                </button>
              </div>
            </div>

            {/* Tax + Due Date + Estimated Delivery */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-0.5">
                  Tax / VAT Rate (%)
                </label>
                <p className="text-xs mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Leave 0 if not charging tax
                </p>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className={`${inputClass} w-full`}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-0.5">
                  Payment Due Date (optional)
                </label>
                <p className="text-xs mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Deadline for the client to pay
                </p>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={`${inputClass} w-full`}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-0.5">
                  Est. Delivery Date (optional)
                </label>
                <p className="text-xs mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  When project / first phase is done
                </p>
                <input
                  type="date"
                  value={estimatedDelivery}
                  onChange={(e) => setEstimatedDelivery(e.target.value)}
                  className={`${inputClass} w-full`}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Summary */}
            <div
              className="rounded-xl p-4 space-y-2 text-sm"
              style={{ background: "var(--bg-primary)" }}
            >
              <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
                INVOICE SUMMARY
              </p>
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>
                  Subtotal <span className="text-xs opacity-70">(sum of all line totals)</span>
                </span>
                <span>
                  {sym}
                  {subtotal.toFixed(2)}
                </span>
              </div>
              {taxRate > 0 && (
                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>
                    Tax ({taxRate}%){" "}
                    <span className="text-xs opacity-70">(added on top of subtotal)</span>
                  </span>
                  <span>
                    {sym}
                    {tax.toFixed(2)}
                  </span>
                </div>
              )}
              <div
                className="flex justify-between font-bold text-[var(--text-primary)] text-base pt-2"
                style={{ borderTop: "1px solid var(--border-subtle)" }}
              >
                <span>
                  Total <span className="text-xs font-normal opacity-60">(amount client pays)</span>
                </span>
                <span>
                  {sym}
                  {total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Payment instructions, bank details, thank you note..."
                className={`${inputClass} w-full`}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              onClick={handleSend}
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, var(--accent-teal) 0%, #0d7a6e 100%)" }}
            >
              <FaPaperPlane />
              {sending
                ? isUpdate
                  ? "Updating..."
                  : "Sending..."
                : isUpdate
                  ? `Update & Resend to ${inquiry.name}`
                  : `Send Invoice to ${inquiry.name}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
