import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Home from "../Home";

// Logo is already mocked via moduleNameMapper (.*)/Logo
// lucide-react icons render as SVG elements in jsdom

const renderHome = () =>
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );

describe("Home", () => {
  describe("Hero section", () => {
    it("renders the main heading", () => {
      renderHome();
      expect(screen.getByText("Transparent Giving")).toBeInTheDocument();
    });

    it("renders the vision section heading", () => {
      renderHome();
      expect(screen.getByText("Our Vision")).toBeInTheDocument();
    });

    it("renders 'Read Documentation' link", () => {
      renderHome();
      const docLinks = screen.getAllByText("Read Documentation");
      expect(docLinks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Features section", () => {
    it("renders the features section heading", () => {
      renderHome();
      expect(
        screen.getByText("Your Gateway to Transparent Philanthropy"),
      ).toBeInTheDocument();
    });

    it("renders High-Efficiency Giving feature", () => {
      renderHome();
      expect(screen.getByText("High-Efficiency Giving")).toBeInTheDocument();
    });

    it("renders Charitable Equity Funds feature", () => {
      renderHome();
      expect(screen.getByText("Charitable Equity Funds")).toBeInTheDocument();
    });

    it("renders Impact Funds feature", () => {
      renderHome();
      const items = screen.getAllByText("Impact Funds");
      expect(items.length).toBeGreaterThanOrEqual(1);
    });

    it("renders Verified Organizations feature", () => {
      renderHome();
      expect(screen.getByText("Verified Organizations")).toBeInTheDocument();
    });

    it("renders Blockchain Verified feature", () => {
      renderHome();
      expect(screen.getByText("Blockchain Verified")).toBeInTheDocument();
    });

    it("renders 'Coming Soon' badges", () => {
      renderHome();
      const badges = screen.getAllByText("Coming Soon");
      expect(badges.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("User roles section", () => {
    it("renders Built for Everyone section", () => {
      renderHome();
      expect(
        screen.getByText("Built for Everyone Changing the World"),
      ).toBeInTheDocument();
    });

    it("renders For Donors column", () => {
      renderHome();
      expect(screen.getByText("For Donors")).toBeInTheDocument();
    });

    it("renders For Non-Profit Organizations column", () => {
      renderHome();
      expect(
        screen.getByText("For Non-Profit Organizations"),
      ).toBeInTheDocument();
    });

    it("renders For Volunteers column", () => {
      renderHome();
      const items = screen.getAllByText("For Volunteers");
      expect(items.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Impact funds section", () => {
    it("renders Planned Impact Funds heading", () => {
      renderHome();
      expect(screen.getByText("Planned Impact Funds")).toBeInTheDocument();
    });

    it("renders Environmental Impact Fund", () => {
      renderHome();
      expect(screen.getByText("Environmental Impact Fund")).toBeInTheDocument();
    });

    it("renders Education Opportunity Fund", () => {
      renderHome();
      expect(
        screen.getByText("Education Opportunity Fund"),
      ).toBeInTheDocument();
    });
  });

  describe("CTA section", () => {
    it("renders Ready to Transform Giving heading", () => {
      renderHome();
      expect(
        screen.getByText("Ready to Transform Giving?"),
      ).toBeInTheDocument();
    });
  });

  describe("Footer", () => {
    it("renders Give Protocol brand name in footer", () => {
      renderHome();
      // Multiple "Give Protocol" appearances; check at least one exists
      const brands = screen.getAllByText(/Give Protocol/);
      expect(brands.length).toBeGreaterThanOrEqual(1);
    });

    it("renders Product footer links", () => {
      renderHome();
      expect(screen.getByText("Product")).toBeInTheDocument();
    });

    it("renders Resources footer links", () => {
      renderHome();
      expect(screen.getByText("Resources")).toBeInTheDocument();
    });

    it("renders Connect footer links", () => {
      renderHome();
      expect(screen.getByText("Connect")).toBeInTheDocument();
    });

    it("renders Legal footer section", () => {
      renderHome();
      expect(screen.getByText("Legal")).toBeInTheDocument();
    });

    it("renders Cookie preferences button in footer", () => {
      renderHome();
      const cookieBtn = screen.getByText("Cookie preferences");
      expect(cookieBtn).toBeInTheDocument();
      expect(cookieBtn.tagName).toBe("BUTTON");
    });

    it("renders Terms of Service link in Legal section", () => {
      renderHome();
      expect(screen.getByText("Terms of Service")).toBeInTheDocument();
    });

    it("renders Privacy Policy link in Legal section", () => {
      renderHome();
      expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
    });
  });

  describe("Navigation", () => {
    it("renders nav Features link", () => {
      renderHome();
      // "Features" appears in both nav and footer
      const items = screen.getAllByText("Features");
      expect(items.length).toBeGreaterThanOrEqual(1);
    });

    it("renders nav Impact link", () => {
      renderHome();
      expect(screen.getByText("Impact")).toBeInTheDocument();
    });
  });
});
