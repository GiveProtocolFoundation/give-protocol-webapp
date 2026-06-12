import fs from "node:fs/promises";
import express from "express";
import cookieParser from "cookie-parser";

// Constants
const isProduction = process.env.NODE_ENV === "production";
const port = process.env.PORT || 5173;
const base = process.env.BASE || "/";

// Create http server
const app = express();

// Parse cookies
app.use(cookieParser());

// Parse JSON bodies for RPC proxy and CSP reports
app.use(
  express.json({
    type: [
      "application/json",
      "application/csp-report",
      "application/reports+json",
    ],
  }),
);

// --- CSP violation report collector (TT-F1 / GIV-328) ---
const CSP_HIGH_RISK_DIRECTIVES = new Set([
  "script-src",
  "script-src-elem",
  "script-src-attr",
  "frame-src",
  "object-src",
  "base-uri",
]);
const CSP_EXTENSION_RE = /^(chrome|moz|safari|ms-browser)-extension:\/\//;

app.post("/api/csp-report", (req, res) => {
  const raw = req.body;
  // Normalise legacy report-uri and Reporting API v1 formats
  const legacy = raw?.["csp-report"];
  const modern = raw?.type === "csp-violation" ? raw.body : null;
  const report = legacy
    ? {
        documentUri: legacy["document-uri"] ?? "",
        directive:
          legacy["effective-directive"] ?? legacy["violated-directive"] ?? "",
        blockedUri: legacy["blocked-uri"] ?? "",
        sourceFile: legacy["source-file"] ?? "",
      }
    : modern
      ? {
          documentUri: modern.documentURL ?? raw.url ?? "",
          directive:
            modern.effectiveDirective ?? modern.violatedDirective ?? "",
          blockedUri: modern.blockedURL ?? "",
          sourceFile: modern.sourceFile ?? "",
        }
      : null;

  if (!report) {
    res.status(204).end();
    return;
  }

  // Drop browser-extension noise
  if (
    CSP_EXTENSION_RE.test(report.blockedUri) ||
    CSP_EXTENSION_RE.test(report.sourceFile)
  ) {
    res.status(204).end();
    return;
  }

  const isHighRisk = CSP_HIGH_RISK_DIRECTIVES.has(report.directive);
  const entry = {
    event: "csp_violation",
    ts: new Date().toISOString(),
    ...report,
    highRisk: isHighRisk,
  };

  if (isHighRisk) {
    console.error(
      `[CSP-ALERT] ${report.directive} blocked ${report.blockedUri} on ${report.documentUri}`,
    );
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }

  res.status(204).end();
});

// RPC proxy endpoints (avoids browser CORS issues with public RPCs)
const RPC_ENDPOINTS = {
  base: process.env.VITE_BASE_RPC_URL || "https://base.publicnode.com",
  optimism: process.env.VITE_OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
  moonbeam:
    process.env.VITE_MOONBEAM_RPC_URL || "https://rpc.api.moonbeam.network",
  "base-sepolia":
    process.env.VITE_BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
  "optimism-sepolia":
    process.env.VITE_OPTIMISM_SEPOLIA_RPC_URL || "https://sepolia.optimism.io",
  moonbase:
    process.env.VITE_MOONBASE_RPC_URL ||
    "https://rpc.api.moonbase.moonbeam.network",
};

app.post("/api/rpc/:chain", async (req, res) => {
  const safeChain = String(req.params.chain).replace(/[^a-z0-9-]/gi, "");
  const rpcUrl = RPC_ENDPOINTS[req.params.chain];
  if (!rpcUrl) {
    res.status(400).json({ error: `Unknown chain: ${safeChain}` });
    return;
  }

  try {
    if (!req.body || !req.body.method) {
      res.status(400).json({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32600,
          message: "Invalid Request: empty or malformed JSON-RPC body",
        },
      });
      return;
    }

    const body = JSON.stringify(req.body);

    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body).toString(),
      },
      body,
    });

    console.log(
      `RPC proxy (${safeChain}): upstream responded ${Number(response.status)}`,
    );

    const data = await response.json();

    if (
      data === null ||
      typeof data !== "object" ||
      (!("result" in data) && !("error" in data))
    ) {
      res.status(502).json({
        jsonrpc: "2.0",
        id: req.body.id,
        error: { code: -32603, message: "Empty response from upstream RPC" },
      });
      return;
    }

    res.json(data);
  } catch (error) {
    const safeMessage =
      error instanceof Error ? error.message.slice(0, 200) : "Unknown error";
    console.error(`RPC proxy error (${safeChain}): ${safeMessage}`);
    res
      .status(502)
      .set("Content-Type", "application/json")
      .json({
        jsonrpc: "2.0",
        id: req.body?.id ?? null,
        error: { code: -32603, message: `RPC request failed for ${safeChain}` },
      });
  }
});

// API Proxy routes for external services (to avoid CORS issues)
app.get("/api/coingecko/*", async (req, res) => {
  try {
    const path = req.params[0];
    const query = new URLSearchParams(req.query).toString();
    const url = `https://api.coingecko.com/api/v3/${path}${query ? `?${query}` : ""}`;

    const response = await fetch(url);
    const data = await response.json();

    res.json(data);
  } catch (error) {
    console.error("CoinGecko proxy error:", error);
    res.status(500).json({ error: "Failed to fetch from CoinGecko" });
  }
});

app.get("/api/exchangerate/*", async (req, res) => {
  try {
    const path = req.params[0];
    const url = `https://api.exchangerate-api.com/v4/latest/${path}`;

    const response = await fetch(url);
    const data = await response.json();

    res.json(data);
  } catch (error) {
    console.error("Exchange rate proxy error:", error);
    res.status(500).json({ error: "Failed to fetch exchange rates" });
  }
});

// Add Vite or respective production middlewares
let vite = null;
if (!isProduction) {
  const { createServer } = await import("vite");
  vite = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
    base,
  });
  app.use(vite.middlewares);
} else {
  const compression = (await import("compression")).default;
  const sirv = (await import("sirv")).default;
  app.use(compression());
  app.use(base, sirv("./dist/client", { extensions: [] }));
}

// Serve HTML
app.use("*", async (req, res) => {
  try {
    let url = req.originalUrl.replace(base, "");
    // Ensure URL starts with / so StaticRouter can match routes
    if (!url.startsWith("/")) url = `/${url}`;

    // Read theme from cookie (default to 'light')
    const theme = req.cookies.theme || "light";

    let template = "";
    let render = null;
    if (!isProduction) {
      // Always read fresh template in development
      template = await fs.readFile("./index.html", "utf-8");
      template = await vite.transformIndexHtml(url, template);
      render = (await vite.ssrLoadModule("/src/entry-server.tsx")).render;
    } else {
      template = await fs.readFile("./dist/client/index.html", "utf-8");
      render = (await import("./dist/server/entry-server.js")).render;
    }

    const appHtml = render(url, theme);

    // Apply dark class to html element if theme is dark
    const htmlWithTheme =
      theme === "dark"
        ? template.replace('<html lang="en">', '<html lang="en" class="dark">')
        : template;

    const html = htmlWithTheme.replace("<!--app-html-->", appHtml);

    res.status(200).set({ "Content-Type": "text/html" }).send(html);
  } catch (e) {
    vite?.ssrFixStacktrace(e);
    console.log(e.stack);
    res.status(500).end(e.stack);
  }
});

// Start http server
app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`);
});
