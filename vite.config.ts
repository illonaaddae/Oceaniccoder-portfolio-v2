import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    strictPort: false,
  },
  build: {
    outDir: "build",
    sourcemap: false,
    target: "es2020",
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          // ── Core React runtime ──────────────────────────────────────────
          if (
            id.includes("/node_modules/react/") ||
            id.includes("/node_modules/react-dom/") ||
            id.includes("/node_modules/scheduler/")
          ) {
            return "react-vendor";
          }

          // ── Router ──────────────────────────────────────────────────────
          if (
            id.includes("/node_modules/react-router") ||
            id.includes("/node_modules/@remix-run/")
          ) {
            return "router";
          }

          // ── Animation ───────────────────────────────────────────────────
          if (id.includes("/node_modules/framer-motion/")) {
            return "framer-motion";
          }

          // ── Syntax highlighting (loaded only with blog posts) ───────────
          // Kept separate from markdown AST processing so each can be
          // cached independently and the syntax chunk benefits from
          // PrismLight tree-shaking.
          if (
            id.includes("/node_modules/react-syntax-highlighter/") ||
            id.includes("/node_modules/prismjs/") ||
            id.includes("/node_modules/highlight.js/") ||
            id.includes("/node_modules/refractor/")
          ) {
            return "syntax-highlighter";
          }

          // ── Markdown AST processing (loaded only with blog posts) ───────
          if (
            id.includes("/node_modules/react-markdown/") ||
            id.includes("/node_modules/remark") ||
            id.includes("/node_modules/rehype") ||
            id.includes("/node_modules/unified/") ||
            id.includes("/node_modules/micromark") ||
            id.includes("/node_modules/mdast") ||
            id.includes("/node_modules/hast") ||
            id.includes("/node_modules/vfile") ||
            id.includes("/node_modules/unist")
          ) {
            return "markdown";
          }

          // ── Appwrite SDK ─────────────────────────────────────────────────
          // The SDK is imported by services/api which is pulled in by
          // eagerly-loaded home components via usePortfolioData.
          // Isolating it keeps the main bundle lean and lets the SDK
          // be cached separately (it never changes between deploys).
          if (id.includes("/node_modules/appwrite/")) {
            return "appwrite";
          }

          // ── Icons ────────────────────────────────────────────────────────
          if (id.includes("/node_modules/react-icons/")) {
            return "icons";
          }
        },
      },
    },
    cssCodeSplit: true,
    chunkSizeWarningLimit: 500,
    cssMinify: true,
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom", "framer-motion"],
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",
  },
});
