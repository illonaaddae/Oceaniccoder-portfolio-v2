import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from "./client";
import type { Testimonial } from "../../types";
import { listRows, submitRow, usesCosmos } from "./dataApi";

export async function getTestimonials(): Promise<Testimonial[]> {
  const response = usesCosmos
    ? await listRows(COLLECTIONS.TESTIMONIALS, { orderBy: "order" })
    : await databases.listDocuments(DATABASE_ID, COLLECTIONS.TESTIMONIALS, [
        Query.orderAsc("order"),
      ]);
  return response.documents as unknown as Testimonial[];
}

export async function getFeaturedTestimonials(): Promise<Testimonial[]> {
  const response = usesCosmos
    ? await listRows(COLLECTIONS.TESTIMONIALS, { where: { featured: true }, orderBy: "order" })
    : await databases.listDocuments(DATABASE_ID, COLLECTIONS.TESTIMONIALS, [
        Query.equal("featured", true),
        Query.orderAsc("order"),
      ]);
  return response.documents as unknown as Testimonial[];
}

export async function createTestimonial(
  testimonial: Omit<Testimonial, "$id" | "$createdAt">,
  turnstileToken?: string | null,
  /** A visitor's photo as a data URL; stored and resized by /api/submit. */
  imageData?: string,
): Promise<Testimonial> {
  if (usesCosmos) {
    return submitRow<Testimonial>(COLLECTIONS.TESTIMONIALS, testimonial, turnstileToken, {
      ...(imageData && { imageData }),
    });
  }
  return databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.TESTIMONIALS,
    ID.unique(),
    testimonial as Record<string, unknown>,
  ) as unknown as Testimonial;
}

export async function updateTestimonial(
  testimonialId: string,
  testimonial: Partial<Omit<Testimonial, "$id" | "$createdAt">>,
): Promise<Testimonial> {
  return databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.TESTIMONIALS,
    testimonialId,
    testimonial as Record<string, unknown>,
  ) as unknown as Testimonial;
}

export async function deleteTestimonial(testimonialId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.TESTIMONIALS, testimonialId);
}
