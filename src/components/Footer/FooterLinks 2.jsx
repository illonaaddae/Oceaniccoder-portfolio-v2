import React from "react";
import { useNavigate } from "react-router-dom";
import { quickLinks } from "./footerData";

const FooterLinks = React.memo(() => {
  const navigate = useNavigate();

  return (
    <div>
      <h4 className="text-lg font-semibold text-white mb-4">Quick Links</h4>
      <ul className="space-y-3">
        {quickLinks.map((link, index) => (
          <li key={index}>
            {link.href && link.href.startsWith("/") ? (
              <button
                onClick={() => navigate(link.href)}
                className="text-gray-400 hover:text-oceanic-500 transition-colors duration-300 text-sm"
              >
                {link.label}
              </button>
            ) : (
              <a
                href={link.href}
                className="text-gray-400 hover:text-oceanic-500 transition-colors duration-300 text-sm"
              >
                {link.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
});

FooterLinks.displayName = "FooterLinks";

export default FooterLinks;
