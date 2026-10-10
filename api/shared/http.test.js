// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

const H = await import("./http.js");

describe("http helpers", () => {
  it("sends JSON with no-store", () => {
    const context = {};
    H.send(context, 201, { a: 1 });
    expect(context.res).toMatchObject({ status: 201, body: '{"a":1}' });
    expect(context.res.headers["Cache-Control"]).toBe("no-store");
  });
  it("rejects large and non-object bodies", () => {
    expect(() => H.readJson({ rawBody: "x".repeat(70000), body: {} })).toThrow(/too large/);
    expect(() => H.readJson({ body: "text" })).toThrow(/JSON/);
    expect(H.readJson({ body: { a: 1 } })).toEqual({ a: 1 });
  });
  it("maps HttpError to its status and hides other errors", () => {
    const context = { log: { error: vi.fn() } };
    H.handleError(context, new H.HttpError(409, "Nope", { fields: { a: "b" } }), "t");
    expect(context.res.status).toBe(409);
    expect(JSON.parse(context.res.body)).toEqual({ error: "Nope", fields: { a: "b" } });
    H.handleError(context, new Error("secret detail"), "t");
    expect(context.res.status).toBe(500);
    expect(context.res.body).not.toContain("secret detail");
  });
});
