// @vitest-environment node
import { describe, it, expect } from "vitest";

const { BadRequest, parseListQuery, buildQuery, sortRows, stripPrivate } =
  await import("./publicData.js");

describe("parseListQuery", () => {
  it("returns empty options for an empty query", () => {
    expect(parseListQuery({})).toEqual({ where: [], orderBy: null, dir: "asc", limit: null });
  });

  it("parses typed where values and maps Appwrite system fields", () => {
    const options = parseListQuery({
      where: JSON.stringify({ featured: true, slug: "123", $id: "abc" }),
      orderBy: "$createdAt",
      dir: "desc",
      limit: "10",
    });
    expect(options.where).toEqual([
      { field: "featured", value: true },
      { field: "slug", value: "123" },
      { field: "id", value: "abc" },
    ]);
    expect(options).toMatchObject({ orderBy: "createdAt", dir: "desc", limit: 10 });
  });

  it("refuses to filter or sort on a hidden field", () => {
    const byEmail = { where: JSON.stringify({ authorEmail: "ada@example.com" }) };
    expect(() => parseListQuery(byEmail, "comments")).toThrow(BadRequest);
    expect(() => parseListQuery({ orderBy: "authorEmail" }, "comments")).toThrow(BadRequest);
  });

  it("allows a field that is only hidden in another collection", () => {
    const options = parseListQuery({ orderBy: "authorEmail" }, "projects");
    expect(options.orderBy).toBe("authorEmail");
  });

  it("caps the limit", () => {
    expect(parseListQuery({ limit: "100000" }).limit).toBe(500);
  });

  it.each([
    [{ where: "not json" }],
    [{ where: "[1,2]" }],
    [{ where: JSON.stringify({ a: { $ne: 1 } }) }],
    [{ where: JSON.stringify({ 'x"] OR 1=1 --': 1 }) }],
    [{ orderBy: "c.id; DROP" }],
    [{ limit: "0" }],
    [{ limit: "abc" }],
  ])("rejects %j", (query) => {
    expect(() => parseListQuery(query)).toThrow(BadRequest);
  });
});

describe("buildQuery", () => {
  it("passes values as parameters, never inline", () => {
    const { query, parameters } = buildQuery("projects", {
      where: [{ field: "slug", value: "x' OR 1=1" }],
    });
    expect(query).toBe('SELECT * FROM c WHERE c["slug"] = @p0');
    expect(parameters).toEqual([{ name: "@p0", value: "x' OR 1=1" }]);
  });

  it("always applies the collection's visibility rule", () => {
    const { query } = buildQuery("blog_posts", {});
    expect(query).toContain("NOT (IS_BOOLEAN(c.published) AND c.published = false)");
  });

  it("limits settings to the public keys", () => {
    const { query, parameters } = buildQuery("settings", {});
    expect(query).toContain("ARRAY_CONTAINS(@publicKeys, c.key)");
    expect(parameters[0].value.sort()).toEqual(["hero_images", "hero_roles", "platform_logos"]);
  });

  it("filters by id for single reads, alongside the visibility rule", () => {
    const { query, parameters } = buildQuery("gallery", {}, "img1");
    expect(query).toContain("c.isPublic = false");
    expect(query).toContain("c.id = @id");
    expect(parameters).toContainEqual({ name: "@id", value: "img1" });
  });
});

describe("sortRows", () => {
  const rows = [{ n: 2 }, { n: null }, { n: 1 }, {}, { n: 3 }];

  it("puts missing values first when ascending, like Appwrite", () => {
    expect(sortRows(rows, "n", "asc").map((r) => r.n)).toEqual([null, undefined, 1, 2, 3]);
  });

  it("puts missing values last when descending", () => {
    expect(sortRows(rows, "n", "desc").map((r) => r.n)).toEqual([3, 2, 1, null, undefined]);
  });

  it("sorts ISO date strings chronologically", () => {
    const dated = [{ d: "2026-01-02" }, { d: "2025-12-31" }];
    expect(sortRows(dated, "d", "desc")[0].d).toBe("2026-01-02");
  });

  it("leaves rows untouched without a sort field", () => {
    expect(sortRows(rows, null, "asc")).toBe(rows);
  });
});

describe("stripPrivate", () => {
  it("removes commenter emails", () => {
    const row = { $id: "c1", authorName: "Ada", authorEmail: "ada@example.com" };
    expect(stripPrivate("comments", row)).toEqual({ $id: "c1", authorName: "Ada" });
  });

  it("leaves other collections unchanged", () => {
    const row = { $id: "p1", title: "x" };
    expect(stripPrivate("projects", row)).toBe(row);
  });
});
