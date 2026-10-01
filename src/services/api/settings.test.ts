import { describe, it, expect, vi, afterEach } from "vitest";
import { Permission, Role } from "appwrite";
import { databases } from "./client";
import { setSetting } from "./settings";

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
