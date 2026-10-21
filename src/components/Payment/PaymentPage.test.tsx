import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PaymentPage from "./PaymentPage";

const invoice = {
  invoiceNumber: "INV-123456",
  clientName: "Ama Owusu",
  clientEmail: "ama@example.com",
  total: 500,
  currency: "GHS",
  status: "paid",
  dueDate: null,
  estimatedDelivery: null,
};

function renderAt(path: string, response: { ok: boolean; body: unknown }) {
  const fetchMock = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(
      new Response(JSON.stringify(response.body), { status: response.ok ? 200 : 404 }),
    );
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/pay/:invoiceNumber" element={<PaymentPage />} />
      </Routes>
    </MemoryRouter>,
  );
  return fetchMock;
}

const requested = (fetchMock: ReturnType<typeof renderAt>) =>
  new URL(String(fetchMock.mock.calls[0][0]), "https://oceaniccoder.dev").searchParams;

describe("PaymentPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends the pay link's signature with the invoice lookup", async () => {
    const fetchMock = renderAt("/pay/INV-123456?s=abc_DEF-123", { ok: true, body: invoice });
    expect(await screen.findByText("Ama Owusu")).toBeInTheDocument();
    expect(requested(fetchMock).get("number")).toBe("INV-123456");
    expect(requested(fetchMock).get("s")).toBe("abc_DEF-123");
  });

  it("sends no signature for an unsigned link and shows the server's not-found answer", async () => {
    const fetchMock = renderAt("/pay/INV-123456", {
      ok: false,
      body: {
        error: "This payment link is not valid. Ask us for a new one at hello@oceaniccoder.dev.",
      },
    });
    expect(
      await screen.findByText(
        "This payment link is not valid. Ask us for a new one at hello@oceaniccoder.dev.",
      ),
    ).toBeInTheDocument();
    expect(requested(fetchMock).has("s")).toBe(false);
    expect(screen.queryByText("Ama Owusu")).toBeNull();
  });
});
