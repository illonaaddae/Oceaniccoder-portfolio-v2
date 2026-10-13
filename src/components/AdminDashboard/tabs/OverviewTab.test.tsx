import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/services/api", () => ({
  getStorageStats: vi.fn(() => new Promise(() => {})),
}));

import { OverviewTab } from "./OverviewTab";
import type { Certification, Project } from "@/types";

const recent = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

describe("OverviewTab stat cards", () => {
  it("derives the change lines from the data instead of fixed text", () => {
    render(
      <OverviewTab
        theme="dark"
        totalProjects={1}
        filteredSkills={[]}
        totalCertifications={1}
        totalGallery={0}
        newMessages={0}
        totalMessages={0}
        activityProjects={[{ $id: "p1", title: "Shop", $createdAt: recent } as Project]}
        activityCertifications={[
          { $id: "c1", title: "Azure Fundamentals", $createdAt: recent } as Certification,
        ]}
        siteViews={42}
      />,
    );
    expect(screen.getByText("+1 in 30 days")).toBeInTheDocument();
    expect(screen.getByText("Latest: Azure Fundamentals")).toBeInTheDocument();
    expect(screen.getByText("Site Sessions")).toBeInTheDocument();
    expect(screen.queryByText("+2 this mo")).not.toBeInTheDocument();
    expect(screen.queryByText("Latest: AWS Cloud")).not.toBeInTheDocument();
    expect(screen.queryByText("Total page visits")).not.toBeInTheDocument();
  });
});
