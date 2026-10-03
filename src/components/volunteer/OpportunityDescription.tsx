import React from "react";
import {
  ALLOWED_TAGS,
  htmlToPlainText,
  sanitizeOpportunityHtml,
} from "@/utils/opportunityText";

const ALLOWED = new Set(ALLOWED_TAGS);
const VOID_TAGS = new Set(["br", "hr"]);

/**
 * Converts a sanitized DOM node to a React node. Children are passed as
 * variadic arguments to createElement so no list keys are needed.
 * @param node - Node from the parsed, already-sanitized document
 * @returns React node, or null for unsupported node types
 */
function toReactNode(node: Node): React.ReactNode {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent;
  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const element = node as Element;
  const tag = element.tagName.toLowerCase();
  const children = Array.from(element.childNodes).map(toReactNode);

  if (!ALLOWED.has(tag)) {
    return React.createElement(React.Fragment, null, ...children);
  }
  if (VOID_TAGS.has(tag)) return React.createElement(tag);
  if (tag === "a") {
    const href = element.getAttribute("href");
    return React.createElement(
      "a",
      { href: href ?? undefined, rel: "noopener noreferrer" },
      ...children,
    );
  }
  return React.createElement(tag, null, ...children);
}

interface OpportunityDescriptionProps {
  html: string;
  className?: string;
}

/**
 * Renders rich-text opportunity HTML as React elements. The HTML is sanitized
 * to an allow-list first and then rebuilt node by node, so no raw markup is
 * injected into the page. Without a DOM (server rendering) plain text is shown.
 * @param props - Component props
 * @param props.html - Untrusted HTML from volunteer_opportunities.description
 * @param props.className - Optional class names for the wrapper
 * @returns The rendered description
 */
export const OpportunityDescription: React.FC<OpportunityDescriptionProps> = ({
  html,
  className,
}) => {
  const content = React.useMemo(() => {
    if (typeof DOMParser === "undefined") return htmlToPlainText(html);
    const doc = new DOMParser().parseFromString(
      sanitizeOpportunityHtml(html),
      "text/html",
    );
    return React.createElement(
      React.Fragment,
      null,
      ...Array.from(doc.body.childNodes).map(toReactNode),
    );
  }, [html]);

  return <div className={className}>{content}</div>;
};
