import { describe, it, expect, vi, afterEach } from "vitest";
import { logoutAdmin } from "./auth";

describe("logoutAdmin", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("signs out and comes back to the admin sign-in page, not the website", () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    logoutAdmin();
    expect(assign).toHaveBeenCalledWith(
      "/.auth/logout?post_logout_redirect_uri=%2Fadmin%2Fdashboard",
    );
  });
});
