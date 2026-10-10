import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const fetchEmailPreview = vi.fn(async (name?: string) =>
  name
    ? { subject: `Subject ${name}`, html: "<p>hi</p>", text: "hi" }
    : { templates: ["quoteSent", "paymentReceipt"] },
);
const sendTestEmail = vi.fn().mockResolvedValue({ sent: true, to: "admin@oceaniccoder.dev" });
vi.mock("@/services/api/quotes", () => ({
  fetchEmailPreview: (n?: string) => fetchEmailPreview(n),
  sendTestEmail: (n: string) => sendTestEmail(n),
}));

import EmailsTab from "./EmailsTab";

describe("EmailsTab", () => {
  it("previews the selected template and sends a test", async () => {
    render(<EmailsTab theme="dark" />);
    expect(await screen.findByText("Subject quoteSent")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "paymentReceipt" }));
    expect(await screen.findByText("Subject paymentReceipt")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /send test to me/i }));
    await waitFor(() => expect(sendTestEmail).toHaveBeenCalledWith("paymentReceipt"));
    expect(await screen.findByText(/sent to admin@oceaniccoder.dev/i)).toBeInTheDocument();
  });
});
