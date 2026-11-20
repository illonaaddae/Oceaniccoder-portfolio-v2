import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const reset = vi.hoisted(() => vi.fn());
const widget = vi.hoisted(() => ({ token: "tok" }));

vi.mock("@/hooks/useTurnstile", () => ({
  useTurnstile: () => ({ ref: vi.fn(), token: widget.token, error: null, reset }),
}));

const { default: Chatbot } = await import("./index");

const respond = (status, body) => ({ ok: status < 400, status, json: async () => body });

function send(text) {
  fireEvent.change(screen.getByPlaceholderText(/ask me anything/i), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
}

describe("Chatbot", () => {
  let fetchMock;

  beforeEach(() => {
    reset.mockReset();
    widget.token = "tok";
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows the daily-limit message and keeps the chat token it returns", async () => {
    const limitMsg = "The assistant has reached its limit for today. Please use the contact form.";
    fetchMock
      .mockImplementationOnce(async () => {
        widget.token = null;
        return respond(429, { error: limitMsg, chatToken: "c1" });
      })
      .mockResolvedValueOnce(respond(200, { reply: "Back again" }));

    render(
      <MemoryRouter>
        <Chatbot />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open chat" }));

    send("Hi");
    expect(await screen.findByText(limitMsg)).toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).turnstileToken).toBe("tok");

    send("Again");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const second = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(second.chatToken).toBe("c1");
    expect(second.turnstileToken).toBeUndefined();
    expect(await screen.findByText("Back again")).toBeInTheDocument();
  });
});
