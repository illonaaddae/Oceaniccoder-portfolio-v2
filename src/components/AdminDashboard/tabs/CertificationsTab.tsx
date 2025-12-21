import { FaAward, FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import type { Certification } from "@/types";

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
                ? "bg-gradient-to-r from-cyan-600 to-blue-600 border-cyan-500/50 text-white hover:from-cyan-500 hover:to-blue-500 shadow-cyan-500/20"
                : "bg-gradient-to-r from-blue-500 to-cyan-400 border-blue-400/50 text-white hover:from-blue-600 hover:to-cyan-500 shadow-blue-400/30"
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
        <div
          className={`glass-card border rounded-2xl overflow-hidden transition-colors duration-200 ${
            theme === "dark"
              ? "bg-gray-800/50 border-gray-700/80"
              : "bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40"
          }`}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr
                  className={`border-b transition-colors duration-200 ${
                    theme === "dark" ? "border-gray-700" : "border-blue-200/40"
                  }`}
                >
                  <th
                    className={`px-4 py-4 text-left text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${
                      theme === "dark" ? "text-white/95" : "text-slate-700/90"
                    }`}
                  >
                    Certification Name
                  </th>
                  <th
                    className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${
                      theme === "dark" ? "text-white/95" : "text-slate-700/90"
                    }`}
                  >
                    Issuer
                  </th>
                  <th
                    className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${
                      theme === "dark" ? "text-white/95" : "text-slate-700/90"
                    }`}
                  >
                    Date Earned
                  </th>
                  <th
                    className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${
                      theme === "dark" ? "text-white/95" : "text-slate-700/90"
                    }`}
                  >
                    Status
                  </th>
                  <th
                    className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${
                      theme === "dark" ? "text-white/95" : "text-slate-700/90"
                    }`}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody
                className={`divide-y transition-colors duration-300 ${
                  theme === "dark" ? "divide-white/5" : "divide-blue-200/20"
                }`}
              >
                {filteredCertifications.map((cert) => (
                  <tr
                    key={cert.$id}
                    className={`transition-all duration-300 border-b ${
                      theme === "dark"
                        ? "border-white/5 hover:bg-white/5"
                        : "border-blue-200/20 hover:bg-white/20"
                    }`}
                  >
                    <td
                      className={`px-4 py-4 transition-colors duration-300 ${
                        theme === "dark" ? "text-white" : "text-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                          <FaAward className="text-white text-sm" />
                        </div>
                        <span className="font-bold text-sm">{cert.title}</span>
                      </div>
                    </td>
                    <td
                      className={`px-4 py-4 text-sm font-medium transition-colors duration-300 ${
                        theme === "dark"
                          ? "text-slate-200/90"
                          : "text-slate-700/90"
                      }`}
                    >
                      {cert.issuer}
                    </td>
                    <td
                      className={`px-4 py-4 text-sm font-medium transition-colors duration-300 ${
                        theme === "dark"
                          ? "text-slate-200/90"
                          : "text-slate-700/90"
                      }`}
                    >
                      {new Date(cert.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`px-3 py-1 rounded-xl text-xs font-bold backdrop-blur-sm border transition-colors duration-300 ${
                          theme === "dark"
                            ? "bg-amber-500/40 text-amber-100 border-amber-400/50"
                            : "bg-amber-400/30 text-amber-800 border-amber-300/60"
                        }`}
                      >
                        {cert.platform || "certified"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {!isReadOnly && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => onEdit?.(cert)}
                            className={`p-2 rounded-lg transition ${
                              theme === "dark"
                                ? "text-cyan-300 hover:bg-white/10"
                                : "text-blue-600 hover:bg-white/30"
                            }`}
                            title="Edit certification"
                          >
                            <FaEdit className="text-sm" />
                          </button>
                          <button
                            onClick={() => onDelete(cert.$id)}
                            className={`p-2 rounded-lg transition ${
                              theme === "dark"
                                ? "text-red-400 hover:bg-white/10"
                                : "text-red-600 hover:bg-white/30"
                            }`}
                            title="Delete certification"
                          >
                            <FaTrash className="text-sm" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
