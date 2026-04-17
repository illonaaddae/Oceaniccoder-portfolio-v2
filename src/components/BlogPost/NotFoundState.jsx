import React from "react";
import { Link } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";

/** Shown when a blog post cannot be found by slug. */
const NotFoundState = React.memo(() => (
  <section
    className="min-h-screen pt-28 pb-20 flex items-center justify-center"
    style={{
      background:
        "linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-primary) 50%, var(--bg-secondary) 100%)",
    }}
  >
    <div className="text-center">
      <h1 className="text-4xl font-bold text-white mb-4">Post Not Found</h1>
      <p className="text-gray-400 mb-8">
        The blog post you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        to="/blog"
        className="px-6 py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors inline-flex items-center gap-2"
      >
        <FaArrowLeft /> Back to Blog
      </Link>
    </div>
  </section>
));

NotFoundState.displayName = "NotFoundState";
export { NotFoundState };
