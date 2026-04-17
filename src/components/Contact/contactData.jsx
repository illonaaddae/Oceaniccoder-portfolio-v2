import React from "react";
import {
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaLinkedin,
  FaGithub,
  FaTwitter,
  FaInstagram,
} from "react-icons/fa";

export const contactInfo = [
  {
    icon: <FaEnvelope className="text-oceanic-500" />,
    label: "Email",
    value: "info@illonaaddae.com",
    href: "mailto:info@illonaaddae.com",
  },
  {
    icon: <FaPhone className="text-green-400" />,
    label: "Phone",
    value: "+233 54 449 7456",
    href: "tel:+233544497456",
  },
  {
    icon: <FaMapMarkerAlt className="text-red-400" />,
    label: "Location",
    value: "Accra, Ghana",
    href: "#",
  },
];

export const socialLinks = [
  {
    icon: <FaLinkedin />,
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/illonaaddae/",
    color: "hover:text-blue-400",
  },
  {
    icon: <FaGithub />,
    label: "GitHub",
    href: "https://github.com/illonaaddae",
    color: "hover:text-gray-400",
  },
  {
    icon: <FaTwitter />,
    label: "Twitter",
    href: "https://x.com/illonaaddae?s=21",
    color: "hover:text-blue-400",
  },
  {
    icon: <FaInstagram />,
    label: "Instagram",
    href: "https://www.instagram.com/illonaaddae/",
    color: "hover:text-pink-400",
  },
];
