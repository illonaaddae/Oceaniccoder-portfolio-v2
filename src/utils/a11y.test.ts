/**
 * Accessibility Utility Tests
 * @module utils/a11y.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  trapFocus,
  announce,
  handleArrowNavigation,
  checkElementA11y,
  generateId,
  prefersReducedMotion,
} from "./a11y";

describe("generateId", () => {
  it("should generate unique IDs", () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });

  it("should use provided prefix", () => {
    const id = generateId("test");
    expect(id.startsWith("test-")).toBe(true);
  });

  it("should use default prefix when none provided", () => {
    const id = generateId();
    expect(id.startsWith("a11y-")).toBe(true);
  });
});

describe("trapFocus", () => {
  let container: HTMLDivElement;
  let btn1: HTMLElement;
  let input1: HTMLInputElement;
  let btn2: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
    container.innerHTML = `
      <button id="btn1">Button 1</button>
      <input id="input1" type="text" />
      <button id="btn2">Button 2</button>
    `;
    document.body.appendChild(container);

    btn1 = document.getElementById("btn1") as HTMLElement;
    input1 = document.getElementById("input1") as HTMLInputElement;
    btn2 = document.getElementById("btn2") as HTMLElement;

    // We need to mock focus behavior as JSDOM might not fully emulate it
    // but actual focus() calls work in vitest with document attached
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it("should focus first focusable element", () => {
    trapFocus(container);
    expect(document.activeElement?.id).toBe("btn1");
  });

  it("should wrap focus to first element when pressing Tab on last element", () => {
    trapFocus(container);

    // Set focus to the last element
    btn2.focus();
    expect(document.activeElement?.id).toBe("btn2");

    // Simulate Tab keydown on the container (which catches the bubbled event)
    const tabEvent = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    btn2.dispatchEvent(tabEvent);

    expect(tabEvent.defaultPrevented).toBe(true);
    expect(document.activeElement?.id).toBe("btn1");
  });

  it("should wrap focus to last element when pressing Shift+Tab on first element", () => {
    trapFocus(container);

    // Set focus to the first element
    btn1.focus();
    expect(document.activeElement?.id).toBe("btn1");

    // Simulate Shift+Tab keydown
    const shiftTabEvent = new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    btn1.dispatchEvent(shiftTabEvent);

    expect(shiftTabEvent.defaultPrevented).toBe(true);
    expect(document.activeElement?.id).toBe("btn2");
  });

  it("should not intercept Tab when focused on middle elements", () => {
    trapFocus(container);

    // Set focus to the middle element
    input1.focus();
    expect(document.activeElement?.id).toBe("input1");

    // Simulate Tab keydown
    const tabEvent = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    input1.dispatchEvent(tabEvent);

    expect(tabEvent.defaultPrevented).toBe(false);
    // document.activeElement will still be input1 because JSDOM doesn't move focus on default Tab
    // but the key thing is we didn't call event.preventDefault() and didn't manually move focus
  });

  it("should not affect focus on other keys", () => {
    trapFocus(container);

    // Set focus to the last element
    btn2.focus();
    expect(document.activeElement?.id).toBe("btn2");

    // Simulate Enter keydown
    const enterEvent = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    });
    btn2.dispatchEvent(enterEvent);

    expect(enterEvent.defaultPrevented).toBe(false);
    expect(document.activeElement?.id).toBe("btn2"); // Still focused on btn2
  });

  it("should return cleanup function", () => {
    const cleanup = trapFocus(container);
    expect(typeof cleanup).toBe("function");
  });

  it("should remove event listener on cleanup", () => {
    const cleanup = trapFocus(container);

    // Set focus to the last element
    btn2.focus();

    // Cleanup
    cleanup();

    // Simulate Tab keydown after cleanup
    const tabEvent = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    btn2.dispatchEvent(tabEvent);

    // Should not have intercepted
    expect(tabEvent.defaultPrevented).toBe(false);
    expect(document.activeElement?.id).toBe("btn2"); // Still focused on btn2, not btn1
  });
});

describe("handleArrowNavigation", () => {
  let items: HTMLElement[];

  beforeEach(() => {
    items = [
      document.createElement("button"),
      document.createElement("button"),
      document.createElement("button"),
    ];
    items.forEach((item, i) => {
      item.textContent = `Item ${i}`;
      item.focus = vi.fn();
    });
  });

  it("should move to next item on ArrowRight", () => {
    const event = new KeyboardEvent("keydown", { key: "ArrowRight" });
    const newIndex = handleArrowNavigation(event, items, 0);
    expect(newIndex).toBe(1);
  });

  it("should move to previous item on ArrowLeft", () => {
    const event = new KeyboardEvent("keydown", { key: "ArrowLeft" });
    const newIndex = handleArrowNavigation(event, items, 1);
    expect(newIndex).toBe(0);
  });

  it("should wrap around when at end", () => {
    const event = new KeyboardEvent("keydown", { key: "ArrowRight" });
    const newIndex = handleArrowNavigation(event, items, 2, { wrap: true });
    expect(newIndex).toBe(0);
  });

  it("should not wrap when wrap is false", () => {
    const event = new KeyboardEvent("keydown", { key: "ArrowRight" });
    const newIndex = handleArrowNavigation(event, items, 2, { wrap: false });
    expect(newIndex).toBe(2);
  });

  it("should go to first item on Home", () => {
    const event = new KeyboardEvent("keydown", { key: "Home" });
    const newIndex = handleArrowNavigation(event, items, 2);
    expect(newIndex).toBe(0);
  });

  it("should go to last item on End", () => {
    const event = new KeyboardEvent("keydown", { key: "End" });
    const newIndex = handleArrowNavigation(event, items, 0);
    expect(newIndex).toBe(2);
  });
});

describe("checkElementA11y", () => {
  describe("images", () => {
    it("should flag images without alt attribute", () => {
      const img = document.createElement("img");
      img.src = "test.jpg";

      const result = checkElementA11y(img);

      expect(result.passed).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].issue).toContain("alt");
    });

    it("should pass images with alt attribute", () => {
      const img = document.createElement("img");
      img.src = "test.jpg";
      img.alt = "Test image";

      const result = checkElementA11y(img);

      expect(result.passed).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("should pass decorative images with empty alt", () => {
      const img = document.createElement("img");
      img.src = "test.jpg";
      img.alt = "";

      const result = checkElementA11y(img);

      expect(result.passed).toBe(true);
    });
  });

  describe("buttons", () => {
    it("should flag buttons without accessible name", () => {
      const button = document.createElement("button");

      const result = checkElementA11y(button);

      expect(result.passed).toBe(false);
      expect(result.issues[0].issue).toContain("accessible name");
    });

    it("should pass buttons with text content", () => {
      const button = document.createElement("button");
      button.textContent = "Click me";

      const result = checkElementA11y(button);

      expect(result.passed).toBe(true);
    });

    it("should pass buttons with aria-label", () => {
      const button = document.createElement("button");
      button.setAttribute("aria-label", "Close dialog");

      const result = checkElementA11y(button);

      expect(result.passed).toBe(true);
    });
  });

  describe("links", () => {
    it("should flag links without accessible name", () => {
      const link = document.createElement("a");
      link.href = "https://example.com";

      const result = checkElementA11y(link);

      expect(result.passed).toBe(false);
    });

    it("should warn about non-functional hrefs", () => {
      const link = document.createElement("a");
      link.href = "#";
      link.textContent = "Click here";

      const result = checkElementA11y(link);

      expect(result.issues.some((i) => i.severity === "warning")).toBe(true);
    });
  });

  describe("form inputs", () => {
    it("should flag inputs without labels", () => {
      const input = document.createElement("input");
      input.type = "text";

      const result = checkElementA11y(input);

      expect(result.passed).toBe(false);
      expect(result.issues[0].issue).toContain("label");
    });

    it("should pass inputs with aria-label", () => {
      const input = document.createElement("input");
      input.type = "text";
      input.setAttribute("aria-label", "Search");

      const result = checkElementA11y(input);

      expect(result.passed).toBe(true);
    });
  });

  describe("tabindex", () => {
    it("should warn about positive tabindex", () => {
      const div = document.createElement("div");
      div.setAttribute("tabindex", "5");

      const result = checkElementA11y(div);

      expect(
        result.issues.some((i) => i.issue.includes("tabindex") && i.severity === "warning"),
      ).toBe(true);
    });

    it("should not warn about tabindex 0", () => {
      const div = document.createElement("div");
      div.setAttribute("tabindex", "0");

      const result = checkElementA11y(div);

      expect(result.issues.some((i) => i.issue.includes("tabindex"))).toBe(false);
    });
  });
});

describe("announce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    // Clean up any remaining announcers
    document.querySelectorAll('[role="status"]').forEach((el) => el.remove());
  });

  it("should create an announcer element", () => {
    announce("Test message");

    vi.advanceTimersByTime(150);

    const announcer = document.querySelector('[role="status"]');
    expect(announcer).toBeTruthy();
    expect(announcer?.getAttribute("aria-live")).toBe("polite");
  });

  it("should support assertive announcements", () => {
    announce("Urgent message", "assertive");

    vi.advanceTimersByTime(150);

    const announcer = document.querySelector('[role="alert"]');
    expect(announcer?.getAttribute("aria-live")).toBe("assertive");
  });

  it("should clean up after announcement", () => {
    announce("Test message");

    vi.advanceTimersByTime(1100);

    const announcer = document.querySelector('[role="status"]');
    expect(announcer).toBeFalsy();
  });
});

describe("prefersReducedMotion", () => {
  beforeEach(() => {
    // Mock window.matchMedia
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("should return a boolean", () => {
    const result = prefersReducedMotion();
    expect(typeof result).toBe("boolean");
  });
});
