import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaCalendarAlt,
  FaClock,
  FaVideo,
  FaComments,
  FaRocket,
  FaHeart,
  FaCheckCircle,
  FaArrowRight,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaGlobe,
  FaExternalLinkAlt,
} from "react-icons/fa";
import { createBooking } from "../services/api/bookings";

const MEETING_TYPES = [
  {
    id: "discovery",
    label: "Discovery Call",
    duration: "30 min",
    icon: <FaComments />,
    desc: "Learn about my work and how I can help your project",
  },
  {
    id: "project",
    label: "Project Discussion",
    duration: "60 min",
    icon: <FaRocket />,
    desc: "Deep dive into your project requirements and scope",
  },
  {
    id: "mentorship",
    label: "Mentorship Session",
    duration: "45 min",
    icon: <FaHeart />,
    desc: "Guidance on your dev journey, career, or code review",
  },
  {
    id: "general",
    label: "General Chat",
    duration: "30 min",
    icon: <FaVideo />,
    desc: "Networking, collaboration ideas, or just to say hi!",
  },
];

const TIME_SLOTS = [
  "09:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "01:00 PM", "02:00 PM",
  "03:00 PM", "04:00 PM", "05:00 PM",
];

const INITIAL_FORM = {
  name: "", email: "", phone: "",
  meetingType: "", preferredDate: "", preferredTime: "",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  message: "",
};

const getTodayMin = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
};

export default function BookingSection() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const sectionTopRef = useRef(null);
  const [bookingRef, setBookingRef] = useState("");
  const [meetLink, setMeetLink] = useState("");
  const [calendarLink, setCalendarLink] = useState("");
  const [slotAvailability, setSlotAvailability] = useState({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  useEffect(() => {
    if (!form.preferredDate) return;
    setLoadingSlots(true);
    setSlotAvailability({});
    fetch(`/api/get-availability?date=${form.preferredDate}&timezone=${encodeURIComponent(form.timezone)}`)
      .then((r) => r.json())
      .then((data) => setSlotAvailability(data.available || {}))
      .catch(() => {})
      .finally(() => setLoadingSlots(false));
  }, [form.preferredDate, form.timezone]);

  // iOS Safari keeps the keyboard open on the first tap of a button, consuming it.
  // Blurring on touchStart forces the keyboard to dismiss so the click fires immediately.
  const blurActive = () => document.activeElement?.blur();

  const handleChange = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const canProceedStep1 =
    form.name.trim() && form.email.trim() && form.email.includes("@");
  const canProceedStep2 =
    form.meetingType && form.preferredDate && form.preferredTime;

  const handleSubmit = async () => {
    setError("");
    setSubmitting(true);
    try {
      // 1. Try calendar event creation — best-effort, don't block booking if unavailable
      let calMeetLink = null;
      let calEventLink = null;

      try {
        const meetRes = await fetch("/api/create-booking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        if (meetRes.status === 409) {
          const meetData = await meetRes.json();
          setError(meetData.message || "That time slot is already booked. Please choose a different time.");
          return;
        }

        if (meetRes.ok) {
          const meetData = await meetRes.json();
          calMeetLink = meetData.meetLink ?? null;
          calEventLink = meetData.calendarEventLink ?? null;
        }
      } catch {
        // API unavailable locally (run `netlify dev` for full local testing) — continue to save
      }

      // 2. Save booking to Appwrite
      const result = await createBooking({ ...form, status: "pending" });
      const ref = result.$id?.slice(-8).toUpperCase() || "OC" + Date.now().toString().slice(-6);
      setBookingRef(ref);

      if (calMeetLink) setMeetLink(calMeetLink);
      if (calEventLink) setCalendarLink(calEventLink);

      setStep(4);
      sectionTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      console.error(err);
      setError("Booking failed. Please try again or contact me directly.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      ref={sectionTopRef}
      className="min-h-screen py-20 relative"
      style={{
        background:
          "linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 50%, var(--bg-tertiary) 100%)",
      }}
    >
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-teal-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-oceanic-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-600/3 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-6 relative z-10 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <span
            className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold mb-4 border"
            style={{
              background: "var(--accent-teal-subtle)",
              color: "var(--accent-teal)",
              borderColor: "var(--accent-teal-border)",
            }}
          >
            <FaCalendarAlt className="inline mr-2" />
            Book a Meeting
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
            Let&apos;s{" "}
            <span style={{ color: "var(--accent-teal)" }}>Connect</span>
          </h1>
          <p className="text-lg max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
            Schedule a meeting that fits your needs no back-and-forth emails,
            no waiting. Just pick a slot and let&apos;s talk.
          </p>
        </motion.div>

        {step < 4 ? (
          <div className="grid lg:grid-cols-5 gap-10 items-start">
            {/* Left info panel */}
            <motion.aside
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="lg:col-span-2 space-y-6"
            >
              <div
                className="glass-card rounded-2xl p-6 border"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <h2
                  className="text-xl font-bold mb-5"
                  style={{ color: "var(--text-primary)" }}
                >
                  Meeting Types
                </h2>
                <div className="space-y-4">
                  {MEETING_TYPES.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleChange("meetingType", m.id)}
                      className={`w-full text-left rounded-xl p-4 border transition-all duration-200 ${
                        form.meetingType === m.id
                          ? "border-teal-500 bg-teal-500/10"
                          : "border-transparent hover:border-teal-500/40 hover:bg-teal-500/5"
                      }`}
                      style={{ borderColor: form.meetingType === m.id ? "var(--accent-teal)" : undefined, touchAction: "manipulation" }}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="text-xl"
                          style={{ color: "var(--accent-teal)" }}
                        >
                          {m.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span
                              className="font-semibold text-sm"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {m.label}
                            </span>
                            <span
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{
                                background: "var(--accent-teal-subtle)",
                                color: "var(--accent-teal)",
                              }}
                            >
                              <FaClock className="inline mr-1" />
                              {m.duration}
                            </span>
                          </div>
                          <p
                            className="text-xs mt-1"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {m.desc}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div
                className="glass-card rounded-2xl p-6 border space-y-3"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <h3
                  className="font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  What to expect
                </h3>
                {[
                  "Response within 24 hours to confirm",
                  "Video call link sent to your email",
                  "Flexible rescheduling if needed",
                  "All meetings held in English",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <FaCheckCircle
                      className="mt-0.5 shrink-0"
                      style={{ color: "var(--accent-teal)" }}
                    />
                    <span
                      className="text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </motion.aside>

            {/* Right form panel */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:col-span-3"
            >
              <div
                className="glass-card rounded-2xl border overflow-hidden"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                {/* Step tabs */}
                <div className="flex border-b" style={{ borderColor: "var(--border-subtle)" }}>
                  {[
                    { n: 1, label: "Your Info" },
                    { n: 2, label: "Schedule" },
                    { n: 3, label: "Message" },
                  ].map(({ n, label }) => (
                    <button
                      key={n}
                      onClick={() => step > n && setStep(n)}
                      className={`flex-1 py-4 text-sm font-semibold transition-colors duration-200 ${
                        step === n
                          ? "border-b-2"
                          : step > n
                          ? "cursor-pointer"
                          : "cursor-default opacity-50"
                      }`}
                      style={{
                        borderColor: step === n ? "var(--accent-teal)" : "transparent",
                        color: step === n ? "var(--accent-teal)" : "var(--text-secondary)",
                      }}
                    >
                      <span
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs mr-2"
                        style={{
                          background: step >= n ? "var(--accent-teal)" : "var(--border-subtle)",
                          color: step >= n ? "#fff" : "var(--text-secondary)",
                        }}
                      >
                        {step > n ? "✓" : n}
                      </span>
                      {label}
                    </button>
                  ))}
                </div>

                <div className="p-6 sm:p-8 pb-24 sm:pb-8">
                  <AnimatePresence mode="wait">
                    {/* Step 1 — Contact Info */}
                    {step === 1 && (
                      <motion.div
                        key="step1"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-5"
                      >
                        <h2
                          className="text-xl font-bold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          Tell me about yourself
                        </h2>
                        <FormField
                          icon={<FaUser />}
                          label="Full Name"
                          required
                          value={form.name}
                          onChange={(v) => handleChange("name", v)}
                          placeholder="Jane Smith"
                        />
                        <FormField
                          icon={<FaEnvelope />}
                          label="Email Address"
                          required
                          type="email"
                          value={form.email}
                          onChange={(v) => handleChange("email", v)}
                          placeholder="jane@example.com"
                        />
                        <FormField
                          icon={<FaPhone />}
                          label="Phone (optional)"
                          type="tel"
                          value={form.phone}
                          onChange={(v) => handleChange("phone", v)}
                          placeholder="+1 (555) 000-0000"
                        />
                        <button
                          disabled={!canProceedStep1}
                          onTouchStart={blurActive}
                          onClick={() => setStep(2)}
                          className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ background: "var(--accent-teal)", touchAction: "manipulation" }}
                        >
                          Continue <FaArrowRight />
                        </button>
                      </motion.div>
                    )}

                    {/* Step 2 — Schedule */}
                    {step === 2 && (
                      <motion.div
                        key="step2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                      >
                        <h2
                          className="text-xl font-bold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          Pick your slot
                        </h2>

                        {/* Meeting type (if not yet selected) */}
                        {!form.meetingType && (
                          <div className="space-y-2">
                            <p className="block text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
                              Meeting Type <span className="text-red-400">*</span>
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              {MEETING_TYPES.map((m) => (
                                <button
                                  key={m.id}
                                  onClick={() => handleChange("meetingType", m.id)}
                                  className="text-left rounded-xl p-3 border text-sm transition-all"
                                  style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
                                >
                                  <span style={{ color: "var(--accent-teal)" }}>{m.icon}</span>
                                  <span className="ml-2">{m.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {form.meetingType && (
                          <div
                            className="flex items-center gap-3 p-3 rounded-xl"
                            style={{ background: "var(--accent-teal-subtle)" }}
                          >
                            <span style={{ color: "var(--accent-teal)" }}>
                              {MEETING_TYPES.find((m) => m.id === form.meetingType)?.icon}
                            </span>
                            <div>
                              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                                {MEETING_TYPES.find((m) => m.id === form.meetingType)?.label}
                              </p>
                              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                                {MEETING_TYPES.find((m) => m.id === form.meetingType)?.duration} · Click left panel to change
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Date */}
                        <div className="space-y-2">
                          <label
                            htmlFor="booking-date"
                            className="block text-sm font-semibold"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            Preferred Date <span className="text-red-400">*</span>
                          </label>
                          <div className="relative">
                            <span
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
                              style={{ color: "var(--accent-teal)" }}
                            >
                              <FaCalendarAlt />
                            </span>
                            <input
                              id="booking-date"
                              type="date"
                              min={getTodayMin()}
                              value={form.preferredDate}
                              onChange={(e) => handleChange("preferredDate", e.target.value)}
                              className="w-full rounded-xl pl-10 pr-4 py-3 border outline-none focus:ring-2 transition"
                              style={{
                                background: "var(--bg-secondary)",
                                borderColor: "var(--border-subtle)",
                                color: "var(--text-primary)",
                                colorScheme: isDark ? "dark" : "light",
                                fontSize: "16px",
                                minHeight: "48px",
                              }}
                            />
                          </div>
                        </div>

                        {/* Time slots */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p
                              className="block text-sm font-semibold"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              Preferred Time <span className="text-red-400">*</span>
                            </p>
                            {loadingSlots && (
                              <span className="text-xs flex items-center gap-1" style={{ color: "var(--text-secondary)" }}>
                                <span className="inline-block w-3 h-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--accent-teal)", borderTopColor: "transparent" }} />
                                Checking availability…
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {TIME_SLOTS.map((slot) => {
                              const isBooked = slotAvailability[slot] === false;
                              const isSelected = form.preferredTime === slot;
                              return (
                                <button
                                  key={slot}
                                  disabled={isBooked}
                                  onClick={() => !isBooked && handleChange("preferredTime", slot)}
                                  className="rounded-lg text-sm font-medium border transition-all duration-150 flex flex-col items-center justify-center"
                                  style={{
                                    background: isBooked
                                      ? "var(--bg-secondary)"
                                      : isSelected
                                      ? "var(--accent-teal)"
                                      : "var(--bg-secondary)",
                                    color: isBooked
                                      ? "var(--text-secondary)"
                                      : isSelected
                                      ? "#fff"
                                      : "var(--text-secondary)",
                                    borderColor: isBooked
                                      ? "var(--border-subtle)"
                                      : isSelected
                                      ? "var(--accent-teal)"
                                      : "var(--border-subtle)",
                                    opacity: isBooked ? 0.45 : 1,
                                    cursor: isBooked ? "not-allowed" : "pointer",
                                    touchAction: "manipulation",
                                    minHeight: "52px",
                                    padding: "6px 4px",
                                  }}
                                >
                                  <span>{slot}</span>
                                  {isBooked && (
                                    <span className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                                      Booked
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                          {Object.keys(slotAvailability).length > 0 && Object.values(slotAvailability).every((v) => !v) && (
                            <p className="text-xs text-center pt-1" style={{ color: "var(--text-secondary)" }}>
                              All slots on this day are taken. Please choose a different date.
                            </p>
                          )}
                        </div>

                        {/* Timezone */}
                        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                          <FaGlobe />
                          <span>Your timezone: {form.timezone}</span>
                        </div>

                        <button
                          disabled={!canProceedStep2}
                          onTouchStart={blurActive}
                          onClick={() => setStep(3)}
                          className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ background: "var(--accent-teal)", touchAction: "manipulation" }}
                        >
                          Continue <FaArrowRight />
                        </button>
                      </motion.div>
                    )}

                    {/* Step 3 — Message */}
                    {step === 3 && (
                      <motion.div
                        key="step3"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-5"
                      >
                        <h2
                          className="text-xl font-bold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          Anything to add?
                        </h2>

                        {/* Summary */}
                        <div
                          className="rounded-xl p-4 space-y-2 border text-sm"
                          style={{
                            background: "var(--accent-teal-subtle)",
                            borderColor: "var(--accent-teal-border)",
                          }}
                        >
                          <p style={{ color: "var(--text-primary)" }}>
                            <span style={{ color: "var(--accent-teal)" }}>Meeting:</span>{" "}
                            {MEETING_TYPES.find((m) => m.id === form.meetingType)?.label}
                          </p>
                          <p style={{ color: "var(--text-primary)" }}>
                            <span style={{ color: "var(--accent-teal)" }}>Date:</span>{" "}
                            {new Date(form.preferredDate + "T12:00:00").toLocaleDateString("en-US", {
                              weekday: "long", year: "numeric", month: "long", day: "numeric",
                            })}
                          </p>
                          <p style={{ color: "var(--text-primary)" }}>
                            <span style={{ color: "var(--accent-teal)" }}>Time:</span>{" "}
                            {form.preferredTime} ({form.timezone})
                          </p>
                        </div>

                        <div className="space-y-2">
                          <label
                            htmlFor="booking-message"
                            className="block text-sm font-semibold"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            Message (optional)
                          </label>
                          <textarea
                            id="booking-message"
                            rows={5}
                            value={form.message}
                            onChange={(e) => handleChange("message", e.target.value)}
                            placeholder="Tell me briefly what you'd like to discuss, any specific questions, or anything I should know before our meeting..."
                            className="w-full rounded-xl px-4 py-3 border text-base outline-none focus:ring-2 resize-none transition"
                            style={{
                              background: "var(--bg-secondary)",
                              borderColor: "var(--border-subtle)",
                              color: "var(--text-primary)",
                            }}
                          />
                        </div>

                        {error && (
                          <div className="rounded-xl p-3 border border-red-500/30 bg-red-500/10">
                            <p className="text-red-400 text-sm mb-2">{error}</p>
                            {error.includes("already booked") && (
                              <button
                                onClick={() => { setError(""); setStep(2); }}
                                className="text-xs font-semibold underline"
                                style={{ color: "var(--accent-teal)" }}
                              >
                                ← Choose a different time
                              </button>
                            )}
                          </div>
                        )}

                        <button
                          onTouchStart={blurActive}
                          onClick={handleSubmit}
                          disabled={submitting}
                          className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60"
                          style={{ background: "var(--accent-teal)", touchAction: "manipulation" }}
                        >
                          {submitting ? (
                            <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                          ) : (
                            <>
                              Confirm Booking <FaCalendarAlt />
                            </>
                          )}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </div>
        ) : (
          /* Success */
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="max-w-xl mx-auto text-center"
          >
            <div
              className="glass-card rounded-3xl p-10 border"
              style={{ borderColor: "var(--accent-teal-border)" }}
            >
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background: "var(--accent-teal-subtle)" }}
              >
                <FaCheckCircle
                  className="text-4xl"
                  style={{ color: "var(--accent-teal)" }}
                />
              </div>
              <h2
                className="text-3xl font-bold mb-3"
                style={{ color: "var(--text-primary)" }}
              >
                {meetLink ? "You're Booked!" : "Booking Received!"}
              </h2>
              <p className="mb-2" style={{ color: "var(--text-secondary)" }}>
                Thanks <strong style={{ color: "var(--text-primary)" }}>{form.name}</strong>!
              </p>
              <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
                {meetLink
                  ? "A Google Calendar invite with your Meet link has been sent to your email."
                  : "I'll confirm your booking and send a meeting link within 24 hours."}{" "}
                <span style={{ color: "var(--accent-teal)" }}>
                  {MEETING_TYPES.find((m) => m.id === form.meetingType)?.label}
                </span>{" · "}
                <span style={{ color: "var(--accent-teal)" }}>
                  {form.preferredTime},{" "}
                  {new Date(form.preferredDate + "T12:00:00").toLocaleDateString("en-US", {
                    month: "long", day: "numeric", year: "numeric",
                  })}
                </span>
              </p>

              {/* Google Meet link — shown when auto-generated */}
              {meetLink && (
                <a
                  href={meetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-bold text-white mb-4 transition-all hover:opacity-90 hover:scale-[1.02]"
                  style={{
                    background: "linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%)",
                  }}
                >
                  <FaVideo className="text-lg" />
                  Join Google Meet
                  <FaExternalLinkAlt className="text-xs opacity-70" />
                </a>
              )}

              {/* Calendar event link */}
              {calendarLink && (
                <a
                  href={calendarLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold mb-4 border transition-all hover:opacity-80"
                  style={{
                    borderColor: "var(--border-subtle)",
                    color: "var(--text-secondary)",
                  }}
                >
                  <FaCalendarAlt />
                  View Calendar Event
                </a>
              )}

              <div
                className="rounded-xl p-4 mb-6"
                style={{ background: "var(--bg-secondary)" }}
              >
                <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
                  Booking Reference
                </p>
                <p
                  className="text-2xl font-mono font-bold tracking-widest"
                  style={{ color: "var(--accent-teal)" }}
                >
                  #{bookingRef}
                </p>
              </div>

              <button
                onClick={() => {
                  setForm(INITIAL_FORM);
                  setStep(1);
                  setBookingRef("");
                  setMeetLink("");
                  setCalendarLink("");
                }}
                className="w-full py-3 rounded-xl font-semibold border transition-all"
                style={{ borderColor: "var(--accent-teal)", color: "var(--accent-teal)" }}
              >
                Book Another Meeting
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}

function FormField({ icon, label, required, type = "text", value, onChange, placeholder }) {
  const inputId = `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <div className="relative">
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
          style={{ color: "var(--accent-teal)" }}
        >
          {icon}
        </span>
        <input
          id={inputId}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl pl-10 pr-4 py-3 border text-base outline-none focus:ring-2 transition"
          style={{
            background: "var(--bg-secondary)",
            borderColor: "var(--border-subtle)",
            color: "var(--text-primary)",
          }}
        />
      </div>
    </div>
  );
}
