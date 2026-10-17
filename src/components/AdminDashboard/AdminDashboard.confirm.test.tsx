import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Certification, Project } from "@/types";

const project = { $id: "p1", title: "Shop", $createdAt: "2026-10-01T00:00:00.000Z" } as Project;
const certification = {
  $id: "c1",
  title: "Cloud Practitioner",
  issuer: "AWS",
  $createdAt: "2026-10-01T00:00:00.000Z",
} as Certification;
const deleteProject = vi.fn(async (_id: string) => {});
const deleteCertification = vi.fn(async (_id: string) => {});

vi.mock("@/services/api", () => ({
  getMessages: vi.fn(async () => []),
  getSkills: vi.fn(async () => []),
  getProjects: vi.fn(async () => [project]),
  getCertifications: vi.fn(async () => [certification]),
  getGallery: vi.fn(async () => []),
  getEducation: vi.fn(async () => []),
  getJourney: vi.fn(async () => []),
  getAbout: vi.fn(async () => null),
  getBlogPosts: vi.fn(async () => []),
  getTestimonials: vi.fn(async () => []),
  getSiteViews: vi.fn(async () => 0),
  getStorageStats: vi.fn(() => new Promise(() => {})),
  deleteProject: (id: string) => deleteProject(id),
  deleteCertification: (id: string) => deleteCertification(id),
}));

vi.mock("@/services/api/bookings", () => ({ getBookings: vi.fn(async () => []) }));

import { AdminDashboard } from "./index";

// Regression: useAdminData calls useConfirm() from inside AdminDashboard, so
// the provider has to sit above that component. When it sat below, the hook got
// the context default and every Projects delete was cancelled with no dialog.
describe("AdminDashboard delete confirmation", () => {
  beforeEach(() => {
    deleteProject.mockClear();
    deleteCertification.mockClear();
  });

  it("asks before deleting a project, and deletes it once confirmed", async () => {
    render(<AdminDashboard onLogout={() => {}} />);

    fireEvent.click(screen.getByTitle("Projects"));
    const [trash] = await screen.findAllByTitle("Delete project");
    fireEvent.click(trash);

    expect(await screen.findByRole("heading", { name: "Delete project?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(deleteProject).toHaveBeenCalledWith("p1"));
  });

  it("asks before deleting a certification, and deletes it once confirmed", async () => {
    render(<AdminDashboard onLogout={() => {}} />);

    fireEvent.click(screen.getByTitle("Certifications"));
    const [trash] = await screen.findAllByTitle("Delete certification");
    fireEvent.click(trash);

    expect(
      await screen.findByRole("heading", { name: "Delete certification?" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(deleteCertification).toHaveBeenCalledWith("c1"));
  });

  it("deletes nothing when the dialog is cancelled", async () => {
    render(<AdminDashboard onLogout={() => {}} />);

    fireEvent.click(screen.getByTitle("Projects"));
    const [trash] = await screen.findAllByTitle("Delete project");
    fireEvent.click(trash);

    await screen.findByRole("heading", { name: "Delete project?" });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Delete project?" })).not.toBeInTheDocument(),
    );
    expect(deleteProject).not.toHaveBeenCalled();
  });
});
