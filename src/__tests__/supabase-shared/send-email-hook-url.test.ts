import { describe, it, expect } from "@jest/globals";
import {
  getWebappBaseUrl,
  buildConfirmationUrl,
} from "../../../supabase/functions/_shared/send-email-hook-url.ts";

describe("send-email-hook URL builder", () => {
  describe("getWebappBaseUrl", () => {
    it("extracts origin from redirect_to when present and valid", () => {
      const origin = getWebappBaseUrl({
        redirect_to: "https://giveprotocol.io/auth/callback?email=donor%40example.com",
        site_url: "https://api.giveprotocol.io/auth/v1",
      });
      expect(origin).toBe("https://giveprotocol.io");
    });

    it("extracts origin from preview / netlify redirect_to", () => {
      const origin = getWebappBaseUrl({
        redirect_to: "https://giveprotocol.netlify.app/auth/callback?email=donor%40example.com",
        site_url: "https://api.giveprotocol.io",
      });
      expect(origin).toBe("https://giveprotocol.netlify.app");
    });

    it("extracts origin from localhost redirect_to during development", () => {
      const origin = getWebappBaseUrl({
        redirect_to: "http://localhost:5173/auth/callback?email=dev%40example.com",
        site_url: "https://lhbyfidtlhojnrewpstp.supabase.co",
      });
      expect(origin).toBe("http://localhost:5173");
    });

    it("ignores redirect_to if pointing to api gateway or supabase", () => {
      const origin = getWebappBaseUrl({
        redirect_to: "https://api.giveprotocol.io/auth/v1/callback",
        site_url: "https://giveprotocol.io",
      });
      expect(origin).toBe("https://giveprotocol.io");
    });

    it("uses site_url if valid and no redirect_to", () => {
      const origin = getWebappBaseUrl({
        site_url: "https://giveprotocol.io",
      });
      expect(origin).toBe("https://giveprotocol.io");
    });

    it("falls back to CANONICAL_SITE_URL if site_url points to API gateway or supabase", () => {
      const originFromApi = getWebappBaseUrl({
        site_url: "https://api.giveprotocol.io/auth/v1",
      });
      expect(originFromApi).toBe("https://giveprotocol.io");

      const originFromSupabase = getWebappBaseUrl({
        site_url: "https://lhbyfidtlhojnrewpstp.supabase.co/auth/v1",
      });
      expect(originFromSupabase).toBe("https://giveprotocol.io");
    });

    it("falls back to CANONICAL_SITE_URL when empty or missing", () => {
      expect(getWebappBaseUrl({})).toBe("https://giveprotocol.io");
      expect(getWebappBaseUrl({ site_url: null, redirect_to: null })).toBe(
        "https://giveprotocol.io",
      );
    });
  });

  describe("buildConfirmationUrl", () => {
    it("builds correct confirmation URL without API gateway path", () => {
      const url = buildConfirmationUrl({
        site_url: "https://api.giveprotocol.io/auth/v1",
        redirect_to: "https://giveprotocol.io/auth/callback?email=rodw6905%40gmail.com",
        token_hash: "pkce_efed2e01ae53dc60b46f59745ccf18c4e0a47f23f4c895189d834610",
        email_action_type: "signup",
      });

      expect(url).toBe(
        "https://giveprotocol.io/auth/confirm?token_hash=pkce_efed2e01ae53dc60b46f59745ccf18c4e0a47f23f4c895189d834610&type=signup&next=https%3A%2F%2Fgiveprotocol.io%2Fauth%2Fcallback%3Femail%3Drodw6905%2540gmail.com",
      );
    });

    it("builds confirmation URL for password recovery", () => {
      const url = buildConfirmationUrl({
        site_url: "https://api.giveprotocol.io/auth/v1",
        redirect_to: null,
        token_hash: "rec_12345",
        email_action_type: "recovery",
      });

      expect(url).toBe(
        "https://giveprotocol.io/auth/confirm?token_hash=rec_12345&type=recovery",
      );
    });
  });
});
