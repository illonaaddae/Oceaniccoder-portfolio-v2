interface StorageRingProps {
  theme: "light" | "dark";
  usedPercentage: number;
}

export const StorageRing: React.FC<StorageRingProps> = ({
  theme,
  usedPercentage,
}) => (
  <div className="flex items-center justify-center mb-3 sm:mb-4">
    <div className="relative w-16 h-16 xs:w-20 xs:h-20 sm:w-24 sm:h-24">
      <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={
            theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(59,130,246,0.1)"
          }
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="url(#storageGradient)"
          strokeWidth="8"
          strokeDasharray="282.7"
          strokeDashoffset={282.7 - (282.7 * usedPercentage) / 100}
          strokeLinecap="round"
        />
        <defs>
          <linearGradient
            id="storageGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#0C8599" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={`text-sm xs:text-base sm:text-lg font-bold transition-colors duration-300 ${
            theme === "dark" ? "text-white" : "text-slate-900"
          }`}
        >
          {usedPercentage}%
        </span>
      </div>
    </div>
  </div>
);
