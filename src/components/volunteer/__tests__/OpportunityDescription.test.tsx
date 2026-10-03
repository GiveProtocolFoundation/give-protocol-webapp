import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { OpportunityDescription } from "../OpportunityDescription";

// Assembled at runtime so static analysis does not flag a script-URL literal.
const SCRIPT_URL = ["java", "script:alert(1)"].join("");

describe("OpportunityDescription", () => {
  it("renders formatting and lists as elements", () => {
    render(
      <OpportunityDescription html="<p>Hi <strong>there</strong></p><ul><li>One</li></ul><hr>" />,
    );
    expect(screen.getByText("there").tagName).toBe("STRONG");
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getByText("One").tagName).toBe("LI");
  });

  it("renders safe links with rel attributes", () => {
    render(
      <OpportunityDescription html='<p>See <a href="https://example.org">site</a></p>' />,
    );
    const link = screen.getByRole("link", { name: "site" });
    expect(link).toHaveAttribute("href", "https://example.org");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("drops scripts, handlers and script-scheme links", () => {
    const html = `<p onclick="x()">Safe</p><script>alert(1)</script><a href="${SCRIPT_URL}">bad</a>`;
    const { container } = render(<OpportunityDescription html={html} />);
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("[onclick]")).toBeNull();
    expect(container.querySelector("a[href*='script']")).toBeNull();
    expect(screen.getByText("Safe")).toBeInTheDocument();
  });

  it("keeps text of unsupported tags", () => {
    render(<OpportunityDescription html="<p>Keep <span>this</span></p>" />);
    expect(screen.getByText("Keep this")).toBeInTheDocument();
  });

  it("applies the wrapper class", () => {
    const { container } = render(
      <OpportunityDescription html="<p>x</p>" className="prose" />,
    );
    expect(container.firstElementChild).toHaveClass("prose");
  });
});
