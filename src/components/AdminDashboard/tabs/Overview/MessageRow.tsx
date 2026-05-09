import { FaEnvelope } from "react-icons/fa";
import type { Message } from "@/types";
import { formatRelativeTime } from "@/utils/formatters";

interface MessageRowProps {
  message: Message;
  theme: "light" | "dark";
}

export const MessageRow: React.FC<MessageRowProps> = ({ message, theme }) => (
  <tr
    className={`border-b transition-colors duration-300 ${
      theme === "dark"
        ? "border-white/5 hover:bg-white/5"
        : "border-blue-200/20 hover:bg-white/20"
    }`}
  >
    <td className="px-3 sm:px-4 py-2 sm:py-3">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-purple-500/30 flex items-center justify-center flex-shrink-0">
          <FaEnvelope className="text-purple-400 text-[10px] sm:text-xs" />
        </div>
        <span
          className={`font-medium transition-colors duration-300 text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none ${
            theme === "dark" ? "text-white" : "text-slate-900"
          }`}
        >
          {message.name}
        </span>
      </div>
    </td>
    <td
      className={`px-3 sm:px-4 py-2 sm:py-3 transition-colors duration-300 hidden sm:table-cell ${
        theme === "dark" ? "text-slate-300" : "text-slate-700"
      }`}
    >
      Message
    </td>
    <td className="px-3 sm:px-4 py-2 sm:py-3">
      <span
        className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-bold ${
          message.status === "new"
            ? "bg-blue-500/20 text-blue-400"
            : "bg-slate-500/20 text-slate-400"
        }`}
      >
        {message.status === "new" ? "New" : "Read"}
      </span>
    </td>
    <td
      className={`px-3 sm:px-4 py-2 sm:py-3 transition-colors duration-300 hidden md:table-cell ${
        theme === "dark" ? "text-slate-200/90" : "text-slate-600"
      }`}
    >
      {formatRelativeTime(message.$createdAt)}
    </td>
  </tr>
);
