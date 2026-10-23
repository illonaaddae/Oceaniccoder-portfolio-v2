import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const createMessage = vi.hoisted(() => vi.fn());
const reset = vi.hoisted(() => vi.fn());
const widget = vi.hoisted(() => ({ token: "tok" }));

vi.mock("../../services/api", () => ({ createMessage }));
vi.mock("@/hooks/useTurnstile", () => ({
  useTurnstile: () => ({ active: false, ref: vi.fn(), token: widget.token, error: null, reset }),
}));
// The real checks need the form open for 3 seconds; they have their own rules.
vi.mock("./validateForm", () => ({ validateForm: () => ({ valid: true }) }));

const { default: ContactForm } = await import("./ContactForm");

function fillAndSend() {
  fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: "Ada" } });
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "ada@example.com" } });
  fireEvent.change(screen.getByLabelText(/subject/i), { target: { value: "Hi" } });
  fireEvent.change(screen.getByLabelText(/message/i), { target: { value: "Hello there" } });
  fireEvent.click(screen.getByRole("button", { name: /send message/i }));
}

describe("ContactForm", () => {
  let fetchMock;

  beforeEach(() => {
    createMessage.mockReset();
    reset.mockReset();
    widget.token = "tok";
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("has no Web3Forms action or access key", () => {
    const { container } = render(<ContactForm />);

    expect(container.querySelector("form")).not.toHaveAttribute("action");
    expect(container.querySelector('input[name="access_key"]')).toBeNull();
  });

  it("shows success once /api/submit has saved the message", async () => {
    createMessage.mockResolvedValue({});
    render(<ContactForm />);

    fillAndSend();

    expect(await screen.findByRole("status")).toHaveTextContent(/received your message/i);
    expect(createMessage).toHaveBeenCalledWith(
      {
        name: "Ada",
        email: "ada@example.com",
        subject: "Hi",
        message: "Hello there",
        status: "new",
      },
      "tok",
      { signal: expect.any(AbortSignal) },
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the server's error and gets a fresh spam-check token", async () => {
    createMessage.mockImplementation(() =>
      Promise.reject(new Error("The spam check failed. Please try again.")),
    );
    render(<ContactForm />);

    fillAndSend();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /the spam check failed\. please try again\..*hello@oceaniccoder\.dev/i,
    );
    expect(screen.queryByRole("status")).toBeNull();
    expect(reset).toHaveBeenCalled();
  });

  it("leaves the spam check alone when it had no token yet", async () => {
    widget.token = null;
    createMessage.mockImplementation(() =>
      Promise.reject(new Error("Please wait for the spam check to finish, then try again.")),
    );
    render(<ContactForm />);

    fillAndSend();

    expect(await screen.findByRole("alert")).toHaveTextContent(/wait for the spam check/i);
    expect(reset).not.toHaveBeenCalled();
  });
});
