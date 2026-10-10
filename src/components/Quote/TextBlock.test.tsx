import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TextBlock from "./TextBlock";

describe("TextBlock", () => {
  it("renders bullets as a list and paragraphs as text", () => {
    render(<TextBlock text={"Intro line\n- One\n- Two\n\nAfter"} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Intro line")).toBeInTheDocument();
    expect(screen.getByText("After")).toBeInTheDocument();
  });
  it("links https URLs and never renders HTML", () => {
    const { container } = render(<TextBlock text={"See https://example.com/a <b>bold</b>"} />);
    expect(screen.getByRole("link", { name: "https://example.com/a" })).toHaveAttribute(
      "href",
      "https://example.com/a",
    );
    expect(container.querySelector("b")).toBeNull();
  });
});
