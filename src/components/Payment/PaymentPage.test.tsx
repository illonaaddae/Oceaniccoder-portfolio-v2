import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import PaymentPage from "./PaymentPage";
import { captureLinkCode } from "@/utils/linkCode";

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
const LOCKED_BODY = { error: "Enter the code we email you to open this invoice.", locked: true };
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

/**
 * Answers /api/get-invoice with the next of `lookups` (the last one repeats)
 * and /api/doc-access by its action.
 */
function mockApi(lookups: Reply[], access: Record<string, Reply> = {}) {
  let n = 0;
  return vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const url = String(input);
    if (url.includes("/api/get-invoice")) return json(lookups[Math.min(n++, lookups.length - 1)]);
    const { action } = JSON.parse(String(init?.body)) as { action: string };
    return json(access[action] ?? { status: 500, body: { error: `no ${action}` } });
  });
}

// Goes to another invoice inside the same page, as a client with two links would.
function GoTo({ to }: { to: string }) {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(to)}>
      Next invoice
    </button>
  );
}

function renderAt(path: string, { goTo }: { goTo?: string } = {}) {
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/pay/:invoiceNumber"
            element={
              <>
                <PaymentPage />
                {goTo && <GoTo to={goTo} />}
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

function renderWith(path: string, response: { ok: boolean; body: unknown; status?: number }) {
  const fetchMock = mockApi([
    { status: response.status ?? (response.ok ? 200 : 404), body: response.body },
  ]);
  renderAt(path);
  return fetchMock;
}

type FetchMock = ReturnType<typeof mockApi>;
const lookupsOf = (fetchMock: FetchMock) =>
  fetchMock.mock.calls
    .map(([url]) => String(url))
    .filter((url) => url.includes("/api/get-invoice"))
    .map((url) => new URL(url, "https://oceaniccoder.dev").searchParams);
const requested = (fetchMock: FetchMock) => lookupsOf(fetchMock)[0];
const accessCalls = (fetchMock: FetchMock) =>
  fetchMock.mock.calls
    .filter(([url]) => String(url).includes("/api/doc-access"))
    .map(([, init]) => JSON.parse(String(init?.body)) as Record<string, unknown>);

// The emailed link's #k=, as src/index.tsx captures it before React renders.
function arriveWithLinkCode(path: string, code = "nonce.minted.sig") {
  const u = new URL(path, "https://oceaniccoder.dev");
  captureLinkCode(
    { pathname: u.pathname, search: u.search, hash: `#k=${code}` } as typeof window.location,
    { state: null, replaceState: vi.fn() } as unknown as typeof window.history,
  );
}

beforeEach(() => {
  sessionStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("PaymentPage", () => {
  it("sends the pay link's signature with the invoice lookup", async () => {
    const fetchMock = renderWith("/pay/INV-123456?s=abc_DEF-123", { ok: true, body: invoice });
    expect(await screen.findByText("Ama Owusu")).toBeInTheDocument();
    expect(requested(fetchMock).get("number")).toBe("INV-123456");
    expect(requested(fetchMock).get("s")).toBe("abc_DEF-123");
    expect(requested(fetchMock).has("admin")).toBe(false);
  });

  it("sends no signature for an unsigned link and shows the server's not-found answer", async () => {
    const fetchMock = renderWith("/pay/INV-123456", {
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
    expect(screen.getByRole("heading", { name: "Invoice Not Found" })).toBeInTheDocument();
    expect(requested(fetchMock).has("s")).toBe(false);
    expect(screen.queryByText("Ama Owusu")).toBeNull();
  });

  it("asks the client to wait, not that the invoice is missing, when rate limited", async () => {
    renderWith("/pay/INV-123456?s=abc", {
      ok: false,
      status: 429,
      body: { error: "Too many requests. Try again in a few minutes." },
    });
    expect(await screen.findByRole("heading", { name: "Too many requests" })).toBeInTheDocument();
    expect(screen.queryByText("Invoice Not Found")).toBeNull();
  });

  it("doesn't call a server failure a missing invoice", async () => {
    renderWith("/pay/INV-123456?s=abc", {
      ok: false,
      status: 503,
      body: { error: "Invoice links are unavailable right now. Please try again later." },
    });
    expect(
      await screen.findByText("Invoice links are unavailable right now. Please try again later."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Invoice Not Found")).toBeNull();
  });
});

describe("PaymentPage behind the access code", () => {
  it("shows only the code screen while locked, then the invoice once the code is right", async () => {
    const fetchMock = mockApi(
      [
        { status: 401, body: LOCKED_BODY },
        { status: 200, body: { ...invoice, status: "sent" } },
      ],
      {
        status: { status: 200, body: LOCKED_STATUS },
        send: { status: 200, body: SENT },
        verify: { status: 200, body: { ok: true } },
      },
    );
    renderAt("/pay/INV-123456?s=sig1");
    expect(await screen.findByRole("heading", { name: "Open your invoice" })).toBeInTheDocument();
    await screen.findByText("We sent a code to a•••••@e•••••.com.");
    // Nothing from the invoice, not even its number.
    expect(screen.queryByText("Ama Owusu")).toBeNull();
    expect(screen.queryByText(/INV-123456/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Pay by Card" })).toBeNull();

    await userEvent.type(screen.getByLabelText("6-digit code"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Open invoice" }));

    expect(await screen.findByText("Ama Owusu")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pay by Card" })).toBeInTheDocument();
    expect(accessCalls(fetchMock)).toEqual([
      { kind: "invoice", number: "INV-123456", s: "sig1", action: "status" },
      { kind: "invoice", number: "INV-123456", s: "sig1", action: "send" },
      {
        kind: "invoice",
        number: "INV-123456",
        s: "sig1",
        action: "verify",
        challenge: "v1.c1.sig",
        code: "123456",
      },
    ]);
  });

  it("claims the emailed link code before the lookup and opens straight away", async () => {
    arriveWithLinkCode("/pay/INV-200001?s=sig2");
    const fetchMock = mockApi(
      [{ status: 200, body: { ...invoice, invoiceNumber: "INV-200001" } }],
      {
        claim: { status: 200, body: { ok: true } },
      },
    );
    renderAt("/pay/INV-200001?s=sig2");
    expect(await screen.findByText("Ama Owusu")).toBeInTheDocument();
    expect(accessCalls(fetchMock)).toEqual([
      {
        kind: "invoice",
        number: "INV-200001",
        s: "sig2",
        action: "claim",
        linkCode: "nonce.minted.sig",
      },
    ]);
    const order = fetchMock.mock.calls.map(([url]) => String(url).split("?")[0]);
    expect(order).toEqual(["/api/doc-access", "/api/get-invoice"]);
  });

  it("falls back to the code screen when the link code is refused", async () => {
    arriveWithLinkCode("/pay/INV-200002?s=sig3");
    mockApi([{ status: 401, body: LOCKED_BODY }], {
      claim: { status: 400, body: { error: "This link has already been used." } },
      status: { status: 200, body: LOCKED_STATUS },
      send: { status: 200, body: SENT },
    });
    renderAt("/pay/INV-200002?s=sig3");
    expect(await screen.findByRole("heading", { name: "Open your invoice" })).toBeInTheDocument();
    expect(await screen.findByText("We sent a code to a•••••@e•••••.com.")).toBeInTheDocument();
  });

  it("says cookies are blocked when the browser is still locked right after a link code", async () => {
    arriveWithLinkCode("/pay/INV-200003?s=sig4");
    const fetchMock = mockApi([{ status: 401, body: LOCKED_BODY }], {
      claim: { status: 200, body: { ok: true } },
    });
    renderAt("/pay/INV-200003?s=sig4");
    const message = await screen.findByRole("alert");
    expect(message).toHaveTextContent(/Allow cookies for oceaniccoder.dev/);
    await waitFor(() => expect(message).toHaveFocus());
    expect(accessCalls(fetchMock).map((c) => c.action)).toEqual(["claim"]);
  });

  it("asks the visitor to send the code on an unsigned link, and sends nothing by itself", async () => {
    const fetchMock = mockApi([{ status: 401, body: LOCKED_BODY }], {
      status: { status: 200, body: { locked: true, canUnlock: true, maskedEmail: null } },
    });
    renderAt("/pay/INV-200004");
    expect(
      await screen.findByText(
        "Press Send a code to get one at the email address we sent the invoice to.",
      ),
    ).toBeInTheDocument();
    expect(accessCalls(fetchMock)).toEqual([
      { kind: "invoice", number: "INV-200004", action: "status" },
    ]);
  });

  it("starts a fresh code screen for another invoice opened in the same page", async () => {
    const fetchMock = mockApi([{ status: 401, body: LOCKED_BODY }], {
      status: { status: 200, body: LOCKED_STATUS },
      send: { status: 200, body: SENT },
    });
    renderAt("/pay/INV-300001?s=sigA", { goTo: "/pay/INV-300002?s=sigB" });
    await screen.findByText("We sent a code to a•••••@e•••••.com.");
    await userEvent.click(screen.getByRole("button", { name: "Next invoice" }));
    // The first invoice's challenge doesn't carry over: the second asks for its own code.
    await waitFor(() =>
      expect(accessCalls(fetchMock)).toContainEqual({
        kind: "invoice",
        number: "INV-300002",
        s: "sigB",
        action: "send",
      }),
    );
  });

  describe("admin preview", () => {
    it("shows the invoice under a Preview banner, without the payment options", async () => {
      arriveWithLinkCode("/pay/INV-400001?s=sig5");
      const fetchMock = mockApi([
        { status: 200, body: { ...invoice, status: "sent", preview: true } },
      ]);
      renderAt("/pay/INV-400001?s=sig5&preview=admin");
      expect(await screen.findByText("Ama Owusu")).toBeInTheDocument();
      expect(screen.getByRole("region", { name: "Preview" })).toHaveTextContent(
        /payment options are hidden/,
      );
      expect(screen.queryByRole("button", { name: "Pay by Card" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Mobile Money" })).toBeNull();
      expect(requested(fetchMock).get("admin")).toBe("1");
      // A preview never spends the client's link code.
      expect(accessCalls(fetchMock)).toEqual([]);
    });

    it("asks for the dashboard session and sends no code when the admin check fails", async () => {
      const fetchMock = mockApi([{ status: 401, body: LOCKED_BODY }]);
      renderAt("/pay/INV-400002?s=sig6&preview=admin");
      expect(
        await screen.findByRole("heading", { name: "Preview needs your dashboard session" }),
      ).toBeInTheDocument();
      expect(accessCalls(fetchMock)).toEqual([]);
    });
  });
});
