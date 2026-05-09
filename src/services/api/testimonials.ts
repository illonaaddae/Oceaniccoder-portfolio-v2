import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from "./client";
import type { Testimonial } from "../../types";

export async function getTestimonials(): Promise<Testimonial[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.TESTIMONIALS,
    [Query.orderAsc("order")],
  );
  return response.documents as unknown as Testimonial[];
}

export async function getFeaturedTestimonials(): Promise<Testimonial[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.TESTIMONIALS,
    [Query.equal("featured", true), Query.orderAsc("order")],
  );
  return response.documents as unknown as Testimonial[];
}

export async function createTestimonial(
  testimonial: Omit<Testimonial, "$id" | "$createdAt">,
): Promise<Testimonial> {
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
  await databases.deleteDocument(
    DATABASE_ID,
    COLLECTIONS.TESTIMONIALS,
    testimonialId,
  );
}
