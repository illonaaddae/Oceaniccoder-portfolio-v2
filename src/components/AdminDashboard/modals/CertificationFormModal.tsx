import React, { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { FaSave, FaPlus, FaTimes } from "react-icons/fa";
import type { Certification } from "@/types";
import { ImageUpload } from "../ImageUpload";

interface CertificationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (cert: Omit<Certification, "$id" | "$createdAt">) => Promise<void>;
  theme: "light" | "dark";
  editingCertification?: Certification | null;
}

export const CertificationFormModal: React.FC<CertificationFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  theme,
  editingCertification,
}) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    issuer: "",
    date: "",
    credential: "",
    skills: [] as string[],
    platform: "",
    downloadLink: "",
    verifyLink: "",
    platformColor: "#3b82f6",
    image: "",
  });
  const [newSkill, setNewSkill] = useState("");

  useEffect(() => {
    if (editingCertification) {
      setForm({
        title: editingCertification.title || "",
        issuer: editingCertification.issuer || "",
        date: editingCertification.date || "",
        credential: editingCertification.credential || "",
        skills: editingCertification.skills || [],
        platform: editingCertification.platform || "",
        downloadLink: editingCertification.downloadLink || "",
        verifyLink: editingCertification.verifyLink || "",
        platformColor: editingCertification.platformColor || "#3b82f6",
        image: editingCertification.image || "",
      });
    } else {
      setForm({
        title: "",
        issuer: "",
        date: "",
        credential: "",
        skills: [],
        platform: "",
        downloadLink: "",
        verifyLink: "",
        platformColor: "#3b82f6",
        image: "",
      });
    }
  }, [editingCertification, isOpen]);

  const handleAddSkill = () => {
    if (newSkill.trim() && !form.skills.includes(newSkill.trim())) {
      setForm({ ...form, skills: [...form.skills, newSkill.trim()] });
      setNewSkill("");
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setForm({
      ...form,
      skills: form.skills.filter((s) => s !== skill),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      console.error("Error submitting certification:", err);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = `w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
    theme === "dark"
      ? "bg-gray-800/80 border-gray-700 text-white placeholder-gray-500 focus:border-cyan-500/60"
      : "bg-white/50 border-blue-200/50 text-slate-900 placeholder-slate-500"
  }`;

  const labelClass = `block text-sm font-semibold mb-2 ${
    theme === "dark" ? "text-slate-200" : "text-slate-700"
  }`;

  const platforms = [
    { value: "Scrimba", color: "#7B61FF" },
    { value: "Frontend Masters", color: "#C02D28" },
    { value: "Coursera", color: "#0056D2" },
    { value: "Udemy", color: "#A435F0" },
    { value: "LinkedIn Learning", color: "#0A66C2" },
    { value: "AWS", color: "#FF9900" },
    { value: "Google", color: "#4285F4" },
    { value: "Microsoft", color: "#00A4EF" },
    { value: "Meta", color: "#0081FB" },
    { value: "FreeCodeCamp", color: "#0A0A23" },
    { value: "Codecademy", color: "#1F4056" },
    { value: "Other", color: "#6B7280" },
  ];

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Title */}
          <div>
            <label className={labelClass}>Certification Title *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={inputClass}
              placeholder="e.g., AWS Solutions Architect"
            />
          </div>

          {/* Issuer */}
          <div>
            <label className={labelClass}>Issuer *</label>
            <input
              type="text"
              required
              value={form.issuer}
              onChange={(e) => setForm({ ...form, issuer: e.target.value })}
              className={inputClass}
              placeholder="e.g., Amazon Web Services"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Platform */}
          <div>
            <label className={labelClass}>Platform *</label>
            <select
              required
              value={form.platform}
              onChange={(e) => {
                const selected = platforms.find(
                  (p) => p.value === e.target.value
                );
                setForm({
                  ...form,
                  platform: e.target.value,
                  platformColor: selected?.color || "#3b82f6",
                });
              }}
              className={inputClass}
              title="Select certification platform"
              aria-label="Select certification platform"
            >
              <option value="">Select Platform</option>
              {platforms.map((platform) => (
                <option key={platform.value} value={platform.value}>
                  {platform.value}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className={labelClass}>Date Obtained *</label>
            <input
              type="text"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={inputClass}
              placeholder="e.g., December 2024"
            />
          </div>
        </div>

        {/* Credential ID */}
        <div>
          <label className={labelClass}>Credential ID</label>
          <input
            type="text"
            value={form.credential}
            onChange={(e) => setForm({ ...form, credential: e.target.value })}
            className={inputClass}
            placeholder="e.g., ABC123XYZ"
          />
        </div>

        {/* Skills */}
        <div>
          <label className={labelClass}>Related Skills</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyPress={(e) =>
                e.key === "Enter" && (e.preventDefault(), handleAddSkill())
              }
              className={inputClass}
              placeholder="Add skill covered by this cert"
            />
            <button
              type="button"
              onClick={handleAddSkill}
              title="Add skill"
              aria-label="Add skill"
              className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                theme === "dark"
                  ? "bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30"
                  : "bg-cyan-100 text-cyan-700 hover:bg-cyan-200"
              }`}
            >
              <FaPlus />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {form.skills.map((skill) => (
              <span
                key={skill}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                  theme === "dark"
                    ? "bg-purple-500/20 text-purple-300"
                    : "bg-purple-100 text-purple-700"
                }`}
              >
                {skill}
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill)}
                  className="hover:text-red-400"
                  title={`Remove ${skill}`}
                  aria-label={`Remove ${skill}`}
                >
                  <FaTimes className="text-xs" />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Download Link */}
          <div>
            <label className={labelClass}>Download Link</label>
            <input
              type="url"
              value={form.downloadLink}
              onChange={(e) =>
                setForm({ ...form, downloadLink: e.target.value })
              }
              className={inputClass}
              placeholder="https://..."
            />
          </div>

          {/* Verify Link */}
          <div>
            <label className={labelClass}>Verification Link</label>
            <input
              type="url"
              value={form.verifyLink}
              onChange={(e) => setForm({ ...form, verifyLink: e.target.value })}
              className={inputClass}
              placeholder="https://..."
            />
          </div>
        </div>

        {/* Certificate Image Upload */}
        <div>
          <label className={labelClass}>Certificate Image (Optional)</label>
          <p
            className={`text-xs mb-2 ${
              theme === "dark" ? "text-slate-400" : "text-slate-500"
            }`}
          >
            Upload an image of your certificate if you have one
          </p>
          <ImageUpload
            currentImage={form.image}
            onImageChange={(url) => setForm({ ...form, image: url })}
            theme={theme}
            label="Certificate Image"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
              theme === "dark"
                ? "bg-white/10 text-white hover:bg-white/20"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
              loading
                ? "opacity-50 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-500 to-cyan-400 text-white hover:from-blue-600 hover:to-cyan-500"
            }`}
          >
            <FaSave />
            {loading ? "Saving..." : editingCertification ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
