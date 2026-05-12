import React, { useState } from "react";
import { FaBriefcase, FaCheckCircle, FaArrowRight } from "react-icons/fa";
import { createInquiry } from "../../services/api/inquiries";
import { apiUrl } from "../../utils/apiUrl";

const PROJECT_TYPES = [
  "Portfolio Website",
  "E-Commerce Store",
  "Web Application",
  "Mobile App",
  "Landing Page",
  "Dashboard / Admin Panel",
  "API / Backend",
  "Other",
];

const TIMELINES = [
  "Less than 2 weeks",
  "2–4 weeks",
  "1–2 months",
  "2–3 months",
  "3+ months",
  "Flexible",
];

const BUDGET_RANGES = [
  "Under GHS 1,500 (~$100)",
  "GHS 1,500 – 4,500 (~$100 – $300)",
  "GHS 4,500 – 9,000 (~$300 – $600)",
  "GHS 9,000 – 22,000 (~$600 – $1,500)",
  "GHS 22,000 – 45,000 (~$1,500 – $3,000)",
  "GHS 45,000 – 100,000 (~$3,000 – $7,000)",
  "GHS 100,000+ (~$7,000+)",
  "Not sure yet",
];

const FEATURES_BY_TYPE = {
  "Portfolio Website": [
    "Animations",
    "SEO Optimisation",
    "Blog / CMS",
    "Contact Form",
    "Mobile Responsive",
    "Dark Mode",
    "Gallery / Portfolio Grid",
    "Testimonials Section",
  ],
  "E-Commerce Store": [
    "Payment Integration",
    "User Authentication",
    "Product Catalogue",
    "Shopping Cart",
    "Order Management",
    "Admin Dashboard",
    "Email Notifications",
    "Mobile Responsive",
    "SEO Optimisation",
    "Inventory Tracking",
  ],
  "Web Application": [
    "User Authentication",
    "Admin Dashboard",
    "Real-time Updates",
    "API Integration",
    "Email Notifications",
    "Payment Integration",
    "Role-Based Access",
    "Data Export",
    "Mobile Responsive",
    "Notifications / Alerts",
  ],
  "Mobile App": [
    "User Authentication",
    "Push Notifications",
    "Payment Integration",
    "Offline Support",
    "Real-time Updates",
    "Camera / Media Access",
    "Maps / Location",
    "API Integration",
    "Dark Mode",
    "In-App Messaging",
  ],
  "Landing Page": [
    "Animations",
    "SEO Optimisation",
    "Mobile Responsive",
    "Contact Form",
    "Email Notifications",
    "A/B Testing",
    "Analytics Integration",
    "Live Chat Widget",
  ],
  "Dashboard / Admin Panel": [
    "User Authentication",
    "Role-Based Access",
    "Real-time Updates",
    "Data Visualisation / Charts",
    "Admin Dashboard",
    "Email Notifications",
    "Data Export",
    "API Integration",
    "Audit Logs",
    "Mobile Responsive",
  ],
  "API / Backend": [
    "User Authentication",
    "Role-Based Access",
    "Real-time Updates",
    "Email Notifications",
    "Webhooks",
    "Rate Limiting",
    "API Documentation",
    "Database Design",
    "File Uploads",
    "Third-party Integrations",
  ],
  Other: [
    "User Authentication",
    "Payment Integration",
    "Admin Dashboard",
    "Blog / CMS",
    "API Integration",
    "Animations",
    "SEO Optimisation",
    "Email Notifications",
    "Real-time Updates",
    "Mobile Responsive",
  ],
};

const DOMAIN_EXTENSIONS = [
  { ext: ".com", price: "$16/yr" },
  { ext: ".net", price: "$18/yr" },
  { ext: ".org", price: "$19/yr" },
  { ext: ".dev", price: "$22/yr" },
  { ext: ".io", price: "$45/yr" },
];

const INITIAL_FORM = {
  name: "",
  email: "",
  phone: "",
  projectType: "",
  otherProjectType: "",
  description: "",
  features: [],
  timeline: "",
  budgetRange: "",
  notes: "",
  hasLogo: null,
  needsDomain: null,
  domainExtension: "",
  needsHosting: null,
};

export default function InquiryPage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [status, setStatus] = useState("idle");
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Valid email required";
    if (!form.projectType) e.projectType = "Select a project type";
    if (!form.description.trim() || form.description.trim().length < 20)
      e.description = "Please describe your project (at least 20 characters)";
    return e;
  };

  const handleProjectTypeChange = (type) => {
    setForm((prev) => ({ ...prev, projectType: type, otherProjectType: "", features: [] }));
  };

  const toggleFeature = (feature) => {
    setForm((prev) => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter((f) => f !== feature)
        : [...prev.features, feature],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setStatus("loading");
    setErrors({});
    try {
      const resolvedType =
        form.projectType === "Other" && form.otherProjectType.trim()
          ? form.otherProjectType.trim()
          : form.projectType;
      // eslint-disable-next-line no-unused-vars
      const {
        otherProjectType: _omit,
        hasLogo,
        needsDomain,
        domainExtension,
        needsHosting,
        ...rest
      } = form;
      const inquiryData = {
        ...rest,
        projectType: resolvedType,
        status: "new",
        ...(hasLogo !== null && { hasLogo }),
        ...(needsDomain !== null && { needsDomain }),
        ...(needsDomain && domainExtension && { domainExtension }),
        ...(needsHosting !== null && { needsHosting }),
      };
      await createInquiry(inquiryData);
      // Notify admin via Azure Function (fire-and-forget)
      fetch(apiUrl("/api/notify-inquiry"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, projectType: resolvedType }),
      }).catch(() => {});
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: "var(--bg-primary)" }}
      >
        <div className="max-w-md w-full text-center">
          <FaCheckCircle className="text-6xl text-oceanic-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-3">Got it, thanks!</h1>
          <p className="text-[var(--text-secondary)] mb-8">
            I've received your project details and will get back to you within 24 hours with
            availability and next steps.
          </p>
          <a
            href="https://oceaniccoder.dev"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white"
            style={{ background: "linear-gradient(135deg, var(--accent-teal) 0%, #0d7a6e 100%)" }}
          >
            Back to Portfolio <FaArrowRight />
          </a>
        </div>
      </div>
    );
  }

  const inputClass =
    "w-full px-4 py-3 rounded-xl text-[var(--text-primary)] outline-none transition-all focus:ring-2 focus:ring-oceanic-400/50";
  const inputStyle = {
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-subtle)",
    fontSize: "16px",
  };

  return (
    <div className="min-h-screen py-16 px-4" style={{ background: "var(--bg-primary)" }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "var(--accent-teal-subtle)" }}
          >
            <FaBriefcase className="text-2xl" style={{ color: "var(--accent-teal)" }} />
          </div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
            Tell me about your project
          </h1>
          <p className="text-[var(--text-secondary)]">
            Fill in the details below and I'll get back to you with a quote within 24 hours.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl p-8"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}
        >
          {/* Name + Email */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Jane Doe"
                className={inputClass}
                style={inputStyle}
              />
              {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                Email *
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="jane@example.com"
                className={inputClass}
                style={inputStyle}
              />
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
              Phone / WhatsApp <span className="text-[var(--text-secondary)]">(optional)</span>
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="+233 XX XXX XXXX"
              className={inputClass}
              style={inputStyle}
            />
          </div>

          {/* Project Type */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
              Project Type *
            </label>
            <select
              value={form.projectType}
              onChange={(e) => handleProjectTypeChange(e.target.value)}
              className={inputClass}
              style={inputStyle}
            >
              <option value="">Select a type...</option>
              {PROJECT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {form.projectType === "Other" && (
              <input
                type="text"
                value={form.otherProjectType}
                onChange={(e) => setForm((p) => ({ ...p, otherProjectType: e.target.value }))}
                placeholder="Describe your project type..."
                className={`${inputClass} mt-2`}
                style={inputStyle}
              />
            )}
            {errors.projectType && (
              <p className="mt-1 text-xs text-red-400">{errors.projectType}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
              Project Description *
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Describe what you want built, who it's for, and any key requirements..."
              rows={5}
              className={inputClass}
              style={{ ...inputStyle, resize: "vertical" }}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-400">{errors.description}</p>
            )}
          </div>

          {/* Features */}
          {form.projectType && (
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Features needed{" "}
                <span className="text-[var(--text-secondary)]">(select all that apply)</span>
              </label>
              <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
                Showing features relevant to{" "}
                <span style={{ color: "var(--accent-teal)" }}>
                  {form.projectType === "Other" && form.otherProjectType.trim()
                    ? form.otherProjectType.trim()
                    : form.projectType}
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                {(FEATURES_BY_TYPE[form.projectType] || FEATURES_BY_TYPE["Other"]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleFeature(f)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                    style={
                      form.features.includes(f)
                        ? { background: "var(--accent-teal)", color: "#fff" }
                        : {
                            background: "var(--bg-primary)",
                            border: "1px solid var(--border-subtle)",
                            color: "var(--text-secondary)",
                          }
                    }
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
              Do you have a logo / brand assets ready?
            </label>
            <div className="flex gap-3">
              {[
                { label: "Yes, I have one", value: true },
                { label: "No, I need one designed", value: false },
              ].map(({ label, value }) => (
                <button
                  key={String(value)}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, hasLogo: value }))}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={
                    form.hasLogo === value
                      ? {
                          background: "var(--accent-teal)",
                          color: "#fff",
                          border: "1px solid transparent",
                        }
                      : {
                          background: "var(--bg-primary)",
                          border: "1px solid var(--border-subtle)",
                          color: "var(--text-secondary)",
                        }
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Domain */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
              Do you need a domain name?
            </label>
            <div className="flex gap-3 mb-3">
              {[
                { label: "Yes, register one for me", value: true },
                { label: "No, I already have one", value: false },
              ].map(({ label, value }) => (
                <button
                  key={String(value)}
                  type="button"
                  onClick={() =>
                    setForm((p) => ({
                      ...p,
                      needsDomain: value,
                      domainExtension: value ? p.domainExtension : "",
                    }))
                  }
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={
                    form.needsDomain === value
                      ? {
                          background: "var(--accent-teal)",
                          color: "#fff",
                          border: "1px solid transparent",
                        }
                      : {
                          background: "var(--bg-primary)",
                          border: "1px solid var(--border-subtle)",
                          color: "var(--text-secondary)",
                        }
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            {form.needsDomain === true && (
              <div>
                <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
                  Pick an extension — Namecheap pricing (registration fee, billed annually):
                </p>
                <div className="flex flex-wrap gap-2">
                  {DOMAIN_EXTENSIONS.map(({ ext, price }) => (
                    <button
                      key={ext}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, domainExtension: ext }))}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex flex-col items-center gap-0.5"
                      style={
                        form.domainExtension === ext
                          ? {
                              background: "var(--accent-teal)",
                              color: "#fff",
                              border: "1px solid transparent",
                            }
                          : {
                              background: "var(--bg-primary)",
                              border: "1px solid var(--border-subtle)",
                              color: "var(--text-secondary)",
                            }
                      }
                    >
                      <span className="font-bold">{ext}</span>
                      <span className="text-xs opacity-80">{price}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Hosting */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
              Do you need web hosting?
            </label>
            <div className="flex gap-3">
              {[
                { label: "Yes, set it up for me", value: true },
                { label: "No, I'll handle it", value: false },
              ].map(({ label, value }) => (
                <button
                  key={String(value)}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, needsHosting: value }))}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={
                    form.needsHosting === value
                      ? {
                          background: "var(--accent-teal)",
                          color: "#fff",
                          border: "1px solid transparent",
                        }
                      : {
                          background: "var(--bg-primary)",
                          border: "1px solid var(--border-subtle)",
                          color: "var(--text-secondary)",
                        }
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline + Budget */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                Ideal Timeline
              </label>
              <select
                value={form.timeline}
                onChange={(e) => setForm((p) => ({ ...p, timeline: e.target.value }))}
                className={inputClass}
                style={inputStyle}
              >
                <option value="">Select...</option>
                {TIMELINES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                Budget Range
              </label>
              <select
                value={form.budgetRange}
                onChange={(e) => setForm((p) => ({ ...p, budgetRange: e.target.value }))}
                className={inputClass}
                style={inputStyle}
              >
                <option value="">Select...</option>
                {BUDGET_RANGES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
              Anything else? <span className="text-[var(--text-secondary)]">(optional)</span>
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Reference sites, design preferences, existing codebase, deadline..."
              rows={3}
              className={inputClass}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {status === "error" && (
            <p className="text-sm text-red-400">Something went wrong. Please try again.</p>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, var(--accent-teal) 0%, #0d7a6e 100%)" }}
          >
            <FaArrowRight />
            {status === "loading" ? "Submitting..." : "Submit Project Brief"}
          </button>
        </form>
      </div>
    </div>
  );
}
