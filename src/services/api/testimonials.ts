import { COLLECTIONS } from "./collections";
import type { Testimonial } from "../../types";
import { listRows, manageCreate, manageDelete, manageUpdate, submitRow } from "./dataApi";

export async function getTestimonials(): Promise<Testimonial[]> {
  const response = await listRows(COLLECTIONS.TESTIMONIALS, { orderBy: "order" });
  return response.documents as unknown as Testimonial[];
}

export async function getFeaturedTestimonials(): Promise<Testimonial[]> {
  const response = await listRows(COLLECTIONS.TESTIMONIALS, {
    where: { featured: true },
    orderBy: "order",
  });
  return response.documents as unknown as Testimonial[];
}

export async function createTestimonial(
  testimonial: Omit<Testimonial, "$id" | "$createdAt">,
  turnstileToken?: string | null,
  /** A visitor's photo as a data URL; stored and resized by /api/submit. */
  imageData?: string,
): Promise<Testimonial> {
  return submitRow<Testimonial>(COLLECTIONS.TESTIMONIALS, testimonial, turnstileToken, {
    ...(imageData && { imageData }),
  });
}

/**
 * Adds a testimonial from the admin dashboard. Unlike createTestimonial (the
 * public form), it needs no spam check and isn't held for approval.
 */
export async function addTestimonial(
  testimonial: Omit<Testimonial, "$id" | "$createdAt">,
): Promise<Testimonial> {
  return manageCreate<Testimonial>(COLLECTIONS.TESTIMONIALS, testimonial);
}

export async function updateTestimonial(
  testimonialId: string,
  testimonial: Partial<Omit<Testimonial, "$id" | "$createdAt">>,
): Promise<Testimonial> {
  return manageUpdate<Testimonial>(COLLECTIONS.TESTIMONIALS, testimonialId, testimonial);
}

export async function deleteTestimonial(testimonialId: string): Promise<void> {
  await manageDelete(COLLECTIONS.TESTIMONIALS, testimonialId);
}
