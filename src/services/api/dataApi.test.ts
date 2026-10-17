import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getRow,
  listRows,
  manageCreate,
  manageDelete,
  manageUpdate,
  setAdminReads,
} from "./dataApi";

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

type FetchArgs = Parameters<typeof fetch>;
let fetchMock: ReturnType<typeof vi.fn<FetchArgs, Promise<Response>>>;
const requestedUrl = () => fetchMock.mock.calls[0][0] as string;

beforeEach(() => {
  fetchMock = vi.fn<FetchArgs, Promise<Response>>(async () =>
    jsonResponse(200, { total: 0, documents: [] }),
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  setAdminReads(false);
  window.history.replaceState({}, "", "/");
});

describe("reads", () => {
  it("go through /api/manage in the signed-in admin dashboard", async () => {
    window.history.replaceState({}, "", "/admin/dashboard");
    setAdminReads(true);

    await listRows("projects", { orderBy: "order" });
    await getRow("projects", "p 1");

    expect(fetchMock.mock.calls[0][0]).toBe("/api/manage/projects?orderBy=order");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/manage/projects/p%201");
  });

  it("go through /api/data on the read-only /dashboard, even with admin reads on", async () => {
    window.history.replaceState({}, "", "/dashboard");
    setAdminReads(true);

    await listRows("projects");

    expect(requestedUrl()).toBe("/api/data/projects");
  });

  it("go through /api/data under /admin until the dashboard turns admin reads on", async () => {
    window.history.replaceState({}, "", "/admin/dashboard");

    await listRows("projects");

    expect(requestedUrl()).toBe("/api/data/projects");
  });
});

describe("admin writes", () => {
  it("send JSON to /api/manage", async () => {
    fetchMock.mockImplementation(async () => jsonResponse(201, { $id: "new" }));

    expect(await manageCreate("projects", { title: "New" })).toEqual({ $id: "new" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/manage/projects");
    expect(init).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"title":"New"}',
    });
  });

  it("reject with the server's error message", async () => {
    fetchMock.mockImplementation(async () =>
      jsonResponse(409, { error: "This item changed meanwhile. Reload and try again." }),
    );

    await expect(manageUpdate("projects", "p1", { title: "x" })).rejects.toThrow(
      "This item changed meanwhile. Reload and try again.",
    );
  });

  it("reject with the method and status when the server sends no message", async () => {
    fetchMock.mockImplementation(async () => new Response("Bad gateway", { status: 502 }));

    await expect(manageUpdate("projects", "p1", { title: "x" })).rejects.toThrow(
      "PATCH projects/p1 failed (502)",
    );
  });

  it("resolve a 204 delete with no body", async () => {
    fetchMock.mockImplementation(async () => new Response(null, { status: 204 }));

    await expect(manageDelete("projects", "p1")).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "DELETE", body: undefined });
  });
});
