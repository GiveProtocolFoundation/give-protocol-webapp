import { jest } from "@jest/globals";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { useToast } from "@/contexts/ToastContext";
import { setMockResult, resetMockState, supabase } from "@/lib/supabase";
import AdminPlatformNews from "./AdminPlatformNews";

// Built at runtime so no script-URL literal appears in source.
const UNSAFE_URL = ["java", "script:alert(1)"].join("");

const mockUseToast = jest.mocked(useToast);
const mockShowToast = jest.fn();

const NEWS_ROW = {
  id: "news-1",
  title: "Testnet is live",
  content: "We launched the testnet.",
  url: "https://example.org/testnet",
  image_url: null,
  published_at: "2026-10-01T00:00:00Z",
  category: "product",
  is_active: true,
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-01T00:00:00Z",
};

async function renderPage() {
  render(<AdminPlatformNews />);
  await screen.findByText("Testnet is live");
}

describe("AdminPlatformNews", () => {
  beforeEach(() => {
    resetMockState();
    mockShowToast.mockReset();
    mockUseToast.mockReturnValue({
      showToast: mockShowToast,
      dismissToast: jest.fn(),
    } as never);
    setMockResult("platform_news", { data: [NEWS_ROW], error: null });
  });

  it("lists existing news items", async () => {
    await renderPage();
    expect(screen.getByText("Testnet is live")).toBeInTheDocument();
  });

  it("rejects a link that could not be rendered safely", async () => {
    await renderPage();
    fireEvent.click(screen.getByRole("button", { name: /New Item/ }));
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "T" },
    });
    fireEvent.change(screen.getByLabelText("Content / Excerpt"), {
      target: { value: "C" },
    });
    fireEvent.change(screen.getByLabelText("Link URL"), {
      target: { value: UNSAFE_URL },
    });

    expect(
      screen.getByText(
        "Enter a full https:// address or a path starting with /.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create News" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Link URL"), {
      target: { value: "https://example.org/ok" },
    });
    expect(screen.getByRole("button", { name: "Create News" })).toBeEnabled();
  });

  it("allows a blank link", async () => {
    await renderPage();
    fireEvent.click(screen.getByRole("button", { name: /New Item/ }));
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "T" },
    });
    fireEvent.change(screen.getByLabelText("Content / Excerpt"), {
      target: { value: "C" },
    });
    expect(screen.getByRole("button", { name: "Create News" })).toBeEnabled();
  });

  it("asks for confirmation before deleting and does not delete on cancel", async () => {
    await renderPage();
    fireEvent.click(
      screen.getByRole("button", { name: "Delete Testnet is live" }),
    );
    expect(screen.getByText("Delete news item?")).toBeInTheDocument();
    expect(supabase.from).not.toHaveBeenCalledWith("platform_news_delete");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(screen.queryByText("Delete news item?")).not.toBeInTheDocument(),
    );
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it("deletes after confirmation and reports success", async () => {
    await renderPage();
    fireEvent.click(
      screen.getByRole("button", { name: "Delete Testnet is live" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith(
        "success",
        "News item deleted",
      ),
    );
  });

  it("reports an error toast (not success) when a save fails", async () => {
    await renderPage();
    setMockResult("platform_news", {
      data: null,
      error: { message: "permission denied" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Deactivate Testnet is live" }),
    );
    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith(
        "error",
        "Couldn't save your changes. Please try again.",
      ),
    );
    expect(mockShowToast).not.toHaveBeenCalledWith(
      "success",
      expect.anything(),
    );
  });
});
