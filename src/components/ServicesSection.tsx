import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaCode,
  FaMobile,
  FaServer,
  FaPalette,
  FaRocket,
  FaHeadset,
  FaCheck,
  FaTimes,
  FaStar,
  FaArrowRight,
  FaEnvelope,
  FaQuestionCircle,
} from "react-icons/fa";
import { Link } from "react-router-dom";

// Service Types
interface ServiceFeature {
  name: string;
  included: boolean;
  additionalCost?: string;
}

interface ServicePackage {
  id: string;
  name: string;
  description: string;
  price: string;
  priceNote?: string;
  popular?: boolean;
  icon: React.ReactNode;
  color: string;
  features: ServiceFeature[];
  deliveryTime: string;
  revisions: string;
  support: string;
}

interface AddonService {
  name: string;
  description: string;
  price: string;
}

const ServicesSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"packages" | "addons" | "faq">(
    "packages"
  );
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Service Packages
  const servicePackages: ServicePackage[] = [
    {
      id: "starter",
      name: "Starter",
      description:
        "Perfect for small businesses or personal projects needing a professional web presence.",
      price: "$299",
      priceNote: "Starting from",
      icon: <FaRocket className="text-2xl" />,
      color: "from-blue-500 to-cyan-500",
      deliveryTime: "7-10 days",
      revisions: "2 rounds",
      support: "1 week post-launch",
      features: [
        { name: "Responsive Landing Page", included: true },
        { name: "Up to 5 Sections", included: true },
        { name: "Contact Form Integration", included: true },
        { name: "Basic SEO Setup", included: true },
        { name: "Mobile Responsive Design", included: true },
        { name: "Social Media Integration", included: true },
        { name: "Custom Animations", included: false, additionalCost: "+$100" },
        { name: "CMS Integration", included: false, additionalCost: "+$200" },
        {
          name: "E-commerce Features",
          included: false,
          additionalCost: "+$300",
        },
        { name: "API Integration", included: false, additionalCost: "+$150" },
      ],
    },
    {
      id: "professional",
      name: "Professional",
      description:
        "Comprehensive solution for businesses requiring a full-featured website with advanced functionality.",
      price: "$799",
      priceNote: "Starting from",
      popular: true,
      icon: <FaCode className="text-2xl" />,
      color: "from-purple-500 to-pink-500",
      deliveryTime: "2-4 weeks",
      revisions: "4 rounds",
      support: "1 month post-launch",
      features: [
        { name: "Multi-Page Website (up to 10 pages)", included: true },
        { name: "Custom UI/UX Design", included: true },
        { name: "Advanced SEO Optimization", included: true },
        { name: "Contact Form with Dashboard", included: true },
        { name: "CMS Integration (Blog/Content)", included: true },
        { name: "Custom Animations & Transitions", included: true },
        { name: "Performance Optimization", included: true },
        { name: "Analytics Setup", included: true },
        {
          name: "E-commerce (Basic)",
          included: false,
          additionalCost: "+$500",
        },
        {
          name: "Custom API Development",
          included: false,
          additionalCost: "+$300",
        },
      ],
    },
    {
      id: "enterprise",
      name: "Enterprise",
      description:
        "Full-scale web application with custom features, integrations, and ongoing support.",
      price: "$1,999",
      priceNote: "Starting from",
      icon: <FaServer className="text-2xl" />,
      color: "from-orange-500 to-red-500",
      deliveryTime: "4-8 weeks",
      revisions: "Unlimited",
      support: "3 months post-launch",
      features: [
        { name: "Custom Web Application", included: true },
        { name: "Full-Stack Development", included: true },
        { name: "Database Design & Setup", included: true },
        { name: "User Authentication System", included: true },
        { name: "Admin Dashboard", included: true },
        { name: "API Development & Integration", included: true },
        { name: "E-commerce (Full-Featured)", included: true },
        { name: "Payment Gateway Integration", included: true },
        { name: "Cloud Deployment (AWS/Azure)", included: true },
        { name: "24/7 Priority Support", included: true },
      ],
    },
  ];

  // Additional Services / Add-ons
  const addonServices: AddonService[] = [
    {
      name: "Mobile App Development",
      description: "Native or cross-platform mobile applications (iOS/Android)",
      price: "From $2,499",
    },
    {
      name: "UI/UX Design Only",
      description: "Complete design mockups and prototypes in Figma",
      price: "From $399",
    },
    {
      name: "Website Maintenance",
      description: "Monthly updates, backups, security patches, and monitoring",
      price: "$99/month",
    },
    {
      name: "SEO Optimization Package",
      description:
        "Comprehensive SEO audit, keyword research, and implementation",
      price: "From $299",
    },
    {
      name: "Content Writing",
      description: "Professional copywriting for your website pages",
      price: "$50/page",
    },
    {
      name: "Logo Design",
      description: "Professional logo design with multiple concepts",
      price: "From $149",
    },
    {
      name: "Performance Audit",
      description: "In-depth analysis and optimization recommendations",
      price: "$199",
    },
    {
      name: "Hosting Setup & Management",
      description: "Domain, hosting configuration, and SSL setup",
      price: "$99 one-time",
    },
  ];

  // FAQ Items
  const faqItems = [
    {
      question: "What's included in the revision rounds?",
      answer:
        "Each revision round covers feedback on design, functionality, or content changes. Major scope changes or new feature requests may require additional discussion and potentially an adjusted quote.",
    },
    {
      question: "How does the payment process work?",
      answer:
        "I typically require a 50% deposit to begin work, with the remaining 50% due upon project completion before the final handover. For larger projects, we can discuss milestone-based payments.",
    },
    {
      question: "Do you offer ongoing maintenance?",
      answer:
        "Yes! I offer monthly maintenance packages starting at $99/month which includes updates, backups, security monitoring, and minor content changes. Custom maintenance plans are also available.",
    },
    {
      question: "Can I upgrade my package later?",
      answer:
        "Absolutely! You can always add more features or upgrade to a higher tier. Any work already completed will be credited toward the upgrade cost.",
    },
    {
      question: "What technologies do you work with?",
      answer:
        "I specialize in React, TypeScript, Node.js, and modern web technologies. For mobile apps, I use React Native. Backend services include Express, PostgreSQL, MongoDB, and cloud services like AWS and Firebase.",
    },
    {
      question: "Do you provide source code?",
      answer:
        "Yes, upon full payment, you receive complete ownership of all source code and assets created for your project.",
    },
    {
      question: "What if I need something custom?",
      answer:
        "I love custom projects! If your needs don't fit these packages, let's chat. I'll provide a tailored quote based on your specific requirements.",
    },
    {
      question: "How do we communicate during the project?",
      answer:
        "I use a combination of email, video calls (Zoom/Google Meet), and project management tools like Notion or Trello. You'll have direct access to me throughout the project.",
    },
  ];

  return (
    <section
      id="services"
      className="py-20 md:py-32 relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 50%, var(--bg-tertiary) 100%)",
      }}
    >
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="liquid-morph absolute top-20 left-20 w-96 h-96 bg-gradient-to-r from-cyan-500/8 to-blue-500/10 blur-3xl"></div>
        <div className="liquid-morph absolute bottom-40 right-20 w-80 h-80 bg-gradient-to-r from-purple-500/6 to-pink-500/8 blur-3xl"></div>
        <div className="liquid-morph absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-emerald-500/5 to-cyan-500/5 blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 dark:from-cyan-400 dark:via-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                Services & Pricing
              </span>
            </h2>
            <p className="text-lg md:text-xl leading-relaxed max-w-3xl mx-auto text-[var(--text-secondary)]">
              Professional web development services tailored to your needs. From
              simple landing pages to complex web applications.
            </p>
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex p-1.5 rounded-2xl glass-card border border-[var(--glass-border)]">
            {[
              { id: "packages", label: "Packages" },
              { id: "addons", label: "Add-ons" },
              { id: "faq", label: "FAQ" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-300 ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {/* Packages Tab */}
          {activeTab === "packages" && (
            <motion.div
              key="packages"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {servicePackages.map((pkg, index) => (
                  <motion.div
                    key={pkg.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className={`relative glass-card border rounded-3xl overflow-hidden transition-all duration-300 hover:scale-[1.02] ${
                      pkg.popular
                        ? "border-purple-500/50 shadow-xl shadow-purple-500/20"
                        : "border-[var(--glass-border)] hover:border-cyan-500/50"
                    }`}
                  >
                    {/* Popular Badge */}
                    {pkg.popular && (
                      <div className="absolute top-0 right-0">
                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl flex items-center gap-1">
                          <FaStar className="text-yellow-300" /> MOST POPULAR
                        </div>
                      </div>
                    )}

                    {/* Header */}
                    <div className={`p-6 pb-0 ${pkg.popular ? "pt-10" : ""}`}>
                      <div
                        className={`inline-flex p-3 rounded-2xl bg-gradient-to-r ${pkg.color} text-white mb-4`}
                      >
                        {pkg.icon}
                      </div>
                      <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                        {pkg.name}
                      </h3>
                      <p className="text-[var(--text-secondary)] text-sm mb-4 min-h-[60px]">
                        {pkg.description}
                      </p>
                      <div className="flex items-baseline gap-2 mb-6">
                        <span className="text-4xl font-bold text-[var(--text-primary)]">
                          {pkg.price}
                        </span>
                        {pkg.priceNote && (
                          <span className="text-sm text-[var(--text-accent)]">
                            {pkg.priceNote}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Info */}
                    <div className="px-6 py-4 border-y border-[var(--glass-border)] grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-xs text-[var(--text-accent)] mb-1">
                          Delivery
                        </p>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {pkg.deliveryTime}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--text-accent)] mb-1">
                          Revisions
                        </p>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {pkg.revisions}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--text-accent)] mb-1">
                          Support
                        </p>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {pkg.support}
                        </p>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="p-6">
                      <p className="text-xs font-semibold text-[var(--text-accent)] uppercase tracking-wider mb-4">
                        What's Included
                      </p>
                      <ul className="space-y-3">
                        {pkg.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            {feature.included ? (
                              <FaCheck className="text-emerald-500 mt-0.5 flex-shrink-0" />
                            ) : (
                              <FaTimes className="text-gray-500 mt-0.5 flex-shrink-0" />
                            )}
                            <span
                              className={`text-sm ${
                                feature.included
                                  ? "text-[var(--text-primary)]"
                                  : "text-[var(--text-accent)]"
                              }`}
                            >
                              {feature.name}
                              {!feature.included && feature.additionalCost && (
                                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500">
                                  {feature.additionalCost}
                                </span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* CTA */}
                    <div className="p-6 pt-0">
                      <Link
                        to="/contact"
                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all duration-300 bg-gradient-to-r ${
                          pkg.color
                        } text-white hover:scale-105 shadow-lg ${
                          pkg.popular
                            ? "shadow-purple-500/30"
                            : "shadow-black/20"
                        }`}
                      >
                        Get Started <FaArrowRight className="text-sm" />
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Custom Project CTA */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mt-12 text-center"
              >
                <div className="inline-block glass-card border border-[var(--glass-border)] rounded-2xl p-8 max-w-2xl">
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                    Need Something Custom?
                  </h3>
                  <p className="text-[var(--text-secondary)] mb-4">
                    Every project is unique. Let's discuss your specific
                    requirements and create a tailored solution.
                  </p>
                  <Link
                    to="/contact"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl hover:scale-105 transition-transform shadow-lg"
                  >
                    <FaEnvelope /> Request Custom Quote
                  </Link>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Add-ons Tab */}
          {activeTab === "addons" && (
            <motion.div
              key="addons"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {addonServices.map((addon, index) => (
                  <motion.div
                    key={addon.name}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    className="glass-card border border-[var(--glass-border)] rounded-2xl p-6 hover:border-cyan-500/50 transition-all duration-300 hover:scale-[1.02]"
                  >
                    <h4 className="text-lg font-bold text-[var(--text-primary)] mb-2">
                      {addon.name}
                    </h4>
                    <p className="text-sm text-[var(--text-secondary)] mb-4 min-h-[48px]">
                      {addon.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">
                        {addon.price}
                      </span>
                      <Link
                        to="/contact"
                        className="text-sm text-[var(--text-accent)] hover:text-cyan-500 transition-colors flex items-center gap-1"
                      >
                        Add <FaArrowRight className="text-xs" />
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Bulk Discount Note */}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mt-8 text-center"
              >
                <p className="text-[var(--text-secondary)] text-sm">
                  💡 <strong>Pro tip:</strong> Bundle add-ons with any package
                  and get 10% off the total!
                </p>
              </motion.div>
            </motion.div>
          )}

          {/* FAQ Tab */}
          {activeTab === "faq" && (
            <motion.div
              key="faq"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-3xl mx-auto"
            >
              <div className="space-y-4">
                {faqItems.map((faq, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="glass-card border border-[var(--glass-border)] rounded-xl overflow-hidden"
                  >
                    <button
                      onClick={() =>
                        setExpandedFaq(expandedFaq === index ? null : index)
                      }
                      className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-colors"
                    >
                      <span className="font-semibold text-[var(--text-primary)] flex items-center gap-3">
                        <FaQuestionCircle className="text-cyan-500 flex-shrink-0" />
                        {faq.question}
                      </span>
                      <span
                        className={`text-[var(--text-accent)] transition-transform duration-300 ${
                          expandedFaq === index ? "rotate-180" : ""
                        }`}
                      >
                        ▼
                      </span>
                    </button>
                    <AnimatePresence>
                      {expandedFaq === index && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 pl-14 text-[var(--text-secondary)]">
                            {faq.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>

              {/* Still Have Questions */}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mt-12 text-center glass-card border border-[var(--glass-border)] rounded-2xl p-8"
              >
                <FaHeadset className="text-4xl text-cyan-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                  Still Have Questions?
                </h3>
                <p className="text-[var(--text-secondary)] mb-4">
                  I'm here to help! Feel free to reach out and let's discuss
                  your project.
                </p>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl hover:scale-105 transition-transform shadow-lg"
                >
                  <FaEnvelope /> Get in Touch
                </Link>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-20 text-center"
        >
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 text-[var(--text-accent)]">
            <div className="flex items-center gap-2">
              <FaCheck className="text-emerald-500" />
              <span>100% Satisfaction Guarantee</span>
            </div>
            <div className="flex items-center gap-2">
              <FaCheck className="text-emerald-500" />
              <span>Fast Communication</span>
            </div>
            <div className="flex items-center gap-2">
              <FaCheck className="text-emerald-500" />
              <span>Quality Code Standards</span>
            </div>
            <div className="flex items-center gap-2">
              <FaCheck className="text-emerald-500" />
              <span>On-Time Delivery</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ServicesSection;
