import React from "react";

interface Stat {
  icon: React.ReactNode;
  number: string;
  label: string;
  color: string;
}

interface SectionHeaderProps {
  isVisible: boolean;
  stats: Stat[];
}

const SectionHeader = React.memo(({ isVisible, stats }: SectionHeaderProps) => (
  <div
    className={`text-center mb-16 transition-all duration-1000 ${
      isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
    }`}
  >
    <h2 className="text-5xl md:text-6xl font-bold mb-6">
      <span className="text-gray-700 dark:text-gray-100">About </span>
      <span className="text-oceanic-600 dark:text-oceanic-500 font-bold">Me</span>
    </h2>
    <p className="text-xl leading-relaxed max-w-3xl mx-auto text-gray-700 dark:text-gray-300">
      Empowering communities through technology and building bridges for
      inclusive innovation
    </p>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 max-w-4xl mx-auto">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="glass-card p-6 text-center group hover:scale-105 transition-all duration-300"
        >
          <div
            className={`text-4xl mb-3 group-hover:scale-110 transition-transform duration-300 ${stat.color}`}
          >
            {stat.icon}
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {stat.number}
          </div>
          <div className="text-sm text-gray-300">{stat.label}</div>
        </div>
      ))}
    </div>
  </div>
));

SectionHeader.displayName = "SectionHeader";
export default SectionHeader;
