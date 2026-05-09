import React from "react";
import { Modal } from "./Modal";
import { useJourneyForm } from "./JourneyForm/useJourneyForm";
import { RoleCompanyFields } from "./JourneyForm/RoleCompanyFields";
import { PeriodLocationFields } from "./JourneyForm/PeriodLocationFields";
import { ColorThemeSelect } from "./JourneyForm/ColorThemeSelect";
import { DescriptionField } from "./JourneyForm/DescriptionField";
import { AchievementsField } from "./JourneyForm/AchievementsField";
import { FormActions } from "./JourneyForm/FormActions";
import type { JourneyFormModalProps } from "./JourneyForm/types";

export const JourneyFormModal: React.FC<JourneyFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  theme,
  editingJourney,
}) => {
  const {
    form,
    setForm,
    achievementInput,
    setAchievementInput,
    loading,
    handleSubmit,
    inputClass,
    labelClass,
  } = useJourneyForm({ isOpen, editingJourney, onSubmit, onClose, theme });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingJourney ? "Edit Journey" : "Add New Journey"}
      theme={theme}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <RoleCompanyFields
          form={form}
          setForm={setForm}
          inputClass={inputClass}
          labelClass={labelClass}
        />
        <PeriodLocationFields
          form={form}
          setForm={setForm}
          inputClass={inputClass}
          labelClass={labelClass}
        />
        <ColorThemeSelect
          form={form}
          setForm={setForm}
          inputClass={inputClass}
          labelClass={labelClass}
          theme={theme}
        />
        <DescriptionField
          form={form}
          setForm={setForm}
          inputClass={inputClass}
          labelClass={labelClass}
        />
        <AchievementsField
          form={form}
          setForm={setForm}
          achievementInput={achievementInput}
          setAchievementInput={setAchievementInput}
          inputClass={inputClass}
          labelClass={labelClass}
          theme={theme}
        />
        <FormActions
          onClose={onClose}
          loading={loading}
          isEditing={!!editingJourney}
          theme={theme}
        />
      </form>
    </Modal>
  );
};
