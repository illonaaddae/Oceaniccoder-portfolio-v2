import React from "react";
import { Helmet } from "react-helmet-async";
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
          "linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 50%, var(--bg-tertiary) 100%)",
      }}
    >
      <Helmet>
        <title>Contact Illona | OceanicCoder</title>
        <meta
          name="description"
          content="Get in touch with Illona Addae for freelance web development projects, collaborations, or general enquiries."
        />
        <meta property="og:title" content="Contact Illona | OceanicCoder" />
        <meta
          property="og:description"
          content="Get in touch with Illona Addae for freelance web development projects, collaborations, or general enquiries."
        />
        <meta property="og:url" content="https://oceaniccoder.dev/contact" />
      </Helmet>
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
