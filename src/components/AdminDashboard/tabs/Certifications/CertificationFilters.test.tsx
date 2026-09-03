import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CertificationsTab } from "../CertificationsTab";
import type { Certification } from "@/types";

const cert = (extra: Partial<Certification>): Certification =>
  ({
    $id: extra.title as string,
    title: "T",
    issuer: "I",
    platform: "P",
    date: "May 2025",
    ...extra,
  }) as Certification;

const certifications = [
  cert({
    title: "Learn Linux",
    issuer: "Boot.dev",
    platform: "Boot.dev",
    date: "September 2026",
    certificationType: "Course Completion",
  }),
  cert({
    title: "Intermediate Python",
    issuer: "DataCamp",
    platform: "DataCamp",
    date: "July 2026",
    certificationType: "Professional Certificate",
  }),
  cert({
    title: "AWS Practitioner",
    issuer: "Amazon",
    platform: "AWS",
    date: "2022",
    certificationType: "Cloud Certification",
  }),
];

const renderTab = () =>
  render(
    <CertificationsTab
      theme="dark"
      loading={false}
      filteredCertifications={certifications}
      onDelete={vi.fn()}
      onEdit={vi.fn()}
      onShowForm={vi.fn()}
    />,
  );

describe("CertificationsTab filters", () => {
  it("shows the total before any filter is applied", () => {
    renderTab();
    expect(screen.getByText("3 certifications")).toBeInTheDocument();
  });

  it("narrows the table by search", () => {
    renderTab();
    fireEvent.change(screen.getByLabelText("Search certifications"), {
      target: { value: "python" },
    });

    expect(screen.getByText("Intermediate Python")).toBeInTheDocument();
    expect(screen.queryByText("Learn Linux")).not.toBeInTheDocument();
    expect(screen.getByText("Showing 1 of 3")).toBeInTheDocument();
  });

  it("narrows the table by platform", () => {
    renderTab();
    fireEvent.click(screen.getByRole("button", { name: "Filter by platform" }));
    // CustomSelect commits on mousedown, not click.
    fireEvent.mouseDown(screen.getByRole("option", { name: "AWS" }));

    expect(screen.getByText("AWS Practitioner")).toBeInTheDocument();
    expect(screen.queryByText("Learn Linux")).not.toBeInTheDocument();
  });

  it("explains an empty result and clears back to the full list", () => {
    renderTab();
    fireEvent.change(screen.getByLabelText("Search certifications"), {
      target: { value: "nothing matches this" },
    });
    expect(screen.getByText("No certifications match these filters.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /clear filters/i }));
    expect(screen.getByText("Learn Linux")).toBeInTheDocument();
    expect(screen.getByText("3 certifications")).toBeInTheDocument();
  });
});
