import React from "react";
import {
  FaHeart,
  FaLinkedin,
  FaGithub,
  FaTwitter,
  FaInstagram,
  FaEnvelope,
  FaArrowUp,
  FaCalendarAlt,
} from "react-icons/fa";
import { IMAGES } from "../utils/imageUrls";
import { useNavigate } from "react-router-dom";

const Footer = ({ theme }) => {
  const currentYear = new Date().getFullYear();
  const navigate = useNavigate();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const quickLinks = [
    { label: "About", href: "/about" },
    { label: "Skills", href: "/skills" },
    { label: "Projects", href: "/projects" },
    { label: "Blog", href: "/blog" },
    { label: "Contact", href: "/contact" },
  ];

  const socialLinks = [
    {
      icon: <FaLinkedin />,
      href: "https://www.linkedin.com/in/illonaaddae/",
      label: "LinkedIn",
    },
    {
      icon: <FaGithub />,
      href: "https://github.com/illonaaddae",
      label: "GitHub",
    },
    {
      icon: <FaTwitter />,
      href: "https://x.com/illonaaddae?s=21",
      label: "Twitter",
    },
    {
      icon: <FaInstagram />,
      href: "https://www.instagram.com/illonaaddae/",
      label: "Instagram",
    },
    {
      icon: <FaEnvelope />,
      href: "mailto:illona@oceaniccoder.dev",
      label: "Email",
    },
  ];

  return (
    <footer className="relative bg-gradient-to-t from-black/50 to-transparent">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="liquid-morph absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 blur-3xl"></div>
        <div className="liquid-morph absolute bottom-0 right-1/4 w-80 h-80 bg-gradient-to-r from-cyan-500/3 to-green-500/3 blur-3xl"></div>
      </div>

      <div className="container mx-auto px-6 py-12 relative z-10">
        {/* Main Footer Content */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <img
                src={
                  theme === "dark"
                    ? "/images/logo/Oceaniccoder-croped.svg"
                    : "/images/logo/Oceaniccoder-croped.png"
                }
                alt="Oceaniccoder"
                className={`h-12 w-auto object-contain ${
                  theme === "dark"
                    ? "brightness-0 invert sepia saturate-[5] hue-rotate-[175deg]"
                    : ""
                }`}
              />
              <p className="text-sm text-gray-400 mt-2">Illona Addae</p>
            </div>

            <p className="text-gray-300 leading-relaxed mb-6 max-w-md">
              Passionate full-stack developer and community leader dedicated to
              creating inclusive tech spaces and building innovative solutions
              that make a difference.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">
              Quick Links
            </h4>
            <ul className="space-y-3">
              {quickLinks.map((link, index) => (
                <li key={index}>
                  {link.href && link.href.startsWith("/") ? (
                    <button
                      onClick={() => navigate(link.href)}
                      className="text-gray-400 hover:text-cyan-400 transition-colors duration-300 text-sm"
                    >
                      {link.label}
                    </button>
                  ) : (
                    <a
                      href={link.href}
                      className="text-gray-400 hover:text-cyan-400 transition-colors duration-300 text-sm"
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Connect</h4>
            <div className="space-y-4">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-gray-400 hover:text-cyan-400 transition-colors duration-300 text-sm"
                >
                  <span className="text-base">{social.icon}</span>
                  {social.label}
                </a>
              ))}
            </div>

            {/* Availability Status */}
            <div className="mt-6 p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-400 text-sm font-medium">
                    Available for hire
                  </span>
                </div>
                <a
                  href="https://calendly.com/addaeillona"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs font-medium rounded-lg transition-all duration-300 hover:scale-105"
                >
                  <FaCalendarAlt className="text-xs" />
                  Schedule
                </a>
              </div>
            </div>

            {/* Scrimba Ambassador */}
            <a
              href="https://scrimba.com/?via=u01ap3s"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 block p-3 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 dark:from-[#2B283A]/60 dark:to-[#3D3A4F]/60 rounded-lg border border-purple-500/20 dark:border-[#5D5A6F]/30 hover:border-purple-500/40 dark:hover:border-[#7D7A8F]/50 transition-all duration-300 hover:scale-[1.02] group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 dark:bg-[#2B283A] rounded-lg">
                  <img
                    src={IMAGES.scrimba}
                    alt="Scrimba"
                    className="w-5 h-5 object-contain"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-800 dark:text-white text-sm font-medium">
                      Scrimba Ambassador
                    </span>
                    <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full animate-pulse">
                      20% OFF
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-xs">
                    Learn to code with my exclusive discount!
                  </p>
                </div>
              </div>
            </a>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 my-8"></div>

        {/* Bottom Footer */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <p className="text-gray-400 text-sm">
              © {currentYear} Illona Addae (Oceaniccoder). All rights reserved.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Building the future, one line of code at a time.
            </p>
          </div>

          {/* Back to Top */}
          <button
            onClick={scrollToTop}
            className="glass-btn p-3 text-gray-400 hover:text-cyan-400 hover:scale-110 transition-all duration-300 group"
            aria-label="Back to top"
          >
            <FaArrowUp className="w-4 h-4 group-hover:animate-bounce" />
          </button>
        </div>

        {/* Inspirational Quote */}
        <div className="mt-8 text-center">
          <div className="glass-card p-6 max-w-2xl mx-auto">
            <blockquote className="text-cyan-300 italic">
              "Don't let anyone look down on you because you are young, but set
              an example for the believers in speech, in conduct, in love, in
              faith and in purity."
            </blockquote>
            <cite className="text-sm text-gray-400 mt-2 block">
              1 Timothy 4:12 NIV
            </cite>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
