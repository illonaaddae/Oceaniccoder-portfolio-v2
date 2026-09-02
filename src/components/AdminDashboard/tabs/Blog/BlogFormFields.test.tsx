import React, { useState } from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BlogPost } from "@/types";
import { BlogFormFields } from "./BlogFormFields";
import { CATEGORIES } from "./constants";

afterEach(cleanup);

const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");

function Harness({ content = "", readTime = "" }: { content?: string; readTime?: string }) {
  const [formData, setFormData] = useState<Partial<BlogPost>>({ content, readTime });
  return <BlogFormFields formData={formData} setFormData={setFormData} theme="light" />;
}

const readTimeInput = () => screen.getByPlaceholderText(/min read/i) as HTMLInputElement;

describe("read time", () => {
  it("fills itself in from the body", () => {
    render(<Harness content={words(450)} />);

    expect(readTimeInput().value).toBe("2 min read");
  });

  it("leaves an empty post's field empty", () => {
    // "0 min read" on a blank draft reads as a bug.
    render(<Harness />);

    expect(readTimeInput().value).toBe("");
  });

  it("stops overwriting once a value is typed by hand", () => {
    // A deliberate "10 min read" must survive further edits to the body.
    render(<Harness content={words(450)} />);

    fireEvent.change(readTimeInput(), { target: { value: "10 min read" } });

    expect(readTimeInput().value).toBe("10 min read");
  });

  it("offers the estimate as a button once the value is manual", () => {
    render(<Harness content={words(450)} readTime="10 min read" />);

    expect(screen.getByRole("button", { name: /use 2 min read/i })).toBeInTheDocument();
  });

  it("applies the estimate when that button is pressed", () => {
    render(<Harness content={words(450)} readTime="10 min read" />);

    fireEvent.click(screen.getByRole("button", { name: /use 2 min read/i }));

    expect(readTimeInput().value).toBe("2 min read");
  });

  it("does not offer a button when the field already matches", () => {
    render(<Harness content={words(450)} readTime="2 min read" />);

    expect(screen.queryByRole("button", { name: /use .* min read/i })).toBeNull();
  });

  it("shows the word count it based the estimate on", () => {
    render(<Harness content={words(450)} />);

    expect(screen.getByText(/450 words/)).toBeInTheDocument();
  });
});

describe("categories", () => {
  it("keeps Other last so it reads as the fallback", () => {
    expect(CATEGORIES[CATEGORIES.length - 1]).toBe("Other");
  });

  it("has no duplicates", () => {
    expect(new Set(CATEGORIES).size).toBe(CATEGORIES.length);
  });

  it("still contains the original set, so existing posts keep their category", () => {
    for (const original of [
      "Development",
      "Leadership",
      "Community",
      "Career",
      "Tutorial",
      "Personal",
      "Tech News",
      "Other",
    ]) {
      expect(CATEGORIES).toContain(original);
    }
  });
});
