import React, { useRef, useState } from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BlogPost } from "@/types";
import { BlogContentEditor } from "./BlogContentEditor";

// The upload widget talks to Appwrite storage; the editor's behaviour does not
// depend on it.
vi.mock("../../ImageUpload", () => ({
  ImageUpload: () => <div data-testid="image-upload" />,
}));

afterEach(cleanup);

/**
 * Mirrors how BlogPostFormModal wires the editor: form state lives above it,
 * and the textarea ref is owned by the parent. The pure selection maths is
 * covered in markdownActions.test.ts — these cover the wiring, which is where
 * the caret and the ref can actually go wrong.
 */
function Harness({ initial = "" }: { initial?: string }) {
  const [formData, setFormData] = useState<Partial<BlogPost>>({ content: initial });
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [showUpload, setShowUpload] = useState(false);

  return (
    <BlogContentEditor
      formData={formData}
      setFormData={setFormData}
      theme="light"
      showContentImageUpload={showUpload}
      setShowContentImageUpload={setShowUpload}
      insertImageToContent={() => {}}
      contentTextareaRef={contentTextareaRef}
    />
  );
}

const textarea = () => screen.getByRole("textbox") as HTMLTextAreaElement;

function select(from: number, to: number) {
  const el = textarea();
  el.focus();
  el.setSelectionRange(from, to);
}

describe("BlogContentEditor toolbar", () => {
  it("formats the selected text when a toolbar button is clicked", () => {
    render(<Harness initial="hello world" />);
    select(6, 11);

    fireEvent.click(screen.getByRole("button", { name: "Bold" }));

    expect(textarea().value).toBe("hello **world**");
  });

  it("applies a heading to the current line", () => {
    render(<Harness initial="My title" />);
    select(3, 3);

    fireEvent.click(screen.getByRole("button", { name: "Heading" }));

    expect(textarea().value).toBe("## My title");
  });

  it("builds a link with the selection as the label", () => {
    render(<Harness initial="read the docs" />);
    select(9, 13);

    fireEvent.click(screen.getByRole("button", { name: "Link" }));

    expect(textarea().value).toBe("read the [docs](url)");
  });

  it("supports the keyboard shortcut as well as the button", () => {
    render(<Harness initial="hello world" />);
    select(0, 5);

    fireEvent.keyDown(textarea(), { key: "b", metaKey: true });

    expect(textarea().value).toBe("**hello** world");
  });

  it("leaves the content alone for an unmodified keypress", () => {
    render(<Harness initial="hello" />);
    select(0, 5);

    fireEvent.keyDown(textarea(), { key: "b" });

    expect(textarea().value).toBe("hello");
  });

  it("does not submit the surrounding form when a toolbar button is clicked", () => {
    // Buttons inside a form default to type="submit"; without type="button"
    // clicking Bold would publish the post.
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Harness initial="hello" />
      </form>,
    );
    select(0, 5);

    fireEvent.click(screen.getByRole("button", { name: "Italic" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("BlogContentEditor preview", () => {
  it("renders the markdown through the same component the public page uses", () => {
    render(<Harness initial={"## A heading\n\nSome **bold** copy."} />);

    fireEvent.click(screen.getByRole("button", { name: /preview/i }));

    expect(screen.getByRole("heading", { name: "A heading" })).toBeInTheDocument();
    expect(screen.getByText("bold").tagName).toBe("STRONG");
    // The raw markdown is no longer on screen while previewing.
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("explains itself when there is nothing to preview", () => {
    render(<Harness initial="   " />);

    fireEvent.click(screen.getByRole("button", { name: /preview/i }));

    expect(screen.getByText(/nothing to preview/i)).toBeInTheDocument();
  });

  it("returns to the editor with the content intact", () => {
    render(<Harness initial="draft copy" />);

    fireEvent.click(screen.getByRole("button", { name: /preview/i }));
    fireEvent.click(screen.getByRole("button", { name: /write/i }));

    expect(textarea().value).toBe("draft copy");
  });
});
