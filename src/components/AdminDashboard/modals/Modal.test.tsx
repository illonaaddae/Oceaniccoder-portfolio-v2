import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Modal } from "./Modal";

afterEach(cleanup);

const open = (props: Partial<React.ComponentProps<typeof Modal>> = {}) =>
  render(
    <Modal isOpen onClose={() => {}} title="Create New Blog Post" theme="light" {...props}>
      <p>body</p>
    </Modal>,
  );

describe("admin Modal", () => {
  it("offsets itself past the sidebar so it is not centred under it", () => {
    // Centred on the viewport, max-w-3xl leaves roughly the sidebar's own
    // width of slack per side — so the modal's left edge lands on the sidebar
    // and every bit of the gap piles up on the right. The offset (sidebar
    // width plus the container's own padding) puts it in the middle of the
    // area actually available beside it.
    const { container } = open();

    const centering = container.querySelector(".min-h-dvh");
    expect(centering).toHaveClass("lg:pl-[calc(var(--admin-sidebar-w,0px)+1rem)]");
  });

  it("renders its title and children", () => {
    open();

    expect(screen.getByRole("heading", { name: "Create New Blog Post" })).toBeInTheDocument();
    expect(screen.getByText("body")).toBeInTheDocument();
  });

  it("closes on Escape and on a backdrop click", () => {
    const onClose = vi.fn();
    const { container } = open({ onClose });

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(container.querySelector(".bg-black\\/60") as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("renders nothing when closed", () => {
    const { container } = render(
      <Modal isOpen={false} onClose={() => {}} title="Hidden" theme="light">
        <p>body</p>
      </Modal>,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
