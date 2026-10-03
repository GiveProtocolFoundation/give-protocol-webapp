import { describe, it, expect } from "@jest/globals";
import {
  sanitizeOpportunityHtml,
  htmlToPlainText,
  splitLines,
} from "./opportunityText";

describe("sanitizeOpportunityHtml", () => {
  it("keeps formatting tags", () => {
    const html = "<p>Hello <strong>world</strong></p><ul><li>One</li></ul>";
    expect(sanitizeOpportunityHtml(html)).toBe(html);
  });

  it("removes script tags and event handlers", () => {
    const out = sanitizeOpportunityHtml(
      '<p onclick="steal()">Hi</p><script>alert(1)</script><img src=x onerror="alert(1)">',
    );
    expect(out).toBe("<p>Hi</p>");
  });

  it("drops javascript: links but keeps https links", () => {
    const out = sanitizeOpportunityHtml(
      '<a href="javascript:alert(1)">bad</a><a href="https://example.org">good</a>',
    );
    expect(out).not.toContain("javascript:");
    expect(out).toContain('href="https://example.org"');
  });

  it("drops disallowed attributes", () => {
    expect(
      sanitizeOpportunityHtml(
        '<a href="https://x.org" style="color:red">x</a>',
      ),
    ).toBe('<a href="https://x.org">x</a>');
  });
});

describe("htmlToPlainText", () => {
  it("strips tags and separates block elements", () => {
    expect(htmlToPlainText("<p>First</p><p>Second</p>")).toBe("First Second");
  });

  it("separates list items and line breaks", () => {
    expect(htmlToPlainText("<ul><li>A</li><li>B</li></ul>one<br>two")).toBe(
      "A B one two",
    );
  });

  it("decodes entities without producing markup", () => {
    expect(htmlToPlainText("<p>Fish &amp; chips</p>")).toBe("Fish & chips");
  });

  it("drops script content", () => {
    expect(htmlToPlainText("<p>Hi</p><script>alert(1)</script>")).toBe("Hi");
  });

  it("returns plain text unchanged", () => {
    expect(htmlToPlainText("  Just   text ")).toBe("Just text");
  });
});

describe("splitLines", () => {
  it("splits, trims and drops blank lines", () => {
    expect(splitLines("One\n  Two  \n\nThree")).toEqual([
      "One",
      "Two",
      "Three",
    ]);
  });

  it("returns an empty array for empty input", () => {
    expect(splitLines(null)).toEqual([]);
    expect(splitLines(undefined)).toEqual([]);
    expect(splitLines("")).toEqual([]);
  });
});
