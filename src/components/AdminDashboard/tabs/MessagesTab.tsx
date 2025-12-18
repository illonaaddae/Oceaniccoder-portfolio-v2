import { FaEnvelope, FaCheck, FaTrash } from "react-icons/fa";
import type { Message } from "@/types";

interface MessagesTabProps {
  theme: "light" | "dark";
  loading: boolean;
  filteredMessages: Message[];
  onStatusChange: (
    messageId: string,
    status: "new" | "read" | "replied"
  ) => void;
  onDelete: (messageId: string) => void;
}

export const MessagesTab: React.FC<MessagesTabProps> = ({
  theme,
  loading,
  filteredMessages,
  onStatusChange,
  onDelete,
}) => {
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
          Manage contact form submissions
        </p>
      </div>

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
          className={`glass-card backdrop-blur-xl border rounded-2xl p-12 text-center transition-colors duration-300 ${
            theme === "dark"
              ? "bg-gradient-to-br from-white/8 to-white/4 border-white/20"
              : "bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40"
          }`}
        >
          <FaEnvelope
            className={`text-4xl mx-auto mb-4 transition-colors duration-300 ${
              theme === "dark" ? "text-slate-400/50" : "text-slate-400/60"
            }`}
          />
          <p
            className={`transition-colors duration-300 ${
              theme === "dark" ? "text-slate-300" : "text-slate-600"
            }`}
          >
            No messages yet
          </p>
        </div>
      ) : (
        <div
          className={`glass-card backdrop-blur-xl border rounded-2xl overflow-hidden transition-colors duration-300 ${
            theme === "dark"
              ? "bg-gradient-to-br from-white/8 to-white/4 border-white/20"
              : "bg-gradient-to-br from-white/40 to-white/20 border-blue-200/40"
          }`}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead
                className={`backdrop-blur-sm border-b transition-colors duration-300 ${
                  theme === "dark"
                    ? "bg-white/8 border-white/10"
                    : "bg-white/20 border-blue-200/30"
                }`}
              >
                <tr>
                  <th
                    className={`px-6 py-4 text-left font-semibold transition-colors duration-300 ${
                      theme === "dark" ? "text-white" : "text-slate-900"
                    }`}
                  >
                    Subject
                  </th>
                  <th
                    className={`px-6 py-4 text-left font-semibold transition-colors duration-300 ${
                      theme === "dark" ? "text-white" : "text-slate-900"
                    }`}
                  >
                    From
                  </th>
                  <th
                    className={`px-6 py-4 text-left font-semibold transition-colors duration-300 ${
                      theme === "dark" ? "text-white" : "text-slate-900"
                    }`}
                  >
                    Status
                  </th>
                  <th
                    className={`px-6 py-4 text-left font-semibold transition-colors duration-300 ${
                      theme === "dark" ? "text-white" : "text-slate-900"
                    }`}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody
                className={`divide-y transition-colors duration-300 ${
                  theme === "dark" ? "divide-white/5" : "divide-blue-200/20"
                }`}
              >
                {filteredMessages.map((msg) => (
                  <tr
                    key={msg.$id}
                    className={`transition-all duration-300 ${
                      theme === "dark"
                        ? "hover:bg-white/5"
                        : "hover:bg-white/20"
                    }`}
                  >
                    <td
                      className={`px-6 py-4 font-medium transition-colors duration-300 ${
                        theme === "dark" ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {msg.subject}
                    </td>
                    <td
                      className={`px-6 py-4 transition-colors duration-300 ${
                        theme === "dark" ? "text-slate-300" : "text-slate-700"
                      }`}
                    >
                      {msg.name}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm border transition-colors duration-300 ${
                          msg.status === "new"
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
                        <button
                          onClick={() =>
                            onStatusChange(
                              msg.$id,
                              msg.status === "read" ? "new" : "read"
                            )
                          }
                          className={`p-2 rounded transition duration-300 ${
                            theme === "dark"
                              ? "text-cyan-300 hover:bg-cyan-500/20"
                              : "text-blue-600 hover:bg-blue-400/20"
                          }`}
                          title="Toggle read status"
                        >
                          <FaCheck className="text-sm" />
                        </button>
                        <button
                          onClick={() => onDelete(msg.$id)}
                          className={`p-2 rounded transition duration-300 ${
                            theme === "dark"
                              ? "text-red-400 hover:bg-red-500/20"
                              : "text-red-600 hover:bg-red-400/20"
                          }`}
                          title="Delete message"
                        >
                          <FaTrash className="text-sm" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
