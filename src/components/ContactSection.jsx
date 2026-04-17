import React from "react";
import { usePortfolioData } from "../hooks/usePortfolioData";
import {
  BackgroundElements,
  SectionHeader,
  ContactInfoCard,
  ContactForm,
  CallToAction,
} from "./Contact";

const ContactSection = () => {
  // Get about data for CV URL
  const { about } = usePortfolioData();

  return (
    <section
      id="contact"
      className="min-h-screen py-20 relative"
      style={{
        background:
          "linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 50%, var(--bg-primary) 100%)",
      }}
    >
      <BackgroundElements />

      <div className="container mx-auto px-6 relative z-10">
        <SectionHeader />

        <div className="grid lg:grid-cols-2 gap-16 max-w-6xl mx-auto">
          <ContactInfoCard />
          <ContactForm />
        </div>

        <CallToAction resumeUrl={about?.resumeUrl} />
      </div>
    </section>
  );
};

export default ContactSection;
