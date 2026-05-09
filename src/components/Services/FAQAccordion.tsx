import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaQuestionCircle } from "react-icons/fa";
import type { FAQItem } from "./faqData";

interface FAQAccordionProps {
  items: FAQItem[];
}

const FAQAccordion: React.FC<FAQAccordionProps> = ({ items }) => {
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);

  const toggle = useCallback((question: string) => {
    setOpenQuestion((prev) => (prev === question ? null : question));
  }, []);

  return (
    <div className="space-y-4">
      {items.map((item, i) => {
        const isOpen = openQuestion === item.question;
        return (
          <motion.div
            key={item.question}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className="glass-card border border-[var(--glass-border)] rounded-xl overflow-hidden"
          >
            <button
              onClick={() => toggle(item.question)}
              className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-colors"
              aria-expanded={isOpen}
            >
              <span className="font-semibold text-[var(--text-primary)] flex items-center gap-3">
                <FaQuestionCircle className="text-oceanic-500 flex-shrink-0" />
                {item.question}
              </span>
              <span
                className={`text-[var(--text-accent)] transition-transform duration-300 ${
                  isOpen ? "rotate-180" : ""
                }`}
              >
                ▼
              </span>
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 pl-14 text-[var(--text-secondary)]">
                    {item.answer}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
};

export default React.memo(FAQAccordion);
