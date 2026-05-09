import React from "react";
import { FaCheckCircle } from "react-icons/fa";

const SuccessMessage: React.FC = React.memo(() => (
  <div className="text-center py-8">
    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
      <FaCheckCircle className="text-green-400 text-3xl" />
    </div>
    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
      Thank You!
    </h3>
    <p className="text-[var(--text-secondary)]">
      Your testimonial has been submitted and is pending review.
    </p>
  </div>
));

SuccessMessage.displayName = "SuccessMessage";

export default SuccessMessage;
