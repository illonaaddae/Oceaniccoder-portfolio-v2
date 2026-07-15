import { useState } from "react";
import {
  FaGraduationCap,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaEyeSlash,
  FaArrowUp,
  FaArrowDown,
} from "react-icons/fa";
import type { Education } from "@/types";
import { ToastContainer, useToast } from "../Toast";
import { useConfirm } from "../ConfirmContext";
import { usePagination } from "@/hooks/usePagination";
import { Pagination } from "@/components/common/Pagination";

const PAGE_SIZE = 10;

interface EducationTabProps {
  theme: "light" | "dark";
  loading: boolean;
  education: Education[];
  onDelete: (id: string) => void;
  onEdit?: (edu: Education) => void;
  onShowForm?: () => void;
  onReorder?: (id: string, newOrder: number) => Promise<void>;
  isReadOnly?: boolean;
}

export const EducationTab: React.FC<EducationTabProps> = ({
  theme,
  loading,
  education,
  onDelete,
  onEdit,
  onShowForm,
  onReorder,
  isReadOnly = false,
}) => {
  const toast = useToast();
  const confirm = useConfirm();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const { page, setPage, pageItems, totalItems } = usePagination(education, PAGE_SIZE);
  const pageOffset = (page - 1) * PAGE_SIZE;

  const handleMove = async (index: number, direction: "up" | "down") => {
    if (!onReorder) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= education.length) return;
    const current = education[index];
    const target = education[targetIndex];
    const currentOrder = current.displayOrder ?? 0;
    const targetOrder = target.displayOrder ?? 0;
    setReorderingId(current.$id);
    try {
      // Swap displayOrder values. If both are the same default (0), assign descending fresh values.
      if (currentOrder === targetOrder) {
        const base = education.length - index;
        await onReorder(current.$id, direction === "up" ? base + 1 : base - 1);
        await onReorder(target.$id, direction === "up" ? base - 1 : base + 1);
      } else {
        await onReorder(current.$id, targetOrder);
        await onReorder(target.$id, currentOrder);
      }
    } catch {
      toast.error("Failed to reorder. Please try again.");
    } finally {
      setReorderingId(null);
    }
  };

  const handleDelete = async (edu: Education) => {
    const ok = await confirm({
      message: "Delete education record?",
      description: "This will permanently remove the record.",
    });
    if (!ok) return;
    setDeletingId(edu.$id);
    try {
      await onDelete(edu.$id);
      toast.success(`"${edu.degree}" deleted successfully`);
    } catch {
      toast.error("Failed to delete education record. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div>
          <h1
            className={`text-2xl sm:text-3xl font-bold transition-colors duration-300 ${
              theme === "dark" ? "text-white" : "text-slate-900"
            }`}
          >
            Education
          </h1>
          <p
            className={`text-sm sm:text-base transition-colors duration-300 ${
              theme === "dark" ? "text-slate-300" : "text-slate-600"
            }`}
          >
            Manage your educational background
          </p>
        </div>
        {!isReadOnly && (
          <button
            onClick={onShowForm}
            className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl font-medium text-sm sm:text-base transition duration-200 border shadow-lg ${
              theme === "dark"
                ? "bg-gradient-to-r from-oceanic-600 to-oceanic-900 border-oceanic-500/50 text-white hover:from-oceanic-500 hover:to-oceanic-900 shadow-oceanic-500/20"
                : "bg-gradient-to-r from-oceanic-500 to-oceanic-900 border-oceanic-500/50 text-white hover:from-oceanic-400 hover:to-oceanic-800 shadow-oceanic-500/20"
            }`}
          >
            <FaPlus className="text-sm" />
            Add Education
          </button>
        )}
      </div>

      {/* Education List */}
      {loading ? (
        <div className="text-center py-12">
          <p className={theme === "dark" ? "text-slate-300" : "text-slate-600"}>
            Loading education...
          </p>
        </div>
      ) : education.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <FaGraduationCap
            className={`text-4xl mx-auto mb-4 ${
              theme === "dark" ? "text-gray-600" : "text-slate-400/60"
            }`}
          />
          <p className={theme === "dark" ? "text-slate-300" : "text-slate-600"}>
            No education records yet
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pageItems.map((edu, localIndex) => {
            const index = pageOffset + localIndex;
            return (
              <div key={edu.$id} className="glass-card p-6">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    {(edu.universityLogo || edu.logo) && (
                      <img
                        src={edu.universityLogo || edu.logo}
                        alt={edu.institution}
                        className="w-12 h-12 rounded-lg object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    )}
                    <div>
                      <h3
                        className={`text-lg font-bold ${
                          theme === "dark" ? "text-white" : "text-slate-900"
                        }`}
                      >
                        {edu.degree}
                        {edu.field && ` in ${edu.field}`}
                      </h3>
                      <p
                        className={`${theme === "dark" ? "text-oceanic-500" : "text-oceanic-600"}`}
                      >
                        {edu.institution}
                      </p>
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-sm ${
                            theme === "dark" ? "text-slate-400" : "text-slate-500"
                          }`}
                        >
                          {edu.period}
                        </p>
                        {edu.isVisible === false ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                            <FaEyeSlash className="text-xs" />
                            Hidden
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                            <FaEye className="text-xs" />
                            Visible
                          </span>
                        )}
                      </div>
                      {edu.description && (
                        <p
                          className={`mt-2 text-sm ${
                            theme === "dark" ? "text-slate-300" : "text-slate-600"
                          }`}
                        >
                          {edu.description}
                        </p>
                      )}
                    </div>
                  </div>
                  {!isReadOnly && (
                    <div className="flex gap-2 items-start">
                      {onReorder && (
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => handleMove(index, "up")}
                            disabled={index === 0 || reorderingId === edu.$id}
                            className={`p-1.5 rounded-md transition text-xs ${
                              theme === "dark"
                                ? "bg-gray-700/80 text-gray-300 hover:bg-gray-600/80 border border-gray-600 disabled:opacity-30"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-30"
                            } disabled:cursor-not-allowed`}
                            title="Move up (show higher on site)"
                            aria-label="Move up"
                          >
                            <FaArrowUp />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMove(index, "down")}
                            disabled={index === education.length - 1 || reorderingId === edu.$id}
                            className={`p-1.5 rounded-md transition text-xs ${
                              theme === "dark"
                                ? "bg-gray-700/80 text-gray-300 hover:bg-gray-600/80 border border-gray-600 disabled:opacity-30"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-30"
                            } disabled:cursor-not-allowed`}
                            title="Move down (show lower on site)"
                            aria-label="Move down"
                          >
                            <FaArrowDown />
                          </button>
                        </div>
                      )}
                      <button
                        onClick={() => onEdit?.(edu)}
                        className={`p-2 rounded-lg transition ${
                          theme === "dark"
                            ? "bg-gray-700/80 text-gray-300 hover:bg-gray-600/80 border border-gray-600"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(edu)}
                        disabled={deletingId === edu.$id}
                        className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <Pagination
            page={page}
            totalItems={totalItems}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            theme={theme}
          />
        </div>
      )}
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} theme={theme} />
    </div>
  );
};
