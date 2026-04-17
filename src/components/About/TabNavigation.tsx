import React from "react";
import { tabs } from "./constants";

interface TabNavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const activeStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #0c8599, #085866)",
  color: "#ffffff",
  border: "1px solid rgba(12, 133, 153, 0.5)",
  boxShadow: "0 4px 16px rgba(12, 133, 153, 0.3)",
};

const inactiveStyle: React.CSSProperties = {
  background: "rgba(12, 133, 153, 0.07)",
  color: "var(--text-secondary, #334155)",
  border: "1px solid rgba(12, 133, 153, 0.18)",
};

const TabNavigation = React.memo(
  ({ activeTab, setActiveTab }: TabNavigationProps) => (
    <div className="flex flex-wrap justify-center gap-4 mb-12">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={isActive ? activeStyle : inactiveStyle}
            className={`px-6 py-3 font-medium rounded-xl transition-all duration-300 flex items-center gap-2 ${
              isActive ? "scale-105" : "hover:scale-105"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  ),
);

TabNavigation.displayName = "TabNavigation";
export default TabNavigation;
