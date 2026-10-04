// @vitest-environment node
import { describe, it, expect } from "vitest";

const { Invalid, isCollection, partitionField, writableFields, buildAdminQuery, isJsonRequest } =
  await import("./adminData.js");

describe("isCollection", () => {
  it("accepts containers and rejects inherited keys", () => {
    expect(isCollection("expenses")).toBe(true);
    expect(isCollection("constructor")).toBe(false);
    expect(isCollection("__proto__")).toBe(false);
  });
});

describe("partitionField", () => {
  it("returns the field each container is partitioned on", () => {
    expect(partitionField("projects")).toBe("id");
    expect(partitionField("project_videos")).toBe("projectId");
    expect(partitionField("blog_views")).toBe("postId");
  });
});

describe("writableFields", () => {
  it("drops system and Appwrite fields the browser sends back", () => {
    expect(
      writableFields({
        $id: "x",
        $createdAt: "t",
        $permissions: [],
        id: "y",
        createdAt: "t",
        _etag: "e",
        title: "Hello",
        tags: ["a"],
        image: null,
      }),
    ).toEqual({ title: "Hello", tags: ["a"], image: null });
  });

  it.each([[[]], [null], ["text"], [{ "bad name": 1 }], [{ "a.b": 1 }]])("rejects %j", (body) => {
    expect(() => writableFields(body)).toThrow(Invalid);
  });

  it("rejects oversized bodies", () => {
    expect(() => writableFields({ content: "x".repeat(1024 * 1024 + 1) })).toThrow("too large");
  });
});

describe("buildAdminQuery", () => {
  it("parameterises filters and the id", () => {
    expect(buildAdminQuery({ where: [{ field: "postId", value: "p1" }] }, "c1")).toEqual({
      query: 'SELECT * FROM c WHERE c.id = @id AND c["postId"] = @p0',
      parameters: [
        { name: "@id", value: "c1" },
        { name: "@p0", value: "p1" },
      ],
    });
  });
});

describe("isJsonRequest", () => {
  it("only accepts JSON bodies (cross-site forms can't send them without CORS)", () => {
    expect(isJsonRequest({ headers: { "content-type": "application/json; charset=utf-8" } })).toBe(
      true,
    );
    expect(isJsonRequest({ headers: { "content-type": "text/plain" } })).toBe(false);
    expect(isJsonRequest({ headers: {} })).toBe(false);
  });
});
