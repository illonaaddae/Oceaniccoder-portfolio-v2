import React, { useState } from "react";
import {
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaLinkedin,
  FaGithub,
  FaTwitter,
  FaInstagram,
  FaPaperPlane,
  FaHeart,
} from "react-icons/fa";

const ContactSection = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState("");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    setTimeout(() => {
      setSubmitStatus("success");
      setIsSubmitting(false);
      setFormData({ name: "", email: "", subject: "", message: "" });

      setTimeout(() => setSubmitStatus(""), 5000);
    }, 2000);
  };

  const contactInfo = [
    {
      icon: <FaEnvelope className="text-cyan-400" />,
      label: "Email",
      value: "illona@oceaniccoder.dev",
      href: "mailto:illona@oceaniccoder.dev",
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

  const socialLinks = [
    {
      icon: <FaLinkedin />,
      label: "LinkedIn",
      href: "https://linkedin.com/in/illona-addae",
      color: "hover:text-blue-400",
    },
    {
      icon: <FaGithub />,
      label: "GitHub",
      href: "https://github.com/illona-addae",
      color: "hover:text-gray-400",
    },
    {
      icon: <FaTwitter />,
      label: "Twitter",
      href: "https://twitter.com/oceaniccoder",
      color: "hover:text-blue-400",
    },
    {
      icon: <FaInstagram />,
      label: "Instagram",
      href: "https://instagram.com/oceaniccoder",
      color: "hover:text-pink-400",
    },
  ];

  return (
    <section
      id="contact"
      className="min-h-screen py-20 relative"
      style={{
        background:
          "linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 50%, var(--bg-primary) 100%)",
      }}
    >
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="liquid-morph absolute top-20 left-10 w-96 h-96 bg-gradient-to-r from-cyan-500/8 to-blue-500/10 blur-3xl"></div>
        <div className="liquid-morph absolute bottom-20 right-10 w-80 h-80 bg-gradient-to-r from-purple-500/6 to-pink-500/8 blur-3xl"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 dark:from-cyan-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
              Let's Connect
            </span>
          </h2>
          <p className="text-xl leading-relaxed max-w-3xl mx-auto text-gray-700 dark:text-gray-300">
            Ready to collaborate on your next project or discuss opportunities
            in tech?
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 max-w-6xl mx-auto">
          {/* Contact Information */}
          <div className="space-y-8">
            <div className="glass-card p-8">
              <h3 className="text-2xl font-bold text-white mb-6">
                Get in Touch
              </h3>
              <p className="text-gray-300 mb-8 leading-relaxed">
                I'm always excited to discuss new opportunities, collaborate on
                innovative projects, or share insights about technology and
                leadership. Whether you're looking to build something amazing or
                just want to connect, I'd love to hear from you!
              </p>

              {/* Contact Info */}
              <div className="space-y-6">
                {contactInfo.map((info, index) => (
                  <a
                    key={index}
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
                <h4 className="text-lg font-semibold text-white mb-4">
                  Follow Me
                </h4>
                <div className="flex gap-4">
                  {socialLinks.map((social, index) => (
                    <a
                      key={index}
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

          {/* Contact Form */}
          <div className="glass-card p-8">
            <h3 className="text-2xl font-bold text-white mb-6">
              Send a Message
            </h3>

            {submitStatus === "success" && (
              <div className="mb-6 p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-green-400">
                  <FaHeart className="w-4 h-4" />
                  <span className="font-medium">
                    Message sent successfully!
                  </span>
                </div>
                <p className="text-sm text-gray-300 mt-1">
                  I'll get back to you within 24 hours.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Input */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-white mb-2"
                >
                  Your Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full glass-input"
                  placeholder="Enter your full name"
                />
              </div>

              {/* Email Input */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-white mb-2"
                >
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full glass-input"
                  placeholder="your.email@example.com"
                />
              </div>

              {/* Subject Input */}
              <div>
                <label
                  htmlFor="subject"
                  className="block text-sm font-medium text-white mb-2"
                >
                  Subject *
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  required
                  className="w-full glass-input"
                  placeholder="What's this about?"
                />
              </div>

              {/* Message Textarea */}
              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-medium text-white mb-2"
                >
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  rows={6}
                  className="w-full glass-input resize-none"
                  placeholder="Tell me about your project or what you'd like to discuss..."
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full glass-btn bg-gradient-to-r from-cyan-600 to-purple-600 text-white py-3 font-medium hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 ${
                  isSubmitting ? "opacity-75 cursor-not-allowed" : ""
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <FaPaperPlane className="w-4 h-4" />
                    Send Message
                  </>
                )}
              </button>
            </form>

            {/* Response Time Note */}
            <div className="mt-6 p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-lg border border-cyan-500/20">
              <p className="text-sm text-cyan-300">
                💡 <strong>Quick Response:</strong> I typically respond to
                messages within 24 hours. For urgent inquiries, feel free to
                reach out via LinkedIn or email directly.
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-20 text-center">
          <div className="glass-card p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-white mb-4">
              Ready to Build Something Amazing?
            </h3>
            <p className="text-gray-300 mb-6">
              Let's turn your ideas into reality. Whether it's a web
              application, mobile app, or innovative tech solution, I'm here to
              help bring your vision to life.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <a
                href="mailto:illona@oceaniccoder.dev"
                className="glass-btn bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-6 py-3 font-medium hover:scale-105 transition-transform duration-300 flex items-center gap-2"
              >
                <FaEnvelope className="w-4 h-4" />
                Email Me
              </a>
              <a
                href="/path-to-your-cv.pdf"
                download
                className="glass-btn border border-white/20 text-white px-6 py-3 font-medium hover:scale-105 transition-transform duration-300"
              >
                Download CV
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
