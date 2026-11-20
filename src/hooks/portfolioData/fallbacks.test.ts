import { describe, expect, it } from "vitest";
import {
  getStaticProjects,
  getStaticCertifications,
  getStaticEducation,
  getStaticJourney,
  getStaticGallery,
} from "./fallbacks";

describe("static fallbacks", () => {
  it.each([
    ["projects", getStaticProjects],
    ["certifications", getStaticCertifications],
    ["education", getStaticEducation],
    ["journey", getStaticJourney],
    ["gallery", getStaticGallery],
  ])("returns the same %s array on every call", (_name, get) => {
    expect(get()).toBe(get());
  });

  it("gives static projects stable ids", () => {
    expect(getStaticProjects()[0].$id).toBe("static-0");
  });
});
