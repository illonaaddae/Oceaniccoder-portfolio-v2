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

export interface TerminalLine {
  type: string;
  text: string;
  color?: string;
  delay: number;
}

export const sequence: TerminalLine[] = [
  { type: "cmd", text: "npm run dev", delay: 500 },
  {
    type: "output",
    text: "→ starship init zsh",
    color: colors.comment,
    delay: 800,
  },
  {
    type: "output",
    text: "✔ Appwrite connection established",
    color: colors.green,
    delay: 1200,
  },
  {
    type: "output",
    text: "✔ Azure deployment verified",
    color: colors.green,
    delay: 1500,
  },
  {
    type: "output",
    text: "⚠ Loading portfolio modules...",
    color: colors.yellow,
    delay: 1900,
  },
  {
    type: "output",
    text: "ℹ Hydrating oceanic components...",
    color: colors.cyan,
    delay: 2300,
  },
  {
    type: "success",
    text: "✨ System Ready.",
    color: colors.purple,
    delay: 2700,
  },
];
