import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { EmailPreviewList, EmailPreviewMail } from "@/services/api/quotes";

type Response = EmailPreviewList & EmailPreviewMail;

const LIST: EmailPreviewList = {
  from: "invoices@send.oceaniccoder.dev",
  templates: [
    {
      id: "quoteSent",
      group: "clients",
      name: "Quote ready",
      when: "You send a quote",
      subject: "Your quote",
    },
    {
      id: "paymentReceipt",
      group: "clients",
      name: "Stage receipt",
      when: "A quote payment is confirmed",
      subject: "Your receipt",
    },
    {
      id: "webhookFailed",
      group: "admin",
      name: "Webhook not processed",
      when: "A Paystack webhook can't be processed",
      subject: "Action needed",
    },
  ],
};

const defaultFetch = async (name?: string): Promise<Response> =>
  name ? { subject: `Subject ${name}`, html: "<p>hi</p>", text: `text ${name}` } : LIST;
let fetchImpl: (name?: string) => Promise<Response> = defaultFetch;
const fetchEmailPreview = vi.fn((name?: string) => fetchImpl(name));
let sendImpl: (name: string) => Promise<{ sent: boolean; to: string }> = async () => ({
  sent: true,
  to: "admin@oceaniccoder.dev",
});
const sendTestEmail = vi.fn((n: string) => sendImpl(n));
vi.mock("@/services/api/quotes", () => ({
  fetchEmailPreview: (n?: string) => fetchEmailPreview(n),
  sendTestEmail: (n: string) => sendTestEmail(n),
}));

import EmailsTab, { withAppearance } from "./EmailsTab";

const row = (name: RegExp) => screen.findByRole("button", { name });

describe("EmailsTab", () => {
  beforeEach(() => {
    fetchImpl = defaultFetch;
    sendImpl = async () => ({ sent: true, to: "admin@oceaniccoder.dev" });
    sendTestEmail.mockClear();
    try {
      localStorage.clear();
    } catch {
      /* storage unavailable */
    }
  });

  it("groups emails by audience with counts, names and triggers", async () => {
    render(<EmailsTab theme="dark" />);
    const clients = await screen.findByRole("region", { name: /to clients/i });
    expect(within(clients).getByText("Quote ready")).toBeInTheDocument();
    expect(within(clients).getByText("You send a quote")).toBeInTheDocument();
    expect(within(clients).getByText("2")).toBeInTheDocument();
    const admin = screen.getByRole("region", { name: /to you/i });
    expect(within(admin).getByText("Webhook not processed")).toBeInTheDocument();
  });

  it("previews the selected email with its sender and sends a test", async () => {
    render(<EmailsTab theme="dark" />);
    expect(await screen.findByText("Subject quoteSent")).toBeInTheDocument();
    expect(screen.getByText(/OceanicCoder <invoices@send.oceaniccoder.dev>/)).toBeInTheDocument();
    await userEvent.click(await row(/stage receipt/i));
    expect(await screen.findByText("Subject paymentReceipt")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /stage receipt/i })).toHaveAttribute(
      "aria-current",
      "true",
    );
    await userEvent.click(screen.getByRole("button", { name: /send me a test/i }));
    await waitFor(() => expect(sendTestEmail).toHaveBeenCalledWith("paymentReceipt"));
    expect(await screen.findByText(/sent to admin@oceaniccoder.dev/i)).toBeInTheDocument();
  });

  it("renders the preview in a sandboxed iframe and switches to mobile width", async () => {
    render(<EmailsTab theme="dark" />);
    const frame = await screen.findByTitle("Preview: Quote ready");
    expect(frame.getAttribute("sandbox")).toBe("");
    expect(frame.getAttribute("srcdoc")).toContain("<p>hi</p>");
    await userEvent.click(screen.getByRole("button", { name: /mobile width/i }));
    expect(screen.getByRole("button", { name: /mobile width/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTitle("Preview: Quote ready").className).toContain("w-[390px]");
  });

  it("previews the email as a dark mail app would show it", async () => {
    render(<EmailsTab theme="light" />);
    await screen.findByTitle("Preview: Quote ready");
    await userEvent.click(screen.getByRole("button", { name: /dark mail app/i }));
    expect(screen.getByRole("button", { name: /dark mail app/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("forces the email's dark styles on or off whatever the OS is set to", () => {
    const html = "<style>@media (prefers-color-scheme:dark){body{background:#000}}</style>";
    expect(withAppearance(html, "dark")).toContain("@media all{body");
    expect(withAppearance(html, "light")).toContain("@media not all{body");
  });

  it("scales the desktop preview down to fit a narrow pane, but not the mobile one", async () => {
    let report: (width: number) => void = () => {};
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(cb: (entries: { contentRect: { width: number } }[]) => void) {
          report = (width) => cb([{ contentRect: { width } }]);
        }
        observe() {}
        disconnect() {}
      },
    );
    try {
      render(<EmailsTab theme="dark" />);
      const frame = await screen.findByTitle("Preview: Quote ready");
      act(() => report(320));
      expect(frame.style.transform).toBe("scale(0.5)");
      expect(frame.style.width).toBe("640px");
      // Scaled down, the frame is twice as tall so the visible box stays full,
      // and the wrapper clips what the transform leaves outside it.
      expect(frame.style.height).toBe("200%");
      expect(frame.parentElement?.className).toContain("overflow-hidden");
      act(() => report(800));
      expect(frame.style.transform).toBe("");
      act(() => report(320));
      await userEvent.click(screen.getByRole("button", { name: /mobile width/i }));
      expect(screen.getByTitle("Preview: Quote ready").style.transform).toBe("");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("shows the plain-text version", async () => {
    render(<EmailsTab theme="dark" />);
    await screen.findByText("Subject quoteSent");
    await userEvent.click(screen.getByRole("button", { name: /plain text/i }));
    expect(screen.getByText("text quoteSent")).toBeInTheDocument();
  });

  it("collapses a group that holds no selection", async () => {
    render(<EmailsTab theme="dark" />);
    await screen.findByText("Webhook not processed");
    const toggle = screen.getByRole("button", { name: /to you/i });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Webhook not processed")).not.toBeVisible();
  });

  it("ignores a stale preview that resolves after a newer selection", async () => {
    let resolveA: (v: Response) => void = () => {};
    fetchImpl = (name) => {
      if (!name) return Promise.resolve(LIST);
      if (name === "quoteSent") return new Promise<Response>((res) => (resolveA = res));
      return Promise.resolve({ subject: "Subject B", html: "<p>b</p>", text: "b" });
    };
    render(<EmailsTab theme="dark" />);
    await userEvent.click(await row(/stage receipt/i));
    expect(await screen.findByText("Subject B")).toBeInTheDocument();
    resolveA({ subject: "Subject A", html: "<p>a</p>", text: "a" });
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.getByText("Subject B")).toBeInTheDocument();
    expect(screen.queryByText("Subject A")).not.toBeInTheDocument();
  });

  it("shows an alert when the list fails to load", async () => {
    // A thenable that rejects: a vi.fn returning a real rejected promise fails the run.
    fetchImpl = () =>
      ({
        then: () => Promise.reject(new Error("boom list")),
      }) as unknown as Promise<Response>;
    render(<EmailsTab theme="dark" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("boom list");
    expect(screen.getByText("No emails found.")).toBeInTheDocument();
  });

  it("disables the send button while sending", async () => {
    let finish: (v: { sent: boolean; to: string }) => void = () => {};
    sendImpl = () => new Promise((res) => (finish = res));
    render(<EmailsTab theme="dark" />);
    await screen.findByText("Subject quoteSent");
    await userEvent.click(screen.getByRole("button", { name: /send me a test/i }));
    const btn = await screen.findByRole("button", { name: /sending/i });
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    expect(sendTestEmail).toHaveBeenCalledTimes(1);
    finish({ sent: true, to: "x@y.z" });
    expect(await screen.findByText(/sent to x@y.z/i)).toBeInTheDocument();
  });
});
