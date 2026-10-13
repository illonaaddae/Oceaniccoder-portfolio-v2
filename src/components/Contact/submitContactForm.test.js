import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("../../services/api", () => ({ createMessage: vi.fn(() => Promise.resolve()) }));

const { submitContactForm } = await import("./submitContactForm");

const formData = { name: "Ada", email: "ada@example.com", subject: "Hi", message: "Hello" };

describe("submitContactForm error messages", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("points visitors to the public contact address when offline", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(submitContactForm(new FormData(), formData, "tok")).rejects.toThrow(
      /hello@oceaniccoder\.dev/,
    );
  });

  it("points visitors to the public contact address when the form service refuses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false }), { status: 200 })),
    );
    await expect(submitContactForm(new FormData(), formData, "tok")).rejects.toThrow(
      /hello@oceaniccoder\.dev/,
    );
  });
});
