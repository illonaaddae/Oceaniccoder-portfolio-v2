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
    // Target modern browsers for smaller bundles
    target: "es2020",
    // Minify for production
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime
          "react-vendor": ["react", "react-dom"],
          // Router separate for better caching
          router: ["react-router-dom"],
          // Animation library (large, cache separately)
          "framer-motion": ["framer-motion"],
          // Markdown/blog related
          markdown: [
            "react-markdown",
            "remark-gfm",
            "react-syntax-highlighter",
          ],
          // Icons
          icons: ["react-icons"],
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 500,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom", "framer-motion"],
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",
  },
});
