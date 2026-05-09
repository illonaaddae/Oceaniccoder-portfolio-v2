import { FaAward, FaEdit, FaTrash } from "react-icons/fa";
import type { Certification } from "@/types";
import { formatCertDate } from "./formatCertDate";

interface CertificationRowProps {
  cert: Certification;
  theme: "light" | "dark";
  isReadOnly: boolean;
  onEdit?: (cert: Certification) => void;
  onDelete: (id: string) => void;
}

export const CertificationRow: React.FC<CertificationRowProps> = ({
  cert,
  theme,
  isReadOnly,
  onEdit,
  onDelete,
}) => {
  return (
    <tr
      className={`transition-all duration-300 border-b ${
        theme === "dark"
          ? "border-white/5 hover:bg-white/5"
          : "border-blue-200/20 hover:bg-white/20"
      }`}
    >
      {/* Name + Icon */}
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

      {/* Issuer */}
      <td
        className={`px-4 py-4 text-sm font-medium transition-colors duration-300 ${
          theme === "dark" ? "text-slate-200/90" : "text-slate-700/90"
        }`}
      >
        {cert.issuer}
      </td>

      {/* Date Earned */}
      <td
        className={`px-4 py-4 text-sm font-medium transition-colors duration-300 ${
          theme === "dark" ? "text-slate-200/90" : "text-slate-700/90"
        }`}
      >
        {formatCertDate(cert.date)}
      </td>

      {/* Status Badge */}
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

      {/* Actions */}
      <td className="px-4 py-4">
        {!isReadOnly && (
          <div className="flex gap-2">
            <button
              onClick={() => onEdit?.(cert)}
              className={`p-2 rounded-lg transition ${
                theme === "dark"
                  ? "text-oceanic-500 hover:bg-white/10"
                  : "text-oceanic-600 hover:bg-white/30"
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
  );
};
