import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import compression from "vite-plugin-compression";

export default defineConfig(({ mode }) => {
  // Optional Supabase reverse proxy for Cypress E2E runs (GIV-921).
  // Some sandboxed browsers launched by Cypress cannot open connections to
  // arbitrary localhost ports (e.g. the local Supabase stack on 54321) even
  // though the dev server on 5173 is reachable.  When
  // E2E_SUPABASE_PROXY_TARGET is set, /sb/* is proxied to the Supabase API,
  // so the app can be pointed at http://localhost:5173/sb via
  // VITE_SUPABASE_URL and all traffic stays same-origin.
  const supabaseProxyTarget = process.env.E2E_SUPABASE_PROXY_TARGET;
  const supabaseProxy = supabaseProxyTarget
    ? {
        "/sb": {
          target: supabaseProxyTarget,
          changeOrigin: true,
          rewrite: (p: string) => p.replace(/^\/sb/, ""),
        },
      }
    : undefined;

  return {
    plugins: [
      react(),
      compression({
        algorithm: "gzip",
        ext: ".gz",
      }),
    ],
    build: {
      target: "es2020",
      minify: mode === "production" ? "terser" : false,
      sourcemap: true,
      reportCompressedSize: true,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (
                id.includes("react") ||
                id.includes("react-dom") ||
                id.includes("react-router-dom")
              ) {
                return "vendor-react";
              }
              if (id.includes("@polkadot")) {
                return "vendor-web3";
              }
              if (
                id.includes("lucide-react") ||
                id.includes("clsx") ||
                id.includes("tailwind-merge")
              ) {
                return "vendor-ui";
              }
              if (id.includes("@supabase")) {
                return "vendor-supabase";
              }
              return "vendor";
            }
            return undefined;
          },
        },
      },
      terserOptions: {
        compress: {
          drop_console: mode === "production",
          drop_debugger: mode === "production",
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        buffer: "buffer/",
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      host: true,
      proxy: supabaseProxy,
    },
    preview: {
      port: 4173,
      strictPort: true,
      host: true,
      proxy: supabaseProxy,
    },
    esbuild: {
      target: "es2020",
    },
    envDir: ".",
    envPrefix: "VITE_",
    mode: mode === "app" ? "app" : "production",
    define: {
      "globalThis.Buffer": "globalThis.Buffer",
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-router-dom",
        "@supabase/supabase-js",
        "ethers",
        "viem",
        "buffer",
      ],
    },
    ssr: {
      noExternal: ["react-router-dom", "@supabase/supabase-js"],
    },
  };
});
