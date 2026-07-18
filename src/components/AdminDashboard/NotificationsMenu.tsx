import { useState, useRef, useEffect } from "react";
import { FaBell, FaEnvelope, FaCalendarAlt, FaBriefcase, FaComment } from "react-icons/fa";
import type { IconType } from "react-icons";
import { formatRelativeTime } from "@/utils/formatters";
import type { NotificationItem } from "./useNotifications";
import type { TabType } from "./types";

interface NotificationsMenuProps {
  theme: "light" | "dark";
  items: NotificationItem[];
  count: number;
  onNavigate: (tab: TabType) => void;
}

const TYPE_ICON: Record<NotificationItem["type"], IconType> = {
  message: FaEnvelope,
  booking: FaCalendarAlt,
  inquiry: FaBriefcase,
  comment: FaComment,
};

export const NotificationsMenu: React.FC<NotificationsMenuProps> = ({
  theme,
  items,
  count,
  onNavigate,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isDark = theme === "dark";

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) setOpen(false);
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  const handleItemClick = (tab: TabType) => {
    onNavigate(tab);
    setOpen(false);
  };

  const shown = items.slice(0, 10);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        title={
          count > 0 ? `${count} new notification${count > 1 ? "s" : ""}` : "No new notifications"
        }
        aria-haspopup="true"
        aria-expanded={open}
        className={`relative p-2 rounded-lg transition ${
          isDark
            ? "text-slate-200 hover:text-oceanic-400 hover:bg-white/10"
            : "text-slate-700 hover:text-oceanic-600 hover:bg-white/40"
        }`}
      >
        <FaBell className="text-xl" />
        {count > 0 && (
          <span
            className={`absolute top-0 right-0 min-w-5 h-5 px-1 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg ${
              isDark
                ? "bg-gradient-to-r from-error-500 to-error-700 shadow-error-500/50"
                : "bg-gradient-to-r from-error-400 to-error-500 shadow-error-400/50"
            }`}
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border shadow-2xl overflow-hidden z-50 ${
            isDark ? "bg-[#111827] border-gray-700" : "bg-white border-slate-200"
          }`}
        >
          <div
            className={`px-4 py-3 border-b flex items-center justify-between ${
              isDark ? "border-gray-700" : "border-slate-200"
            }`}
          >
            <span className={`font-bold text-sm ${isDark ? "text-white" : "text-slate-900"}`}>
              Notifications
            </span>
            <span className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {count} new
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {shown.length === 0 ? (
              <p
                className={`px-4 py-8 text-center text-sm ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`}
              >
                No new notifications
              </p>
            ) : (
              shown.map((item) => {
                const Icon = TYPE_ICON[item.type];
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.tab)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 border-b transition-colors ${
                      isDark
                        ? "border-gray-800 hover:bg-white/5"
                        : "border-slate-100 hover:bg-slate-50"
                    }`}
                  >
                    <span className="w-8 h-8 rounded-lg bg-oceanic-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="text-oceanic-400 text-xs" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-sm font-medium truncate ${
                          isDark ? "text-white/95" : "text-slate-900"
                        }`}
                      >
                        {item.label}
                      </span>
                      {item.sublabel && (
                        <span
                          className={`block text-xs truncate ${
                            isDark ? "text-slate-400" : "text-slate-500"
                          }`}
                        >
                          {item.sublabel}
                        </span>
                      )}
                    </span>
                    {item.time && (
                      <span
                        className={`text-[10px] flex-shrink-0 mt-0.5 ${
                          isDark ? "text-slate-500" : "text-slate-400"
                        }`}
                      >
                        {formatRelativeTime(item.time)}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
