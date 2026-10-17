import { act, render, screen } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import AdminLogin from "./AdminLogin";
import { getSwaUser } from "@/services/api/session";

type SwaUser = {
  identityProvider: string;
  userId: string;
  userDetails: string;
  userRoles: string[];
};

const mode = vi.hoisted(() => ({ usesCosmos: false, user: null as SwaUser | null }));

vi.mock("@/services/api/dataApi", () => ({
  get usesCosmos() {
    return mode.usesCosmos;
  },
}));

vi.mock("@/services/api/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/api/session")>()),
  getSwaUser: vi.fn(async () => mode.user),
}));

vi.mock("@/services/api", () => ({ requestPasswordRecovery: vi.fn() }));

const githubLink = () => screen.queryByRole("link", { name: /sign in with github/i });

describe("AdminLogin", () => {
  beforeEach(() => {
    mode.usesCosmos = false;
    mode.user = null;
    vi.mocked(getSwaUser).mockClear();
  });

  test("keeps the password form while the site runs on Appwrite", () => {
    render(<AdminLogin onLogin={vi.fn()} />);

    expect(screen.getByPlaceholderText("Enter password...")).toBeInTheDocument();
    expect(githubLink()).not.toBeInTheDocument();
  });

  test("shows only GitHub sign-in on Cosmos", async () => {
    mode.usesCosmos = true;
    render(<AdminLogin onLogin={vi.fn()} />);

    expect(githubLink()).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Enter password...")).not.toBeInTheDocument();
  });

  test("shows a signed-in non-admin their id on Cosmos", async () => {
    mode.usesCosmos = true;
    mode.user = {
      identityProvider: "github",
      userId: "abc123",
      userDetails: "someone",
      userRoles: [],
    };
    render(<AdminLogin onLogin={vi.fn()} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Your sign-in id is abc123");
  });

  test("shows no id message to the admin", async () => {
    mode.usesCosmos = true;
    mode.user = {
      identityProvider: "github",
      userId: "abc123",
      userDetails: "admin",
      userRoles: ["anonymous", "authenticated", "admin"],
    };
    render(<AdminLogin onLogin={vi.fn()} />);

    // Let the session lookup settle before checking nothing was shown.
    await act(() => vi.mocked(getSwaUser).mock.results[0].value);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
