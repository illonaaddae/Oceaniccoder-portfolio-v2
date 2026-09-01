import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BlogFormActions } from "./BlogFormActions";

afterEach(cleanup);

const setup = (props: Partial<React.ComponentProps<typeof BlogFormActions>> = {}) => {
  const onSendTest = vi.fn().mockResolvedValue(undefined);
  render(
    <BlogFormActions
      theme="light"
      submitting={false}
      isEditing={false}
      onCancel={() => {}}
      onSendTest={onSendTest}
      {...props}
    />,
  );
  return { onSendTest };
};

describe("BlogFormActions", () => {
  it("offers a test send alongside save and cancel", () => {
    setup();

    expect(screen.getByRole("button", { name: /send test email/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create post/i })).toBeInTheDocument();
  });

  it("does not submit the form when the test button is pressed", () => {
    // Buttons in a form default to submit; a test send must never publish.
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    cleanup();
    const onSendTest = vi.fn().mockResolvedValue(undefined);
    render(
      <form onSubmit={onSubmit}>
        <BlogFormActions
          theme="light"
          submitting={false}
          isEditing={false}
          onCancel={() => {}}
          onSendTest={onSendTest}
        />
      </form>,
    );

    fireEvent.click(screen.getByRole("button", { name: /send test email/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(onSendTest).toHaveBeenCalledTimes(1);
  });

  it("blocks repeat presses while a test is in flight", async () => {
    let release: () => void = () => {};
    const onSendTest = vi.fn(() => new Promise<void>((r) => (release = r)));
    render(
      <BlogFormActions
        theme="light"
        submitting={false}
        isEditing={false}
        onCancel={() => {}}
        onSendTest={onSendTest}
      />,
    );

    const btn = screen.getByRole("button", { name: /send test email/i });
    fireEvent.click(btn);

    const busy = await screen.findByRole("button", { name: /sending test/i });
    expect(busy).toBeDisabled();

    release();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /send test email/i })).toBeEnabled(),
    );
    expect(onSendTest).toHaveBeenCalledTimes(1);
  });

  it("disables the test send while the post itself is saving", () => {
    setup({ submitting: true });

    expect(screen.getByRole("button", { name: /send test email/i })).toBeDisabled();
  });
});
