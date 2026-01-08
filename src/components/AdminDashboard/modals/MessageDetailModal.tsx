import React from "react";
import { FaEnvelope, FaUser, FaClock, FaReply } from "react-icons/fa";
import { Modal } from "./Modal";
import type { Message } from "@/types";

interface MessageDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: "light" | "dark";
  message: Message | null;
  onMarkAsRead?: (messageId: string) => void;
  isReadOnly?: boolean;
}

export const MessageDetailModal: React.FC<MessageDetailModalProps> = ({
  isOpen,
  onClose,
  theme,
  message,
  onMarkAsRead,
  isReadOnly = false,
}) => {
  if (!message) return null;

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown date";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getMailtoUrl = () => {
    const subject = encodeURIComponent(
      `Re: ${message.subject || "Your Message"}`
    );
    return `mailto:${message.email}?subject=${subject}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Message Details"
      theme={theme}
      size="lg"
    >
      <div className="p-6 space-y-6">
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm border ${
              message.status === "new"
                ? theme === "dark"
                  ? "bg-blue-500/30 text-blue-100 border-blue-400/30"
                  : "bg-blue-400/20 text-blue-700 border-blue-300/50"
                : message.status === "read"
                ? theme === "dark"
                  ? "bg-yellow-500/30 text-yellow-100 border-yellow-400/30"
                  : "bg-yellow-400/20 text-yellow-700 border-yellow-300/50"
                : theme === "dark"
                ? "bg-green-500/30 text-green-100 border-green-400/30"
                : "bg-green-400/20 text-green-700 border-green-300/50"
            }`}
          >
            {message.status?.toUpperCase() || "NEW"}
          </span>
          <div
            className={`flex items-center gap-2 text-sm ${
              theme === "dark" ? "text-slate-400" : "text-slate-500"
            }`}
          >
            <FaClock className="text-xs" />
            <span>{formatDate(message.$createdAt)}</span>
          </div>
        </div>

        {/* Subject */}
        <div>
          <h3
            className={`text-xl font-bold ${
              theme === "dark" ? "text-white" : "text-slate-900"
            }`}
          >
            {message.subject}
          </h3>
        </div>

        {/* Sender Info */}
        <div
          className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border ${
            theme === "dark"
              ? "bg-slate-800/50 border-slate-700/50"
              : "bg-slate-50 border-slate-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                theme === "dark" ? "bg-cyan-500/20" : "bg-blue-100"
              }`}
            >
              <FaUser
                className={theme === "dark" ? "text-cyan-400" : "text-blue-600"}
              />
            </div>
            <div>
              <p
                className={`font-semibold ${
                  theme === "dark" ? "text-white" : "text-slate-900"
                }`}
              >
                {message.name}
              </p>
              <a
                href={`mailto:${message.email}`}
                className={`text-sm hover:underline ${
                  theme === "dark" ? "text-cyan-400" : "text-blue-600"
                }`}
              >
                {message.email}
              </a>
            </div>
          </div>
        </div>

        {/* Message Content */}
        <div>
          <label
            className={`flex items-center gap-2 text-sm font-medium mb-2 ${
              theme === "dark" ? "text-slate-300" : "text-slate-600"
            }`}
          >
            <FaEnvelope className="text-xs" />
            Message
          </label>
          <div
            className={`p-4 rounded-xl border min-h-[150px] whitespace-pre-wrap ${
              theme === "dark"
                ? "bg-slate-800/50 border-slate-700/50 text-slate-200"
                : "bg-white border-slate-200 text-slate-700"
            }`}
          >
            {message.message}
          </div>
        </div>

        {/* Actions */}
        {!isReadOnly && (
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <a
              href={getMailtoUrl()}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all duration-300 no-underline ${
                theme === "dark"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg shadow-cyan-500/25"
                  : "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/25"
              }`}
            >
              <FaReply />
              Reply via Email
            </a>
            {message.status === "new" && onMarkAsRead && (
              <button
                onClick={() => onMarkAsRead(message.$id)}
                className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all duration-300 border ${
                  theme === "dark"
                    ? "border-slate-600 text-slate-300 hover:bg-slate-700"
                    : "border-slate-300 text-slate-700 hover:bg-slate-100"
                }`}
              >
                Mark as Read
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
