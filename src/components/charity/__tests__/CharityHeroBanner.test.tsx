import { render, screen, fireEvent } from "@testing-library/react";
import { CharityHeroBanner } from "../CharityHeroBanner";

describe("CharityHeroBanner", () => {
  describe("with banner image", () => {
    it("renders image with alt text", () => {
      render(
        <CharityHeroBanner
          bannerImageUrl="https://example.com/banner.jpg"
          orgName="Test Org"
        />,
      );
      const img = screen.getByRole("img", { name: /test org banner/i });
      expect(img).toBeInTheDocument();
    });

    it("falls back to gradient placeholder when image fails to load", () => {
      render(
        <CharityHeroBanner
          bannerImageUrl="https://example.com/broken.jpg"
          orgName="Test Org"
        />,
      );
      const img = screen.getByRole("img", { name: /test org banner/i });
      fireEvent.error(img);

      const placeholder = screen.getByRole("img", {
        name: /test org banner placeholder/i,
      });
      expect(placeholder).toBeInTheDocument();
    });
  });

  describe("without banner image (placeholder)", () => {
    it("placeholder has role=img with aria-label", () => {
      render(<CharityHeroBanner bannerImageUrl={null} orgName="Test Org" />);
      const placeholder = screen.getByRole("img", {
        name: /test org banner placeholder/i,
      });
      expect(placeholder).toBeInTheDocument();
    });

    it("placeholder aria-label includes org name", () => {
      render(
        <CharityHeroBanner
          bannerImageUrl={undefined}
          orgName="Give Foundation"
        />,
      );
      const placeholder = screen.getByRole("img", {
        name: /give foundation banner placeholder/i,
      });
      expect(placeholder).toBeInTheDocument();
    });
  });
});
