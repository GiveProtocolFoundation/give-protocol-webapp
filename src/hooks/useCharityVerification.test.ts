import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { renderHook, act } from "@testing-library/react";
import { useCharityVerification } from "./useCharityVerification";
import { useToast } from "@/contexts/ToastContext";
import { resetMockState } from "@/lib/supabase";

const mockUseToast = useToast as ReturnType<typeof jest.fn>;
const mockShowToast = jest.fn();

describe("useCharityVerification", () => {
  beforeEach(() => {
    resetMockState();
    mockShowToast.mockClear();
    mockUseToast.mockImplementation(() => ({ showToast: mockShowToast }));
  });

  it("should initialize with empty documents and not uploading", () => {
    const { result } = renderHook(() => useCharityVerification());
    expect(result.current.documents).toEqual([]);
    expect(result.current.uploading).toBe(false);
  });

  it("should not fetch when no profile (default mock)", async () => {
    const { result } = renderHook(() => useCharityVerification());

    await act(async () => {
      await result.current.fetchDocuments();
    });

    expect(result.current.documents).toEqual([]);
  });

  it("should throw when uploading without profile", async () => {
    const file = new File(["content"], "tax.pdf", { type: "application/pdf" });
    Object.defineProperty(file, "size", { value: 1024 });

    const { result } = renderHook(() => useCharityVerification());

    let threw = false;
    let errorMsg = "";
    await act(async () => {
      try {
        await result.current.uploadDocument(file, "tax_certificate");
      } catch (e) {
        threw = true;
        errorMsg = (e as Error).message;
      }
    });

    expect(threw).toBe(true);
    expect(errorMsg).toBe("Profile not found");
  });

  it("should expose fetchDocuments function", () => {
    const { result } = renderHook(() => useCharityVerification());
    expect(typeof result.current.fetchDocuments).toBe("function");
  });

  it("should expose uploadDocument function", () => {
    const { result } = renderHook(() => useCharityVerification());
    expect(typeof result.current.uploadDocument).toBe("function");
  });
});
