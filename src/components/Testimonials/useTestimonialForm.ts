import { useState, useRef, useEffect } from "react";
import { createTestimonial, uploadImage } from "../../services/api";
import type { TestimonialFormData } from "./types";
import { INITIAL_FORM_DATA } from "./types";

export function useTestimonialForm() {
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<TestimonialFormData>({
    ...INITIAL_FORM_DATA,
  });

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showForm) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createTestimonial({
        name: formData.name,
        role: formData.role,
        company: formData.company || undefined,
        content: formData.content,
        rating: formData.rating,
        image: formData.image || undefined,
        featured: false,
        order: 999,
      });
      setSubmitSuccess(true);
      setFormData({ ...INITIAL_FORM_DATA });
      setTimeout(() => {
        setShowForm(false);
        setSubmitSuccess(false);
      }, 3000);
    } catch (error) {
      console.error("Failed to submit testimonial:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      // eslint-disable-next-line no-alert
      alert("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      // eslint-disable-next-line no-alert
      alert("Image must be less than 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
    setUploadingImage(true);
    try {
      const url = await uploadImage(file);
      setFormData((prev) => ({ ...prev, image: url }));
    } catch (error) {
      console.error("Failed to upload image:", error);
      // eslint-disable-next-line no-alert
      alert("Failed to upload image. You can still add a URL manually.");
      setImagePreview(null);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCloseModal = () => {
    setShowForm(false);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleCloseModal();
    }
  };

  return {
    showForm,
    setShowForm,
    submitting,
    submitSuccess,
    uploadingImage,
    imagePreview,
    setImagePreview,
    fileInputRef,
    formData,
    setFormData,
    handleSubmit,
    handleImageUpload,
    handleCloseModal,
    handleBackdropClick,
  };
}
