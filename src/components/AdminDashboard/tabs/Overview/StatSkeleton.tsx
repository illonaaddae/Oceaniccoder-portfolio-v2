interface StatSkeletonProps {
  theme: "light" | "dark";
}

export const StatSkeleton: React.FC<StatSkeletonProps> = ({ theme }) => (
  <div
    className={`glass-card border rounded-xl sm:rounded-2xl p-4 xs:p-3 sm:p-5 lg:p-6 animate-pulse ${
      theme === "dark"
        ? "bg-gray-800/50 border-gray-700/80"
        : "bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40"
    }`}
  >
    <div className="flex items-start justify-between mb-3 xs:mb-2 sm:mb-4">
      <div className="min-w-0 flex-1">
        <div
          className={`h-3 w-20 rounded mb-2 ${
            theme === "dark" ? "bg-gray-700" : "bg-gray-300"
          }`}
        />
        <div
          className={`h-8 w-12 rounded mt-2 ${
            theme === "dark" ? "bg-gray-700" : "bg-gray-300"
          }`}
        />
      </div>
      <div
        className={`p-2 xs:p-2 sm:p-2.5 lg:p-3 rounded-lg sm:rounded-xl ${
          theme === "dark" ? "bg-gray-700" : "bg-gray-300"
        }`}
      >
        <div className="w-5 h-5" />
      </div>
    </div>
    <div
      className={`h-5 w-24 rounded ${
        theme === "dark" ? "bg-gray-700" : "bg-gray-300"
      }`}
    />
  </div>
);
