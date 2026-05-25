import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useSettings } from "@/contexts/SettingsContext";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { SettingsMenu } from "../SettingsMenu";

// useSettings, useCurrencyContext, and useTranslation are all mocked via
// moduleNameMapper (ESM-compatible).

const mockUseSettings = jest.mocked(useSettings);
const mockUseCurrencyContext = jest.mocked(useCurrencyContext);

interface MockSettingsReturnValue {
  language: string;
  setLanguage: jest.Mock;
  currency: string;
  setCurrency: jest.Mock;
  theme: string;
  setTheme: jest.Mock;
  languageOptions: Array<{ value: string; label: string }>;
  currencyOptions: Array<{ value: string; label: string; symbol: string }>;
}

const createSettingsMock = (
  overrides: Partial<MockSettingsReturnValue> = {},
): MockSettingsReturnValue => ({
  language: "en",
  setLanguage: jest.fn(),
  currency: "USD",
  setCurrency: jest.fn(),
  theme: "light",
  setTheme: jest.fn(),
  languageOptions: [
    { value: "en", label: "English" },
    { value: "es", label: "Espanol" },
  ],
  currencyOptions: [
    { value: "USD", label: "US Dollar", symbol: "$" },
    { value: "EUR", label: "Euro", symbol: "\u20AC" },
  ],
  ...overrides,
});

interface MockCurrencyReturnValue {
  selectedCurrency: string;
  setSelectedCurrency: jest.Mock;
  exchangeRates: Record<string, number>;
  isLoading: boolean;
}

const createCurrencyMock = (
  overrides: Partial<MockCurrencyReturnValue> = {},
): MockCurrencyReturnValue => ({
  selectedCurrency: "USD",
  setSelectedCurrency: jest.fn(),
  exchangeRates: {},
  isLoading: false,
  ...overrides,
});

const renderSettingsMenu = () =>
  render(
    <MemoryRouter>
      <SettingsMenu />
    </MemoryRouter>,
  );

describe("SettingsMenu", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSettings.mockReturnValue(createSettingsMock());
    mockUseCurrencyContext.mockReturnValue(createCurrencyMock());
  });

  describe("Menu trigger", () => {
    it("renders the settings button", () => {
      renderSettingsMenu();
      const button = screen.getByRole("button", { name: "Settings" });
      expect(button).toBeInTheDocument();
    });

    it("has aria-expanded set to false when menu is closed", () => {
      renderSettingsMenu();
      const button = screen.getByRole("button", { name: "Settings" });
      expect(button).toHaveAttribute("aria-expanded", "false");
    });

    it("has aria-haspopup set to true", () => {
      renderSettingsMenu();
      const button = screen.getByRole("button", { name: "Settings" });
      expect(button).toHaveAttribute("aria-haspopup", "true");
    });
  });

  describe("Opening the menu", () => {
    it("shows the settings title when menu is opened", () => {
      renderSettingsMenu();
      fireEvent.click(screen.getByRole("button", { name: "Settings" }));
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    it("sets aria-expanded to true when menu is open", () => {
      renderSettingsMenu();
      const button = screen.getByRole("button", { name: "Settings" });
      fireEvent.click(button);
      expect(button).toHaveAttribute("aria-expanded", "true");
    });

    it("does not show the dropdown when menu is closed", () => {
      renderSettingsMenu();
      expect(screen.queryByText("Settings")).not.toBeInTheDocument();
    });
  });

  describe("Theme section", () => {
    it("renders Light and Dark theme options", () => {
      renderSettingsMenu();
      fireEvent.click(screen.getByRole("button", { name: "Settings" }));
      expect(screen.getByText("Light")).toBeInTheDocument();
      expect(screen.getByText("Dark")).toBeInTheDocument();
    });

    it("renders the theme section title", () => {
      renderSettingsMenu();
      fireEvent.click(screen.getByRole("button", { name: "Settings" }));
      expect(screen.getByText("Theme")).toBeInTheDocument();
    });

    it("calls setTheme when a theme option is clicked", () => {
      const mockSetTheme = jest.fn();
      mockUseSettings.mockReturnValue(
        createSettingsMock({ setTheme: mockSetTheme }),
      );
      renderSettingsMenu();
      fireEvent.click(screen.getByRole("button", { name: "Settings" }));

      const darkButton = screen.getByText("Dark").closest("button");
      expect(darkButton).not.toBeNull();
      fireEvent.click(darkButton as HTMLButtonElement);

      expect(mockSetTheme).toHaveBeenCalledWith("dark");
    });

    it("shows the Sun icon section header when theme is light", () => {
      renderSettingsMenu();
      fireEvent.click(screen.getByRole("button", { name: "Settings" }));
      expect(screen.getByText("Theme")).toBeInTheDocument();
    });

    it("shows the Moon icon section header when theme is dark", () => {
      mockUseSettings.mockReturnValue(createSettingsMock({ theme: "dark" }));
      renderSettingsMenu();
      fireEvent.click(screen.getByRole("button", { name: "Settings" }));
      expect(screen.getByText("Theme")).toBeInTheDocument();
    });
  });

  describe("Language section", () => {
    it("renders the language section title", () => {
      renderSettingsMenu();
      fireEvent.click(screen.getByRole("button", { name: "Settings" }));
      expect(screen.getByText("Language")).toBeInTheDocument();
    });

    it("renders all language options", () => {
      renderSettingsMenu();
      fireEvent.click(screen.getByRole("button", { name: "Settings" }));
      expect(screen.getByText("English")).toBeInTheDocument();
      expect(screen.getByText("Espanol")).toBeInTheDocument();
    });

    it("calls setLanguage when a language option is clicked", () => {
      const mockSetLanguage = jest.fn();
      mockUseSettings.mockReturnValue(
        createSettingsMock({ setLanguage: mockSetLanguage }),
      );
      renderSettingsMenu();
      fireEvent.click(screen.getByRole("button", { name: "Settings" }));

      const spanishButton = screen.getByText("Espanol").closest("button");
      expect(spanishButton).not.toBeNull();
      fireEvent.click(spanishButton as HTMLButtonElement);

      expect(mockSetLanguage).toHaveBeenCalledWith("es");
    });
  });

  describe("Currency section", () => {
    it("renders the currency section title", () => {
      renderSettingsMenu();
      fireEvent.click(screen.getByRole("button", { name: "Settings" }));
      expect(screen.getByText("Currency")).toBeInTheDocument();
    });

    it("renders all currency options with symbols", () => {
      renderSettingsMenu();
      fireEvent.click(screen.getByRole("button", { name: "Settings" }));
      expect(screen.getByText("$ USD")).toBeInTheDocument();
      expect(screen.getByText("\u20AC EUR")).toBeInTheDocument();
    });

    it("calls setCurrency when a currency option is clicked", () => {
      const mockSetCurrency = jest.fn();
      const mockSetSelectedCurrency = jest.fn();
      mockUseSettings.mockReturnValue(
        createSettingsMock({ setCurrency: mockSetCurrency }),
      );
      mockUseCurrencyContext.mockReturnValue(
        createCurrencyMock({ setSelectedCurrency: mockSetSelectedCurrency }),
      );
      renderSettingsMenu();
      fireEvent.click(screen.getByRole("button", { name: "Settings" }));

      const eurButton = screen.getByText("\u20AC EUR").closest("button");
      expect(eurButton).not.toBeNull();
      fireEvent.click(eurButton as HTMLButtonElement);

      expect(mockSetCurrency).toHaveBeenCalledWith("EUR");
    });
  });

  describe("Closing the menu", () => {
    it("closes the menu when the toggle button is clicked again", () => {
      renderSettingsMenu();
      const button = screen.getByRole("button", { name: "Settings" });

      fireEvent.click(button);
      expect(screen.getByText("Settings")).toBeInTheDocument();

      fireEvent.click(button);
      expect(screen.queryByText("Settings")).not.toBeInTheDocument();
    });

    it("closes the menu when clicking outside", () => {
      renderSettingsMenu();
      fireEvent.click(screen.getByRole("button", { name: "Settings" }));
      expect(screen.getByText("Settings")).toBeInTheDocument();

      fireEvent.mouseDown(document.body);
      expect(screen.queryByText("Settings")).not.toBeInTheDocument();
    });

    it("closes the menu when pressing Escape", () => {
      renderSettingsMenu();
      fireEvent.click(screen.getByRole("button", { name: "Settings" }));
      expect(screen.getByText("Settings")).toBeInTheDocument();

      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.queryByText("Settings")).not.toBeInTheDocument();
    });
  });

  describe("Selected state", () => {
    it("highlights the currently selected language", () => {
      mockUseSettings.mockReturnValue(createSettingsMock({ language: "es" }));
      renderSettingsMenu();
      fireEvent.click(screen.getByRole("button", { name: "Settings" }));

      const spanishButton = screen.getByText("Espanol").closest("button");
      expect(spanishButton).toHaveClass("bg-emerald-50");
    });

    it("highlights the currently selected theme", () => {
      mockUseSettings.mockReturnValue(createSettingsMock({ theme: "light" }));
      renderSettingsMenu();
      fireEvent.click(screen.getByRole("button", { name: "Settings" }));

      const lightButton = screen.getByText("Light").closest("button");
      expect(lightButton).toHaveClass("bg-emerald-50");
    });

    it("highlights the currently selected currency", () => {
      mockUseSettings.mockReturnValue(createSettingsMock({ currency: "EUR" }));
      renderSettingsMenu();
      fireEvent.click(screen.getByRole("button", { name: "Settings" }));

      const eurButton = screen.getByText("\u20AC EUR").closest("button");
      expect(eurButton).toHaveClass("bg-emerald-50");
    });
  });
});
