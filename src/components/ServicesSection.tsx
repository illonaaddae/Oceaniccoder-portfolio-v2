import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { FaLightbulb } from "react-icons/fa";
import {
  ServiceCard,
  AddonCard,
  FAQAccordion,
  ServicesTabs,
  CustomQuoteCTA,
  StillHaveQuestions,
  TrustIndicators,
  BackgroundElements,
  SectionHeader,
} from "./Services";
import type { ServiceTab } from "./Services";
import { servicePackages, addonServices } from "./Services/servicesData";
import { faqItems } from "./Services/faqData";

const ServicesSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ServiceTab>("packages");
  const handleTabChange = useCallback(
    (tab: ServiceTab) => setActiveTab(tab),
    [],
  );

  return (
    <section
      id="services"
      className="py-20 md:py-32 relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 50%, var(--bg-tertiary) 100%)",
      }}
    >
      <BackgroundElements />
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <SectionHeader />
        <ServicesTabs activeTab={activeTab} onTabChange={handleTabChange} />

        {activeTab === "packages" && (
          <motion.div
            key="packages"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {servicePackages.map((pkg, i) => (
                <ServiceCard key={pkg.id} pkg={pkg} index={i} />
              ))}
            </div>
            <CustomQuoteCTA />
          </motion.div>
        )}

        {activeTab === "addons" && (
          <motion.div
            key="addons"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {addonServices.map((addon, i) => (
                <AddonCard key={addon.name} addon={addon} index={i} />
              ))}
            </div>
            <div className="mt-8 text-center">
              <p className="text-[var(--text-secondary)] text-sm flex items-center justify-center gap-2">
                <FaLightbulb className="w-4 h-4 text-oceanic-500" />
                <strong>Pro tip:</strong> Bundle add-ons with any package and
                get 10% off the total!
              </p>
            </div>
          </motion.div>
        )}

        {activeTab === "faq" && (
          <motion.div
            key="faq"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-3xl mx-auto"
          >
            <FAQAccordion items={faqItems} />
            <StillHaveQuestions />
          </motion.div>
        )}

        <TrustIndicators />
      </div>
    </section>
  );
};

export default ServicesSection;
