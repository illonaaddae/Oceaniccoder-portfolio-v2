import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const reset = vi.hoisted(() => vi.fn());
const widget = vi.hoisted(() => ({ token: "tok" }));

vi.mock("@/hooks/useTurnstile", () => ({
  useTurnstile: () => ({ ref: vi.fn(), token: widget.token, error: null, reset }),
}));

const { default: NewsletterSignup } = await import("./NewsletterSignup");

function subscribe(email = "ada@example.com") {
  fireEvent.change(screen.getByPlaceholderText("your@email.com"), { target: { value: email } });
  fireEvent.click(screen.getByRole("button", { name: /subscribe/i }));
}

describe("NewsletterSignup", () => {
  let fetchMock;

  beforeEach(() => {
    reset.mockReset();
    widget.token = "tok";
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends the Turnstile token with the email", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    render(<NewsletterSignup />);

    subscribe();

    expect(await screen.findByText(/you're subscribed/i)).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/newsletter-signup$/);
    expect(JSON.parse(init.body)).toEqual({ email: "ada@example.com", turnstileToken: "tok" });
    expect(reset).toHaveBeenCalled();
  });

  it("shows the server's error and resets the single-use token", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Too many sign-ups. Please try again later." }),
    });
    render(<NewsletterSignup />);

    subscribe();

    expect(await screen.findByText(/too many sign-ups/i)).toBeInTheDocument();
    expect(reset).toHaveBeenCalled();
  });
});
