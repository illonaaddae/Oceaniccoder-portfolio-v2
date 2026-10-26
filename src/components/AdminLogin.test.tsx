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

const mode = vi.hoisted(() => ({ user: null as SwaUser | null }));

vi.mock("@/services/api/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/api/session")>()),
  getSwaUser: vi.fn(async () => mode.user),
}));

const githubLink = () => screen.queryByRole("link", { name: /sign in with github/i });

describe("AdminLogin", () => {
  beforeEach(() => {
    mode.user = null;
    vi.mocked(getSwaUser).mockClear();
  });

  test("offers only GitHub sign-in, with no password field", async () => {
    render(<AdminLogin />);

    expect(githubLink()).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Enter password...")).not.toBeInTheDocument();
    expect(screen.queryByText(/password protected/)).not.toBeInTheDocument();
    expect(screen.getByText("This dashboard is for the site admin only.")).toBeInTheDocument();
    await act(() => vi.mocked(getSwaUser).mock.results[0].value);
  });

  test("names the theme toggle for screen readers", async () => {
    render(<AdminLogin />);

    expect(
      screen.getByRole("button", { name: /^switch to (light|dark) theme$/i }),
    ).toBeInTheDocument();
    await act(() => vi.mocked(getSwaUser).mock.results[0].value);
  });

  test("shows a signed-in non-admin their id", async () => {
    mode.user = {
      identityProvider: "github",
      userId: "abc123",
      userDetails: "someone",
      userRoles: [],
    };
    render(<AdminLogin />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Your sign-in id is abc123");
  });

  test("shows no id message to the admin", async () => {
    mode.user = {
      identityProvider: "github",
      userId: "abc123",
      userDetails: "admin",
      userRoles: ["anonymous", "authenticated", "admin"],
    };
    render(<AdminLogin />);

    // Let the session lookup settle before checking nothing was shown.
    await act(() => vi.mocked(getSwaUser).mock.results[0].value);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
