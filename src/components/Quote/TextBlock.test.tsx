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
  it("shows HTML and non-https schemes as plain text", () => {
    render(<TextBlock text={"<b>bold</b> javascript:alert(1) http://x.com"} />);
    expect(screen.getByText(/<b>bold<\/b>/)).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });
  it("keeps trailing punctuation out of the link", () => {
    const { container } = render(<TextBlock text={"(see https://example.com/a)."} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "https://example.com/a");
    expect(container.textContent).toBe("(see https://example.com/a).");
  });
  it("treats -, • and * markers as bullets even without a space", () => {
    render(<TextBlock text={"-The 60% / 40% payments\n•Second\n* Third\n*Fourth"} />);
    const items = screen.getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual([
      "The 60% / 40% payments",
      "Second",
      "Third",
      "Fourth",
    ]);
  });
  it("keeps plain paragraphs as paragraphs", () => {
    render(<TextBlock text={"Just text - with a dash"} />);
    expect(screen.queryByRole("listitem")).toBeNull();
  });
});
