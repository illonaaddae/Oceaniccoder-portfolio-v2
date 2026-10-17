import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Project } from "@/types";

const project = { $id: "p1", title: "Shop", $createdAt: "2026-10-01T00:00:00.000Z" } as Project;
const deleteProject = vi.fn(async (_id: string) => {});

vi.mock("@/services/api", () => ({
  getMessages: vi.fn(async () => []),
  getSkills: vi.fn(async () => []),
  getProjects: vi.fn(async () => [project]),
  getCertifications: vi.fn(async () => []),
  getGallery: vi.fn(async () => []),
  getEducation: vi.fn(async () => []),
  getJourney: vi.fn(async () => []),
  getAbout: vi.fn(async () => null),
  getBlogPosts: vi.fn(async () => []),
  getTestimonials: vi.fn(async () => []),
  getSiteViews: vi.fn(async () => 0),
  getStorageStats: vi.fn(() => new Promise(() => {})),
  deleteProject: (id: string) => deleteProject(id),
}));

vi.mock("@/services/api/bookings", () => ({ getBookings: vi.fn(async () => []) }));

import { AdminDashboard } from "./index";

// Regression: useAdminData calls useConfirm() from inside AdminDashboard, so
// the provider has to sit above that component. When it sat below, the hook got
// the context default and every Projects delete was cancelled with no dialog.
describe("AdminDashboard delete confirmation", () => {
  it("asks before deleting a project", async () => {
    render(<AdminDashboard onLogout={() => {}} />);

    fireEvent.click(screen.getByTitle("Projects"));
    const [trash] = await screen.findAllByTitle("Delete project");
    fireEvent.click(trash);

    expect(await screen.findByRole("heading", { name: "Delete project?" })).toBeInTheDocument();
    expect(deleteProject).not.toHaveBeenCalled();
  });
});
