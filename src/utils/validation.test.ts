/**
 * Validation Utility Tests
 * @module utils/validation.test
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  sanitizeString,
  escapeHtml,
  validateEmail,
  validateName,
  validateMessage,
  validateUrl,
  validateSubject,
  validateContactForm,
  isRateLimited,
  clearRateLimit,
} from "./validation";

describe("sanitizeString", () => {
  it("should trim whitespace", () => {
    expect(sanitizeString("  hello world  ")).toBe("hello world");
  });

  it("should remove HTML tags", () => {
    expect(sanitizeString("<script>alert('xss')</script>hello")).toBe(
      "alert('xss')hello"
    );
  });

  it("should remove javascript: protocol", () => {
    expect(sanitizeString("javascript:alert('xss')")).toBe("alert('xss')");
  });

  it("should remove event handlers", () => {
    expect(sanitizeString("onclick=alert('xss')")).toBe("alert('xss')");
  });

  it("should handle empty strings", () => {
    expect(sanitizeString("")).toBe("");
  });

  it("should handle null/undefined gracefully", () => {
    expect(sanitizeString(null as any)).toBe("");
    expect(sanitizeString(undefined as any)).toBe("");
  });

  it("should normalize whitespace", () => {
    expect(sanitizeString("hello    world")).toBe("hello world");
  });
});

describe("escapeHtml", () => {
  it("should escape < and >", () => {
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
  });

  it("should escape quotes", () => {
    expect(escapeHtml('"hello"')).toBe("&quot;hello&quot;");
    expect(escapeHtml("'hello'")).toBe("&#x27;hello&#x27;");
  });

  it("should escape ampersand", () => {
    expect(escapeHtml("hello & world")).toBe("hello &amp; world");
  });

  it("should handle empty strings", () => {
    expect(escapeHtml("")).toBe("");
  });
});

describe("validateEmail", () => {
  it("should accept valid emails", () => {
    const result = validateEmail("test@example.com");
    expect(result.isValid).toBe(true);
    expect(result.sanitized).toBe("test@example.com");
  });

  it("should accept emails with subdomains", () => {
    const result = validateEmail("test@mail.example.com");
    expect(result.isValid).toBe(true);
  });

  it("should accept emails with plus sign", () => {
    const result = validateEmail("test+filter@example.com");
    expect(result.isValid).toBe(true);
  });

  it("should reject invalid emails", () => {
    expect(validateEmail("notanemail").isValid).toBe(false);
    expect(validateEmail("missing@").isValid).toBe(false);
    expect(validateEmail("@nodomain.com").isValid).toBe(false);
    expect(validateEmail("spaces in@email.com").isValid).toBe(false);
  });

  it("should reject empty emails", () => {
    const result = validateEmail("");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Email is required");
  });

  it("should lowercase emails", () => {
    const result = validateEmail("TEST@EXAMPLE.COM");
    expect(result.sanitized).toBe("test@example.com");
  });
});

describe("validateName", () => {
  it("should accept valid names", () => {
    const result = validateName("John Doe");
    expect(result.isValid).toBe(true);
    expect(result.sanitized).toBe("John Doe");
  });

  it("should reject names too short", () => {
    const result = validateName("J");
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("at least 2 characters");
  });

  it("should reject names too long", () => {
    const result = validateName("a".repeat(101));
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("less than 100 characters");
  });

  it("should reject empty names", () => {
    const result = validateName("");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Name is required");
  });

  it("should reject SQL injection attempts", () => {
    const result = validateName("Robert'); DROP TABLE users;--");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Invalid characters detected");
  });

  it("should reject script injection", () => {
    const result = validateName("<script>alert('xss')</script>");
    expect(result.isValid).toBe(false);
  });
});

describe("validateMessage", () => {
  it("should accept valid messages", () => {
    const result = validateMessage("This is a valid message for testing.");
    expect(result.isValid).toBe(true);
  });

  it("should reject messages too short", () => {
    const result = validateMessage("Hi");
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("at least 10 characters");
  });

  it("should reject empty messages", () => {
    const result = validateMessage("");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Message is required");
  });

  it("should respect custom length parameters", () => {
    const result = validateMessage("Hi", 2, 100);
    expect(result.isValid).toBe(true);
  });
});

describe("validateUrl", () => {
  it("should accept valid HTTPS URLs", () => {
    const result = validateUrl("https://example.com");
    expect(result.isValid).toBe(true);
  });

  it("should accept valid HTTP URLs", () => {
    const result = validateUrl("http://example.com");
    expect(result.isValid).toBe(true);
  });

  it("should accept URLs with paths", () => {
    const result = validateUrl("https://example.com/path/to/page");
    expect(result.isValid).toBe(true);
  });

  it("should accept empty URLs (optional field)", () => {
    const result = validateUrl("");
    expect(result.isValid).toBe(true);
    expect(result.sanitized).toBe("");
  });

  it("should reject invalid URLs", () => {
    const result = validateUrl("not-a-url");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Please enter a valid URL");
  });

  it("should reject javascript: URLs", () => {
    const result = validateUrl("javascript:alert('xss')");
    expect(result.isValid).toBe(false);
  });
});

describe("validateSubject", () => {
  it("should accept valid subjects", () => {
    const result = validateSubject("Hello there");
    expect(result.isValid).toBe(true);
  });

  it("should reject subjects too short", () => {
    const result = validateSubject("Hi");
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("at least 3 characters");
  });

  it("should reject empty subjects", () => {
    const result = validateSubject("");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Subject is required");
  });
});

describe("validateContactForm", () => {
  it("should validate a complete valid form", () => {
    const result = validateContactForm({
      name: "John Doe",
      email: "john@example.com",
      subject: "Hello",
      message: "This is a valid message for the contact form.",
    });

    expect(result.isValid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  it("should return all validation errors", () => {
    const result = validateContactForm({
      name: "",
      email: "invalid",
      subject: "",
      message: "short",
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBeDefined();
    expect(result.errors.email).toBeDefined();
    expect(result.errors.message).toBeDefined();
  });

  it("should sanitize all fields", () => {
    const result = validateContactForm({
      name: "  John Doe  ",
      email: "  JOHN@EXAMPLE.COM  ",
      message: "  This is a valid message for testing.  ",
    });

    expect(result.sanitized.name).toBe("John Doe");
    expect(result.sanitized.email).toBe("john@example.com");
    expect(result.sanitized.message).toBe(
      "This is a valid message for testing."
    );
  });
});

describe("isRateLimited", () => {
  beforeEach(() => {
    clearRateLimit("test-form");
  });

  it("should not rate limit first submission", () => {
    expect(isRateLimited("test-form", 3, 60000)).toBe(false);
  });

  it("should not rate limit under the limit", () => {
    expect(isRateLimited("test-form", 3, 60000)).toBe(false);
    expect(isRateLimited("test-form", 3, 60000)).toBe(false);
    expect(isRateLimited("test-form", 3, 60000)).toBe(false);
  });

  it("should rate limit after exceeding submissions", () => {
    isRateLimited("test-form", 2, 60000);
    isRateLimited("test-form", 2, 60000);
    expect(isRateLimited("test-form", 2, 60000)).toBe(true);
  });

  it("should track different forms separately", () => {
    isRateLimited("form-a", 1, 60000);
    expect(isRateLimited("form-a", 1, 60000)).toBe(true);
    expect(isRateLimited("form-b", 1, 60000)).toBe(false);
  });
});
