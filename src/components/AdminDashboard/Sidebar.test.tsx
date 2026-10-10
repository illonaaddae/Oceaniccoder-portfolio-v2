import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "./Sidebar";

const props = { activeTab: "overview", onTabChange: () => {}, theme: "dark" };

describe("Sidebar quote tabs", () => {
  it("shows Quotes and Emails to the admin", () => {
    render(<Sidebar {...props} />);
    expect(screen.getAllByText("Quotes").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Emails").length).toBeGreaterThan(0);
  });

  it("hides Quotes and Emails on the read-only dashboard", () => {
    render(<Sidebar {...props} isReadOnly />);
    expect(screen.queryByText("Quotes")).toBeNull();
    expect(screen.queryByText("Emails")).toBeNull();
  });
});
