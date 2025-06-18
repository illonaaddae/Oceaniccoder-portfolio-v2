/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class", // Changed from "selector" to "class"
  theme: {
    extend: {
      colors: {
        brand: {
          "ocean-1": "#0d253f",
          "ocean-2": "#01b4e4",
          "ocean-3": "#90cea1",
          "ocean-4": "#1a5f3f", // ✅ Added ocean green
          "ocean-5": "#2d8659", // ✅ Added deeper ocean green
          "dark-1": "#000b21",
          "dark-2": "#001321",
          "dark-3": "#10162f",
          "dark-4": "#1d2340",
          "text-light": "#F2FAFD",
          "text-gray": "#EAEAEB",
        },
        oceanic: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6", // ✅ Main oceanic green
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
        },
      },
      fontFamily: {
        heading: ["Space Grotesk", "sans-serif"],
        display: ["Space Grotesk", "sans-serif"],
        body: ["Space Grotesk", "sans-serif"],
      },
      animation: {
        "liquid-1": "liquid1 8s ease-in-out infinite",
        "liquid-2": "liquid2 10s ease-in-out infinite",
        "liquid-3": "liquid3 12s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        glow: "glow 2s ease-in-out infinite alternate",
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        liquid1: {
          "0%, 100%": {
            transform: "translate(0px, 0px) scale(1) rotate(0deg)",
            borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%",
          },
          "33%": {
            transform: "translate(30px, -30px) scale(1.1) rotate(120deg)",
            borderRadius: "30% 60% 70% 40% / 50% 60% 30% 60%",
          },
          "66%": {
            transform: "translate(-20px, 20px) scale(0.9) rotate(240deg)",
            borderRadius: "70% 30% 40% 60% / 40% 50% 60% 50%",
          },
        },
        liquid2: {
          "0%, 100%": {
            transform: "translate(0px, 0px) scale(1) rotate(0deg)",
            borderRadius: "40% 60% 30% 70% / 60% 30% 70% 40%",
          },
          "33%": {
            transform: "translate(-30px, 30px) scale(0.8) rotate(-120deg)",
            borderRadius: "60% 30% 70% 40% / 50% 60% 30% 60%",
          },
          "66%": {
            transform: "translate(20px, -20px) scale(1.2) rotate(-240deg)",
            borderRadius: "30% 70% 40% 60% / 40% 50% 60% 50%",
          },
        },
        liquid3: {
          "0%, 100%": {
            transform: "translate(0px, 0px) scale(1)",
            borderRadius: "50% 50% 50% 50% / 50% 50% 50% 50%",
          },
          "50%": {
            transform: "translate(25px, 25px) scale(1.1)",
            borderRadius: "30% 70% 60% 40% / 50% 60% 30% 70%",
          },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        glow: {
          from: {
            boxShadow: "0 0 20px #14b8a6, 0 0 40px #14b8a6",
          },
          to: {
            boxShadow: "0 0 30px #14b8a6, 0 0 60px #14b8a6, 0 0 80px #14b8a6",
          },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
