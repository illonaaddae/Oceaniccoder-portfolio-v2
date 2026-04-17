import React from "react";
import { Modal } from "./Modal";
import { ImageUpload } from "../ImageUpload";
import { useGalleryForm } from "./GalleryForm/useGalleryForm";
import { GalleryMetaFields } from "./GalleryForm/GalleryMetaFields";
import { GalleryVisibilityToggle } from "./GalleryForm/GalleryVisibilityToggle";
import { FormActions } from "./GalleryForm/FormActions";
import type { GalleryFormModalProps } from "./GalleryForm/types";

export const GalleryFormModal: React.FC<GalleryFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  theme,
  editingImage,
  totalImages = 0,
}) => {
  const {
    form,
    setForm,
    setPreviewError,
    loading,
    handleSubmit,
    inputClass,
    labelClass,
  } = useGalleryForm(
    isOpen,
    editingImage,
    totalImages,
    onSubmit,
    onClose,
    theme,
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingImage ? "Edit Gallery Image" : "Add Gallery Image"}
      theme={theme}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <ImageUpload
            value={form.src}
            onChange={(url) => {
              setForm((prev) => ({ ...prev, src: url }));
              setPreviewError(false);
            }}
            label="Gallery Image *"
            theme={theme}
          />
        </div>

        <GalleryMetaFields
          form={form}
          setForm={setForm}
          inputClass={inputClass}
          labelClass={labelClass}
          theme={theme}
        />

        <GalleryVisibilityToggle
          isPublic={form.isPublic}
          onToggle={() =>
            setForm((prev) => ({ ...prev, isPublic: !prev.isPublic }))
          }
          theme={theme}
          labelClass={labelClass}
        />

        <FormActions
          onClose={onClose}
          loading={loading}
          isEditing={!!editingImage}
          theme={theme}
        />
      </form>
    </Modal>
  );
};
