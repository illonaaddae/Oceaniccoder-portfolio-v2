import React from "react";
import { Modal } from "./Modal";
import {
  BasicInfoFields,
  TagListInput,
  ImageYearFields,
  LinksFields,
  StatusFields,
  CaseStudyInfoFields,
  FormActions,
  useProjectForm,
  getInputClass,
  getLabelClass,
} from "./ProjectForm";
import type { ProjectFormModalProps } from "./ProjectForm";

export const ProjectFormModal: React.FC<ProjectFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  theme,
  editingProject,
}) => {
  const {
    form,
    setForm,
    loading,
    newTech,
    setNewTech,
    newFeature,
    setNewFeature,
    newScreenshot,
    setNewScreenshot,
    addToList,
    removeFromList,
    generateSlug,
    handleSubmit,
  } = useProjectForm(editingProject, isOpen, onSubmit, onClose);

  const inputClass = getInputClass(theme);
  const labelClass = getLabelClass(theme);
  const fieldProps = { form, setForm, theme, inputClass, labelClass };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingProject ? "Edit Project" : "Add New Project"}
      theme={theme}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <BasicInfoFields {...fieldProps} />
        <TagListInput
          items={form.technologies}
          inputValue={newTech}
          onInputChange={setNewTech}
          onAdd={() => addToList("technologies", newTech, setNewTech)}
          onRemove={(item) => removeFromList("technologies", item)}
          theme={theme}
          inputClass={inputClass}
          labelClass={labelClass}
          label="Technologies"
          placeholder="Add technology (e.g., React, Node.js)"
          tagColor={{
            dark: "bg-blue-500/20 text-blue-300",
            light: "bg-blue-100 text-blue-700",
          }}
        />
        <ImageYearFields {...fieldProps} />
        <LinksFields {...fieldProps} />
        <StatusFields {...fieldProps} />

        <div
          className={`border-t pt-6 mt-6 ${theme === "dark" ? "border-gray-700" : "border-slate-200"}`}
        >
          <h3
            className={`text-lg font-bold mb-4 ${theme === "dark" ? "text-white" : "text-slate-900"}`}
          >
            📋 Case Study Details (Optional)
          </h3>
          <CaseStudyInfoFields {...fieldProps} onGenerateSlug={generateSlug} />
          <div className="mb-5">
            <TagListInput
              items={form.keyFeatures}
              inputValue={newFeature}
              onInputChange={setNewFeature}
              onAdd={() => addToList("keyFeatures", newFeature, setNewFeature)}
              onRemove={(f) => removeFromList("keyFeatures", f)}
              theme={theme}
              inputClass={inputClass}
              labelClass={labelClass}
              label="Key Features"
              placeholder="Add a key feature"
              tagColor={{
                dark: "bg-green-500/20 text-green-300",
                light: "bg-green-100 text-green-700",
              }}
              getRemoveLabel={(item) => `"${item}"`}
            />
          </div>
          <TagListInput
            items={form.screenshots}
            inputValue={newScreenshot}
            onInputChange={setNewScreenshot}
            onAdd={() =>
              addToList("screenshots", newScreenshot, setNewScreenshot)
            }
            onRemove={(url) => removeFromList("screenshots", url)}
            theme={theme}
            inputClass={inputClass}
            labelClass={labelClass}
            label="Screenshots (URLs)"
            placeholder="https://... (screenshot URL)"
            inputType="url"
            truncateItems
            tagColor={{
              dark: "bg-purple-500/20 text-purple-300",
              light: "bg-purple-100 text-purple-700",
            }}
            getRemoveLabel={() => "screenshot"}
          />
        </div>

        <FormActions
          loading={loading}
          isEditing={!!editingProject}
          onClose={onClose}
          theme={theme}
        />
      </form>
    </Modal>
  );
};
