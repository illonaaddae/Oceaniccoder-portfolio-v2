import React from "react";

interface SidebarHeaderProps {
  theme: string;
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({ theme }) => {
  return (
    <div
      className={`flex-shrink-0 p-4 sm:p-6 pt-14 lg:pt-6 border-b ${
        theme === "dark" ? "border-gray-800" : "border-blue-200/30"
      }`}
    >
      {/* Profile Image */}
      <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
        <div
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 flex-shrink-0 ${
            theme === "dark"
              ? "border-oceanic-500/60 ring-2 ring-oceanic-500/20"
              : "border-oceanic-500/50 ring-2 ring-blue-500/30"
          }`}
        >
          <img
            src="https://fra.cloud.appwrite.io/v1/storage/buckets/69444749001b5f3a325b/files/69444ceb001c1eda1331/view?project=6943431e00253c8f9883"
            alt="Admin Profile"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
              (
                e.target as HTMLImageElement
              ).nextElementSibling?.classList.remove("hidden");
            }}
          />
          <div
            className={`w-full h-full items-center justify-center text-xl font-bold ${
              theme === "dark"
                ? "bg-gradient-to-br from-oceanic-500/40 to-blue-500/40 text-white"
                : "bg-gradient-to-br from-blue-400/40 to-oceanic-400/40 text-slate-800"
            }`}
            style={{ display: "none" }}
          >
            OC
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3
            className={`font-bold truncate transition-colors duration-300 ${
              theme === "dark" ? "text-white" : "text-slate-900"
            }`}
          >
            Oceaniccoder
          </h3>
          <p
            className={`text-xs truncate transition-colors duration-300 ${
              theme === "dark" ? "text-oceanic-500" : "text-oceanic-600"
            }`}
          >
            Administrator
          </p>
        </div>
      </div>

      <h2
        className={`text-xl font-bold transition-colors duration-300 ${
          theme === "dark" ? "text-white" : "text-slate-900"
        }`}
      >
        Admin Panel
      </h2>
      <p
        className={`text-sm transition-colors duration-300 ${
          theme === "dark" ? "text-slate-300" : "text-slate-600"
        }`}
      >
        Manage your portfolio
      </p>
    </div>
  );
};
