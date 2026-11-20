import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ReceiptPage from "./ReceiptPage";
import { captureLinkCode } from "@/utils/linkCode";

const receipt = {
  reference: "R-100",
  quoteNumber: "Q-2026-0001",
  title: "Online store",
  clientName: "Ama Owusu",
  clientCompany: "",
  stageLabel: "Deposit",
  invoiceNumber: "INV-Q-1",
  amountMinor: 6000,
  currency: "GHS",
  method: "Mobile Money",
  paidAt: "2026-10-10T00:00:00.000Z",
  balanceMinor: 4000,
};
const LOCKED_BODY = { error: "Enter the code we email you to open this receipt.", locked: true };
const LOCKED_STATUS = {
  locked: true,
  canUnlock: true,
  blocked: false,
  maskedEmail: "a•••••@e•••••.com",
};
const SENT = {
  challenge: "v1.c1.sig",
  maskedEmail: "a•••••@e•••••.com",
  expiresInSeconds: 600,
  retryAfterSeconds: 0,
};

type Reply = { status: number; body: unknown };
const json = ({ status, body }: Reply) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

/** Answers /api/quote-receipt with the next of `lookups` (the last repeats), /api/doc-access by action. */
function mockApi(lookups: Reply[], access: Record<string, Reply> = {}) {
  let n = 0;
  return vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const url = String(input);
    if (url.includes("/api/quote-receipt")) return json(lookups[Math.min(n++, lookups.length - 1)]);
    const { action } = JSON.parse(String(init?.body)) as { action: string };
    return json(access[action] ?? { status: 500, body: { error: `no ${action}` } });
  });
}

type FetchMock = ReturnType<typeof mockApi>;
const lookupsOf = (fetchMock: FetchMock) =>
  fetchMock.mock.calls
    .map(([url]) => String(url))
    .filter((url) => url.includes("/api/quote-receipt"))
    .map((url) => new URL(url, "https://oceaniccoder.dev").searchParams);
const accessCalls = (fetchMock: FetchMock) =>
  fetchMock.mock.calls
    .filter(([url]) => String(url).includes("/api/doc-access"))
    .map(([, init]) => JSON.parse(String(init?.body)) as Record<string, unknown>);

function renderAt(path: string) {
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/receipt/:reference" element={<ReceiptPage />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

function arriveWithLinkCode(path: string, code = "nonce.minted.sig") {
  const u = new URL(path, "https://oceaniccoder.dev");
  captureLinkCode(
    { pathname: u.pathname, search: u.search, hash: `#k=${code}` } as typeof window.location,
    { state: null, replaceState: vi.fn() } as unknown as typeof window.history,
  );
}

beforeEach(() => sessionStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("ReceiptPage behind the access code", () => {
  it("shows the receipt when the browser is unlocked", async () => {
    const fetchMock = mockApi([{ status: 200, body: { receipt } }]);
    renderAt("/receipt/R-100?s=sig1");
    expect(await screen.findByText("Ama Owusu")).toBeInTheDocument();
    expect(lookupsOf(fetchMock)[0].get("s")).toBe("sig1");
    expect(lookupsOf(fetchMock)[0].has("admin")).toBe(false);
    expect(accessCalls(fetchMock)).toEqual([]);
  });

  it("shows only the code screen while locked, then the receipt once the code is right", async () => {
    const fetchMock = mockApi(
      [
        { status: 401, body: LOCKED_BODY },
        { status: 200, body: { receipt } },
      ],
      {
        status: { status: 200, body: LOCKED_STATUS },
        send: { status: 200, body: SENT },
        verify: { status: 200, body: { ok: true } },
      },
    );
    renderAt("/receipt/R-100?s=sig1");
    expect(await screen.findByRole("heading", { name: "Open your receipt" })).toBeInTheDocument();
    await screen.findByText("We sent a code to a•••••@e•••••.com.");
    expect(screen.queryByText("Ama Owusu")).toBeNull();
    expect(screen.queryByText(/R-100/)).toBeNull();

    await userEvent.type(screen.getByLabelText("6-digit code"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Open receipt" }));

    expect(await screen.findByText("Ama Owusu")).toBeInTheDocument();
    expect(accessCalls(fetchMock)).toEqual([
      { kind: "receipt", reference: "R-100", s: "sig1", action: "status" },
      { kind: "receipt", reference: "R-100", s: "sig1", action: "send" },
      {
        kind: "receipt",
        reference: "R-100",
        s: "sig1",
        action: "verify",
        challenge: "v1.c1.sig",
        code: "123456",
      },
    ]);
  });

  it("claims the emailed link code before the lookup and opens straight away", async () => {
    arriveWithLinkCode("/receipt/R-200?s=sig2");
    const fetchMock = mockApi([{ status: 200, body: { receipt } }], {
      claim: { status: 200, body: { ok: true } },
    });
    renderAt("/receipt/R-200?s=sig2");
    expect(await screen.findByText("Ama Owusu")).toBeInTheDocument();
    expect(accessCalls(fetchMock)).toEqual([
      {
        kind: "receipt",
        reference: "R-200",
        s: "sig2",
        action: "claim",
        linkCode: "nonce.minted.sig",
      },
    ]);
    const order = fetchMock.mock.calls.map(([url]) => String(url).split("?")[0]);
    expect(order).toEqual(["/api/doc-access", "/api/quote-receipt"]);
  });

  it("says cookies are blocked when the browser is still locked right after a link code", async () => {
    arriveWithLinkCode("/receipt/R-300?s=sig3");
    mockApi([{ status: 401, body: LOCKED_BODY }], { claim: { status: 200, body: { ok: true } } });
    renderAt("/receipt/R-300?s=sig3");
    const message = await screen.findByRole("alert");
    expect(message).toHaveTextContent(/Allow cookies for oceaniccoder.dev/);
    await waitFor(() => expect(message).toHaveFocus());
  });

  it("asks for the dashboard session on the admin preview and never claims a code", async () => {
    arriveWithLinkCode("/receipt/R-400?s=sig4&preview=admin");
    const fetchMock = mockApi([{ status: 401, body: LOCKED_BODY }]);
    renderAt("/receipt/R-400?s=sig4&preview=admin");
    expect(
      await screen.findByRole("heading", { name: "Preview needs your dashboard session" }),
    ).toBeInTheDocument();
    expect(lookupsOf(fetchMock)[0].get("admin")).toBe("1");
    expect(accessCalls(fetchMock)).toEqual([]);
  });

  it("shows the not-found text for a bad link", async () => {
    mockApi([{ status: 404, body: { error: "Receipt not found.", inactive: true } }]);
    renderAt("/receipt/R-500?s=bad");
    expect(await screen.findByText("Receipt not found.")).toBeInTheDocument();
  });
});
