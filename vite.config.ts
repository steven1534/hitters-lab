import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // Raise per-chunk warning so unavoidable vendor bundles don't nag us,
    // but keep it low enough that we notice real regressions.
    chunkSizeWarningLimit: 700,
    // Vite aggressively modulepreloads dependencies of dynamic imports.
    // That defeats the point of lazy-loading heavy libs like jspdf. Strip
    // the vendor-pdf preload so it only loads when the user clicks Export.
    modulePreload: {
      resolveDependencies(_filename, deps) {
        return deps.filter((d) => !d.includes("vendor-pdf-"));
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return;
          // Pull the package name out of the module path
          const marker = "node_modules/";
          const slice = id.slice(id.lastIndexOf(marker) + marker.length);
          const pkg = slice.startsWith("@")
            ? slice.split("/").slice(0, 2).join("/")
            : slice.split("/")[0];

          // Heavy feature-specific libs — isolate so they can be cache-hit
          // separately and don't bloat the app entry.
          if (pkg === "recharts") return "vendor-recharts";
          if (pkg === "framer-motion") return "vendor-framer";
          if (pkg === "html2canvas" || pkg === "jspdf" || pkg === "jspdf-autotable") return "vendor-pdf";
          if (pkg === "dompurify" || pkg === "isomorphic-dompurify") return "vendor-dompurify";
          if (pkg.startsWith("@tiptap") || pkg === "@tiptap/pm" || pkg === "prosemirror-model" || pkg === "prosemirror-state" || pkg === "prosemirror-view" || pkg.startsWith("prosemirror-")) return "vendor-tiptap";
          if (pkg.startsWith("@radix-ui")) return "vendor-radix";
          if (pkg === "lucide-react") return "vendor-icons";
          if (pkg === "date-fns") return "vendor-date";
          if (pkg === "embla-carousel-react" || pkg.startsWith("embla-carousel")) return "vendor-embla";
          if (pkg === "cmdk" || pkg === "vaul" || pkg === "react-day-picker" || pkg === "react-resizable-panels" || pkg === "input-otp") return "vendor-ui-extras";
          if (pkg === "react-hook-form" || pkg === "@hookform/resolvers" || pkg === "zod") return "vendor-forms";
          if (
            pkg === "react" ||
            pkg === "react-dom" ||
            pkg === "scheduler" ||
            pkg === "wouter"
          ) return "vendor-react";
          if (
            pkg === "@tanstack/react-query" ||
            pkg.startsWith("@trpc") ||
            pkg === "superjson"
          ) return "vendor-data";
          if (pkg.startsWith("@sentry")) return "vendor-sentry";
          // Everything else lands in a shared vendor bucket
          return "vendor";
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
