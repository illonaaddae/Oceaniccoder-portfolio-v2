import React from "react";

export type ServiceTab = "packages" | "addons" | "faq";

interface ServicesTabsProps {
  activeTab: ServiceTab;
  onTabChange: (tab: ServiceTab) => void;
}

const tabs: { id: ServiceTab; label: string }[] = [
  { id: "packages", label: "Packages" },
  { id: "addons", label: "Add-ons" },
  { id: "faq", label: "FAQ" },
];

const ServicesTabs: React.FC<ServicesTabsProps> = ({
  activeTab,
  onTabChange,
}) => (
  <div className="flex justify-center mb-12">
    <div className="inline-flex p-1.5 rounded-2xl glass-card border border-[var(--glass-border)]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-300 ${
            activeTab === tab.id
              ? "bg-gradient-to-r from-oceanic-500 to-oceanic-900 text-white shadow-lg"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  </div>
);

export default React.memo(ServicesTabs);
