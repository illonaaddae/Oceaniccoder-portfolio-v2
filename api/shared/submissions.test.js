// @vitest-environment node
import { describe, it, expect } from "vitest";

const { Invalid, validateSubmission } = await import("./submissions.js");

const message = { name: "Ada", email: "ada@example.com", subject: "Hi", message: "Hello" };

describe("validateSubmission", () => {
  it("keeps allowed fields, trims them and adds server-owned fields", () => {
    const doc = validateSubmission("messages", { ...message, name: "  Ada  " });
    expect(doc).toEqual({ ...message, status: "new" });
  });

  it("ignores server-owned fields sent by the browser", () => {
    const doc = validateSubmission("messages", { ...message, status: "replied" });
    expect(doc.status).toBe("new");
    const testimonial = validateSubmission("testimonials", {
      name: "Ada",
      role: "Engineer",
      content: "Great",
      featured: true,
      approved: true,
      order: 0,
    });
    expect(testimonial).toMatchObject({ approved: false, featured: false, order: 999 });
  });

  it("rejects unknown fields instead of dropping them", () => {
    expect(() => validateSubmission("messages", { ...message, isAdmin: true })).toThrow(
      "Unexpected field: isAdmin",
    );
  });

  it("requires required fields", () => {
    expect(() => validateSubmission("messages", { ...message, email: "  " })).toThrow(
      "email is required",
    );
  });

  it.each([
    ["messages", { ...message, email: "not-an-email" }, "email is invalid"],
    ["messages", { ...message, message: "x".repeat(5001) }, "too long"],
    ["messages", { ...message, name: 42 }, "name must be text"],
    ["testimonials", { name: "A", role: "B", content: "C", rating: 6 }, "from 1 to 5"],
    ["testimonials", { name: "A", role: "B", content: "C", image: "http://x.com/a.png" }, "https"],
    ["comments", { postId: "../x", authorName: "A", content: "B" }, "postId is invalid"],
  ])("rejects bad input in %s", (collection, body, error) => {
    expect(() => validateSubmission(collection, body)).toThrow(error);
  });

  it("only accepts meeting links on known hosts", () => {
    const booking = {
      name: "Ada",
      email: "ada@example.com",
      meetingType: "discovery",
      preferredDate: "2099-06-15",
      preferredTime: "10:00",
      timezone: "UTC",
    };
    expect(
      validateSubmission("bookings", { ...booking, meetingLink: "https://meet.google.com/abc" }),
    ).toMatchObject({ meetingLink: "https://meet.google.com/abc", status: "pending" });
    expect(() =>
      validateSubmission("bookings", { ...booking, meetingLink: "https://evil.example/meet" }),
    ).toThrow("meetingLink isn't allowed");
  });

  it("validates list items and drops empty optional strings", () => {
    const doc = validateSubmission("project_inquiries", {
      name: "Ada",
      email: "ada@example.com",
      projectType: "Website",
      description: "A site",
      features: ["Blog", "Shop"],
      notes: "",
      hasLogo: false,
    });
    expect(doc).toMatchObject({ features: ["Blog", "Shop"], hasLogo: false, status: "new" });
    expect(doc).not.toHaveProperty("notes");
    expect(() => validateSubmission("project_inquiries", { ...doc, features: [{ a: 1 }] })).toThrow(
      Invalid,
    );
  });

  it("rejects unknown collections", () => {
    expect(() => validateSubmission("invoices", {})).toThrow("Unknown form");
  });
});
