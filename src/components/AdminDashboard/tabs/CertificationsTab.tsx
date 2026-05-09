import { FaAward, FaPlus } from "react-icons/fa";
import type { Certification } from "@/types";
import { CertificationsTable } from "./Certifications/CertificationsTable";

interface CertificationsTabProps {
  theme: "light" | "dark";
  loading: boolean;
  filteredCertifications: Certification[];
  onDelete: (certId: string) => void;
  onEdit?: (cert: Certification) => void;
  onShowForm?: () => void;
  isReadOnly?: boolean;
}

export const CertificationsTab: React.FC<CertificationsTabProps> = ({
  theme,
  loading,
  filteredCertifications,
  onDelete,
  onEdit,
  onShowForm,
  isReadOnly = false,
}) => {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div>
          <h1
            className={`text-2xl sm:text-3xl font-bold transition-colors duration-300 ${
              theme === "dark" ? "text-white" : "text-slate-900"
            }`}
          >
            Certifications
          </h1>
          <p
            className={`text-sm sm:text-base transition-colors duration-300 ${
              theme === "dark" ? "text-slate-200/90" : "text-slate-700/80"
            }`}
          >
            Manage your professional certifications
          </p>
        </div>
        {!isReadOnly && (
          <button
            onClick={onShowForm}
            className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2 rounded-xl font-bold text-sm sm:text-base transition duration-200 border shadow-lg ${
              theme === "dark"
                ? "bg-gradient-to-r from-oceanic-600 to-oceanic-900 border-oceanic-500/50 text-white hover:from-oceanic-500 hover:to-oceanic-900 shadow-oceanic-500/20"
                : "bg-gradient-to-r from-oceanic-500 to-oceanic-900 border-oceanic-500/50 text-white hover:from-oceanic-400 hover:to-oceanic-800 shadow-oceanic-500/20"
            }`}
          >
            <FaPlus className="text-sm" />
            Add Certification
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p
            className={`transition-colors duration-300 ${
              theme === "dark" ? "text-slate-300" : "text-slate-600"
            }`}
          >
            Loading certifications...
          </p>
        </div>
      ) : filteredCertifications.length === 0 ? (
        <div
          className={`glass-card border rounded-2xl p-12 text-center transition-colors duration-200 ${
            theme === "dark"
              ? "bg-gray-800/50 border-gray-700/80"
              : "bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40"
          }`}
        >
          <FaAward
            className={`text-4xl mx-auto mb-4 transition-colors duration-300 ${
              theme === "dark" ? "text-gray-600" : "text-slate-400/60"
            }`}
          />
          <p
            className={`transition-colors duration-300 ${
              theme === "dark" ? "text-gray-400" : "text-slate-600"
            }`}
          >
            No certifications yet
          </p>
        </div>
      ) : (
        <CertificationsTable
          certifications={filteredCertifications}
          theme={theme}
          isReadOnly={isReadOnly}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
    </div>
  );
};
