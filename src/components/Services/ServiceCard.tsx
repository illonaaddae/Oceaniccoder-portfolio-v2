import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  FaCode,
  FaServer,
  FaRocket,
  FaCheck,
  FaTimes,
  FaStar,
  FaArrowRight,
} from "react-icons/fa";
import type { ServicePackage } from "./servicesData";

interface ServiceCardProps {
  pkg: ServicePackage;
  index: number;
}

const iconMap: Record<string, React.ReactNode> = {
  FaRocket: <FaRocket className="text-2xl" />,
  FaCode: <FaCode className="text-2xl" />,
  FaServer: <FaServer className="text-2xl" />,
};

const ServiceCard: React.FC<ServiceCardProps> = ({ pkg, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: index * 0.1 }}
    className={`relative glass-card border rounded-3xl overflow-hidden transition-all duration-300 hover:scale-[1.02] ${
      pkg.popular
        ? "border-oceanic-500/50 shadow-xl shadow-oceanic-500/20"
        : "border-[var(--glass-border)] hover:border-oceanic-500/50"
    }`}
  >
    {pkg.popular && (
      <div className="absolute top-0 right-0">
        <div className="bg-oceanic-600 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl flex items-center gap-1">
          <FaStar className="text-white" /> MOST POPULAR
        </div>
      </div>
    )}

    <div className={`p-6 pb-0 ${pkg.popular ? "pt-10" : ""}`}>
      <div className="inline-flex p-3 rounded-2xl bg-oceanic-600 text-white mb-4">
        {iconMap[pkg.icon] || <FaCode className="text-2xl" />}
      </div>
      <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
        {pkg.name}
      </h3>
      <p className="text-[var(--text-secondary)] text-sm mb-4 min-h-[60px]">
        {pkg.description}
      </p>
    </div>

    <ServiceQuickInfo pkg={pkg} />
    <ServiceFeatures features={pkg.features} />

    <div className="p-6 pt-0">
      <Link
        to="/contact"
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all duration-300 bg-oceanic-600 hover:bg-oceanic-700 text-white shadow-lg hover:shadow-oceanic-500/30"
      >
        Get Started <FaArrowRight className="text-sm" />
      </Link>
    </div>
  </motion.div>
);

const ServiceQuickInfo: React.FC<{ pkg: ServicePackage }> = ({ pkg }) => (
  <div className="px-6 py-4 border-y border-[var(--glass-border)] grid grid-cols-3 gap-2 text-center">
    {[
      { label: "Delivery", value: pkg.deliveryTime },
      { label: "Revisions", value: pkg.revisions },
      { label: "Support", value: pkg.support },
    ].map((item) => (
      <div key={item.label}>
        <p className="text-xs text-[var(--text-accent)] mb-1">{item.label}</p>
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          {item.value}
        </p>
      </div>
    ))}
  </div>
);

const ServiceFeatures: React.FC<{
  features: ServicePackage["features"];
}> = ({ features }) => (
  <div className="p-6">
    <p className="text-xs font-semibold text-[var(--text-accent)] uppercase tracking-wider mb-4">
      What&apos;s Included
    </p>
    <ul className="space-y-3">
      {features.map((feature) => (
        <li key={feature.name} className="flex items-start gap-3">
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
          </span>
        </li>
      ))}
    </ul>
  </div>
);

export default React.memo(ServiceCard);
