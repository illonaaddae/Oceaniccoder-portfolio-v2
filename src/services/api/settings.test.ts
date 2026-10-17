import { describe, it, expect, vi, afterEach } from "vitest";
import { Permission, Role } from "appwrite";
import { databases } from "./client";
import { getPlatformLogoOverrides, readPlatformLogoOverrides, setSetting } from "./settings";

function mockEmptyList() {
  vi.spyOn(databases, "listDocuments").mockResolvedValue({ documents: [], total: 0 } as never);
}

describe("setSetting", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("makes a new public setting readable by visitors", async () => {
    mockEmptyList();
    const create = vi.spyOn(databases, "createDocument").mockResolvedValue({} as never);

    await setSetting("hero_images", "{}");

    expect(create.mock.calls[0][4]).toEqual([Permission.read(Role.any())]);
  });

  it("leaves other settings private", async () => {
    mockEmptyList();
    const create = vi.spyOn(databases, "createDocument").mockResolvedValue({} as never);

    await setSetting("something_private", "x");

    expect(create.mock.calls[0][4]).toBeUndefined();
  });

  it("updates an existing row without touching its permissions", async () => {
    vi.spyOn(databases, "listDocuments").mockResolvedValue({
      documents: [{ $id: "doc1", key: "hero_roles", value: "[]" }],
      total: 1,
    } as never);
    const update = vi.spyOn(databases, "updateDocument").mockResolvedValue({} as never);

    await setSetting("hero_roles", '["Engineer"]');

    expect(update).toHaveBeenCalledWith(expect.any(String), expect.any(String), "doc1", {
      value: '["Engineer"]',
    });
  });
});

describe("platform logo overrides", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const storedValue = (value: string) =>
    vi.spyOn(databases, "listDocuments").mockResolvedValue({
      documents: [{ $id: "doc1", key: "platform_logos", value }],
      total: 1,
    } as never);

  it("reads the saved URLs", async () => {
    storedValue('{"AWS":"https://example.com/aws.png"}');
    await expect(readPlatformLogoOverrides()).resolves.toEqual({
      AWS: "https://example.com/aws.png",
    });
  });

  it("reads no row as no overrides", async () => {
    mockEmptyList();
    await expect(readPlatformLogoOverrides()).resolves.toEqual({});
  });

  it.each([
    [
      "a failed read",
      () => vi.spyOn(databases, "listDocuments").mockRejectedValue(new Error("401")),
    ],
    ["malformed JSON", () => storedValue("{not json")],
    ["a non-object value", () => storedValue('["https://example.com/aws.png"]')],
    ["a non-string URL", () => storedValue('{"AWS":42}')],
  ])("the strict read rejects on %s, the lenient read returns {}", async (_name, arrange) => {
    arrange();
    await expect(readPlatformLogoOverrides()).rejects.toThrow();
    await expect(getPlatformLogoOverrides()).resolves.toEqual({});
  });
});
