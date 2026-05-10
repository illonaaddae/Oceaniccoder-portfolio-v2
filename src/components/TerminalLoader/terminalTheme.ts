// Dracula Theme Colors
export const colors = {
  background: "#282a36",
  currentLine: "#44475a",
  foreground: "#f8f8f2",
  comment: "#6272a4",
  cyan: "#8be9fd",
  green: "#50fa7b",
  orange: "#ffb86c",
  pink: "#ff79c6",
  purple: "#bd93f9",
  red: "#ff5555",
  yellow: "#f1fa8c",
};

export type TerminalIcon = "arrow" | "check" | "warn" | "info" | "spark";

export interface TerminalLine {
  type: string;
  text: string;
  color?: string;
  icon?: TerminalIcon;
  delay: number;
}

export const sequence: TerminalLine[] = [
  { type: "cmd", text: "npm run dev", delay: 100 },
  {
    type: "output",
    text: "starship init zsh",
    color: colors.comment,
    icon: "arrow",
    delay: 150,
  },
  {
    type: "output",
    text: "Appwrite connection established",
    color: colors.green,
    icon: "check",
    delay: 220,
  },
  {
    type: "output",
    text: "Azure deployment verified",
    color: colors.green,
    icon: "check",
    delay: 250,
  },
  {
    type: "output",
    text: "Loading portfolio modules...",
    color: colors.yellow,
    icon: "warn",
    delay: 300,
  },
  {
    type: "output",
    text: "Hydrating oceanic components...",
    color: colors.cyan,
    icon: "info",
    delay: 350,
  },
  {
    type: "success",
    text: "System Ready.",
    color: colors.purple,
    icon: "spark",
    delay: 400,
  },
];
