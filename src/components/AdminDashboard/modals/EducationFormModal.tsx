import React from "react";
import { Modal } from "./Modal";
import { useEducationForm } from "./EducationForm/useEducationForm";
import { BasicInfoFields } from "./EducationForm/BasicInfoFields";
import { AcademicFields } from "./EducationForm/AcademicFields";
import { PeriodSection } from "./EducationForm/PeriodSection";
import { LogoInitialsFields } from "./EducationForm/LogoInitialsFields";
import { DescriptionField } from "./EducationForm/DescriptionField";
import { VisibilityToggle } from "./EducationForm/VisibilityToggle";
import { FormActions } from "./EducationForm/FormActions";
import type { EducationFormModalProps } from "./EducationForm/types";

export type { EducationFormModalProps };

export const EducationFormModal: React.FC<EducationFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  theme,
  editingEducation,
}) => {
  const {
    form,
    updateForm,
    years,
    loading,
    error,
    handleSubmit,
    inputClass,
    labelClass,
  } = useEducationForm({ isOpen, onClose, onSubmit, editingEducation, theme });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingEducation ? "Edit Education" : "Add New Education"}
      theme={theme}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}
        <BasicInfoFields
          form={form}
          updateForm={updateForm}
          inputClass={inputClass}
          labelClass={labelClass}
        />
        <AcademicFields
          form={form}
          updateForm={updateForm}
          inputClass={inputClass}
          labelClass={labelClass}
        />
        <PeriodSection
          form={form}
          updateForm={updateForm}
          years={years}
          theme={theme}
          inputClass={inputClass}
          labelClass={labelClass}
        />
        <LogoInitialsFields
          form={form}
          updateForm={updateForm}
          inputClass={inputClass}
          labelClass={labelClass}
          theme={theme}
        />
        <DescriptionField
          form={form}
          updateForm={updateForm}
          inputClass={inputClass}
          labelClass={labelClass}
        />
        <VisibilityToggle
          form={form}
          updateForm={updateForm}
          theme={theme}
          labelClass={labelClass}
        />
        <FormActions
          onClose={onClose}
          loading={loading}
          isEditing={!!editingEducation}
          theme={theme}
        />
      </form>
    </Modal>
  );
};
