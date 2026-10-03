import { classifyNewsLink, isValidNewsLink } from "./newsLinks";

describe("classifyNewsLink", () => {
  it("treats app-relative paths as internal", () => {
    expect(classifyNewsLink("/about")).toBe("internal");
    expect(classifyNewsLink("  /faq  ")).toBe("internal");
  });

  it("treats http(s) URLs as external", () => {
    expect(classifyNewsLink("https://example.org/post")).toBe("external");
    expect(classifyNewsLink("http://example.org")).toBe("external");
  });

  it("refuses unsafe or unusable values", () => {
    expect(classifyNewsLink("javascript:alert(1)")).toBe("none");
    expect(classifyNewsLink("data:text/html,hi")).toBe("none");
    expect(classifyNewsLink("//evil.example")).toBe("none");
    expect(classifyNewsLink("not a url")).toBe("none");
    expect(classifyNewsLink("")).toBe("none");
    expect(classifyNewsLink("   ")).toBe("none");
    expect(classifyNewsLink(null)).toBe("none");
    expect(classifyNewsLink(undefined)).toBe("none");
  });
});

describe("isValidNewsLink", () => {
  it("accepts blank, internal and external links", () => {
    expect(isValidNewsLink("")).toBe(true);
    expect(isValidNewsLink("/about")).toBe(true);
    expect(isValidNewsLink("https://example.org")).toBe(true);
  });

  it("rejects values that could not be rendered as a safe link", () => {
    expect(isValidNewsLink("javascript:alert(1)")).toBe(false);
    expect(isValidNewsLink("example.org")).toBe(false);
  });
});
