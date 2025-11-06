import React from "react";
import {
  FaHeart,
  FaLinkedin,
  FaGithub,
  FaTwitter,
  FaInstagram,
  FaEnvelope,
  FaArrowUp,
} from "react-icons/fa";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const quickLinks = [
    { label: "About", href: "#about" },
    { label: "Skills", href: "#skills" },
    { label: "Projects", href: "#projects" },
    { label: "Blog", href: "#blog" },
    { label: "Contact", href: "#contact" },
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
        <div className="liquid-morph absolute bottom-0 right-1/4 w-80 h-80 bg-gradient-to-r from-purple-500/3 to-pink-500/3 blur-3xl"></div>
      </div>

      <div className="container mx-auto px-6 py-12 relative z-10">
        {/* Main Footer Content */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">O</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">
                  <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    Oceaniccoder
                  </span>
                </h3>
                <p className="text-sm text-gray-400">Illona Addae</p>
              </div>
            </div>

            <p className="text-gray-300 leading-relaxed mb-6 max-w-md">
              Passionate full-stack developer and community leader dedicated to
              creating inclusive tech spaces and building innovative solutions
              that make a difference.
            </p>

            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>Made with</span>
              <FaHeart className="text-red-400 animate-pulse" />
              <span>and lots of ☕ in Ghana</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">
              Quick Links
            </h4>
            <ul className="space-y-3">
              {quickLinks.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="text-gray-400 hover:text-cyan-400 transition-colors duration-300 text-sm"
                  >
                    {link.label}
                  </a>
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
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-400 text-sm font-medium">
                  Available for hire
                </span>
              </div>
            </div>
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
              Building the future, one line of code at a time 🌊
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
