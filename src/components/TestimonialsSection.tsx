import React from "react";
import {
  BackgroundElements,
  SectionHeader,
  LoadingState,
  TestimonialCard,
  CarouselNavigation,
  DotsNavigation,
  TestimonialsGrid,
  TestimonialFormModal,
  ShareExperienceButton,
  useTestimonialsCarousel,
  useTestimonialForm,
  SECTION_GRADIENT_STYLE,
} from "./Testimonials";

const TestimonialsSection: React.FC = () => {
  const {
    testimonials,
    loading,
    currentIndex,
    isAnimating,
    goToNext,
    goToPrev,
    goToSlide,
  } = useTestimonialsCarousel();

  const form = useTestimonialForm();

  if (loading) return <LoadingState />;

  const hasTestimonials = testimonials.length > 0;
  const subtitle = hasTestimonials
    ? "What people say about working with me"
    : "Be the first to share your experience working with me";
  const imageInputId = hasTestimonials
    ? "testimonial-image-upload"
    : "testimonial-image-upload-empty";
  const titleId = hasTestimonials
    ? "testimonial-form-title-main"
    : "testimonial-form-title";

  return (
    <section
      id="testimonials"
      className="py-20 relative overflow-hidden"
      style={SECTION_GRADIENT_STYLE}
    >
      <BackgroundElements />
      <div className="container mx-auto px-6 relative z-10">
        <SectionHeader subtitle={subtitle} />

        {hasTestimonials && (
          <div className="max-w-4xl mx-auto mt-8">
            <div className="relative">
              <TestimonialCard
                testimonial={testimonials[currentIndex]}
                isAnimating={isAnimating}
              />
              {testimonials.length > 1 && (
                <CarouselNavigation onPrev={goToPrev} onNext={goToNext} />
              )}
            </div>
            {testimonials.length > 1 && (
              <DotsNavigation
                total={testimonials.length}
                currentIndex={currentIndex}
                onSelect={goToSlide}
              />
            )}
          </div>
        )}

        {testimonials.length > 3 && (
          <TestimonialsGrid
            testimonials={testimonials}
            currentIndex={currentIndex}
            onSelect={goToSlide}
          />
        )}

        <ShareExperienceButton
          onClick={() => form.setShowForm(true)}
          className={hasTestimonials ? "mt-16 text-center" : "text-center"}
        />

        {form.showForm && (
          <TestimonialFormModal
            formData={form.formData}
            setFormData={form.setFormData}
            onSubmit={form.handleSubmit}
            onImageUpload={form.handleImageUpload}
            onClose={form.handleCloseModal}
            onBackdropClick={form.handleBackdropClick}
            submitting={form.submitting}
            submitSuccess={form.submitSuccess}
            uploadingImage={form.uploadingImage}
            imagePreview={form.imagePreview}
            setImagePreview={form.setImagePreview}
            fileInputRef={form.fileInputRef}
            titleId={titleId}
            imageInputId={imageInputId}
          />
        )}
      </div>
    </section>
  );
};

export default TestimonialsSection;
