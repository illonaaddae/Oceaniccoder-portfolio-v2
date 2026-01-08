import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  FaQuoteLeft,
  FaStar,
  FaChevronLeft,
  FaChevronRight,
  FaUser,
  FaPaperPlane,
  FaTimes,
  FaCheckCircle,
  FaImage,
  FaCloudUploadAlt,
} from "react-icons/fa";
import {
  getTestimonials,
  createTestimonial,
  uploadImage,
} from "../services/api";
import type { Testimonial } from "../types";

const TestimonialsSection: React.FC = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  // Submission form state
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    company: "",
    content: "",
    rating: 5,
    image: "",
  });

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const data = await getTestimonials();
        setTestimonials(data);
      } catch (error) {
        console.error("Error fetching testimonials:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTestimonials();
  }, []);

  // Auto-play carousel
  useEffect(() => {
    if (testimonials.length <= 1) return;

    autoPlayRef.current = setInterval(() => {
      goToNext();
    }, 6000);

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [testimonials.length, currentIndex]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showForm) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "";
    };
  }, [showForm]);

  const goToNext = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    setTimeout(() => setIsAnimating(false), 500);
  };

  const goToPrev = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex(
      (prev) => (prev - 1 + testimonials.length) % testimonials.length
    );
    setTimeout(() => setIsAnimating(false), 500);
  };

  const goToSlide = (index: number) => {
    if (isAnimating || index === currentIndex) return;
    setIsAnimating(true);
    setCurrentIndex(index);
    setTimeout(() => setIsAnimating(false), 500);
  };

  // Handle form submission
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
        featured: false, // Needs admin approval
        order: 999, // Will be at the end
      });
      setSubmitSuccess(true);
      setFormData({
        name: "",
        role: "",
        company: "",
        content: "",
        rating: 5,
        image: "",
      });
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

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be less than 5MB");
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to server
    setUploadingImage(true);
    try {
      const url = await uploadImage(file);
      setFormData({ ...formData, image: url });
    } catch (error) {
      console.error("Failed to upload image:", error);
      alert("Failed to upload image. You can still add a URL manually.");
      setImagePreview(null);
    } finally {
      setUploadingImage(false);
    }
  };

  // Render star rating
  const renderStars = (
    rating: number = 5,
    interactive = false,
    onSelect?: (r: number) => void
  ) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <FaStar
            key={star}
            onClick={() => interactive && onSelect?.(star)}
            className={`w-4 h-4 ${
              star <= rating ? "text-yellow-400" : "text-gray-600"
            } ${
              interactive
                ? "cursor-pointer hover:scale-110 transition-transform"
                : ""
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <section className="py-20 relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </section>
    );
  }

  const currentTestimonial = testimonials[currentIndex];

  // Handle modal close
  const handleCloseModal = () => {
    setShowForm(false);
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleCloseModal();
    }
  };

  // If no testimonials, show just the CTA section
  if (testimonials.length === 0) {
    return (
      <section
        id="testimonials"
        className="py-20 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 50%, var(--bg-tertiary) 100%)",
        }}
      >
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="liquid-morph absolute top-20 right-20 w-96 h-96 bg-gradient-to-r from-cyan-500/8 to-blue-500/10 blur-3xl"></div>
          <div className="liquid-morph absolute bottom-20 left-20 w-80 h-80 bg-gradient-to-r from-cyan-500/6 to-blue-500/8 blur-3xl"></div>
        </div>

        <div className="container mx-auto px-6 relative z-10">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-cyan-600 via-blue-600 to-green-600 dark:from-cyan-400 dark:via-blue-400 dark:to-green-400 bg-clip-text text-transparent">
                Testimonials
              </span>
            </h2>
            <p className="text-xl leading-relaxed max-w-3xl mx-auto text-[var(--text-secondary)]">
              Be the first to share your experience working with me
            </p>
          </div>

          {/* Share Your Experience CTA */}
          <div className="text-center">
            <button
              onClick={() => setShowForm(true)}
              type="button"
              className="glass-btn bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-8 py-3 font-medium hover:scale-105 active:scale-95 transition-transform duration-300 rounded-xl shadow-lg shadow-cyan-500/30 touch-manipulation"
            >
              Share Your Experience
            </button>
          </div>

          {/* Testimonial Submission Form Modal */}
          {showForm &&
            createPortal(
              <div
                className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 dark:bg-black/95 backdrop-blur-md"
                onClick={handleBackdropClick}
                role="dialog"
                aria-modal="true"
                aria-labelledby="testimonial-form-title"
              >
                <div
                  className="rounded-2xl p-6 md:p-8 w-full max-w-md relative animate-fadeIn max-h-[90vh] overflow-y-auto bg-[var(--bg-primary)] border border-[var(--glass-border)] shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Close Button */}
                  <button
                    onClick={handleCloseModal}
                    type="button"
                    className="absolute top-4 right-4 p-2 rounded-lg hover:bg-[var(--glass-border)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] touch-manipulation z-10"
                    aria-label="Close form"
                  >
                    <FaTimes />
                  </button>

                  {submitSuccess ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                        <FaCheckCircle className="text-green-400 text-3xl" />
                      </div>
                      <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                        Thank You!
                      </h3>
                      <p className="text-[var(--text-secondary)]">
                        Your testimonial has been submitted and is pending
                        review.
                      </p>
                    </div>
                  ) : (
                    <>
                      <h3
                        id="testimonial-form-title"
                        className="text-2xl font-bold text-[var(--text-primary)] mb-2"
                      >
                        Share Your Experience
                      </h3>
                      <p className="text-[var(--text-secondary)] mb-6 text-sm">
                        Your feedback helps others understand what it's like
                        working with me.
                      </p>

                      <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Profile Image Upload */}
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                            Profile Image
                          </label>

                          <div className="flex items-start gap-4">
                            {(imagePreview || formData.image) && (
                              <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-[var(--glass-border)] flex-shrink-0">
                                <img
                                  src={imagePreview || formData.image}
                                  alt="Preview"
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setImagePreview(null);
                                    setFormData({ ...formData, image: "" });
                                    if (fileInputRef.current)
                                      fileInputRef.current.value = "";
                                  }}
                                  className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white hover:bg-red-500 transition-colors touch-manipulation"
                                  title="Remove image"
                                  aria-label="Remove image"
                                >
                                  <FaTimes className="text-xs" />
                                </button>
                              </div>
                            )}

                            <div className="flex-1">
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                                id="testimonial-image-upload-empty"
                              />
                              <label
                                htmlFor="testimonial-image-upload-empty"
                                className={`flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl border border-dashed cursor-pointer transition-all touch-manipulation ${
                                  uploadingImage
                                    ? "border-cyan-500 bg-cyan-500/10"
                                    : "border-[var(--glass-border)] hover:border-cyan-500 hover:bg-[var(--glass-border)]/50"
                                }`}
                              >
                                {uploadingImage ? (
                                  <>
                                    <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                                    <span className="text-cyan-400 text-sm">
                                      Uploading...
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <FaCloudUploadAlt className="text-[var(--text-secondary)]" />
                                    <span className="text-[var(--text-secondary)] text-sm">
                                      {imagePreview || formData.image
                                        ? "Change Image"
                                        : "Upload Photo"}
                                    </span>
                                  </>
                                )}
                              </label>

                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs text-[var(--text-accent)]">
                                  or paste URL:
                                </span>
                                <input
                                  type="url"
                                  value={formData.image}
                                  onChange={(e) => {
                                    setFormData({
                                      ...formData,
                                      image: e.target.value,
                                    });
                                    setImagePreview(null);
                                  }}
                                  className="flex-1 px-3 py-1.5 text-sm rounded-lg bg-[var(--bg-secondary)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-accent)] focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all outline-none"
                                  placeholder="https://..."
                                />
                              </div>
                              <p className="text-xs text-[var(--text-accent)] mt-1">
                                Optional - Max 5MB (JPG, PNG, GIF)
                              </p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                            Your Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) =>
                              setFormData({ ...formData, name: e.target.value })
                            }
                            className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-accent)] focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all outline-none"
                            placeholder="John Doe"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                              Your Role *
                            </label>
                            <input
                              type="text"
                              required
                              value={formData.role}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  role: e.target.value,
                                })
                              }
                              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-accent)] focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all outline-none"
                              placeholder="CEO"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                              Company
                            </label>
                            <input
                              type="text"
                              value={formData.company}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  company: e.target.value,
                                })
                              }
                              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-accent)] focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all outline-none"
                              placeholder="Acme Inc"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                            Your Rating *
                          </label>
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() =>
                                  setFormData({ ...formData, rating: star })
                                }
                                className="p-1 transition-transform hover:scale-110 active:scale-95 touch-manipulation"
                                aria-label={`Rate ${star} star${
                                  star > 1 ? "s" : ""
                                }`}
                              >
                                <FaStar
                                  className={`w-6 h-6 ${
                                    star <= formData.rating
                                      ? "text-yellow-400"
                                      : "text-[var(--text-accent)]"
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                            Your Testimonial *
                          </label>
                          <textarea
                            required
                            rows={4}
                            value={formData.content}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                content: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-accent)] focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all outline-none resize-none"
                            placeholder="Share your experience working with me..."
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={submitting}
                          className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium hover:from-cyan-500 hover:to-blue-500 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                        >
                          {submitting ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <FaPaperPlane className="text-sm" />
                              Submit Testimonial
                            </>
                          )}
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </div>,
              document.body
            )}
        </div>
      </section>
    );
  }

  return (
    <section
      id="testimonials"
      className="py-20 relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 50%, var(--bg-tertiary) 100%)",
      }}
    >
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="liquid-morph absolute top-20 right-20 w-96 h-96 bg-gradient-to-r from-cyan-500/8 to-blue-500/10 blur-3xl"></div>
        <div className="liquid-morph absolute bottom-20 left-20 w-80 h-80 bg-gradient-to-r from-cyan-500/6 to-blue-500/8 blur-3xl"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-cyan-600 via-blue-600 to-green-600 dark:from-cyan-400 dark:via-blue-400 dark:to-green-400 bg-clip-text text-transparent">
              Testimonials
            </span>
          </h2>
          <p className="text-xl leading-relaxed max-w-3xl mx-auto text-[var(--text-secondary)]">
            What people say about working with me
          </p>
        </div>

        {/* Testimonial Carousel */}
        <div className="max-w-4xl mx-auto mt-8">
          <div className="relative">
            {/* Main Testimonial Card */}
            <div
              className={`glass-card border border-[var(--glass-border)] rounded-3xl p-8 md:p-12 transition-all duration-500 relative overflow-visible ${
                isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"
              }`}
            >
              {/* Quote Icon - Positioned at top-left corner */}
              <div className="absolute -top-6 left-6 md:left-8">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/30 flex items-center justify-center">
                  <FaQuoteLeft className="text-white text-lg md:text-xl" />
                </div>
              </div>

              <div className="pt-4 md:pt-6">
                {/* Rating */}
                <div className="mb-6">
                  {renderStars(currentTestimonial.rating)}
                </div>

                {/* Testimonial Content */}
                <blockquote className="text-lg md:text-xl text-[var(--text-secondary)] leading-relaxed mb-8 italic">
                  "{currentTestimonial.content}"
                </blockquote>

                {/* Author Info */}
                <div className="flex items-center gap-4">
                  {currentTestimonial.image ? (
                    <img
                      src={currentTestimonial.image}
                      alt={currentTestimonial.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-cyan-500/50"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                      <FaUser className="text-white text-xl" />
                    </div>
                  )}
                  <div>
                    <h4 className="text-lg font-bold text-[var(--text-primary)]">
                      {currentTestimonial.name}
                    </h4>
                    <p className="text-[var(--text-accent)]">
                      {currentTestimonial.role}
                      {currentTestimonial.company && (
                        <span> at {currentTestimonial.company}</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Arrows */}
            {testimonials.length > 1 && (
              <>
                <button
                  onClick={goToPrev}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-12 p-3 rounded-full glass-card border border-[var(--glass-border)] text-[var(--text-primary)] hover:bg-cyan-500/20 hover:border-cyan-500/50 transition-all"
                  aria-label="Previous testimonial"
                >
                  <FaChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={goToNext}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-12 p-3 rounded-full glass-card border border-[var(--glass-border)] text-[var(--text-primary)] hover:bg-cyan-500/20 hover:border-cyan-500/50 transition-all"
                  aria-label="Next testimonial"
                >
                  <FaChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Dots Navigation */}
          {testimonials.length > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentIndex
                      ? "bg-gradient-to-r from-cyan-500 to-blue-500 w-8"
                      : "bg-[var(--glass-border)] hover:bg-cyan-500/50"
                  }`}
                  aria-label={`Go to testimonial ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Multiple Testimonials Grid (for smaller screens or alternative view) */}
        {testimonials.length > 3 && (
          <div className="hidden lg:grid lg:grid-cols-3 gap-6 mt-16">
            {testimonials.slice(0, 3).map((testimonial, index) => (
              <div
                key={testimonial.$id}
                className={`glass-card border border-[var(--glass-border)] rounded-2xl p-6 transition-all duration-300 hover:border-cyan-500/50 ${
                  index === currentIndex ? "ring-2 ring-cyan-500/50" : ""
                }`}
                onClick={() => goToSlide(index)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && goToSlide(index)}
              >
                <div className="flex items-center gap-3 mb-4">
                  {testimonial.image ? (
                    <img
                      src={testimonial.image}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                      <FaUser className="text-white text-sm" />
                    </div>
                  )}
                  <div>
                    <h5 className="font-semibold text-[var(--text-primary)] text-sm">
                      {testimonial.name}
                    </h5>
                    <p className="text-xs text-[var(--text-accent)]">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-[var(--text-secondary)] line-clamp-3">
                  "{testimonial.content}"
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Share Your Experience CTA */}
        <div className="mt-16 text-center">
          <button
            onClick={() => setShowForm(true)}
            type="button"
            className="glass-btn bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-8 py-3 font-medium hover:scale-105 active:scale-95 transition-transform duration-300 rounded-xl shadow-lg shadow-cyan-500/30 touch-manipulation"
          >
            Share Your Experience
          </button>
        </div>

        {/* Testimonial Submission Form Modal */}
        {showForm &&
          createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 dark:bg-black/95 backdrop-blur-md"
              onClick={handleBackdropClick}
              role="dialog"
              aria-modal="true"
              aria-labelledby="testimonial-form-title-main"
            >
              <div
                className="rounded-2xl p-6 md:p-8 w-full max-w-md relative animate-fadeIn max-h-[90vh] overflow-y-auto bg-[var(--bg-primary)] border border-[var(--glass-border)] shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  onClick={handleCloseModal}
                  type="button"
                  className="absolute top-4 right-4 p-2 rounded-lg hover:bg-[var(--glass-border)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] touch-manipulation z-10"
                  aria-label="Close form"
                >
                  <FaTimes />
                </button>

                {submitSuccess ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                      <FaCheckCircle className="text-green-400 text-3xl" />
                    </div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                      Thank You!
                    </h3>
                    <p className="text-[var(--text-secondary)]">
                      Your testimonial has been submitted and is pending review.
                    </p>
                  </div>
                ) : (
                  <>
                    <h3
                      id="testimonial-form-title-main"
                      className="text-2xl font-bold text-[var(--text-primary)] mb-2"
                    >
                      Share Your Experience
                    </h3>
                    <p className="text-[var(--text-secondary)] mb-6 text-sm">
                      Your feedback helps others understand what it's like
                      working with me.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      {/* Profile Image Upload */}
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                          Profile Image
                        </label>

                        {/* Image Preview or Upload Area */}
                        <div className="flex items-start gap-4">
                          {/* Preview */}
                          {(imagePreview || formData.image) && (
                            <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-[var(--glass-border)] flex-shrink-0">
                              <img
                                src={imagePreview || formData.image}
                                alt="Preview"
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setImagePreview(null);
                                  setFormData({ ...formData, image: "" });
                                  if (fileInputRef.current)
                                    fileInputRef.current.value = "";
                                }}
                                className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white hover:bg-red-500 transition-colors touch-manipulation"
                                title="Remove image"
                                aria-label="Remove image"
                              >
                                <FaTimes className="text-xs" />
                              </button>
                            </div>
                          )}

                          {/* Upload Button */}
                          <div className="flex-1">
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                              id="testimonial-image-upload"
                            />
                            <label
                              htmlFor="testimonial-image-upload"
                              className={`flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl border border-dashed cursor-pointer transition-all ${
                                uploadingImage
                                  ? "border-cyan-500 bg-cyan-500/10"
                                  : "border-[var(--glass-border)] hover:border-cyan-500 hover:bg-[var(--glass-border)]/50"
                              }`}
                            >
                              {uploadingImage ? (
                                <>
                                  <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                                  <span className="text-cyan-400 text-sm">
                                    Uploading...
                                  </span>
                                </>
                              ) : (
                                <>
                                  <FaCloudUploadAlt className="text-[var(--text-secondary)]" />
                                  <span className="text-[var(--text-secondary)] text-sm">
                                    {imagePreview || formData.image
                                      ? "Change Image"
                                      : "Upload Photo"}
                                  </span>
                                </>
                              )}
                            </label>

                            {/* OR paste URL */}
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs text-[var(--text-accent)]">
                                or paste URL:
                              </span>
                              <input
                                type="url"
                                value={formData.image}
                                onChange={(e) => {
                                  setFormData({
                                    ...formData,
                                    image: e.target.value,
                                  });
                                  setImagePreview(null);
                                }}
                                className="flex-1 px-3 py-1.5 text-sm rounded-lg bg-[var(--bg-secondary)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-accent)] focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all outline-none"
                                placeholder="https://..."
                              />
                            </div>
                            <p className="text-xs text-[var(--text-accent)] mt-1">
                              Optional - Max 5MB (JPG, PNG, GIF)
                            </p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                          Your Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-accent)] focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all outline-none"
                          placeholder="John Doe"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                            Your Role *
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.role}
                            onChange={(e) =>
                              setFormData({ ...formData, role: e.target.value })
                            }
                            className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-accent)] focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all outline-none"
                            placeholder="CEO"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                            Company
                          </label>
                          <input
                            type="text"
                            value={formData.company}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                company: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-accent)] focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all outline-none"
                            placeholder="Acme Inc"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                          Your Rating *
                        </label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() =>
                                setFormData({ ...formData, rating: star })
                              }
                              className="p-1 transition-transform hover:scale-110 active:scale-95 touch-manipulation"
                              aria-label={`Rate ${star} star${
                                star > 1 ? "s" : ""
                              }`}
                            >
                              <FaStar
                                className={`w-6 h-6 ${
                                  star <= formData.rating
                                    ? "text-yellow-400"
                                    : "text-[var(--text-accent)]"
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                          Your Testimonial *
                        </label>
                        <textarea
                          required
                          rows={4}
                          value={formData.content}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              content: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-accent)] focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all outline-none resize-none"
                          placeholder="Share your experience working with me..."
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium hover:from-cyan-500 hover:to-blue-500 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                      >
                        {submitting ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <FaPaperPlane className="text-sm" />
                            Submit Testimonial
                          </>
                        )}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>,
            document.body
          )}
      </div>
    </section>
  );
};

export default TestimonialsSection;
