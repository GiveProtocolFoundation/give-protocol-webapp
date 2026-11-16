import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CountrySettings } from "../CountrySettings";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";
import { useCountries } from "@/hooks/useCountries";
import {
  supabase,
  setMockResult,
  resetMockState,
} from "@/test-utils/supabaseMock";

// Card, Button, useTranslation, Logger and the Supabase client are mocked via
// moduleNameMapper; giverCountryService runs for real against the Supabase mock.

interface MockBuilder {
  update: { mock: { calls: unknown[][] } };
}

/**
 * Returns the arguments of every update() call made on the profiles table.
 * @returns Flattened list of update call argument arrays
 */
const profileUpdates = (): unknown[][] => {
  const fromMock = supabase.from as unknown as {
    mock: { calls: unknown[][]; results: { value: MockBuilder }[] };
  };
  return fromMock.mock.calls.flatMap((call, index) =>
    call[0] === "profiles"
      ? fromMock.mock.results[index].value.update.mock.calls
      : [],
  );
};

const mockUseAuth = jest.mocked(useAuth);
const mockUseToast = jest.mocked(useToast);
const mockUseCountries = jest.mocked(useCountries);
const mockShowToast = jest.fn();

describe("CountrySettings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMockState();
    (supabase.from as unknown as { mockClear: () => void }).mockClear();
    mockUseAuth.mockReturnValue({ user: { id: "user-1" } } as never);
    mockUseToast.mockReturnValue({ showToast: mockShowToast } as never);
    mockUseCountries.mockReturnValue({
      countries: [
        { code: "US", name: "United States" },
        { code: "GH", name: "Ghana" },
        { code: "JM", name: "Jamaica" },
      ],
    });
    setMockResult("profiles", { data: { country: null }, error: null });
  });

  it("renders nothing when signed out", () => {
    mockUseAuth.mockReturnValue({ user: null } as never);
    const { container } = render(<CountrySettings />);
    expect(container).toBeEmptyDOMElement();
  });

  it("explains that the country is optional and never displayed", async () => {
    render(<CountrySettings />);
    expect(screen.getByText(/never displayed/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("combobox")).toBeEnabled());
  });

  it("lists a not specified option first, then the countries by name", async () => {
    render(<CountrySettings />);
    const select = screen.getByRole("combobox", { name: "Your country" });
    await waitFor(() => expect(select).toBeEnabled());
    const labels = screen
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(labels[0]).toBe("Not specified");
    expect(labels).toEqual(
      expect.arrayContaining(["Ghana", "Jamaica", "United States"]),
    );
    expect(labels.indexOf("Ghana")).toBeLessThan(labels.indexOf("Jamaica"));
    expect(labels.indexOf("Jamaica")).toBeLessThan(
      labels.indexOf("United States"),
    );
  });

  it("stays disabled until the saved country has loaded, then shows it", async () => {
    setMockResult("profiles", { data: { country: "GH" }, error: null });
    render(<CountrySettings />);
    const select = screen.getByRole("combobox");
    expect(select).toBeDisabled();
    await waitFor(() => expect(select).toBeEnabled());
    expect(select).toHaveValue("GH");
  });

  it("keeps the control disabled and says so when the country cannot be loaded", async () => {
    setMockResult("profiles", { data: null, error: { message: "boom" } });
    render(<CountrySettings />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not load your country",
    );
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("saves the chosen country and confirms", async () => {
    render(<CountrySettings />);
    const select = screen.getByRole("combobox");
    await waitFor(() => expect(select).toBeEnabled());

    fireEvent.change(select, { target: { value: "JM" } });

    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith("success", "Country saved"),
    );
    expect(profileUpdates()).toEqual([[{ country: "JM" }]]);
    expect(select).toHaveValue("JM");
  });

  it("clears the country when not specified is chosen", async () => {
    setMockResult("profiles", { data: { country: "GH" }, error: null });
    render(<CountrySettings />);
    const select = screen.getByRole("combobox");
    await waitFor(() => expect(select).toHaveValue("GH"));

    fireEvent.change(select, { target: { value: "" } });

    await waitFor(() =>
      expect(profileUpdates()).toEqual([[{ country: null }]]),
    );
  });

  it("reverts and reports an error when saving fails", async () => {
    setMockResult("profiles", { data: { country: "GH" }, error: null });
    render(<CountrySettings />);
    const select = screen.getByRole("combobox");
    await waitFor(() => expect(select).toHaveValue("GH"));
    setMockResult("profiles", { data: null, error: { message: "boom" } });

    fireEvent.change(select, { target: { value: "JM" } });

    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith(
        "error",
        "Could not save your country",
      ),
    );
    expect(select).toHaveValue("GH");
  });
});
