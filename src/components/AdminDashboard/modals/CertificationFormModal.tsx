import React from "react";
import { Modal } from "./Modal";
import type { CertificationFormModalProps } from "./CertificationForm/types";
import { useCertificationForm } from "./CertificationForm/useCertificationForm";
import { BasicInfoFields } from "./CertificationForm/BasicInfoFields";
import { PlatformDateFields } from "./CertificationForm/PlatformDateFields";
import { CredentialField } from "./CertificationForm/CredentialField";
import { SkillsField } from "./CertificationForm/SkillsField";
import { LinksFields } from "./CertificationForm/LinksFields";
import { ImageField } from "./CertificationForm/ImageField";
import { FormActions } from "./CertificationForm/FormActions";

export const CertificationFormModal: React.FC<CertificationFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  theme,
  editingCertification,
}) => {
  const {
    form,
    updateForm,
    loading,
    newSkill,
    setNewSkill,
    handleAddSkill,
    handleRemoveSkill,
    handleSubmit,
    inputClass,
    labelClass,
  } = useCertificationForm(
    editingCertification,
    isOpen,
    onSubmit,
    onClose,
    theme,
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        editingCertification ? "Edit Certification" : "Add New Certification"
      }
      theme={theme}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <BasicInfoFields
          form={form}
          updateForm={updateForm}
          inputClass={inputClass}
          labelClass={labelClass}
        />
        <PlatformDateFields
          form={form}
          updateForm={updateForm}
          inputClass={inputClass}
          labelClass={labelClass}
        />
        <CredentialField
          form={form}
          updateForm={updateForm}
          inputClass={inputClass}
          labelClass={labelClass}
        />
        <SkillsField
          form={form}
          newSkill={newSkill}
          setNewSkill={setNewSkill}
          onAdd={handleAddSkill}
          onRemove={handleRemoveSkill}
          inputClass={inputClass}
          labelClass={labelClass}
          theme={theme}
        />
        <LinksFields
          form={form}
          updateForm={updateForm}
          inputClass={inputClass}
          labelClass={labelClass}
        />
        <ImageField
          form={form}
          updateForm={updateForm}
          theme={theme}
          labelClass={labelClass}
        />
        <FormActions
          onClose={onClose}
          loading={loading}
          isEditing={!!editingCertification}
          theme={theme}
        />
      </form>
    </Modal>
  );
};
