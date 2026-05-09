import React from "react";
import { FaUser } from "react-icons/fa";
import type { Testimonial } from "../../types";

interface AuthorInfoProps {
  testimonial: Testimonial;
}

const AuthorInfo: React.FC<AuthorInfoProps> = React.memo(({ testimonial }) => (
  <div className="flex items-center gap-4">
    {testimonial.image ? (
      <img
        src={testimonial.image}
        alt={testimonial.name}
        className="w-16 h-16 rounded-full object-cover border-2 border-oceanic-500/50"
      />
    ) : (
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-oceanic-500 to-oceanic-900 flex items-center justify-center">
        <FaUser className="text-white text-xl" />
      </div>
    )}
    <div>
      <h4 className="text-lg font-bold text-[var(--text-primary)]">
        {testimonial.name}
      </h4>
      <p className="text-[var(--text-accent)]">
        {testimonial.role}
        {testimonial.company && <span> at {testimonial.company}</span>}
      </p>
    </div>
  </div>
));

AuthorInfo.displayName = "AuthorInfo";

export default AuthorInfo;
