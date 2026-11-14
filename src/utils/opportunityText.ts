import DOMPurify from "dompurify";

/** Formatting tags that survive sanitization of opportunity HTML. */
export const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "b",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "blockquote",
  "a",
  "code",
  "pre",
  "hr",
];

/**
 * Removes the characters that open or close HTML tags. Used as the fallback
 * when no DOM is available (server rendering), where DOMPurify cannot run.
 * @param input - Untrusted text
 * @returns Text with angle brackets removed
 */
function stripAngleBrackets(input: string): string {
  return input.replace(/[<>]/g, "");
}

/**
 * Sanitizes rich-text HTML written in the opportunity editor so it can be
 * rendered with dangerouslySetInnerHTML. Only formatting tags and http(s) or
 * mailto links are kept; scripts, handlers and unknown tags are dropped. Without a
 * DOM (server rendering) the tags are stripped entirely rather than trusted.
 * @param html - Untrusted HTML from volunteer_opportunities.description
 * @returns Sanitized HTML safe to render
 */
export function sanitizeOpportunityHtml(html: string): string {
  if (typeof window === "undefined" || !DOMPurify.isSupported) {
    return stripAngleBrackets(html);
  }
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ["href"],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:)/i,
  });
}

/**
 * Converts rich-text HTML to a single line of plain text for card excerpts.
 * @param html - Untrusted HTML from volunteer_opportunities.description
 * @returns Whitespace-collapsed plain text
 */
export function htmlToPlainText(html: string): string {
  const spaced = html.split("</").join(" </").split("<br").join(" <br");
  if (typeof window === "undefined" || !DOMPurify.isSupported) {
    return stripAngleBrackets(spaced).replace(/\s+/g, " ").trim();
  }
  const text = DOMPurify.sanitize(spaced, {
    ALLOWED_TAGS: [],
    KEEP_CONTENT: true,
  });
  const decoder = document.createElement("textarea");
  decoder.innerHTML = text;
  return decoder.value.replace(/\s+/g, " ").trim();
}

/**
 * Splits a one-item-per-line text field into list items.
 * @param value - Multi-line text, or null when unset
 * @returns Non-empty trimmed lines
 */
export function splitLines(value?: string | null): string[] {
  if (!value) return [];
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

const COMMITMENTS: Record<string, { key: string; fallback: string }> = {
  "one-time": { key: "volunteer.commitment.oneTime", fallback: "One-time" },
  "short-term": {
    key: "volunteer.commitment.shortTerm",
    fallback: "Short-term",
  },
  "long-term": { key: "volunteer.commitment.longTerm", fallback: "Long-term" },
};

/**
 * Maps a stored commitment category to its i18n key and English fallback.
 * @param commitment - volunteer_opportunities.commitment
 * @returns Key and fallback, or null for values outside the three categories
 */
export function commitmentI18n(
  commitment: string,
): { key: string; fallback: string } | null {
  return COMMITMENTS[commitment] ?? null;
}
