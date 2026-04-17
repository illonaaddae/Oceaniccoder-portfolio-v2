import React from "react";
import { Link } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";

export const CaseStudyLoading: React.FC = () => (
  <section className="min-h-screen pt-28 pb-20 flex items-center justify-center">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-[var(--brand-ocean-2)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-[var(--text-accent)]">Loading project...</p>
    </div>
  </section>
);

export const CaseStudyNotFound: React.FC = () => (
  <section
    className="min-h-screen pt-28 pb-20"
    style={{
      background:
        "linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-primary) 50%, var(--bg-secondary) 100%)",
    }}
  >
    <div className="container mx-auto px-4 text-center">
      <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-4">
        Project Not Found
      </h1>
      <p className="text-[var(--text-accent)] mb-8">
        The project you&apos;re looking for doesn&apos;t exist or has been
        removed.
      </p>
      <Link
        to="/projects"
        className="px-6 py-3 bg-gradient-to-r from-[var(--brand-ocean-2)] to-[var(--brand-ocean-3)] text-white rounded-lg font-medium hover:from-[var(--brand-ocean-3)] hover:to-[var(--brand-ocean-4)] transition-all inline-flex items-center gap-2"
      >
        <FaArrowLeft /> Back to Projects
      </Link>
    </div>
  </section>
);
