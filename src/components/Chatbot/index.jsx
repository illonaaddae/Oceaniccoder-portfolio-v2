import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaComments,
  FaTimes,
  FaPaperPlane,
  FaRobot,
  FaUser,
  FaExternalLinkAlt,
  FaTrash,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import { apiUrl } from "../../utils/apiUrl";

const QUICK_REPLIES = [
  "What are your main skills?",
  "What services do you offer?",
  "How do I book a meeting?",
  "Tell me about your projects",
];

const WELCOME_CONTENT =
  "Hi! I'm Illona's portfolio assistant 👋 I can tell you about her skills, projects, services, or help you get in touch. What would you like to know?";

let _msgId = 0;
const makeMsg = (role, content) => ({ role, content, id: ++_msgId });

async function fetchReply(messages) {
  const res = await fetch(apiUrl("/api/chat"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error("Network error");
  const data = await res.json();
  return data.reply;
}

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([makeMsg("assistant", WELCOME_CONTENT)]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const clearChat = () => {
    setMessages([makeMsg("assistant", WELCOME_CONTENT)]);
    setShowQuickReplies(true);
    setInput("");
  };

  const sendMessage = async (text) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed || loading) return;

    setInput("");
    setShowQuickReplies(false);

    const userMsg = makeMsg("user", trimmed);
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    try {
      const reply = await fetchReply(newMessages.filter((m) => m.role !== "system"));
      setMessages((prev) => [...prev, makeMsg("assistant", reply)]);
    } catch {
      setMessages((prev) => [
        ...prev,
        makeMsg(
          "assistant",
          "Sorry, I'm having trouble connecting right now. Please use the [contact form](/contact) or [book a meeting](/booking).",
        ),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden shadow-2xl border flex flex-col"
            style={{
              background: "var(--bg-primary)",
              borderColor: "var(--border-subtle)",
              height: "min(500px, calc(100dvh - 120px))",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center gap-3 px-4 py-3 shrink-0"
              style={{
                background: "linear-gradient(135deg, var(--accent-teal) 0%, #0d7a6e 100%)",
              }}
            >
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <FaRobot className="text-white text-lg" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm leading-tight">Illona's Assistant</p>
                <p className="text-white/70 text-xs">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-300 mr-1 align-middle" />
                  Online · OceanicCoder
                </p>
              </div>
              <button
                onClick={clearChat}
                className="text-white/60 hover:text-white transition-colors p-1"
                aria-label="Clear chat"
                title="Clear conversation"
              >
                <FaTrash className="text-xs" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-white/70 hover:text-white transition-colors p-1"
                aria-label="Close chat"
              >
                <FaTimes />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}

              {/* Quick replies */}
              {showQuickReplies && messages.length === 1 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {QUICK_REPLIES.map((qr) => (
                    <button
                      key={qr}
                      onClick={() => sendMessage(qr)}
                      className="text-xs px-3 py-1.5 rounded-full border transition-all hover:opacity-80"
                      style={{
                        borderColor: "var(--accent-teal)",
                        color: "var(--accent-teal)",
                        background: "var(--accent-teal-subtle)",
                      }}
                    >
                      {qr}
                    </button>
                  ))}
                </div>
              )}

              {loading && (
                <div className="flex items-end gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "var(--accent-teal-subtle)" }}
                  >
                    <FaRobot className="text-xs" style={{ color: "var(--accent-teal)" }} />
                  </div>
                  <div
                    className="rounded-2xl rounded-bl-sm px-4 py-3"
                    style={{ background: "var(--bg-secondary)" }}
                  >
                    <TypingDots />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div
              className="px-3 py-3 border-t shrink-0"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <div
                className="flex items-center gap-2 rounded-xl border px-3 py-2"
                style={{
                  background: "var(--bg-secondary)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  onFocus={() =>
                    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 350)
                  }
                  placeholder="Ask me anything..."
                  className="flex-1 bg-transparent outline-none"
                  style={{ color: "var(--text-primary)", fontSize: "16px" }}
                  enterKeyHint="send"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="sentences"
                  maxLength={500}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-40"
                  style={{ background: "var(--accent-teal)", touchAction: "manipulation" }}
                  aria-label="Send"
                >
                  <FaPaperPlane className="text-white text-xs" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="w-14 h-14 rounded-full shadow-xl flex items-center justify-center relative"
        style={{
          background: "linear-gradient(135deg, var(--accent-teal) 0%, #0d7a6e 100%)",
        }}
        aria-label="Open chat"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span
              key="close"
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 90 }}
              transition={{ duration: 0.15 }}
            >
              <FaTimes className="text-white text-xl" />
            </motion.span>
          ) : (
            <motion.span
              key="open"
              initial={{ opacity: 0, rotate: 90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: -90 }}
              transition={{ duration: 0.15 }}
            >
              <FaComments className="text-white text-xl" />
            </motion.span>
          )}
        </AnimatePresence>
        {!open && (
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white" />
        )}
      </motion.button>
    </div>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";

  const renderContent = (text) => {
    const parts = [];
    let lastIndex = 0;
    const re = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    while ((match = re.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: "text", value: text.slice(lastIndex, match.index) });
      }
      parts.push({ type: "link", label: match[1], href: match[2] });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push({ type: "text", value: text.slice(lastIndex) });
    }
    return parts.map((part, i) => {
      if (part.type === "text") return part.value;
      const isExternal = part.href.startsWith("http");
      return isExternal ? (
        <a
          key={i}
          href={part.href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline inline-flex items-center gap-1"
          style={{ color: "var(--accent-teal)" }}
        >
          {part.label} <FaExternalLinkAlt className="text-xs" />
        </a>
      ) : (
        <Link key={i} to={part.href} className="underline" style={{ color: "var(--accent-teal)" }}>
          {part.label}
        </Link>
      );
    });
  };

  return (
    <div className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
        style={{
          background: isUser ? "var(--accent-teal)" : "var(--accent-teal-subtle)",
        }}
      >
        {isUser ? (
          <FaUser className="text-white text-xs" />
        ) : (
          <FaRobot className="text-xs" style={{ color: "var(--accent-teal)" }} />
        )}
      </div>
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser ? "rounded-br-sm" : "rounded-bl-sm"
        }`}
        style={{
          background: isUser ? "var(--accent-teal)" : "var(--bg-secondary)",
          color: isUser ? "#fff" : "var(--text-primary)",
        }}
      >
        {renderContent(msg.content)}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 h-4">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full animate-bounce"
          style={{
            background: "var(--accent-teal)",
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </div>
  );
}
