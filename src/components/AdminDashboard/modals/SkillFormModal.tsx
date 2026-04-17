import React from "react";
import { Modal } from "./Modal";
import { useSkillForm } from "./SkillForm/useSkillForm";
import { SkillNameField } from "./SkillForm/SkillNameField";
import { CategorySelect } from "./SkillForm/CategorySelect";
import { ProficiencySlider } from "./SkillForm/ProficiencySlider";
import { IconSelector } from "./SkillForm/IconSelector";
import { SkillPreview } from "./SkillForm/SkillPreview";
import { FormActions } from "./SkillForm/FormActions";
import type { SkillFormModalProps } from "./SkillForm/types";

export const SkillFormModal: React.FC<SkillFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  theme,
  editingSkill,
}) => {
  const { form, setForm, loading, handleSubmit, inputClass, labelClass } =
    useSkillForm({ isOpen, editingSkill, onSubmit, onClose, theme });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingSkill ? "Edit Skill" : "Add New Skill"}
      theme={theme}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <SkillNameField
          form={form}
          setForm={setForm}
          inputClass={inputClass}
          labelClass={labelClass}
        />
        <CategorySelect
          form={form}
          setForm={setForm}
          inputClass={inputClass}
          labelClass={labelClass}
        />
        <ProficiencySlider
          form={form}
          setForm={setForm}
          theme={theme}
          labelClass={labelClass}
        />
        <IconSelector
          form={form}
          setForm={setForm}
          inputClass={inputClass}
          labelClass={labelClass}
          theme={theme}
        />
        <SkillPreview
          name={form.name}
          percentage={form.percentage}
          theme={theme}
        />
        <FormActions
          onClose={onClose}
          loading={loading}
          isEditing={!!editingSkill}
          theme={theme}
        />
      </form>
    </Modal>
  );
};
