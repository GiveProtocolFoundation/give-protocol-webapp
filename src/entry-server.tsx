import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import App from "./App";
import "./i18n"; // Initialize i18n for SSR to match client hydration

/**
 * Server-side rendering entry point
 * @param url The URL to render
 * @param theme The theme preference from cookie ('light' or 'dark')
 * @returns HTML string of the rendered application
 */
export function render(url: string, _theme?: string) {
  // Theme is applied to <html> element by server.js
  // We don't need to do anything with it here, but accept it to match server call
  const html = renderToString(
    <StrictMode>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </StrictMode>,
  );
  return html;
}
