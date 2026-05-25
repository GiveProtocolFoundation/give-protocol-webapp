import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LogoBannerUploadCard } from "../LogoBannerUploadCard";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";

const mockSupabase = jest.mocked(supabase);
const mockUseAuth = jest.mocked(useAuth);
const mockUseToast = jest.mocked(useToast);
const mockShowToast = jest.fn();

const OWNER_ID = "user-123";
const EIN = "12-3456789";

const defaultProps = {
  ein: EIN,
  logoUrl: null,
  bannerImageUrl: null,
  claimedByUserId: OWNER_ID,
  onLogoUploaded: jest.fn(),
  onBannerUploaded: jest.fn(),
};

const renderCard = (overrides: Partial<typeof defaultProps> = {}) =>
  render(<LogoBannerUploadCard {...defaultProps} {...overrides} />);

describe("LogoBannerUploadCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseToast.mockReturnValue({ showToast: mockShowToast });
    mockUseAuth.mockReturnValue({
      user: { id: OWNER_ID } as ReturnType<typeof useAuth>["user"],
      loading: false,
      error: null,
      userType: null,
      login: jest.fn(),
      loginWithGoogle: jest.fn(),
      loginWithApple: jest.fn(),
      logout: jest.fn(),
      resetPassword: jest.fn(),
      refreshSession: jest.fn(),
      register: jest.fn(),
      sendUsernameReminder: jest.fn(),
    });
  });

  describe("visibility", () => {
    it("renders nothing when user is not owner", () => {
      mockUseAuth.mockReturnValue({
        user: { id: "other-user" } as ReturnType<typeof useAuth>["user"],
        loading: false,
        error: null,
        userType: null,
        login: jest.fn(),
        loginWithGoogle: jest.fn(),
        loginWithApple: jest.fn(),
        logout: jest.fn(),
        resetPassword: jest.fn(),
        refreshSession: jest.fn(),
        register: jest.fn(),
        sendUsernameReminder: jest.fn(),
      });
      const { container } = renderCard();
      expect(container.firstChild).toBeNull();
    });

    it("renders nothing when user is not logged in", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        error: null,
        userType: null,
        login: jest.fn(),
        loginWithGoogle: jest.fn(),
        loginWithApple: jest.fn(),
        logout: jest.fn(),
        resetPassword: jest.fn(),
        refreshSession: jest.fn(),
        register: jest.fn(),
        sendUsernameReminder: jest.fn(),
      });
      const { container } = renderCard();
      expect(container.firstChild).toBeNull();
    });

    it("renders for the profile owner", () => {
      renderCard();
      expect(screen.getByText(/logo & banner/i)).toBeInTheDocument();
    });
  });

  describe("empty state placeholders", () => {
    it("shows upload banner placeholder when no banner", () => {
      renderCard();
      expect(screen.getByText("Upload banner")).toBeInTheDocument();
    });

    it("shows org initials in logo placeholder when no logo", () => {
      renderCard();
      // EIN "12-3456789" -> digits "123456789" -> first 2 = "12"
      expect(screen.getByText("12")).toBeInTheDocument();
    });
  });

  describe("images display", () => {
    it("shows banner image when bannerImageUrl is set", () => {
      renderCard({ bannerImageUrl: "https://example.com/banner.jpg" });
      const img = screen.getByAltText("Organization banner");
      expect(img).toHaveAttribute("src", "https://example.com/banner.jpg");
    });

    it("shows logo image when logoUrl is set", () => {
      renderCard({ logoUrl: "https://example.com/logo.png" });
      const img = screen.getByAltText("Organization logo");
      expect(img).toHaveAttribute("src", "https://example.com/logo.png");
    });

    it("shows remove button when banner is set", () => {
      renderCard({ bannerImageUrl: "https://example.com/banner.jpg" });
      expect(screen.getByLabelText("Remove banner")).toBeInTheDocument();
    });

    it("shows remove button when logo is set", () => {
      renderCard({ logoUrl: "https://example.com/logo.png" });
      expect(screen.getByLabelText("Remove logo")).toBeInTheDocument();
    });
  });

  describe("file upload", () => {
    const makeFile = (name: string, type: string, size = 1024) => {
      const file = new File(["x".repeat(size)], name, { type });
      return file;
    };

    it("rejects unsupported file type for logo", async () => {
      renderCard();
      // Find the hidden logo input
      const inputs = document.querySelectorAll('input[type="file"]');
      const logoInput = inputs[1]; // logo is second
      fireEvent.change(logoInput, {
        target: { files: [makeFile("logo.gif", "image/gif")] },
      });
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          "error",
          "Invalid file type",
          expect.any(String),
        );
      });
    });

    it("rejects files over 5 MB for banner", async () => {
      renderCard();
      const inputs = document.querySelectorAll('input[type="file"]');
      const bannerInput = inputs[0]; // banner is first
      fireEvent.change(bannerInput, {
        target: {
          files: [makeFile("banner.png", "image/png", 6 * 1024 * 1024)],
        },
      });
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          "error",
          "File too large",
          expect.any(String),
        );
      });
    });

    it("uploads logo and calls onLogoUploaded on success", async () => {
      mockSupabase.storage.from = jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({
          data: { path: "12-3456789/logo.png" },
          error: null,
        }),
        getPublicUrl: jest.fn(() => ({
          data: { publicUrl: "https://mock-url.com/logo.png" },
        })),
        remove: jest.fn().mockResolvedValue({ data: null, error: null }),
        download: jest.fn().mockResolvedValue({ data: null, error: null }),
      }));
      const onLogoUploaded = jest.fn();
      renderCard({ onLogoUploaded });
      const inputs = document.querySelectorAll('input[type="file"]');
      const logoInput = inputs[1];
      fireEvent.change(logoInput, {
        target: { files: [makeFile("logo.png", "image/png")] },
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith("success", "Logo uploaded");
      });
      expect(onLogoUploaded).toHaveBeenCalledWith(
        "https://mock-url.com/logo.png",
      );
    });

    it("uploads banner and calls onBannerUploaded on success", async () => {
      mockSupabase.storage.from = jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({
          data: { path: "12-3456789/banner.webp" },
          error: null,
        }),
        getPublicUrl: jest.fn(() => ({
          data: { publicUrl: "https://mock-url.com/banner.webp" },
        })),
        remove: jest.fn().mockResolvedValue({ data: null, error: null }),
        download: jest.fn().mockResolvedValue({ data: null, error: null }),
      }));
      const onBannerUploaded = jest.fn();
      renderCard({ onBannerUploaded });
      const inputs = document.querySelectorAll('input[type="file"]');
      const bannerInput = inputs[0];
      fireEvent.change(bannerInput, {
        target: { files: [makeFile("banner.webp", "image/webp")] },
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          "success",
          "Banner uploaded",
        );
      });
      expect(onBannerUploaded).toHaveBeenCalledWith(
        "https://mock-url.com/banner.webp",
      );
    });

    it("shows error toast when storage upload fails", async () => {
      mockSupabase.storage.from = jest.fn(() => ({
        upload: jest
          .fn()
          .mockResolvedValue({ data: null, error: new Error("Upload failed") }),
        getPublicUrl: jest.fn(() => ({
          data: { publicUrl: "https://mock-url.com" },
        })),
        remove: jest.fn().mockResolvedValue({ data: null, error: null }),
        download: jest.fn().mockResolvedValue({ data: null, error: null }),
      }));

      renderCard();
      const inputs = document.querySelectorAll('input[type="file"]');
      const bannerInput = inputs[0];
      fireEvent.change(bannerInput, {
        target: { files: [makeFile("banner.jpg", "image/jpeg")] },
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          "error",
          "Upload failed",
          expect.any(String),
        );
      });
    });
  });

  describe("remove actions", () => {
    it("calls onLogoUploaded(null) and shows toast when removing logo", async () => {
      const onLogoUploaded = jest.fn();
      renderCard({ logoUrl: "https://example.com/logo.png", onLogoUploaded });
      fireEvent.click(screen.getByLabelText("Remove logo"));
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith("success", "Logo removed");
      });
      expect(onLogoUploaded).toHaveBeenCalledWith(null);
    });

    it("calls onBannerUploaded(null) and shows toast when removing banner", async () => {
      const onBannerUploaded = jest.fn();
      renderCard({
        bannerImageUrl: "https://example.com/banner.jpg",
        onBannerUploaded,
      });
      fireEvent.click(screen.getByLabelText("Remove banner"));
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith("success", "Banner removed");
      });
      expect(onBannerUploaded).toHaveBeenCalledWith(null);
    });
  });
});
