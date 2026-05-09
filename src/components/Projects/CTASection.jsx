import React from "react";
import { useNavigate } from "react-router-dom";

const CTASection = React.memo(() => {
  const navigate = useNavigate();

  return (
    <div className="mt-20 text-center">
      <div className="glass-card p-8 max-w-2xl mx-auto">
        <h3 className="text-2xl font-bold text-white mb-4">
          Like What You See?
        </h3>
        <p className="text-gray-300 mb-6">
          I'm always excited to work on new projects and collaborate with
          amazing teams. Let's build something incredible together!
        </p>
        <button
          onClick={() => navigate("/contact")}
          className="glass-btn bg-gradient-to-r from-oceanic-500 to-oceanic-900 text-white px-8 py-3 font-medium hover:scale-105 transition-transform duration-300"
        >
          Let's Connect
        </button>
      </div>
    </div>
  );
});

CTASection.displayName = "CTASection";

export default CTASection;
