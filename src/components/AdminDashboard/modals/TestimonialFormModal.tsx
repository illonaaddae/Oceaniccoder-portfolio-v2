import React from "react";
import { Modal } from "./Modal";
import { ImageUpload } from "../ImageUpload";
import type { TestimonialFormModalProps } from "./TestimonialForm/types";
import { useTestimonialForm } from "./TestimonialForm/useTestimonialForm";
import { PersonInfoFields } from "./TestimonialForm/PersonInfoFields";
import { ContentField } from "./TestimonialForm/ContentField";
import { MetaFields } from "./TestimonialForm/MetaFields";
import { FormActions } from "./TestimonialForm/FormActions";

export const TestimonialFormModal: React.FC<TestimonialFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  theme,
  editingTestimonial,
}) => {
  const { form, setForm, loading, handleSubmit, inputClass, labelClass } =
    useTestimonialForm({
      isOpen,
      onClose,
      onSubmit,
      theme,
      editingTestimonial,
    });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingTestimonial ? "Edit Testimonial" : "Add New Testimonial"}
      theme={theme}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <PersonInfoFields
          form={form}
          setForm={setForm}
          inputClass={inputClass}
          labelClass={labelClass}
        />

        <ContentField
          form={form}
          setForm={setForm}
          inputClass={inputClass}
          labelClass={labelClass}
        />

        <div>
          <ImageUpload
            value={form.image}
            onChange={(url) => setForm((prev) => ({ ...prev, image: url }))}
            label="Profile Image (optional)"
            theme={theme}
          />
        </div>

        <MetaFields
          form={form}
          setForm={setForm}
          theme={theme}
          inputClass={inputClass}
          labelClass={labelClass}
        />

        <FormActions
          onClose={onClose}
          loading={loading}
          isEditing={!!editingTestimonial}
          theme={theme}
        />
      </form>
    </Modal>
  );
};
