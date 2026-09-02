import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getHeroRoles = vi.fn();
vi.mock("@/services/api/settings", () => ({
  getHeroRoles: (...a) => getHeroRoles(...a),
}));

const { useHeroRoles } = await import("./useHeroRoles");
const { roles: DEFAULT_ROLES } = await import("./heroData");

function Consumer() {
  const roles = useHeroRoles();
  return <div data-testid="roles">{roles.join("|")}</div>;
}

const shown = () => screen.getByTestId("roles").textContent;

describe("useHeroRoles", () => {
  beforeEach(() => getHeroRoles.mockReset());

  it("starts on the bundled defaults before settings resolve", async () => {
    let resolveRoles;
    getHeroRoles.mockReturnValue(
      new Promise((resolve) => {
        resolveRoles = resolve;
      }),
    );
    render(<Consumer />);
    expect(shown()).toBe(DEFAULT_ROLES.join("|"));
    resolveRoles([]);
    await waitFor(() => expect(getHeroRoles).toHaveBeenCalled());
  });

  it("swaps in dashboard-managed roles", async () => {
    getHeroRoles.mockResolvedValue(["Cloud Engineer", "Robotics Tinkerer"]);
    render(<Consumer />);
    await waitFor(() => expect(shown()).toBe("Cloud Engineer|Robotics Tinkerer"));
  });

  it("keeps the defaults when nothing is saved", async () => {
    getHeroRoles.mockResolvedValue([]);
    render(<Consumer />);
    await waitFor(() => expect(getHeroRoles).toHaveBeenCalled());
    expect(shown()).toBe(DEFAULT_ROLES.join("|"));
  });
});
