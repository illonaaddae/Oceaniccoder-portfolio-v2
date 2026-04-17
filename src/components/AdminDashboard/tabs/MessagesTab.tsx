import { useState } from "react";
import { FaEnvelope } from "react-icons/fa";
import type { Message } from "@/types";
import { MessageDetailModal } from "../modals";
import { ReadOnlyBanner } from "./Messages/ReadOnlyBanner";
import { MessagesTable } from "./Messages/MessagesTable";

interface MessagesTabProps {
  theme: "light" | "dark";
  loading: boolean;
  filteredMessages: Message[];
  onStatusChange: (
    messageId: string,
    status: "new" | "read" | "replied",
  ) => void;
  onDelete: (messageId: string) => void;
  isReadOnly?: boolean;
}

export const MessagesTab: React.FC<MessagesTabProps> = ({
  theme,
  loading,
  filteredMessages,
  onStatusChange,
  onDelete,
  isReadOnly = false,
}) => {
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleViewMessage = (message: Message) => {
    if (isReadOnly) return;
    setSelectedMessage(message);
    setIsModalOpen(true);
    if (!message.status || message.status === "new") {
      onStatusChange(message.$id, "read");
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedMessage(null);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1
          className={`text-2xl sm:text-3xl font-bold transition-colors duration-300 ${
            theme === "dark" ? "text-white" : "text-slate-900"
          }`}
        >
          Messages
        </h1>
        <p
          className={`text-sm sm:text-base transition-colors duration-300 ${
            theme === "dark" ? "text-slate-200/90" : "text-slate-700/80"
          }`}
        >
          {isReadOnly
            ? "Overview of contact form activity"
            : "Manage contact form submissions"}
        </p>
      </div>

      {isReadOnly && <ReadOnlyBanner theme={theme} />}

      {loading ? (
        <div className="text-center py-12">
          <p
            className={`transition-colors duration-300 ${
              theme === "dark" ? "text-slate-300" : "text-slate-600"
            }`}
          >
            Loading messages...
          </p>
        </div>
      ) : filteredMessages.length === 0 ? (
        <div
          className={`glass-card border rounded-2xl p-12 text-center transition-colors duration-200 ${
            theme === "dark"
              ? "bg-gray-800/50 border-gray-700/80"
              : "bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40"
          }`}
        >
          <FaEnvelope
            className={`text-4xl mx-auto mb-4 transition-colors duration-300 ${
              theme === "dark" ? "text-gray-600" : "text-slate-400/60"
            }`}
          />
          <p
            className={`transition-colors duration-300 ${
              theme === "dark" ? "text-gray-400" : "text-slate-600"
            }`}
          >
            No messages yet
          </p>
        </div>
      ) : (
        <MessagesTable
          messages={filteredMessages}
          theme={theme}
          isReadOnly={isReadOnly}
          onView={handleViewMessage}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
        />
      )}

      <MessageDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        theme={theme}
        message={selectedMessage}
        onMarkAsRead={(id) => onStatusChange(id, "read")}
        isReadOnly={isReadOnly}
      />
    </div>
  );
};
