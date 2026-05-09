import React from "react";
import { FaGraduationCap, FaCertificate } from "react-icons/fa";
import EducationCard from "./EducationCard";
import CertificationCard from "./CertificationCard";
import DownloadCVCard from "./DownloadCVCard";

import type { Education, Certification, About } from "../../types";

interface EducationTabProps {
  education: Education[];
  certifications: Certification[];
  about: About | null;
}

const EducationTab = React.memo(
  ({ education, certifications, about }: EducationTabProps) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-6">
        <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <FaGraduationCap className="text-green-400" />
          Education
        </h3>
        {education
          .filter((edu) => edu.isVisible !== false)
          .map((edu) => (
            <EducationCard key={edu.$id} edu={edu} />
          ))}
      </div>
      <div className="space-y-6">
        <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <FaCertificate className="text-purple-400" />
          Certifications
        </h3>
        {certifications.map((cert) => (
          <CertificationCard key={cert.$id} cert={cert} />
        ))}
        <DownloadCVCard about={about} />
      </div>
    </div>
  ),
);

EducationTab.displayName = "EducationTab";
export default EducationTab;
