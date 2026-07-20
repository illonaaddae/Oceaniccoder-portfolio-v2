import React, { useState, useEffect } from "react";
import { FaEnvelope, FaUser, FaClock, FaReply } from "react-icons/fa";
import { Modal } from "./Modal";
import { apiUrl } from "@/utils/apiUrl";
import type { Message } from "@/types";

interface MessageDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: "light" | "dark";
  message: Message | null;
  onMarkAsRead?: (messageId: string) => void;
  onMarkReplied?: (messageId: string) => void;
  isReadOnly?: boolean;
}

export const MessageDetailModal: React.FC<MessageDetailModalProps> = ({
  isOpen,
  onClose,
  theme,
  message,
  onMarkAsRead,
  onMarkReplied,
  isReadOnly = false,
}) => {
  const [subject, setSubject] = useState("");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // Reset the composer whenever a different message is opened.
  useEffect(() => {
    if (message) {
      setSubject(`Re: ${message.subject || "Your Message"}`);
      setReply("");
      setError("");
    }
  }, [message?.$id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleSend = async () => {
    if (!reply.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/send-message-reply"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: message.email,
          subject,
          message: reply,
          recipientName: message.name,
        }),
      });
      if (!res.ok) throw new Error(`send failed (${res.status})`);
      // Only mark replied once the email actually went out.
      onMarkReplied?.(message.$id);
      onClose();
    } catch {
      setError("Failed to send reply. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const inputClass = `w-full px-3 py-2 rounded-lg border text-sm transition-colors duration-300 ${
    theme === "dark"
      ? "bg-slate-800/50 border-slate-700 text-slate-100 placeholder-slate-500"
      : "bg-white border-slate-300 text-slate-900 placeholder-slate-400"
  }`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Message Details" theme={theme} size="lg">
      <div className="p-6 space-y-6">
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm border ${
              message.status === "new"
                ? theme === "dark"
                  ? "bg-oceanic-500/30 text-oceanic-100 border-oceanic-400/30"
                  : "bg-oceanic-400/20 text-oceanic-700 border-oceanic-300/50"
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
          <h3 className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
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
                theme === "dark" ? "bg-oceanic-500/20" : "bg-oceanic-100"
              }`}
            >
              <FaUser className={theme === "dark" ? "text-oceanic-500" : "text-oceanic-600"} />
            </div>
            <div>
              <p className={`font-semibold ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                {message.name}
              </p>
              <a
                href={`mailto:${message.email}`}
                className={`text-sm hover:underline ${
                  theme === "dark" ? "text-oceanic-500" : "text-oceanic-600"
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

        {/* Reply composer */}
        {!isReadOnly && (
          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <label
              className={`flex items-center gap-2 text-sm font-medium ${
                theme === "dark" ? "text-slate-300" : "text-slate-600"
              }`}
            >
              <FaReply className="text-xs" />
              Reply to {message.name}
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className={inputClass}
              disabled={sending}
            />
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder={`Write your reply to ${message.email}…`}
              rows={5}
              className={`${inputClass} resize-y`}
              disabled={sending}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleSend}
                disabled={sending || !reply.trim()}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                  theme === "dark"
                    ? "bg-gradient-to-r from-oceanic-500 to-oceanic-900 hover:from-oceanic-400 hover:to-oceanic-400 text-white shadow-lg shadow-oceanic-500/25"
                    : "bg-gradient-to-r from-oceanic-500 to-oceanic-500 hover:from-oceanic-600 hover:to-oceanic-600 text-white shadow-lg shadow-oceanic-500/25"
                }`}
              >
                <FaReply />
                {sending ? "Sending…" : "Send Reply"}
              </button>
              {message.status === "new" && onMarkAsRead && (
                <button
                  onClick={() => onMarkAsRead(message.$id)}
                  disabled={sending}
                  className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all duration-300 border disabled:opacity-50 ${
                    theme === "dark"
                      ? "border-slate-600 text-slate-300 hover:bg-slate-700"
                      : "border-slate-300 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Mark as Read
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
