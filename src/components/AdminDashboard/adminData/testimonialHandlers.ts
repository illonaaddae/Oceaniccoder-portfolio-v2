import type { Testimonial } from "@/types";
import {
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
} from "@/services/api";
import type { LoadDataFn } from "./types";

export function createTestimonialHandlers(loadData: LoadDataFn) {
  const handleAddTestimonial = async (
    testimonialForm: Omit<Testimonial, "$id" | "$createdAt">,
  ) => {
    try {
      await createTestimonial(testimonialForm);
      await loadData(false);
    } catch (err) {
      console.error("Failed to add testimonial:", err);
      throw err;
    }
  };

  const handleUpdateTestimonial = async (
    testimonialId: string,
    testimonialForm: Partial<Omit<Testimonial, "$id" | "$createdAt">>,
  ) => {
    try {
      await updateTestimonial(testimonialId, testimonialForm);
      await loadData(false);
    } catch (err) {
      console.error("Failed to update testimonial:", err);
      throw err;
    }
  };

  const handleDeleteTestimonial = async (testimonialId: string) => {
    try {
      await deleteTestimonial(testimonialId);
      await loadData(false);
    } catch (err) {
      console.error("Failed to delete testimonial:", err);
      throw err;
    }
  };

  return {
    handleAddTestimonial,
    handleUpdateTestimonial,
    handleDeleteTestimonial,
  };
}
