import { FaEye, FaEyeSlash } from "react-icons/fa";

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  placeholder: string;
  theme: "light" | "dark";
  inputClasses: string;
}

export const PasswordField: React.FC<PasswordFieldProps> = ({
  label,
  value,
  onChange,
  show,
  onToggleShow,
  placeholder,
  theme,
  inputClasses,
}) => {
  return (
    <div>
      <label
        className={`block text-sm font-medium mb-2 ${
          theme === "dark" ? "text-white" : "text-slate-700"
        }`}
      >
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClasses}
        />
        <button
          type="button"
          onClick={onToggleShow}
          className={`absolute right-4 top-1/2 -translate-y-1/2 ${
            theme === "dark"
              ? "text-slate-400 hover:text-white"
              : "text-slate-500 hover:text-slate-700"
          }`}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <FaEyeSlash /> : <FaEye />}
        </button>
      </div>
    </div>
  );
};
