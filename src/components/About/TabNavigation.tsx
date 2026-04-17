import React from "react";
import { tabs } from "./constants";

interface TabNavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabNavigation = React.memo(
  ({ activeTab, setActiveTab }: TabNavigationProps) => (
    <div className="flex flex-wrap justify-center gap-4 mb-12">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`glass-btn px-6 py-3 font-medium transition-all duration-300 flex items-center gap-2 ${
            activeTab === tab.id
              ? "about-tab-active scale-105"
              : "about-tab-inactive hover:scale-105"
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  ),
);

TabNavigation.displayName = "TabNavigation";
export default TabNavigation;
