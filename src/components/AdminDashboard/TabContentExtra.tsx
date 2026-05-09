import React from "react";
import { BookingsTab } from "./tabs/BookingsTab";
import { SettingsTab } from "./tabs/SettingsTab";
import { GalleryTab } from "./tabs/GalleryTab";
import { EducationTab } from "./tabs/EducationTab";
import { JourneyTab } from "./tabs/JourneyTab";
import { AboutTab } from "./tabs/AboutTab";
import BlogTab from "./tabs/BlogTab";
import { TestimonialsTab } from "./tabs/TestimonialsTab";
import type { TabContentProps } from "./TabContentProps";

export const TabContentExtra: React.FC<TabContentProps> = (props) => {
  const { activeTab, theme, loading, isReadOnly } = props;
  return (
    <>
      {activeTab === "gallery" && (
        <GalleryTab
          theme={theme}
          loading={loading}
          gallery={props.filteredGallery}
          onShowForm={props.openNewGalleryImage}
          onEdit={props.openEditGalleryImage}
          onDelete={props.handleDeleteGalleryImage}
          onUpdateOrder={props.handleUpdateGalleryOrder}
          onToggleVisibility={props.handleToggleGalleryVisibility}
          isReadOnly={isReadOnly}
        />
      )}
      {activeTab === "education" && (
        <EducationTab
          theme={theme}
          loading={loading}
          education={props.filteredEducation}
          onShowForm={props.openNewEducation}
          onEdit={props.openEditEducation}
          onDelete={props.handleDeleteEducation}
          isReadOnly={isReadOnly}
        />
      )}
      {activeTab === "journey" && (
        <JourneyTab
          theme={theme}
          loading={loading}
          journey={props.filteredJourney}
          onShowForm={props.openNewJourney}
          onEdit={props.openEditJourney}
          onDelete={props.handleDeleteJourney}
          isReadOnly={isReadOnly}
        />
      )}
      {activeTab === "about" && (
        <AboutTab
          theme={theme}
          loading={loading}
          about={props.about}
          onSave={props.handleSaveAbout}
          isReadOnly={isReadOnly}
          onSuccess={props.showSuccess}
          onError={props.showError}
        />
      )}
      {activeTab === "blog" && (
        <BlogTab
          blogPosts={props.filteredBlogPosts}
          onAdd={props.handleAddBlogPost}
          onEdit={props.handleUpdateBlogPost}
          onDelete={props.handleDeleteBlogPost}
          loading={loading}
          theme={theme}
          isReadOnly={isReadOnly}
        />
      )}
      {activeTab === "testimonials" && (
        <TestimonialsTab
          theme={theme}
          loading={loading}
          testimonials={props.testimonials}
          onDelete={async (id) => {
            try {
              await props.handleDeleteTestimonial(id);
              props.showSuccess("Testimonial deleted");
            } catch {
              props.showError("Failed to delete testimonial");
            }
          }}
          onEdit={(t) => {
            props.setEditingTestimonial(t);
            props.setShowTestimonialModal(true);
          }}
          onShowForm={() => {
            props.setEditingTestimonial(null);
            props.setShowTestimonialModal(true);
          }}
          isReadOnly={isReadOnly}
        />
      )}
      {activeTab === "bookings" && !isReadOnly && <BookingsTab theme={theme} />}
      {activeTab === "settings" && !isReadOnly && <SettingsTab theme={theme} />}
    </>
  );
};
