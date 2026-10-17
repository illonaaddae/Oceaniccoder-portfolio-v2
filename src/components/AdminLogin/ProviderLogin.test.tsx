import { render, screen } from "@testing-library/react";
import { describe, test, expect } from "vitest";
import ProviderLogin from "./ProviderLogin";

describe("ProviderLogin", () => {
  test("signs in through the GitHub provider and returns to the dashboard", () => {
    render(<ProviderLogin theme="dark" />);

    expect(screen.getByRole("link", { name: /sign in with github/i })).toHaveAttribute(
      "href",
      "/.auth/login/github?post_login_redirect_uri=%2Fadmin%2Fdashboard",
    );
  });

  test("offers GitHub as the only way in", () => {
    render(<ProviderLogin theme="light" />);

    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText(/email/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  test("shows a signed-in non-admin their id to add to ADMIN_USER_IDS", () => {
    render(<ProviderLogin theme="dark" signedInId="abc123" />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("this account isn't the site admin");
    expect(alert).toHaveTextContent("Your sign-in id is abc123");
    expect(alert).toHaveTextContent("ADMIN_USER_IDS");
  });

  test("lets a signed-in non-admin sign out", () => {
    render(<ProviderLogin theme="light" signedInId="abc123" />);

    expect(screen.getByRole("link", { name: "Sign out" })).toHaveAttribute(
      "href",
      "/.auth/logout?post_logout_redirect_uri=%2F",
    );
  });

  test("breaks only the long id, not the sentence around it", () => {
    render(<ProviderLogin theme="dark" signedInId="abc123" />);

    expect(screen.getByText("abc123")).toHaveClass("break-all");
    expect(screen.getByText(/Setting up\?/)).not.toHaveClass("break-all");
  });
});
