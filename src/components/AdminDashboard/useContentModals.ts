import { useState } from "react";
import type { GalleryImage, Education, Journey, Testimonial } from "@/types";

export function useContentModals(readOnlyGuard: () => boolean) {
  const [showEducationModal, setShowEducationModal] = useState(false);
  const [showJourneyModal, setShowJourneyModal] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [showTestimonialModal, setShowTestimonialModal] = useState(false);
  const [editingEducation, setEditingEducation] = useState<Education | null>(
    null,
  );
  const [editingJourney, setEditingJourney] = useState<Journey | null>(null);
  const [editingGalleryImage, setEditingGalleryImage] =
    useState<GalleryImage | null>(null);
  const [editingTestimonial, setEditingTestimonial] =
    useState<Testimonial | null>(null);

  const openNewEducation = () => {
    if (readOnlyGuard()) return;
    setEditingEducation(null);
    setShowEducationModal(true);
  };
  const openEditEducation = (e: Education) => {
    if (readOnlyGuard()) return;
    setEditingEducation(e);
    setShowEducationModal(true);
  };
  const closeEducationModal = () => {
    setShowEducationModal(false);
    setEditingEducation(null);
  };
  const openNewJourney = () => {
    if (readOnlyGuard()) return;
    setEditingJourney(null);
    setShowJourneyModal(true);
  };
  const openEditJourney = (j: Journey) => {
    if (readOnlyGuard()) return;
    setEditingJourney(j);
    setShowJourneyModal(true);
  };
  const closeJourneyModal = () => {
    setShowJourneyModal(false);
    setEditingJourney(null);
  };
  const openNewGalleryImage = () => {
    if (readOnlyGuard()) return;
    setEditingGalleryImage(null);
    setShowGalleryModal(true);
  };
  const openEditGalleryImage = (img: GalleryImage) => {
    if (readOnlyGuard()) return;
    setEditingGalleryImage(img);
    setShowGalleryModal(true);
  };
  const closeGalleryModal = () => {
    setShowGalleryModal(false);
    setEditingGalleryImage(null);
  };
  const openNewTestimonial = () => {
    if (readOnlyGuard()) return;
    setEditingTestimonial(null);
    setShowTestimonialModal(true);
  };
  const openEditTestimonial = (t: Testimonial) => {
    if (readOnlyGuard()) return;
    setEditingTestimonial(t);
    setShowTestimonialModal(true);
  };
  const closeTestimonialModal = () => {
    setShowTestimonialModal(false);
    setEditingTestimonial(null);
  };

  return {
    showEducationModal,
    editingEducation,
    openNewEducation,
    openEditEducation,
    closeEducationModal,
    showJourneyModal,
    editingJourney,
    openNewJourney,
    openEditJourney,
    closeJourneyModal,
    showGalleryModal,
    editingGalleryImage,
    openNewGalleryImage,
    openEditGalleryImage,
    closeGalleryModal,
    showTestimonialModal,
    editingTestimonial,
    openNewTestimonial,
    openEditTestimonial,
    closeTestimonialModal,
  };
}
