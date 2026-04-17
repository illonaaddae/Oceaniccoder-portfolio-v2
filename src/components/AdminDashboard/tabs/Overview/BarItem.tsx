interface BarItemProps {
  theme: "light" | "dark";
  label: string;
  fullLabel: string;
  value: number;
  color: string;
  maxVal: number;
}

export const BarItem: React.FC<BarItemProps> = ({
  theme,
  label,
  fullLabel,
  value,
  color,
  maxVal,
}) => {
  const heightPercent = maxVal > 0 ? Math.max((value / maxVal) * 100, 8) : 8;

  return (
    <div className="flex-1 flex flex-col items-center gap-0.5 xs:gap-1 sm:gap-2 h-full min-w-0">
      <div className="flex-1 w-full flex items-end px-0.5">
        <div
          className={`w-full rounded-t-sm xs:rounded-t-md sm:rounded-t-lg transition-all duration-500 hover:opacity-90 bg-gradient-to-t ${color} relative group min-h-[8px]`}
          style={{ height: `${heightPercent}%` }}
        >
          <span
            className={`absolute -top-5 xs:-top-6 sm:-top-8 left-1/2 transform -translate-x-1/2 text-[9px] xs:text-[10px] sm:text-xs font-bold transition-opacity whitespace-nowrap ${
              theme === "dark" ? "text-oceanic-500" : "text-oceanic-600"
            }`}
          >
            {value}
          </span>
        </div>
      </div>
      <span
        className={`text-[8px] xs:text-[10px] sm:text-xs font-semibold transition-colors duration-300 text-center truncate w-full ${
          theme === "dark" ? "text-slate-100/90" : "text-slate-700"
        }`}
      >
        <span className="xs:hidden">{label}</span>
        <span className="hidden xs:inline sm:hidden">{label}</span>
        <span className="hidden sm:inline">{fullLabel}</span>
      </span>
    </div>
  );
};
