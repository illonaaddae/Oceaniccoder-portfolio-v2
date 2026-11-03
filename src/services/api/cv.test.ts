import { describe, it, expect, vi, afterEach } from "vitest";
import { cvApi, CvApiError } from "./cv";

function respond(status: number, body: unknown) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("cvApi", () => {
  it("posts the action, its input and the loaded version to /api/cv", async () => {
    const fetchSpy = respond(200, { entry: { id: "entry.experience.j1" } });

    await cvApi.setShown("entry.experience.j1", false, '"v3"');

    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/cv$/);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      action: "setShown",
      id: "entry.experience.j1",
      show: false,
      version: '"v3"',
    });
  });

  it("asks for a preview with no input", async () => {
    const fetchSpy = respond(200, { pdfBase64: "JVBERi0=", pages: 1, warnings: [] });

    const preview = await cvApi.preview();

    expect(JSON.parse(String(fetchSpy.mock.calls[0][1]?.body))).toEqual({ action: "preview" });
    expect(preview.pages).toBe(1);
  });

  it("throws the server's message and status on an error answer", async () => {
    respond(409, { error: "Something changed since this loaded. Refresh to see the latest." });

    const err = await cvApi.deleteEntry("entry.projects.cv-1", null).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(CvApiError);
    expect(err).toMatchObject({ status: 409, message: expect.stringContaining("Refresh") });
  });

  it("explains a response that isn't JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("<html>", { status: 502 }));

    const err = await cvApi.load().catch((e: unknown) => e);
    expect(err).toMatchObject({ status: 502, message: expect.stringContaining("502") });
  });
});
