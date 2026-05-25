import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useWeb3 } from "@/contexts/Web3Context";
import Register from "../Register";

const mockUseWeb3 = jest.mocked(useWeb3);

const renderRegister = (initialEntries: string[] = ["/auth/signup"]) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <Register />
    </MemoryRouter>,
  );

describe("Register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWeb3.mockReturnValue({
      provider: null,
      signer: null,
      address: null,
      chainId: 1287,
      isConnected: false,
      isConnecting: false,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      switchChain: jest.fn(),
    });
  });

  describe("Page layout", () => {
    it("renders the registration page with heading", () => {
      renderRegister();
      expect(screen.getByText("Create your account")).toBeInTheDocument();
    });

    it("renders the left panel with branding text", () => {
      renderRegister();
      expect(screen.getByText(/Smart giving/)).toBeInTheDocument();
      expect(screen.getByText("transparent")).toBeInTheDocument();
    });

    it("renders protocol status banner", () => {
      renderRegister();
      expect(screen.getByText(/Protocol Status/)).toBeInTheDocument();
    });

    it("renders Runs On trust tags", () => {
      renderRegister();
      expect(screen.getByText("Moonbeam")).toBeInTheDocument();
      expect(screen.getByText("Base")).toBeInTheDocument();
      expect(screen.getByText("Optimism")).toBeInTheDocument();
    });
  });

  describe("Sign-in link", () => {
    it("renders Already have an account text with sign-in link", () => {
      renderRegister();
      const signInLink = screen.getByText("Sign in");
      expect(signInLink).toBeInTheDocument();
      expect(signInLink.closest("a")).toHaveAttribute("href", "/auth");
    });
  });

  describe("Role toggle", () => {
    it("renders Donor and Charity toggle buttons", () => {
      renderRegister();
      expect(screen.getByText("Donor")).toBeInTheDocument();
      expect(screen.getByText("Charity")).toBeInTheDocument();
    });

    it("selects Donor by default", () => {
      renderRegister();
      const donorRadio = screen.getByRole("radio", { name: /Donor/i });
      expect(donorRadio).toHaveAttribute("aria-checked", "true");
    });

    it("selects Charity by default when type=charity in URL", () => {
      renderRegister(["/auth/signup?type=charity"]);
      const charityRadio = screen.getByRole("radio", { name: /Charity/i });
      expect(charityRadio).toHaveAttribute("aria-checked", "true");
    });

    it("switches to Charity when Charity toggle is clicked", () => {
      renderRegister();
      fireEvent.click(screen.getByText("Charity"));
      const charityRadio = screen.getByRole("radio", { name: /Charity/i });
      expect(charityRadio).toHaveAttribute("aria-checked", "true");
    });

    it("switches back to Donor when Donor toggle is clicked", () => {
      renderRegister();
      fireEvent.click(screen.getByText("Charity"));
      fireEvent.click(screen.getByText("Donor"));
      const donorRadio = screen.getByRole("radio", { name: /Donor/i });
      expect(donorRadio).toHaveAttribute("aria-checked", "true");
    });

    it("renders radiogroup with Account type label", () => {
      renderRegister();
      expect(
        screen.getByRole("radiogroup", { name: "Account type" }),
      ).toBeInTheDocument();
    });
  });

  describe("Donor registration", () => {
    it("renders DonorRegistration form when Donor is selected", () => {
      renderRegister();
      expect(screen.getByTestId("donor-registration")).toBeInTheDocument();
    });

    it("shows wallet disconnected notice when wallet is not connected", () => {
      renderRegister();
      expect(
        screen.getByText(
          "You can connect a wallet from your dashboard after signup.",
        ),
      ).toBeInTheDocument();
    });

    it("shows wallet link toggle when wallet is connected", () => {
      mockUseWeb3.mockReturnValue({
        provider: null,
        signer: null,
        address: "0x1234567890123456789012345678901234567890",
        chainId: 1287,
        isConnected: true,
        isConnecting: false,
        error: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        switchChain: jest.fn(),
      });
      renderRegister();
      expect(
        screen.getByRole("switch", { name: /Link wallet/i }),
      ).toBeInTheDocument();
    });

    it("toggles wallet link switch when clicked", () => {
      mockUseWeb3.mockReturnValue({
        provider: null,
        signer: null,
        address: "0x1234567890123456789012345678901234567890",
        chainId: 1287,
        isConnected: true,
        isConnecting: false,
        error: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        switchChain: jest.fn(),
      });
      renderRegister();
      const toggle = screen.getByRole("switch");
      expect(toggle).toHaveAttribute("aria-checked", "true");

      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute("aria-checked", "false");

      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute("aria-checked", "true");
    });

    it("shows wallet detected notice on left panel when connected", () => {
      mockUseWeb3.mockReturnValue({
        provider: null,
        signer: null,
        address: "0x1234567890123456789012345678901234567890",
        chainId: 1287,
        isConnected: true,
        isConnecting: false,
        error: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        switchChain: jest.fn(),
      });
      renderRegister();
      expect(screen.getByText(/Wallet detected/)).toBeInTheDocument();
    });
  });

  describe("Charity registration", () => {
    it("renders CharityOrganizationSearch when Charity is selected", () => {
      renderRegister();
      fireEvent.click(screen.getByText("Charity"));
      expect(
        screen.getByTestId("charity-organization-search"),
      ).toBeInTheDocument();
    });

    it("shows Find Your Organization heading for search step", () => {
      renderRegister();
      fireEvent.click(screen.getByText("Charity"));
      expect(screen.getByText("Find Your Organization")).toBeInTheDocument();
    });

    it("shows charity wallet setup notice", () => {
      renderRegister();
      fireEvent.click(screen.getByText("Charity"));
      expect(screen.getByText("Organization wallet setup")).toBeInTheDocument();
    });

    it("shows CharityVettingForm when Skip search is clicked", () => {
      renderRegister();
      fireEvent.click(screen.getByText("Charity"));
      fireEvent.click(screen.getByText("Skip search"));
      expect(screen.getByTestId("charity-vetting-form")).toBeInTheDocument();
    });

    it("shows Register Charity Organization heading for manual form", () => {
      renderRegister();
      fireEvent.click(screen.getByText("Charity"));
      fireEvent.click(screen.getByText("Skip search"));
      expect(
        screen.getByText("Register Charity Organization"),
      ).toBeInTheDocument();
    });

    it("hides DonorRegistration when Charity is selected", () => {
      renderRegister();
      fireEvent.click(screen.getByText("Charity"));
      expect(
        screen.queryByTestId("donor-registration"),
      ).not.toBeInTheDocument();
    });

    it("resets to search step when switching back from Charity to Donor", () => {
      renderRegister();
      fireEvent.click(screen.getByText("Charity"));
      fireEvent.click(screen.getByText("Skip search"));
      expect(screen.getByTestId("charity-vetting-form")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Donor"));
      expect(screen.getByTestId("donor-registration")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Charity"));
      expect(
        screen.getByTestId("charity-organization-search"),
      ).toBeInTheDocument();
    });
  });

  describe("Trust signal", () => {
    it("renders SSL encryption and terms text", () => {
      renderRegister();
      expect(screen.getByText(/256-bit SSL encrypted/)).toBeInTheDocument();
    });

    it("renders Terms link", () => {
      renderRegister();
      const termsLinks = screen.getAllByText("Terms");
      const termsLink = termsLinks.find(
        (link) => link.closest("a")?.getAttribute("href") === "/legal",
      );
      expect(termsLink).toBeDefined();
    });

    it("renders Privacy Policy link", () => {
      renderRegister();
      const privacyLink = screen.getByText("Privacy Policy");
      expect(privacyLink.closest("a")).toHaveAttribute("href", "/privacy");
    });
  });

  describe("Mobile logo", () => {
    it("renders homepage link with logo", () => {
      renderRegister();
      const homeLink = screen.getByLabelText("Go to homepage");
      expect(homeLink).toHaveAttribute("href", "/");
    });

    it("renders Give Protocol brand text", () => {
      renderRegister();
      expect(screen.getByText("Give Protocol")).toBeInTheDocument();
    });
  });
});
