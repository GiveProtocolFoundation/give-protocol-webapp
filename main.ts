import { serve } from "https://deno.land/std@0.220.1/http/server.ts";
import { serveDir } from "https://deno.land/std@0.220.1/http/file_server.ts";

const PORT = parseInt(Deno.env.get("PORT") || "8000");

console.log(`HTTP server running on http://localhost:${PORT}`);

// For development, serve the static files from the dist directory
// In production, these files would be served by a CDN or static file server
await serve(
  (req) => {
    const url = new URL(req.url);

    // API routes would go here
    if (url.pathname.startsWith("/api/")) {
      return new Response("API endpoint", { status: 200 });
    }

    // Serve static files from the dist directory
    return serveDir(req, {
      fsRoot: "dist",
      urlRoot: "",
      showDirListing: false,
      enableCors: true,
    });
  },
  { port: PORT },
);
