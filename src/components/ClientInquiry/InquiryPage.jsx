import React, { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { FaBriefcase, FaCheckCircle, FaArrowRight, FaArrowLeft } from "react-icons/fa";
import { createInquiry } from "../../services/api/inquiries";
import { apiUrl } from "../../utils/apiUrl";
import SelectDropdown from "./SelectDropdown";
import { useToast } from "../AdminDashboard/useToastHook";
import { ToastContainer } from "../AdminDashboard/Toast";

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
  preferredContact: "Email",
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

const STEPS = [
  { id: 1, label: "Contact" },
  { id: 2, label: "Project" },
  { id: 3, label: "Extras" },
  { id: 4, label: "Timeline" },
  { id: 5, label: "Review" },
];

export default function InquiryPage() {
  const [searchParams] = useSearchParams();
  const serviceParam = searchParams.get("service");
  const toast = useToast();

  const [form, setForm] = useState({
    ...INITIAL_FORM,
    notes: serviceParam ? `Interested in the "${serviceParam}" package.` : "",
  });
  const [status, setStatus] = useState("idle");
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const fieldRefs = {
    name: useRef(null),
    email: useRef(null),
    projectType: useRef(null),
    description: useRef(null),
    domainExtension: useRef(null),
    terms: useRef(null),
  };
  const topRef = useRef(null);

  useEffect(() => {
    if (status === "success") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [status]);

  // Validation per step
  const validateStep1 = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Valid email required";
    return e;
  };

  const validateStep2 = () => {
    const e = {};
    if (!form.projectType) e.projectType = "Select a project type";
    if (form.projectType === "Other" && !form.otherProjectType.trim())
      e.projectType = "Please describe your project type";
    if (!form.description.trim() || form.description.trim().length < 20)
      e.description = "Please describe your project (at least 20 characters)";
    return e;
  };

  const validateStep3 = () => {
    const e = {};
    if (form.needsDomain === true && !form.domainExtension)
      e.domainExtension = "Pick a domain extension";
    return e;
  };

  const validateStep4 = () => {
    // No required fields on the timeline step.
    return {};
  };

  const validateStep5 = () => {
    const e = {};
    if (!termsAccepted) e.terms = "Please accept the terms before submitting";
    return e;
  };

  const validateAll = () => ({
    ...validateStep1(),
    ...validateStep2(),
    ...validateStep3(),
    ...validateStep4(),
    ...validateStep5(),
  });

  const scrollToFirstError = (errs) => {
    const order = ["name", "email", "projectType", "description", "domainExtension", "terms"];
    const firstErrorKey = order.find((k) => errs[k]);
    if (firstErrorKey && fieldRefs[firstErrorKey]?.current) {
      fieldRefs[firstErrorKey].current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const validateForStep = (s) => {
    if (s === 1) return validateStep1();
    if (s === 2) return validateStep2();
    if (s === 3) return validateStep3();
    if (s === 4) return validateStep4();
    return validateStep5();
  };

  const handleNext = () => {
    const errs = validateForStep(step);
    if (Object.keys(errs).length) {
      setErrors(errs);
      scrollToFirstError(errs);
      toast.error("Please fix the errors before continuing.");
      return;
    }
    setErrors({});
    setStep((s) => Math.min(5, s + 1));
    // Scroll wizard top into view on step change
    setTimeout(() => {
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const handleBack = () => {
    setErrors({});
    setStep((s) => Math.max(1, s - 1));
    setTimeout(() => {
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
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
    const errs = validateAll();
    if (Object.keys(errs).length) {
      setErrors(errs);
      // Jump back to the earliest step that has errors
      if (errs.name || errs.email) setStep(1);
      else if (errs.projectType || errs.description) setStep(2);
      else if (errs.domainExtension) setStep(3);
      else if (errs.terms) setStep(5);
      setTimeout(() => scrollToFirstError(errs), 0);
      toast.error("Please fix the errors before submitting.");
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
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <FaCheckCircle className="text-6xl text-oceanic-400 dark:text-oceanic-400 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-3">Got it, thanks!</h1>
          <p className="text-[var(--text-secondary)] mb-8">
            I've received your project details and will get back to you within 24 hours with
            availability and next steps.
          </p>
          <a
            href="https://oceaniccoder.dev"
            className="glass-btn bg-gradient-to-r from-oceanic-600 to-oceanic-900 text-white inline-flex items-center gap-2 px-6 py-3 font-semibold"
          >
            Back to Portfolio <FaArrowRight />
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} theme="dark" />
      <div
        className="min-h-screen pt-24 pb-16 px-4"
        style={{
          background:
            "linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 50%, var(--bg-tertiary) 100%)",
        }}
      >
        <Helmet>
          <title>Start a Project | OceanicCoder</title>
          <meta
            name="description"
            content="Tell me about your project and get a tailored proposal within 24 hours. Web apps, mobile apps, e-commerce and more."
          />
          <meta property="og:title" content="Start a Project | OceanicCoder" />
          <meta
            property="og:description"
            content="Tell me about your project and get a tailored proposal within 24 hours. Web apps, mobile apps, e-commerce and more."
          />
          <meta property="og:url" content="https://oceaniccoder.dev/inquiry" />
        </Helmet>
        <div className="max-w-2xl mx-auto" ref={topRef}>
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-oceanic-500/10">
              <FaBriefcase className="text-2xl" style={{ color: "var(--accent-teal)" }} />
            </div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
              Tell me about your project
            </h1>
            <p className="text-[var(--text-secondary)]">
              Fill in the details below and I'll get back to you with a quote within 24 hours.
            </p>
          </div>

          {/* Progress indicator */}
          <div className="mb-6" aria-label="Form progress">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-brand-link dark:text-oceanic-400">
                Step {step} of {STEPS.length}
              </span>
              <span className="text-sm text-brand-accent-strong dark:text-oceanic-400 font-medium">
                {STEPS[step - 1].label}
              </span>
            </div>
            <div
              className="flex gap-2"
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={STEPS.length}
              aria-valuenow={step}
            >
              {STEPS.map((s) => {
                const active = s.id <= step;
                return (
                  <div
                    key={s.id}
                    className={`h-2 flex-1 rounded-full transition-colors ${
                      active ? "bg-brand-link dark:bg-oceanic-400" : "bg-gray-200 dark:bg-white/10"
                    }`}
                    aria-label={`${s.label}${active ? " (complete or current)" : ""}`}
                  />
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="glass-card space-y-6 p-8" noValidate>
            {/* STEP 1: Contact info */}
            {step === 1 && (
              <>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div ref={fieldRefs.name}>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Jane Doe"
                      className="w-full glass-input"
                    />
                    {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
                  </div>
                  <div ref={fieldRefs.email}>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                      placeholder="jane@example.com"
                      className="w-full glass-input"
                    />
                    {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                    Phone / WhatsApp{" "}
                    <span className="text-[var(--text-secondary)]">(optional)</span>
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="+233 XX XXX XXXX"
                    className="w-full glass-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                    Preferred contact method
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    {["Email", "Phone", "WhatsApp"].map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, preferredContact: method }))}
                        className={
                          form.preferredContact === method
                            ? "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all bg-oceanic-500 text-white border border-transparent"
                            : "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all glass-btn text-[var(--text-secondary)]"
                        }
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* STEP 2: Project basics */}
            {step === 2 && (
              <>
                <div ref={fieldRefs.projectType}>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                    Project Type *
                  </label>
                  <SelectDropdown
                    value={form.projectType}
                    onChange={handleProjectTypeChange}
                    options={PROJECT_TYPES}
                    placeholder="Select a type..."
                  />
                  {form.projectType === "Other" && (
                    <input
                      type="text"
                      value={form.otherProjectType}
                      onChange={(e) => setForm((p) => ({ ...p, otherProjectType: e.target.value }))}
                      placeholder="Describe your project type..."
                      className="w-full glass-input mt-2"
                    />
                  )}
                  {errors.projectType && (
                    <p className="mt-1 text-xs text-red-400">{errors.projectType}</p>
                  )}
                </div>

                <div ref={fieldRefs.description}>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                    Project Description *{" "}
                    <span className="text-[var(--text-secondary)] font-normal text-xs">
                      (min. 20 characters)
                    </span>
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Describe what you want built, who it's for, and any key requirements. At least 20 characters. The more detail you give, the better I can help."
                    rows={5}
                    className="w-full glass-input"
                  />
                  <div className="flex justify-between mt-1">
                    {errors.description ? (
                      <p className="text-xs text-red-400">{errors.description}</p>
                    ) : (
                      <span />
                    )}
                    <span
                      className={`text-xs ml-auto ${form.description.trim().length < 20 ? "text-gray-600 dark:text-gray-200" : "text-brand-link dark:text-oceanic-400"}`}
                    >
                      {form.description.trim().length} / 20 min
                    </span>
                  </div>
                </div>

                {form.projectType && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                      Features needed{" "}
                      <span className="text-[var(--text-secondary)]">(select all that apply)</span>
                    </label>
                    <p className="text-xs mb-3 text-gray-600 dark:text-gray-200">
                      Showing features relevant to{" "}
                      <span className="text-brand-link dark:text-oceanic-400">
                        {form.projectType === "Other" && form.otherProjectType.trim()
                          ? form.otherProjectType.trim()
                          : form.projectType}
                      </span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(FEATURES_BY_TYPE[form.projectType] || FEATURES_BY_TYPE["Other"]).map(
                        (f) => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => toggleFeature(f)}
                            className={
                              form.features.includes(f)
                                ? "px-3 py-1.5 rounded-lg text-sm font-medium transition-all bg-oceanic-500 text-white"
                                : "px-3 py-1.5 rounded-lg text-sm font-medium transition-all glass-btn text-[var(--text-secondary)]"
                            }
                          >
                            {f}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* STEP 3: Extras */}
            {step === 3 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                    Do you have a logo / brand assets ready?
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    {[
                      { label: "Yes, I have one", value: true },
                      { label: "No, I need one designed", value: false },
                    ].map(({ label, value }) => (
                      <button
                        key={String(value)}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, hasLogo: value }))}
                        className={
                          form.hasLogo === value
                            ? "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all bg-oceanic-500 text-white border border-transparent"
                            : "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all glass-btn text-[var(--text-secondary)]"
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div ref={fieldRefs.domainExtension}>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                    Do you need a domain name?
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3 mb-3">
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
                        className={
                          form.needsDomain === value
                            ? "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all bg-oceanic-500 text-white border border-transparent"
                            : "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all glass-btn text-[var(--text-secondary)]"
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {form.needsDomain === true && (
                    <div>
                      <p className="text-xs mb-2 text-gray-600 dark:text-gray-200">
                        Pick an extension. Namecheap pricing (registration fee, billed annually):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {DOMAIN_EXTENSIONS.map(({ ext, price }) => (
                          <button
                            key={ext}
                            type="button"
                            onClick={() => setForm((p) => ({ ...p, domainExtension: ext }))}
                            className={
                              form.domainExtension === ext
                                ? "px-4 py-2 rounded-lg text-sm font-medium transition-all flex flex-col items-center gap-0.5 bg-oceanic-500 text-white border border-transparent"
                                : "px-4 py-2 rounded-lg text-sm font-medium transition-all flex flex-col items-center gap-0.5 glass-btn text-[var(--text-secondary)]"
                            }
                          >
                            <span className="font-bold">{ext}</span>
                            <span className="text-xs opacity-80">{price}</span>
                          </button>
                        ))}
                      </div>
                      {errors.domainExtension && (
                        <p className="mt-2 text-xs text-red-400">{errors.domainExtension}</p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                    Do you need web hosting?
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    {[
                      { label: "Yes, set it up for me", value: true },
                      { label: "No, I'll handle it", value: false },
                    ].map(({ label, value }) => (
                      <button
                        key={String(value)}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, needsHosting: value }))}
                        className={
                          form.needsHosting === value
                            ? "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all bg-oceanic-500 text-white border border-transparent"
                            : "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all glass-btn text-[var(--text-secondary)]"
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* STEP 4: Timeline */}
            {step === 4 && (
              <>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                      Ideal Timeline
                    </label>
                    <SelectDropdown
                      value={form.timeline}
                      onChange={(v) => setForm((p) => ({ ...p, timeline: v }))}
                      options={TIMELINES}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                      Budget Range
                    </label>
                    <SelectDropdown
                      value={form.budgetRange}
                      onChange={(v) => setForm((p) => ({ ...p, budgetRange: v }))}
                      options={BUDGET_RANGES}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                    Anything else? <span className="text-[var(--text-secondary)]">(optional)</span>
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="Reference sites, design preferences, existing codebase, deadline..."
                    rows={3}
                    className="w-full glass-input"
                  />
                </div>
              </>
            )}

            {/* STEP 5: Review & submit */}
            {step === 5 && (
              <ReviewSummary
                form={form}
                termsAccepted={termsAccepted}
                setTermsAccepted={setTermsAccepted}
                error={errors.terms}
                termsRef={fieldRefs.terms}
              />
            )}

            {status === "error" && (
              <p className="text-sm text-red-400">Something went wrong. Please try again.</p>
            )}

            {/* Navigation buttons */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
              {step > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={status === "loading"}
                  className="sm:flex-1 glass-btn text-[var(--text-primary)] py-3 font-semibold transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <FaArrowLeft />
                  Back
                </button>
              )}
              {step < 5 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="sm:flex-1 glass-btn bg-gradient-to-r from-oceanic-600 to-oceanic-900 text-white py-3 font-semibold transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.02]"
                >
                  Next
                  <FaArrowRight />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="sm:flex-1 glass-btn bg-gradient-to-r from-oceanic-600 to-oceanic-900 text-white py-3 font-semibold transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <FaArrowRight />
                  {status === "loading" ? "Submitting..." : "Submit Project Brief"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

/**
 * Read-only summary shown on the final step.
 */
function ReviewSummary({ form, termsAccepted, setTermsAccepted, error, termsRef }) {
  const resolvedType =
    form.projectType === "Other" && form.otherProjectType.trim()
      ? form.otherProjectType.trim()
      : form.projectType;

  const yesNo = (v) => (v === true ? "Yes" : v === false ? "No" : "—");
  const orDash = (v) => (v && String(v).trim() ? v : "—");

  const Row = ({ label, value }) => (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-3 py-2 border-b border-white/5 last:border-b-0">
      <span className="text-xs uppercase tracking-wide font-semibold text-brand-link dark:text-oceanic-400">
        {label}
      </span>
      <span className="sm:col-span-2 text-sm text-[var(--text-primary)] break-words whitespace-pre-wrap">
        {value}
      </span>
    </div>
  );

  return (
    <div>
      <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1">Review your details</h2>
      <p className="text-sm text-[var(--text-secondary)] mb-5">
        Take a quick look before submitting. Use Back to make changes.
      </p>

      <section className="mb-5">
        <h3 className="text-sm font-semibold text-brand-accent-strong dark:text-oceanic-400 mb-2">
          Contact
        </h3>
        <div className="rounded-xl bg-white/5 dark:bg-white/5 [data-theme=light]_&:bg-black/5 px-4 py-1">
          <Row label="Name" value={orDash(form.name)} />
          <Row label="Email" value={orDash(form.email)} />
          <Row label="Phone" value={orDash(form.phone)} />
          <Row label="Preferred" value={orDash(form.preferredContact)} />
        </div>
      </section>

      <section className="mb-5">
        <h3 className="text-sm font-semibold text-brand-accent-strong dark:text-oceanic-400 mb-2">
          Project
        </h3>
        <div className="rounded-xl bg-white/5 px-4 py-1">
          <Row label="Type" value={orDash(resolvedType)} />
          <Row label="Description" value={orDash(form.description)} />
          <Row label="Features" value={form.features.length ? form.features.join(", ") : "—"} />
        </div>
      </section>

      <section className="mb-5">
        <h3 className="text-sm font-semibold text-brand-accent-strong dark:text-oceanic-400 mb-2">
          Extras
        </h3>
        <div className="rounded-xl bg-white/5 px-4 py-1">
          <Row label="Has logo" value={yesNo(form.hasLogo)} />
          <Row
            label="Needs domain"
            value={
              form.needsDomain === true
                ? `Yes${form.domainExtension ? ` (${form.domainExtension})` : ""}`
                : yesNo(form.needsDomain)
            }
          />
          <Row label="Needs hosting" value={yesNo(form.needsHosting)} />
        </div>
      </section>

      <section className="mb-5">
        <h3 className="text-sm font-semibold text-brand-accent-strong dark:text-oceanic-400 mb-2">
          Timeline
        </h3>
        <div className="rounded-xl bg-white/5 px-4 py-1">
          <Row label="Timeline" value={orDash(form.timeline)} />
          <Row label="Budget" value={orDash(form.budgetRange)} />
          <Row label="Notes" value={orDash(form.notes)} />
        </div>
      </section>

      <div ref={termsRef} className="mt-4">
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-400 text-oceanic-500 focus:ring-oceanic-400 accent-oceanic-500"
          />
          <span className="text-sm text-[var(--text-primary)]">
            I confirm the details above are accurate and agree to be contacted by OceanicCoder
            regarding this enquiry.
          </span>
        </label>
        {error && <p className="mt-1 text-xs text-red-400 ml-7">{error}</p>}
      </div>
    </div>
  );
}
