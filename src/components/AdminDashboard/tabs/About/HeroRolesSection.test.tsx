import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getHeroRoles = vi.fn();
const setHeroRoles = vi.fn();

vi.mock("@/services/api/settings", () => ({
  getHeroRoles: () => getHeroRoles(),
  setHeroRoles: (roles: string[]) => setHeroRoles(roles),
}));

const { HeroRolesSection } = await import("./HeroRolesSection");

const shownOrder = () =>
  screen.getAllByRole("listitem").map((li) => li.textContent?.replace(/^\s*\d+/, "").trim());

/** Minimal dataTransfer stub — jsdom fires drag events but never supplies one. */
const dataTransfer = () => ({
  effectAllowed: "",
  dropEffect: "",
  setData: vi.fn(),
  getData: vi.fn(),
});

describe("HeroRolesSection", () => {
  beforeEach(() => {
    getHeroRoles.mockReset();
    setHeroRoles.mockReset();
    getHeroRoles.mockResolvedValue(["First", "Second", "Third"]);
    setHeroRoles.mockResolvedValue(undefined);
  });

  it("reorders a role when it is dragged onto another row", async () => {
    render(<HeroRolesSection theme="dark" isReadOnly={false} />);
    await waitFor(() => expect(screen.getByText("First")).toBeInTheDocument());

    const rows = screen.getAllByRole("listitem");
    fireEvent.dragStart(rows[0], { dataTransfer: dataTransfer() });
    fireEvent.dragOver(rows[2], { dataTransfer: dataTransfer() });
    fireEvent.drop(rows[2], { dataTransfer: dataTransfer() });

    expect(shownOrder()).toEqual(["Second", "Third", "First"]);
  });

  it("saves the dragged order", async () => {
    render(<HeroRolesSection theme="dark" isReadOnly={false} />);
    await waitFor(() => expect(screen.getByText("First")).toBeInTheDocument());

    const rows = screen.getAllByRole("listitem");
    fireEvent.dragStart(rows[2], { dataTransfer: dataTransfer() });
    fireEvent.dragOver(rows[0], { dataTransfer: dataTransfer() });
    fireEvent.drop(rows[0], { dataTransfer: dataTransfer() });

    fireEvent.click(screen.getByRole("button", { name: /save roles/i }));
    await waitFor(() => expect(setHeroRoles).toHaveBeenCalledWith(["Third", "First", "Second"]));
  });

  it("still reorders with the arrow buttons", async () => {
    render(<HeroRolesSection theme="dark" isReadOnly={false} />);
    await waitFor(() => expect(screen.getByText("First")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Move Third up" }));
    expect(shownOrder()).toEqual(["First", "Third", "Second"]);
  });

  it("adds a new role to the end of the list", async () => {
    render(<HeroRolesSection theme="dark" isReadOnly={false} />);
    await waitFor(() => expect(screen.getByText("First")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("New role"), { target: { value: "Fourth" } });
    fireEvent.click(screen.getByRole("button", { name: "Add role" }));

    expect(shownOrder()).toEqual(["First", "Second", "Third", "Fourth"]);
  });

  it("does not make rows draggable in read-only mode", async () => {
    render(<HeroRolesSection theme="dark" isReadOnly />);
    await waitFor(() => expect(screen.getByText("First")).toBeInTheDocument());

    screen.getAllByRole("listitem").forEach((li) => {
      expect(li).not.toHaveAttribute("draggable", "true");
    });
  });
});
