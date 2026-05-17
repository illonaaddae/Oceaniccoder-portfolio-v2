import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { FaChevronDown } from "react-icons/fa";

interface SelectDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
}

const SelectDropdown: React.FC<SelectDropdownProps> = ({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = "",
}) => {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as globalThis.Node)) {
        setOpen(false);
      }
    };
    const handleScroll = () => setOpen(false);
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, []);

  const handleOpen = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    });
    setOpen((prev) => !prev);
  };

  const handleSelect = (option: string) => {
    onChange(option);
    setOpen(false);
  };

  return (
    <div ref={triggerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={handleOpen}
        className={`w-full glass-input flex items-center justify-between text-left ${
          value ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)] opacity-70"
        }`}
      >
        <span>{value || placeholder}</span>
        <FaChevronDown
          className={`flex-shrink-0 ml-2 transition-transform duration-200 text-oceanic-400 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open &&
        createPortal(
          <div
            style={dropdownStyle}
            className="glass-card border border-oceanic-500/30 rounded-xl overflow-hidden shadow-2xl shadow-black/50 max-h-60 overflow-y-auto"
          >
            <button
              type="button"
              onClick={() => handleSelect("")}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors duration-150 ${
                value === ""
                  ? "bg-oceanic-500/20 text-oceanic-400 font-medium"
                  : "text-[var(--text-secondary)] hover:bg-oceanic-500/10 hover:text-oceanic-400"
              }`}
            >
              {placeholder}
            </button>
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => handleSelect(opt)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors duration-150 border-t border-white/5 ${
                  value === opt
                    ? "bg-oceanic-500/20 text-oceanic-400 font-medium"
                    : "text-[var(--text-primary)] hover:bg-oceanic-500/10 hover:text-oceanic-400"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
};

export default SelectDropdown;
