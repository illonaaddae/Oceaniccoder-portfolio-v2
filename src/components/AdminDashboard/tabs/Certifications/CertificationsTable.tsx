import type { Certification } from "@/types";
import { CertificationRow } from "./CertificationRow";

interface CertificationsTableProps {
  certifications: Certification[];
  theme: "light" | "dark";
  isReadOnly: boolean;
  onEdit?: (cert: Certification) => void;
  onDelete: (id: string) => void;
}

const HEADERS = ["Certification Name", "Issuer", "Date Earned", "Status", "Actions"];

export const CertificationsTable: React.FC<CertificationsTableProps> = ({
  certifications,
  theme,
  isReadOnly,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr
              className={`border-b transition-colors duration-200 ${
                theme === "dark" ? "border-gray-700" : "border-blue-200/40"
              }`}
            >
              {HEADERS.map((header, i) => (
                <th
                  key={header}
                  className={`px-4 ${i === 0 ? "py-4" : "py-3"} text-left text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${
                    theme === "dark" ? "text-white/95" : "text-slate-700/90"
                  }`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody
            className={`divide-y transition-colors duration-300 ${
              theme === "dark" ? "divide-white/5" : "divide-blue-200/20"
            }`}
          >
            {certifications.map((cert) => (
              <CertificationRow
                key={cert.$id}
                cert={cert}
                theme={theme}
                isReadOnly={isReadOnly}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
