import { describe, it, expect } from "@jest/globals";
import { render } from "@testing-library/react";
import { SOCIAL_PLATFORMS, FarcasterIcon } from "./platforms";

describe("social platforms", () => {
  describe("SOCIAL_PLATFORMS", () => {
    it("should have 6 platforms", () => {
      expect(SOCIAL_PLATFORMS).toHaveLength(6);
    });

    it("should include major social platforms", () => {
      const ids = SOCIAL_PLATFORMS.map((p) => p.id);
      expect(ids).toContain("facebook");
      expect(ids).toContain("twitter");
      expect(ids).toContain("linkedin");
      expect(ids).toContain("whatsapp");
      expect(ids).toContain("telegram");
      expect(ids).toContain("farcaster");
    });

    it("should generate valid share URLs", () => {
      const testUrl = "https://example.com";
      const testMsg = "Check this out";

      SOCIAL_PLATFORMS.forEach((platform) => {
        const shareUrl = platform.getShareUrl(testUrl, testMsg);
        expect(shareUrl).toBeTruthy();
        expect(shareUrl).toContain("https://");
      });
    });

    it("should encode URLs in share links", () => {
      const testUrl = "https://example.com/path?q=1&a=2";
      const testMsg = "Hello & welcome";

      const twitterPlatform = SOCIAL_PLATFORMS.find((p) => p.id === "twitter");
      const shareUrl = twitterPlatform?.getShareUrl(testUrl, testMsg);
      expect(shareUrl).toContain(encodeURIComponent(testUrl));
    });
  });

  describe("FarcasterIcon", () => {
    it("should render an SVG element", () => {
      const { container } = render(<FarcasterIcon />);
      const svg = container.querySelector("svg");
      expect(svg).not.toBeNull();
      expect(svg?.getAttribute("aria-hidden")).toBe("true");
    });

    it("should accept className prop", () => {
      const { container } = render(<FarcasterIcon className="w-5 h-5" />);
      const svg = container.querySelector("svg");
      expect(svg?.classList.contains("w-5")).toBe(true);
    });
  });
});
