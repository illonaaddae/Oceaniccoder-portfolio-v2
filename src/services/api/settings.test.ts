import { describe, it, expect, vi, afterEach } from "vitest";
import { Permission, Role } from "appwrite";
import { databases } from "./client";
import {
  getHeroImages,
  getPlatformLogoOverrides,
  readHeroImages,
  readPlatformLogoOverrides,
  setHeroImage,
  setPlatformLogoUrl,
  setSetting,
} from "./settings";

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

describe("setPlatformLogoUrl", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("adds the logo to the saved overrides", async () => {
    vi.spyOn(databases, "listDocuments").mockResolvedValue({
      documents: [{ $id: "doc1", key: "platform_logos", value: '{"AWS":"https://e.com/aws.png"}' }],
      total: 1,
    } as never);
    const update = vi.spyOn(databases, "updateDocument").mockResolvedValue({} as never);

    await setPlatformLogoUrl("Udemy", "https://e.com/udemy.png");

    expect(update).toHaveBeenCalledWith(expect.any(String), expect.any(String), "doc1", {
      value: '{"AWS":"https://e.com/aws.png","Udemy":"https://e.com/udemy.png"}',
    });
  });

  it("starts from no overrides when there is no row yet", async () => {
    mockEmptyList();
    const create = vi.spyOn(databases, "createDocument").mockResolvedValue({} as never);

    await setPlatformLogoUrl("Udemy", "https://e.com/udemy.png");

    expect(create.mock.calls[0][3]).toEqual({
      key: "platform_logos",
      value: '{"Udemy":"https://e.com/udemy.png"}',
    });
  });

  // Saving {} plus one logo would wipe every other override.
  it.each([
    [
      "a failed read",
      () => vi.spyOn(databases, "listDocuments").mockRejectedValue(new Error("401")),
    ],
    [
      "a malformed row",
      () =>
        vi.spyOn(databases, "listDocuments").mockResolvedValue({
          documents: [{ $id: "doc1", key: "platform_logos", value: "{not json" }],
          total: 1,
        } as never),
    ],
  ])("refuses to save after %s", async (_name, arrange) => {
    arrange();
    const update = vi.spyOn(databases, "updateDocument").mockResolvedValue({} as never);
    const create = vi.spyOn(databases, "createDocument").mockResolvedValue({} as never);

    await expect(setPlatformLogoUrl("Udemy", "https://e.com/udemy.png")).rejects.toThrow(
      /Couldn't read the saved platform logos, so nothing was saved/,
    );
    expect(update).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});

describe("hero images", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const storedValue = (value: string) =>
    vi.spyOn(databases, "listDocuments").mockResolvedValue({
      documents: [{ $id: "doc1", key: "hero_images", value }],
      total: 1,
    } as never);

  it("reads the saved images, including a cleared one", async () => {
    storedValue('{"light":"https://e.com/light.png","dark":""}');
    await expect(readHeroImages()).resolves.toEqual({ light: "https://e.com/light.png", dark: "" });
  });

  it("reads no row as no images", async () => {
    mockEmptyList();
    await expect(readHeroImages()).resolves.toEqual({});
  });

  it.each([
    [
      "a failed read",
      () => vi.spyOn(databases, "listDocuments").mockRejectedValue(new Error("401")),
    ],
    ["malformed JSON", () => storedValue("{not json")],
    ["a non-object value", () => storedValue('["https://e.com/light.png"]')],
    ["a non-string URL", () => storedValue('{"light":42}')],
  ])("the strict read rejects on %s, the lenient read returns {}", async (_name, arrange) => {
    arrange();
    await expect(readHeroImages()).rejects.toThrow();
    await expect(getHeroImages()).resolves.toEqual({});
  });

  it("keeps the other theme's image when saving one", async () => {
    storedValue('{"dark":"https://e.com/dark.png"}');
    const update = vi.spyOn(databases, "updateDocument").mockResolvedValue({} as never);

    await setHeroImage("light", "https://e.com/light.png");

    expect(update).toHaveBeenCalledWith(expect.any(String), expect.any(String), "doc1", {
      value: '{"dark":"https://e.com/dark.png","light":"https://e.com/light.png"}',
    });
  });

  // Saving {} plus one image would wipe the other theme's image.
  it.each([
    [
      "a failed read",
      () => vi.spyOn(databases, "listDocuments").mockRejectedValue(new Error("401")),
    ],
    ["a malformed row", () => storedValue("{not json")],
  ])("setHeroImage refuses to save after %s", async (_name, arrange) => {
    arrange();
    const update = vi.spyOn(databases, "updateDocument").mockResolvedValue({} as never);
    const create = vi.spyOn(databases, "createDocument").mockResolvedValue({} as never);

    await expect(setHeroImage("light", "https://e.com/light.png")).rejects.toThrow(
      /Couldn't read the saved hero images, so nothing was saved/,
    );
    expect(update).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});
