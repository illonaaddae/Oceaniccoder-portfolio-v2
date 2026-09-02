import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CredentialBadge from "./CredentialBadge";

const UUID = "2234490f-2d2d-4fea-90a9-575e6990781f";

describe("CredentialBadge", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("middle-truncates an opaque id and keeps the full value in the title", () => {
    render(<CredentialBadge credential={UUID} />);
    expect(screen.getByText("2234490f…90781f")).toBeInTheDocument();
    expect(screen.getByTitle(UUID)).toBeInTheDocument();
  });

  it("copies the full id to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<CredentialBadge credential={UUID} />);
    fireEvent.click(screen.getByRole("button", { name: /copy credential id/i }));

    expect(writeText).toHaveBeenCalledWith(UUID);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /credential id copied/i })).toBeInTheDocument(),
    );
  });

  it("renders a human label in full without a copy button", () => {
    render(<CredentialBadge credential="Professional Certificate" />);
    expect(screen.getByText("Professional Certificate")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders nothing when there is no credential", () => {
    const { container } = render(<CredentialBadge credential="  " />);
    expect(container).toBeEmptyDOMElement();
  });
});
