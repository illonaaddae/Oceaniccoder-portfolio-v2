import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CertificationFormModal } from "./CertificationFormModal";
import type { Certification } from "@/types";

const baseProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSubmit: vi.fn().mockResolvedValue(undefined),
  theme: "dark" as const,
};

describe("CertificationFormModal — certification type", () => {
  it("offers the certification type dropdown", () => {
    render(<CertificationFormModal {...baseProps} />);
    expect(screen.getByText("Certification Type")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /certification type/i })).toBeInTheDocument();
  });

  it("hydrates the type from the certification being edited", () => {
    const cert = {
      $id: "1",
      title: "Learn Linux",
      issuer: "Boot.dev",
      date: "September 2026",
      platform: "Boot.dev",
      certificationType: "Course Completion",
      credential: "2234490f-2d2d-4fea-90a9-575e6990781f",
    } as Certification;

    render(<CertificationFormModal {...baseProps} editingCertification={cert} />);
    expect(screen.getByText("Course Completion")).toBeInTheDocument();
  });

  it("reveals a free-text input for a custom type", () => {
    render(<CertificationFormModal {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /certification type/i }));
    // CustomSelect commits on mousedown, not click.
    fireEvent.mouseDown(screen.getByText("+ Custom / Other"));
    expect(screen.getByLabelText("Custom certification type")).toBeInTheDocument();
  });
});
