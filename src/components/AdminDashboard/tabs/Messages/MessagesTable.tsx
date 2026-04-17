import React from "react";
import type { Message } from "@/types";
import { MessageRow } from "./MessageRow";

interface MessagesTableProps {
  messages: Message[];
  theme: "light" | "dark";
  isReadOnly: boolean;
  onView: (m: Message) => void;
  onStatusChange: (id: string, status: "new" | "read" | "replied") => void;
  onDelete: (id: string) => void;
}

export const MessagesTable: React.FC<MessagesTableProps> = ({
  messages,
  theme,
  isReadOnly,
  onView,
  onStatusChange,
  onDelete,
}) => (
  <div
    className={`glass-card border rounded-2xl overflow-hidden transition-colors duration-200 ${
      theme === "dark"
        ? "bg-gray-800/50 border-gray-700/80"
        : "bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40"
    }`}
  >
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead
          className={`border-b transition-colors duration-200 ${
            theme === "dark"
              ? "bg-gray-900/50 border-gray-700"
              : "bg-white/20 border-blue-200/30"
          }`}
        >
          <tr>
            {["Subject", "From", "Status", "Actions"].map((col) => (
              <th
                key={col}
                className={`px-6 py-4 text-left font-semibold transition-colors duration-300 ${
                  theme === "dark" ? "text-white" : "text-slate-900"
                }`}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody
          className={`divide-y transition-colors duration-300 ${
            theme === "dark" ? "divide-white/5" : "divide-blue-200/20"
          }`}
        >
          {messages.map((msg) => (
            <MessageRow
              key={msg.$id}
              msg={msg}
              theme={theme}
              isReadOnly={isReadOnly}
              onView={onView}
              onStatusChange={onStatusChange}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
