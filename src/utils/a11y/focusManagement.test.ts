/**
 * Focus Management (trapFocus) Tests
 * @module utils/a11y/focusManagement.test
 */

import { describe, it, expect, afterEach } from "vitest";
import { trapFocus } from "./focusManagement";

function dispatchTab(target: HTMLElement, shiftKey = false) {
  const event = new KeyboardEvent("keydown", {
    key: "Tab",
    shiftKey,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event;
}

describe("trapFocus", () => {
  let cleanup: (() => void) | null = null;

  afterEach(() => {
    cleanup?.();
    cleanup = null;
    document.body.innerHTML = "";
  });

  it("focuses the first focusable element on activation", () => {
    document.body.innerHTML = `
      <div id="container">
        <button id="b1">One</button>
        <button id="b2">Two</button>
        <button id="b3">Three</button>
      </div>
    `;
    const container = document.getElementById("container") as HTMLElement;
    cleanup = trapFocus(container);

    expect(document.activeElement?.id).toBe("b1");
  });

  it("wraps focus from last -> first on Tab", () => {
    document.body.innerHTML = `
      <div id="container">
        <button id="b1">One</button>
        <button id="b2">Two</button>
        <button id="b3">Three</button>
      </div>
    `;
    const container = document.getElementById("container") as HTMLElement;
    const last = document.getElementById("b3") as HTMLElement;
    cleanup = trapFocus(container);

    last.focus();
    expect(document.activeElement?.id).toBe("b3");

    const event = dispatchTab(last, false);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement?.id).toBe("b1");
  });

  it("wraps focus from first -> last on Shift+Tab", () => {
    document.body.innerHTML = `
      <div id="container">
        <button id="b1">One</button>
        <button id="b2">Two</button>
        <button id="b3">Three</button>
      </div>
    `;
    const container = document.getElementById("container") as HTMLElement;
    const first = document.getElementById("b1") as HTMLElement;
    cleanup = trapFocus(container);

    expect(document.activeElement?.id).toBe("b1");

    const event = dispatchTab(first, true);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement?.id).toBe("b3");
  });

  it("does not interfere when focus is mid-list and Tab is pressed", () => {
    // The trap only intervenes at boundaries; mid-list Tab should not be prevented.
    document.body.innerHTML = `
      <div id="container">
        <button id="b1">One</button>
        <button id="b2">Two</button>
        <button id="b3">Three</button>
      </div>
    `;
    const container = document.getElementById("container") as HTMLElement;
    const mid = document.getElementById("b2") as HTMLElement;
    cleanup = trapFocus(container);

    mid.focus();
    const event = dispatchTab(mid, false);
    expect(event.defaultPrevented).toBe(false);
  });

  it("skips non-focusable elements (div, span, p)", () => {
    document.body.innerHTML = `
      <div id="container">
        <div id="d1">Not focusable</div>
        <button id="b1">First</button>
        <p id="p1">Also not focusable</p>
        <button id="b2">Second</button>
        <span id="s1">Nope</span>
      </div>
    `;
    const container = document.getElementById("container") as HTMLElement;
    cleanup = trapFocus(container);

    // Initial focus lands on first focusable, skipping the div
    expect(document.activeElement?.id).toBe("b1");

    // Tabbing from the last focusable wraps to the first focusable (not the span/p)
    const last = document.getElementById("b2") as HTMLElement;
    last.focus();
    dispatchTab(last, false);
    expect(document.activeElement?.id).toBe("b1");
  });

  it("excludes disabled buttons/inputs from focus trap", () => {
    document.body.innerHTML = `
      <div id="container">
        <button id="b1">Enabled</button>
        <button id="b2" disabled>Disabled</button>
        <input id="i1" disabled />
        <input id="i2" />
      </div>
    `;
    const container = document.getElementById("container") as HTMLElement;
    cleanup = trapFocus(container);

    // First focusable is the enabled button
    expect(document.activeElement?.id).toBe("b1");

    // Last focusable is the enabled input (i2), wrapping from there goes back to b1
    const lastEnabled = document.getElementById("i2") as HTMLElement;
    lastEnabled.focus();
    dispatchTab(lastEnabled, false);
    expect(document.activeElement?.id).toBe("b1");
  });

  it("treats anchors with href and tabindex>=0 as focusable", () => {
    document.body.innerHTML = `
      <div id="container">
        <a id="a1" href="#one">Link</a>
        <div id="d1" tabindex="0">Custom focusable</div>
        <div id="d2" tabindex="-1">Programmatic only</div>
      </div>
    `;
    const container = document.getElementById("container") as HTMLElement;
    cleanup = trapFocus(container);

    // First focusable is the anchor with href
    expect(document.activeElement?.id).toBe("a1");

    // Wrap from last (the tabindex=0 div) -> first (anchor); tabindex=-1 excluded
    const lastFocusable = document.getElementById("d1") as HTMLElement;
    lastFocusable.focus();
    dispatchTab(lastFocusable, false);
    expect(document.activeElement?.id).toBe("a1");
  });

  it("ignores non-Tab keys", () => {
    document.body.innerHTML = `
      <div id="container">
        <button id="b1">One</button>
      </div>
    `;
    const container = document.getElementById("container") as HTMLElement;
    cleanup = trapFocus(container);

    const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
    (document.getElementById("b1") as HTMLElement).dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it("removes the keydown listener when cleanup is called", () => {
    document.body.innerHTML = `
      <div id="container">
        <button id="b1">One</button>
        <button id="b2">Two</button>
      </div>
    `;
    const container = document.getElementById("container") as HTMLElement;
    const release = trapFocus(container);
    const last = document.getElementById("b2") as HTMLElement;
    last.focus();

    release();

    const event = dispatchTab(last, false);
    // After cleanup, no preventDefault should occur
    expect(event.defaultPrevented).toBe(false);
  });
});
