import React from "react";
import { contactInfo, socialLinks } from "./contactData";

const ContactInfoCard = React.memo(() => (
  <div className="space-y-8">
    <div className="glass-card p-8">
      <h3 className="text-2xl font-bold text-white mb-6">Get in Touch</h3>
      <p className="text-gray-300 mb-8 leading-relaxed">
        I'm always excited to discuss new opportunities, collaborate on
        innovative projects, or share insights about technology and leadership.
        Whether you're looking to build something amazing or just want to
        connect, I'd love to hear from you!
      </p>

      {/* Contact Info */}
      <div className="space-y-6">
        {contactInfo.map((info) => (
          <a
            key={info.label}
            href={info.href}
            className="flex items-center gap-4 p-4 glass-btn hover:scale-105 transition-all duration-300 group"
          >
            <div className="text-2xl group-hover:scale-110 transition-transform duration-300">
              {info.icon}
            </div>
            <div>
              <div className="text-sm text-gray-400">{info.label}</div>
              <div className="text-white font-medium">{info.value}</div>
            </div>
          </a>
        ))}
      </div>

      {/* Social Links */}
      <div className="mt-8 pt-8 border-t border-white/10">
        <h4 className="text-lg font-semibold text-white mb-4">Follow Me</h4>
        <div className="flex gap-4">
          {socialLinks.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`glass-btn p-3 text-gray-400 ${social.color} hover:scale-110 transition-all duration-300`}
              aria-label={social.label}
            >
              <div className="text-xl">{social.icon}</div>
            </a>
          ))}
        </div>
      </div>

      {/* Availability Status */}
      <div className="mt-8 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          <div>
            <div className="text-green-400 font-medium">
              Available for Projects
            </div>
            <div className="text-sm text-gray-300">
              Open to freelance and full-time opportunities
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
));

ContactInfoCard.displayName = "ContactInfoCard";

export default ContactInfoCard;
