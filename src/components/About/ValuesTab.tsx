import React from "react";
import { FaLightbulb } from "react-icons/fa";
import { values } from "./constants";

const ValuesTab = React.memo(() => (
  <div className="space-y-8">
    <h3 className="text-2xl font-bold text-white mb-8 text-center flex items-center justify-center gap-3">
      <FaLightbulb className="text-yellow-400" />
      Core Values & Impact
    </h3>
    <div className="grid md:grid-cols-2 gap-8">
      {values.map((value) => (
        <div
          key={value.title}
          className="glass-card p-8 group hover:scale-105 transition-all duration-300"
        >
          <div className="flex items-start gap-4 mb-4">
            <div className="text-3xl group-hover:scale-110 transition-transform duration-300">
              {value.icon}
            </div>
            <div className="flex-1">
              <h4 className="text-xl font-bold text-white mb-3">
                {value.title}
              </h4>
              <p className="text-gray-300 leading-relaxed mb-4">
                {value.description}
              </p>
              <p className="text-sm text-oceanic-500 font-medium bg-gradient-to-r from-oceanic-500/10 to-blue-500/10 rounded-lg border border-oceanic-500/20 px-3 py-2">
                Impact: {value.impact}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
));

ValuesTab.displayName = "ValuesTab";
export default ValuesTab;
