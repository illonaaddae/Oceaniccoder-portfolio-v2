import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

const createMessage = vi.hoisted(() => vi.fn());

vi.mock("../../services/api", () => ({ createMessage }));

const { submitContactForm } = await import("./submitContactForm");

const formData = { name: "Ada", email: "ada@example.com", subject: "Hi", message: "Hello" };
const savedRow = { ...formData, status: "new" };

beforeEach(() => {
  createMessage.mockReset();
  createMessage.mockResolvedValue({});
});

afterEach(() => vi.unstubAllGlobals());

describe("submitContactForm", () => {
  it("never calls Web3Forms and saves through /api/submit with the Turnstile token", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await submitContactForm(formData, "tok");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(createMessage).toHaveBeenCalledWith(savedRow, "tok", {
      signal: expect.any(AbortSignal),
    });
    expect(result.success).toBe(true);
  });

  it("waits for the save before reporting success", async () => {
    let finishSave;
    createMessage.mockReturnValue(new Promise((resolve) => (finishSave = resolve)));
    let settled = false;

    const pending = submitContactForm(formData, "tok").then(() => (settled = true));
    await Promise.resolve();
    expect(settled).toBe(false);

    finishSave({});
    await pending;
    expect(settled).toBe(true);
  });

  it("passes the server's error through, such as a failed spam check", async () => {
    createMessage.mockImplementation(() =>
      Promise.reject(new Error("The spam check failed. Please try again.")),
    );

    await expect(submitContactForm(formData, "tok")).rejects.toThrow(
      "The spam check failed. Please try again.",
    );
  });

  it("gives up after 30 seconds with the timeout message", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    createMessage.mockImplementation(() =>
      Promise.reject(Object.assign(new Error("signal timed out"), { name: "TimeoutError" })),
    );

    await expect(submitContactForm(formData, "tok")).rejects.toThrow(
      "Request timed out. Please check your internet connection and try again.",
    );
    expect(timeout).toHaveBeenCalledWith(30000);
    timeout.mockRestore();
  });

  it("points visitors to the public contact address when offline", async () => {
    createMessage.mockImplementation(() => Promise.reject(new TypeError("Failed to fetch")));

    await expect(submitContactForm(formData, "tok")).rejects.toThrow(/hello@oceaniccoder\.dev/);
  });
});
