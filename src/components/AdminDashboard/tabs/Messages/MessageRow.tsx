import React from "react";
import { FaEye, FaCheck, FaTrash } from "react-icons/fa";
import type { Message } from "@/types";

interface MessageRowProps {
  msg: Message;
  theme: "light" | "dark";
  isReadOnly: boolean;
  onView: (m: Message) => void;
  onStatusChange: (id: string, status: "new" | "read" | "replied") => void;
  onDelete: (id: string) => void;
}

export const MessageRow: React.FC<MessageRowProps> = ({
  msg,
  theme,
  isReadOnly,
  onView,
  onStatusChange,
  onDelete,
}) => (
  <tr
    onClick={() => onView(msg)}
    className={`transition-all duration-300 ${
      isReadOnly ? "cursor-default" : "cursor-pointer"
    } ${theme === "dark" ? "hover:bg-white/5" : "hover:bg-white/20"}`}
  >
    <td
      className={`px-6 py-4 font-medium transition-colors duration-300 ${
        theme === "dark" ? "text-white" : "text-slate-900"
      } ${isReadOnly ? "blur-sm select-none" : ""}`}
    >
      {isReadOnly ? "••••••••••" : msg.subject}
    </td>

    <td
      className={`px-6 py-4 transition-colors duration-300 ${
        theme === "dark" ? "text-slate-300" : "text-slate-700"
      } ${isReadOnly ? "blur-sm select-none" : ""}`}
    >
      {isReadOnly ? "••••••" : msg.name}
    </td>

    <td className="px-6 py-4">
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm border transition-colors duration-300 ${
          !msg.status || msg.status === "new"
            ? theme === "dark"
              ? "bg-blue-500/30 text-blue-100 border-blue-400/30"
              : "bg-blue-400/20 text-blue-700 border-blue-300/50"
            : msg.status === "read"
            ? theme === "dark"
              ? "bg-yellow-500/30 text-yellow-100 border-yellow-400/30"
              : "bg-yellow-400/20 text-yellow-700 border-yellow-300/50"
            : theme === "dark"
            ? "bg-green-500/30 text-green-100 border-green-400/30"
            : "bg-green-400/20 text-green-700 border-green-300/50"
        }`}
      >
        {msg.status?.toUpperCase() || "NEW"}
      </span>
    </td>

    <td className="px-6 py-4">
      <div className="flex items-center gap-2">
        {!isReadOnly && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onView(msg);
            }}
            className={`p-2 rounded transition duration-300 ${
              theme === "dark"
                ? "text-oceanic-500 hover:bg-oceanic-500/20"
                : "text-blue-600 hover:bg-blue-400/20"
            }`}
            title="View message"
          >
            <FaEye className="text-sm" />
          </button>
        )}

        {!isReadOnly && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(
                  msg.$id,
                  msg.status === "read" ? "new" : "read"
                );
              }}
              className={`p-2 rounded transition duration-300 ${
                theme === "dark"
                  ? "text-oceanic-500 hover:bg-oceanic-500/20"
                  : "text-blue-600 hover:bg-blue-400/20"
              }`}
              title="Toggle read status"
            >
              <FaCheck className="text-sm" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(msg.$id);
              }}
              className={`p-2 rounded transition duration-300 ${
                theme === "dark"
                  ? "text-red-400 hover:bg-red-500/20"
                  : "text-red-600 hover:bg-red-400/20"
              }`}
              title="Delete message"
            >
              <FaTrash className="text-sm" />
            </button>
          </>
        )}
      </div>
    </td>
  </tr>
);
