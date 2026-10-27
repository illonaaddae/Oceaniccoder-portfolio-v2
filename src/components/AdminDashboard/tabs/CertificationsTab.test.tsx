import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CertificationsTab } from "./CertificationsTab";
import type { Certification } from "@/types";

const certification = {
  $id: "c1",
  title: "Cloud Practitioner",
  issuer: "AWS",
  platform: "AWS",
  date: "2022",
} as Certification;

describe("CertificationsTab delete error", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("keeps the error until it is dismissed", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <CertificationsTab
        theme="dark"
        loading={false}
        filteredCertifications={[certification]}
        onDelete={async () => {
          throw new Error("network down");
        }}
      />,
    );

    fireEvent.click(screen.getByTitle("Delete certification"));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Failed to delete certification. Please try again.",
    );

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByRole("alert")).toBeInTheDocument();

    const dismiss = screen.getByRole("button", { name: "Dismiss error" });
    expect(dismiss).toHaveAttribute("type", "button");
    fireEvent.click(dismiss);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
