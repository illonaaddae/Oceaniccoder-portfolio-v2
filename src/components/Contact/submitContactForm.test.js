import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

const mode = vi.hoisted(() => ({ usesCosmos: false }));
const createMessage = vi.hoisted(() => vi.fn());

vi.mock("../../services/api", () => ({ createMessage }));
vi.mock("../../services/api/dataApi", () => ({
  get usesCosmos() {
    return mode.usesCosmos;
  },
}));

const { submitContactForm } = await import("./submitContactForm");

const formData = { name: "Ada", email: "ada@example.com", subject: "Hi", message: "Hello" };
const savedRow = { ...formData, status: "new" };
const web3formsOk = () =>
  vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));

beforeEach(() => {
  mode.usesCosmos = false;
  createMessage.mockReset();
  createMessage.mockResolvedValue({});
});

afterEach(() => vi.unstubAllGlobals());

describe("submitContactForm on Appwrite", () => {
  it("sends to Web3Forms and saves a copy", async () => {
    const fetchMock = web3formsOk();
    vi.stubGlobal("fetch", fetchMock);

    const result = await submitContactForm(new FormData(), formData, null);

    expect(fetchMock).toHaveBeenCalledWith("https://api.web3forms.com/submit", expect.anything());
    expect(fetchMock.mock.calls[0][1].body.get("access_key")).toBeTruthy();
    expect(createMessage).toHaveBeenCalledWith(savedRow, null);
    expect(result.success).toBe(true);
  });

  it("still succeeds when the database copy fails, since Web3Forms sent the email", async () => {
    vi.stubGlobal("fetch", web3formsOk());
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    createMessage.mockImplementation(() => Promise.reject(new Error("db down")));

    await expect(submitContactForm(new FormData(), formData, null)).resolves.toMatchObject({
      success: true,
    });
    await vi.waitFor(() => expect(warn).toHaveBeenCalled());
    warn.mockRestore();
  });

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

describe("submitContactForm on Cosmos", () => {
  beforeEach(() => {
    mode.usesCosmos = true;
  });

  it("never calls Web3Forms and saves through /api/submit with the Turnstile token", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await submitContactForm(new FormData(), formData, "tok");

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

    const pending = submitContactForm(new FormData(), formData, "tok").then(() => (settled = true));
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

    await expect(submitContactForm(new FormData(), formData, "tok")).rejects.toThrow(
      "The spam check failed. Please try again.",
    );
  });

  it("gives up after 30 seconds with the timeout message", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    createMessage.mockImplementation(() =>
      Promise.reject(Object.assign(new Error("signal timed out"), { name: "TimeoutError" })),
    );

    await expect(submitContactForm(new FormData(), formData, "tok")).rejects.toThrow(
      "Request timed out. Please check your internet connection and try again.",
    );
    expect(timeout).toHaveBeenCalledWith(30000);
    timeout.mockRestore();
  });

  it("points visitors to the public contact address when offline", async () => {
    createMessage.mockImplementation(() => Promise.reject(new TypeError("Failed to fetch")));

    await expect(submitContactForm(new FormData(), formData, "tok")).rejects.toThrow(
      /hello@oceaniccoder\.dev/,
    );
  });
});
