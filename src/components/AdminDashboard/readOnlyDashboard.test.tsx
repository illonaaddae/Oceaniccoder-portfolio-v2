import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

// The public /dashboard has no admin session, and messages, bookings,
// inquiries and comments hold visitors' contact details, so it must not ask
// /api/manage for them.

type FetchArgs = Parameters<typeof fetch>;
let fetchMock: ReturnType<typeof vi.fn<FetchArgs, Promise<Response>>>;
const urls = () => fetchMock.mock.calls.map(([url]) => String(url));
const requested = (prefix: string) => urls().some((url) => url.startsWith(prefix));
const manageCalls = () => urls().filter((url) => url.startsWith("/api/manage"));

// Loading the whole dashboard is slow on a busy machine.
const SLOW = { timeout: 10_000 };

describe("dashboard reads", () => {
  let AdminDashboard: (typeof import("./index"))["AdminDashboard"];

  beforeAll(async () => {
    ({ AdminDashboard } = await import("./index"));
  }, 60_000);

  const renderDashboard = (path: string, isReadOnly: boolean) => {
    window.history.replaceState({}, "", path);
    render(<AdminDashboard isReadOnly={isReadOnly} />);
  };

  beforeEach(() => {
    fetchMock = vi.fn<FetchArgs, Promise<Response>>(
      async () =>
        new Response(JSON.stringify({ total: 0, documents: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState({}, "", "/");
  });

  it("make no /api/manage call on the read-only /dashboard, Messages and Comments tabs included", async () => {
    renderDashboard("/dashboard", true);
    // The overview has loaded once the public collections were read.
    await waitFor(() => expect(requested("/api/data/testimonials")).toBe(true), SLOW);

    fireEvent.click(screen.getAllByRole("button", { name: /^Messages/ })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: /^Comments/ })[0]);
    await screen.findByRole("heading", { name: /comments/i }, SLOW);

    expect(manageCalls()).toEqual([]);
  });

  it("read messages, bookings, inquiries and comments in the signed-in admin dashboard", async () => {
    renderDashboard("/admin/dashboard", false);

    await waitFor(
      () =>
        expect(manageCalls()).toEqual(
          expect.arrayContaining([
            expect.stringContaining("/api/manage/messages"),
            expect.stringContaining("/api/manage/bookings"),
            expect.stringContaining("/api/manage/project_inquiries"),
            expect.stringContaining("/api/manage/comments"),
          ]),
        ),
      SLOW,
    );
  });
});
