import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import DocumentAccessGate, { LockedDocument } from "./DocumentAccessGate";
import { docAccessTarget, type AccessTarget } from "@/services/api/access";
import { QuoteApiError } from "@/services/api/quotes";
import type { DocumentKind } from "@/utils/linkCode";

const SENT = {
  challenge: "v1.c1.sig",
  maskedEmail: "k•••••@e•••••.com",
  expiresInSeconds: 600,
  // No resend countdown: its 1-second tick would land outside act() in a
  // slow run. QuoteAccessGate.test.tsx covers the countdown.
  retryAfterSeconds: 0,
};
const LOCKED = { locked: true, canUnlock: true, blocked: false, maskedEmail: SENT.maskedEmail };

// The gate sends one code by itself per link and page load, so every test
// uses its own key.
let n = 0;
function fakeTarget(kind: DocumentKind, key = `doc${(n += 1)}`) {
  return {
    kind,
    key,
    status: vi.fn().mockResolvedValue(LOCKED),
    send: vi.fn().mockResolvedValue(SENT),
    verify: vi.fn().mockResolvedValue({ ok: true }),
    claim: vi.fn(),
  } satisfies AccessTarget;
}

function setup(target: AccessTarget) {
  const onUnlocked = vi.fn();
  const view = render(
    <MemoryRouter>
      <DocumentAccessGate target={target} onUnlocked={onUnlocked} />
    </MemoryRouter>,
  );
  return { onUnlocked, ...view };
}

const enter = async (code: string, button: string) => {
  const el = await screen.findByLabelText("6-digit code");
  fireEvent.paste(el, { clipboardData: { getData: () => code } });
  await userEvent.click(screen.getByRole("button", { name: button }));
};

beforeEach(() => {
  sessionStorage.clear();
});

describe.each([
  ["invoice", "Open your invoice", "Open invoice", "Invoice link"],
  ["receipt", "Open your receipt", "Open receipt", "Receipt link"],
] as const)("DocumentAccessGate for a %s", (kind, title, button, mailSubject) => {
  it("names the document, emails a code once and opens it with the code", async () => {
    const target = fakeTarget(kind);
    const t = setup(target);
    expect(await screen.findByRole("heading", { name: title })).toBeInTheDocument();
    expect(
      screen.getByText(`To keep your ${kind} private, it opens with a code we email to you.`),
    ).toBeInTheDocument();
    await screen.findByText("We sent a code to k•••••@e•••••.com.");
    expect(screen.getByRole("status")).toHaveTextContent("We sent a code to k•••••@e•••••.com.");
    expect(target.send).toHaveBeenCalledTimes(1);
    const saved = `oc-access:${kind}:${target.key}`;
    expect(JSON.parse(sessionStorage.getItem(saved) ?? "null")).toMatchObject({
      challenge: "v1.c1.sig",
    });
    await enter("123456", button);
    expect(target.verify).toHaveBeenCalledWith("v1.c1.sig", "123456");
    await waitFor(() => expect(t.onUnlocked).toHaveBeenCalled());
    expect(sessionStorage.getItem(saved)).toBeNull();
  });

  it("says the document can't open with a code when it has no address", async () => {
    const target = fakeTarget(kind);
    target.status.mockResolvedValue({ locked: true, canUnlock: false, maskedEmail: null });
    setup(target);
    expect(
      await screen.findByText(
        `This ${kind} can't be opened with a code. Contact hello@oceaniccoder.dev to open it.`,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Email hello@oceaniccoder.dev" })).toHaveAttribute(
      "href",
      `mailto:hello@oceaniccoder.dev?subject=${encodeURIComponent(mailSubject)}`,
    );
    expect(target.send).not.toHaveBeenCalled();
  });

  it("names the document in the loading skeleton", () => {
    const target = fakeTarget(kind);
    target.status.mockReturnValue(new Promise(() => {}));
    setup(target);
    expect(screen.getByText(`Loading your ${kind}…`)).toBeInTheDocument();
  });

  it("restores its own saved challenge instead of sending again", async () => {
    const target = fakeTarget(kind);
    sessionStorage.setItem(
      `oc-access:${kind}:${target.key}`,
      JSON.stringify({ challenge: "v1.saved.sig", expiresAt: Date.now() + 60000 }),
    );
    const t = setup(target);
    await enter("123456", button);
    expect(target.send).not.toHaveBeenCalled();
    expect(target.verify).toHaveBeenCalledWith("v1.saved.sig", "123456");
    await waitFor(() => expect(t.onUnlocked).toHaveBeenCalled());
  });

  it("on blocked announces the contact message and moves focus to it", async () => {
    const target = fakeTarget(kind);
    target.verify.mockRejectedValue(
      new QuoteApiError("Blocked.", 403, undefined, undefined, { blocked: true, triesLeft: 0 }),
    );
    setup(target);
    await screen.findByText("We sent a code to k•••••@e•••••.com.");
    await enter("123456", button);
    const message = await screen.findByRole("alert");
    expect(message).toHaveTextContent(/too many wrong codes/i);
    await waitFor(() => expect(message).toHaveFocus());
    expect(sessionStorage.getItem(`oc-access:${kind}:${target.key}`)).toBeNull();
  });

  it("says the browser dropped the sign-in under the document's title", async () => {
    const target = fakeTarget(kind);
    const onRetry = vi.fn();
    render(
      <MemoryRouter>
        <LockedDocument target={target} onUnlocked={vi.fn()} onRetry={onRetry} cookieBlocked />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalled();
    expect(target.status).not.toHaveBeenCalled();
  });
});

describe("DocumentAccessGate across kinds", () => {
  it("doesn't take a quote's saved challenge for another document with the same key", async () => {
    const target = fakeTarget("invoice", "shared-key");
    sessionStorage.setItem(
      "oc-quote-code:shared-key",
      JSON.stringify({ challenge: "v1.quote.sig", expiresAt: Date.now() + 60000 }),
    );
    setup(target);
    await screen.findByText("We sent a code to k•••••@e•••••.com.");
    expect(target.send).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem("oc-quote-code:shared-key")).toContain("v1.quote.sig");
  });

  it("sends one code by itself per kind and key in a page load", async () => {
    const first = fakeTarget("invoice", "once-key");
    const view = setup(first);
    await screen.findByText("We sent a code to k•••••@e•••••.com.");
    view.unmount();
    // Without the saved challenge, only the once-per-load rule stops a second send.
    sessionStorage.clear();

    const again = fakeTarget("invoice", "once-key");
    const second = setup(again);
    expect(await screen.findByLabelText("6-digit code")).toBeInTheDocument();
    second.unmount();
    const receipt = fakeTarget("receipt", "once-key");
    setup(receipt);
    await waitFor(() => expect(receipt.send).toHaveBeenCalledTimes(1));
    expect(again.send).not.toHaveBeenCalled();
  });

  it("emails a code by itself when the link shows the address", async () => {
    const target = fakeTarget("invoice");
    setup(target);
    await screen.findByText("We sent a code to k•••••@e•••••.com.");
    expect(target.send).toHaveBeenCalledTimes(1);
  });

  it("waits for the visitor to ask before emailing a code on an unsigned invoice link", async () => {
    const target = fakeTarget("invoice");
    target.status.mockResolvedValue({ locked: true, canUnlock: true, maskedEmail: null });
    target.send.mockResolvedValue({ ...SENT, maskedEmail: null });
    setup(target);
    expect(await screen.findByLabelText("6-digit code")).toBeInTheDocument();
    // Leaving act runs the effects of the code screen, where an auto-send would start.
    await act(async () => {});
    expect(target.send).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe(
      "Press Send a code to get one at the email address we sent the invoice to.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Send a code" }));
    await screen.findByText("We sent a code to the email address we sent the invoice to.");
    expect(target.send).toHaveBeenCalledTimes(1);
  });

  it("still waits for the visitor on an unsigned link after send shows an address and the code expires", async () => {
    const target = fakeTarget("invoice");
    target.status.mockResolvedValue({ locked: true, canUnlock: true, maskedEmail: null });
    target.verify.mockRejectedValue(
      new QuoteApiError("That code has expired.", 400, undefined, undefined, {
        newCodeNeeded: true,
      }),
    );
    setup(target);
    await userEvent.click(await screen.findByRole("button", { name: "Send a code" }));
    await screen.findByText("We sent a code to k•••••@e•••••.com.");
    await enter("123456", "Open invoice");
    await screen.findByText("That code has expired.");
    await act(async () => {});
    expect(target.send).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toBe(
      "Press Send a code to get one at the email address we sent the invoice to.",
    );
  });

  it("opens the document when the status says this browser is already unlocked", async () => {
    const target = fakeTarget("receipt");
    target.status.mockResolvedValue({ locked: false });
    const t = setup(target);
    await waitFor(() => expect(t.onUnlocked).toHaveBeenCalled());
    expect(target.send).not.toHaveBeenCalled();
  });

  it("shows the dashboard card in admin preview and sends nothing", () => {
    const target = fakeTarget("invoice");
    render(
      <MemoryRouter>
        <LockedDocument target={target} onUnlocked={vi.fn()} onRetry={vi.fn()} admin />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("heading", { name: "Preview needs your dashboard session" }),
    ).toBeInTheDocument();
    expect(target.status).not.toHaveBeenCalled();
    expect(target.send).not.toHaveBeenCalled();
  });
});

describe("DocumentAccessGate with the doc-access endpoint", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("checks the status and sends the code through /api/doc-access with the locator", async () => {
    const fetchMock = vi.fn((_url: string, init: { body: string }) => {
      const { action } = JSON.parse(init.body) as { action: string };
      const body = action === "status" ? LOCKED : SENT;
      return Promise.resolve({ ok: true, status: 200, json: async () => body });
    });
    vi.stubGlobal("fetch", fetchMock);
    const target = docAccessTarget({ kind: "invoice", number: "INV-2026-0042", s: "sig" });
    setup(target);
    await screen.findByText("We sent a code to k•••••@e•••••.com.");
    expect(fetchMock.mock.calls.map(([url, init]) => [url, JSON.parse(init.body)])).toEqual([
      ["/api/doc-access", { kind: "invoice", number: "INV-2026-0042", s: "sig", action: "status" }],
      ["/api/doc-access", { kind: "invoice", number: "INV-2026-0042", s: "sig", action: "send" }],
    ]);
  });
});
