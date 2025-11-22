import React, { useState, useEffect, useRef } from "react";
import {
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaLinkedin,
  FaGithub,
  FaTwitter,
  FaInstagram,
  FaPaperPlane,
  FaCheckCircle,
} from "react-icons/fa";
// Appwrite integration removed temporarily

const ContactSection = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [status, setStatus] = useState("idle"); // idle | sending | success | error
  const [responseMessage, setResponseMessage] = useState("");
  const timeoutRef = useRef(null);
  const lastSubmissionRef = useRef(null);
  const formStartTimeRef = useRef(Date.now());
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
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

            <form
              /* Keep action as fallback when JS is disabled, but intercept submit to use AJAX */
              action="https://api.web3forms.com/submit"
              method="POST"
              className="space-y-6"
              onSubmit={async (e) => {
                e.preventDefault();
                // Prevent double submits
                if (status === "sending") return;
                
                const form = e.target;
                const formDataToSend = new FormData(form);
                
                // Honeypot spam check - if honeypot field is filled, it's spam
                const honeypot = formDataToSend.get("website");
                if (honeypot && honeypot.toString().trim() !== "") {
                  console.warn("Spam detected: honeypot field filled");
                  setStatus("error");
                  setResponseMessage("Spam detected. Please try again.");
                  return;
                }
                
                // Rate limiting - prevent submissions within 10 seconds
                const now = Date.now();
                if (lastSubmissionRef.current && (now - lastSubmissionRef.current) < 10000) {
                  setStatus("error");
                  setResponseMessage("Please wait a few seconds before submitting again.");
                  return;
                }
                
                // Human behavior check - form must be open for at least 3 seconds
                const formFillTime = now - formStartTimeRef.current;
                if (formFillTime < 3000) {
                  setStatus("error");
                  setResponseMessage("Please take your time filling out the form.");
                  return;
                }
                
                // Basic content validation
                const message = formDataToSend.get("message")?.toString().trim() || "";
                if (message.length < 10) {
                  setStatus("error");
                  setResponseMessage("Please provide a more detailed message (at least 10 characters).");
                  return;
                }
                
                setStatus("sending");

                try {
                  // Append access key for Web3Forms (also present as a hidden input for no-JS fallback)
                  if (!formDataToSend.has("access_key")) {
                    formDataToSend.append(
                      "access_key",
                      "e0faddf8-32ef-4a92-b097-8aec3e900163"
                    );
                  }

                  // Build a nicer, user-aware subject for incoming emails.
                  // If the visitor provided a subject, include it; otherwise create one using their name.
                  const visitorName = (
                    formDataToSend.get("name") || "Someone"
                  ).toString().trim();
                  const visitorProvidedSubject = (
                    formDataToSend.get("subject") || ""
                  ).toString().trim();
                  const customSubject = visitorProvidedSubject
                    ? `${visitorName} — ${visitorProvidedSubject}`
                    : `${visitorName} sent a message from website`;
                  // Ensure the subject field is set to our custom subject
                  formDataToSend.set("subject", customSubject);

                  // Helpful email fields for Web3Forms: set sender name and reply-to so emails look nicer
                  formDataToSend.set("from_name", visitorName);
                  const visitorEmail = (
                    formDataToSend.get("email") || ""
                  ).toString().trim();
                  if (visitorEmail)
                    formDataToSend.set("reply_to", visitorEmail);
                  
                  // Add timestamp to help with spam detection
                  formDataToSend.set("_timestamp", now.toString());

                  // Create AbortController for timeout
                  const controller = new AbortController();
                  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

                  let res;
                  try {
                    // Note: Don't set Content-Type header - browser will set it automatically for FormData
                    // User-Agent header is not allowed in browser fetch requests
                    res = await fetch("https://api.web3forms.com/submit", {
                      method: "POST",
                      headers: {
                        Accept: "application/json",
                      },
                      body: formDataToSend,
                      signal: controller.signal,
                      // Enable CORS credentials if needed (default is 'same-origin')
                      mode: "cors",
                      cache: "no-cache",
                    });
                    clearTimeout(timeoutId);
                  } catch (fetchError) {
                    clearTimeout(timeoutId);
                    
                    // Handle network errors specifically
                    if (fetchError.name === "AbortError") {
                      throw new Error(
                        "Request timed out. Please check your internet connection and try again."
                      );
                    }
                    
                    if (fetchError instanceof TypeError && fetchError.message.includes("Failed to fetch")) {
                      throw new Error(
                        "Network error: Unable to connect to the server. Please check your internet connection or try again later. You can also reach me directly at illona@oceaniccoder.dev"
                      );
                    }
                    
                    throw fetchError;
                  }

                  // Parse response
                  let json = null;
                  try {
                    const text = await res.text();
                    if (text) {
                      json = JSON.parse(text);
                    }
                  } catch (parseError) {
                    console.error("Failed to parse response:", parseError);
                  }

                  if (!res.ok || (json && json.success === false)) {
                    // Check for spam error specifically
                    const errorMsg = (json && json.message) || `Status ${res.status}`;
                    if (errorMsg.toLowerCase().includes("spam")) {
                      throw new Error(
                        "Your message was flagged as spam. Please ensure your message is genuine and try again, or contact me directly via email."
                      );
                    }
                    throw new Error(errorMsg || `Server error: ${res.status}`);
                  }
                  
                  // Ensure we have a successful response
                  if (!json || json.success !== true) {
                    throw new Error(
                      "The form submission was not successful. Please try again or contact me directly at illona@oceaniccoder.dev"
                    );
                  }
                  
                  // Success - update last submission time
                  lastSubmissionRef.current = now;
                  setStatus("success");
                  setResponseMessage(
                    "Thanks, I received your message. I'll get back to you within 24 hours! ❤️"
                  );
                  // Reset form start time for next submission
                  formStartTimeRef.current = Date.now();
                  
                  // auto-dismiss success message after 6 seconds
                  if (timeoutRef.current) clearTimeout(timeoutRef.current);
                  timeoutRef.current = setTimeout(() => {
                    setStatus("idle");
                    setResponseMessage("");
                    timeoutRef.current = null;
                  }, 6000);
                  // reset local controlled form state
                  setFormData({
                    name: "",
                    email: "",
                    subject: "",
                    message: "",
                  });
                } catch (err) {
                  console.error("Form submit error:", err);
                  setStatus("error");
                  
                  // Provide specific error messages based on error type
                  let errorMessage = "Something went wrong. Please try again later.";
                  
                  if (err && err.message) {
                    errorMessage = err.message;
                  } else if (err instanceof TypeError) {
                    // Network errors (fetch failed)
                    errorMessage = "Network error: Unable to connect to the server. Please check your internet connection or try again later. You can also reach me directly at illona@oceaniccoder.dev";
                  } else if (err.name === "AbortError") {
                    errorMessage = "Request timed out. Please check your internet connection and try again.";
                  }
                  
                  // Add helpful fallback message if not already present
                  if (!errorMessage.includes("illona@oceaniccoder.dev") && !errorMessage.includes("email")) {
                    errorMessage += " Alternatively, you can contact me directly at illona@oceaniccoder.dev";
                  }
                  
                  setResponseMessage(errorMessage);
                }
              }}
            >
              {/* hidden input to support Web3Forms AJAX / no-JS fallback (access key) */}
              <input
                type="hidden"
                name="access_key"
                value="e0faddf8-32ef-4a92-b097-8aec3e900163"
              />
              {/* default subject for no-JS submissions (JS will override to include visitor name) */}
              <input
                type="hidden"
                name="subject"
                value="New message from Oceaniccoder website"
              />
              {/* Honeypot field - hidden from users, bots will fill it */}
              <input
                type="text"
                name="website"
                tabIndex="-1"
                autoComplete="off"
                style={{
                  position: "absolute",
                  left: "-9999px",
                  opacity: 0,
                  pointerEvents: "none",
                }}
                aria-hidden="true"
              />
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
                  Message * <span className="text-gray-400 text-xs font-normal">(minimum 10 characters)</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  minLength={10}
                  rows={6}
                  className="w-full glass-input resize-none"
                  placeholder="Tell me about your project or what you'd like to discuss... (minimum 10 characters)"
                />
              </div>

              {/* Submit Button */}
              {/* Show inline status messages (success / error) */}
              {status === "success" && (
                <div
                  role="status"
                  aria-live="polite"
                  className="p-3 rounded bg-green-100 border border-green-200 text-green-800 flex items-center gap-3 dark:bg-green-600/20 dark:border-green-500/30 dark:text-green-200"
                >
                  <FaCheckCircle
                    className="w-5 h-5 text-green-600 dark:text-green-300 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <span>{responseMessage}</span>
                </div>
              )}
              {status === "error" && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="p-3 rounded bg-red-600/10 border border-red-500/20 text-red-300"
                >
                  {responseMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={status === "sending"}
                className={`w-full glass-btn bg-gradient-to-r from-cyan-600 to-purple-600 text-white py-3 font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                  status === "sending"
                    ? "opacity-70 cursor-wait"
                    : "hover:scale-105"
                }`}
              >
                <FaPaperPlane className="w-4 h-4" />
                {status === "sending" ? "Sending..." : "Send Message"}
              </button>
            </form>

            {/* Response Time Note */}
            <div className="mt-6 space-y-3">
              <div className="p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-lg border border-cyan-500/20">
                <p className="text-sm text-cyan-300">
                  💡 <strong>Quick Response:</strong> I typically respond to
                  messages within 24 hours. For urgent inquiries, feel free to
                  reach out via LinkedIn or email directly.
                </p>
              </div>
              <div className="p-3 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-lg border border-purple-500/10">
                <p className="text-xs text-gray-400">
                  <strong>Tip:</strong> Please take your time filling out the form 
                  and ensure your message is detailed (at least 10 characters). 
                  This helps prevent spam and ensures I receive your message properly.
                </p>
              </div>
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
                href="https://drive.google.com/file/d/1ewZVJPLATbvO5X0tgceWuGKgQIXSxBRX/view?usp=sharing"
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
