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

describe("Sidebar finance tab", () => {
  it("shows Finance to the admin", () => {
    render(<Sidebar {...props} />);
    expect(screen.getAllByText("Finance").length).toBeGreaterThan(0);
  });

  it("shows the CV tab to the admin", () => {
    render(<Sidebar {...props} />);
    expect(screen.getAllByText("CV").length).toBeGreaterThan(0);
  });

  it("never shows Finance, CV or their Personal group on the public read-only dashboard", () => {
    render(<Sidebar {...props} isReadOnly />);
    expect(screen.queryByText("Finance")).toBeNull();
    expect(screen.queryByText("CV")).toBeNull();
    expect(screen.queryByText("Personal")).toBeNull();
  });
});
