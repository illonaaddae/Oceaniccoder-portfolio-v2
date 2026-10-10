import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

type Preview = { templates?: string[]; subject?: string; html?: string; text?: string };
const defaultFetch = async (name?: string): Promise<Preview> =>
  name
    ? { subject: `Subject ${name}`, html: "<p>hi</p>", text: "hi" }
    : { templates: ["quoteSent", "paymentReceipt"] };
let fetchImpl: (name?: string) => Promise<Preview> = defaultFetch;
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

import EmailsTab from "./EmailsTab";

describe("EmailsTab", () => {
  beforeEach(() => {
    fetchImpl = defaultFetch;
    sendImpl = async () => ({ sent: true, to: "admin@oceaniccoder.dev" });
    sendTestEmail.mockClear();
  });

  it("previews the selected template and sends a test", async () => {
    render(<EmailsTab theme="dark" />);
    expect(await screen.findByText("Subject quoteSent")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "paymentReceipt" }));
    expect(await screen.findByText("Subject paymentReceipt")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /send test to me/i }));
    await waitFor(() => expect(sendTestEmail).toHaveBeenCalledWith("paymentReceipt"));
    expect(await screen.findByText(/sent to admin@oceaniccoder.dev/i)).toBeInTheDocument();
  });

  it("renders the preview in a sandboxed iframe with the html", async () => {
    render(<EmailsTab theme="dark" />);
    const frame = await screen.findByTitle("quoteSent preview");
    expect(frame.getAttribute("sandbox")).toBe("");
    expect(frame.getAttribute("srcdoc")).toContain("<p>hi</p>");
  });

  it("ignores a stale preview that resolves after a newer selection", async () => {
    let resolveA: (v: Preview) => void = () => {};
    fetchImpl = (name) => {
      if (!name) return Promise.resolve({ templates: ["quoteSent", "paymentReceipt"] });
      if (name === "quoteSent") return new Promise<Preview>((res) => (resolveA = res));
      return Promise.resolve({ subject: "Subject B", html: "<p>b</p>", text: "b" });
    };
    render(<EmailsTab theme="dark" />);
    await userEvent.click(await screen.findByRole("button", { name: "paymentReceipt" }));
    expect(await screen.findByText("Subject B")).toBeInTheDocument();
    resolveA({ subject: "Subject A", html: "<p>a</p>", text: "a" });
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.getByText("Subject B")).toBeInTheDocument();
    expect(screen.queryByText("Subject A")).not.toBeInTheDocument();
  });

  it("shows an alert when the template list fails to load", async () => {
    // A thenable that rejects: a vi.fn returning a real rejected promise fails the run.
    fetchImpl = () =>
      ({
        then: () => Promise.reject(new Error("boom list")),
      }) as unknown as Promise<Preview>;
    render(<EmailsTab theme="dark" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("boom list");
    expect(screen.getByText("No templates found.")).toBeInTheDocument();
  });

  it("disables the send button while sending", async () => {
    let finish: (v: { sent: boolean; to: string }) => void = () => {};
    sendImpl = () => new Promise((res) => (finish = res));
    render(<EmailsTab theme="dark" />);
    await userEvent.click(await screen.findByRole("button", { name: /send test to me/i }));
    const btn = await screen.findByRole("button", { name: /sending/i });
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    expect(sendTestEmail).toHaveBeenCalledTimes(1);
    finish({ sent: true, to: "x@y.z" });
    expect(await screen.findByText(/sent to x@y.z/i)).toBeInTheDocument();
  });
});
