import {
  recordCfiaAcceptance,
  getCfiaAcceptance,
  hasCfiaAcceptance,
} from "./cfiaAcceptanceService";
import { supabase } from "@/lib/supabase";

jest.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: jest.fn(),
  },
}));

jest.mock("@/utils/logger", () => ({
  Logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

const mockRpc = supabase.rpc as jest.Mock;

const SAMPLE_ACCEPTANCE = {
  id: "acc-1",
  charity_profile_id: "cp-1",
  user_id: "u-1",
  legal_text_version: "cfia-v1.0",
  legal_text_hash: "sha256abc",
  signer_name: "Jane Smith",
  signer_title: "Executive Director",
  signer_email: "jane@example.org",
  signature_data: "data:image/png;base64,abc",
  ip_address: "1.2.3.4",
  user_agent: "test-agent",
  accepted_at: "2026-10-31T00:00:00Z",
};

describe("recordCfiaAcceptance", () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it("should call the RPC with mapped parameters", async () => {
    mockRpc.mockResolvedValue({ data: [SAMPLE_ACCEPTANCE], error: null });

    const result = await recordCfiaAcceptance({
      charityProfileId: "cp-1",
      legalTextVersion: "cfia-v1.0",
      legalTextHash: "sha256abc",
      signerName: "Jane Smith",
      signerTitle: "Executive Director",
      signerEmail: "jane@example.org",
      signatureData: "data:image/png;base64,abc",
    });

    expect(mockRpc).toHaveBeenCalledWith("record_cfia_acceptance", {
      p_charity_profile_id: "cp-1",
      p_legal_text_version: "cfia-v1.0",
      p_legal_text_hash: "sha256abc",
      p_signer_name: "Jane Smith",
      p_signer_title: "Executive Director",
      p_signer_email: "jane@example.org",
      p_signature_data: "data:image/png;base64,abc",
    });
    expect(result).toEqual(SAMPLE_ACCEPTANCE);
  });

  it("should return null on RPC error", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "RPC failed" },
    });

    const result = await recordCfiaAcceptance({
      charityProfileId: "cp-1",
      legalTextVersion: "cfia-v1.0",
      signerName: "Jane",
      signerTitle: "Director",
      signerEmail: "jane@example.org",
      signatureData: "data:image/png;base64,abc",
    });

    expect(result).toBeNull();
  });

  it("should return null when data array is empty (duplicate version)", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    const result = await recordCfiaAcceptance({
      charityProfileId: "cp-1",
      legalTextVersion: "cfia-v1.0",
      signerName: "Jane",
      signerTitle: "Director",
      signerEmail: "jane@example.org",
      signatureData: "data:image/png;base64,abc",
    });

    expect(result).toBeNull();
  });

  it("should default legalTextHash to null when omitted", async () => {
    mockRpc.mockResolvedValue({ data: [SAMPLE_ACCEPTANCE], error: null });

    await recordCfiaAcceptance({
      charityProfileId: "cp-1",
      legalTextVersion: "cfia-v1.0",
      signerName: "Jane",
      signerTitle: "Director",
      signerEmail: "jane@example.org",
      signatureData: "data:image/png;base64,abc",
    });

    expect(mockRpc).toHaveBeenCalledWith(
      "record_cfia_acceptance",
      expect.objectContaining({ p_legal_text_hash: null }),
    );
  });

  it("should return null on thrown exception", async () => {
    mockRpc.mockRejectedValue(new Error("network error"));

    const result = await recordCfiaAcceptance({
      charityProfileId: "cp-1",
      legalTextVersion: "cfia-v1.0",
      signerName: "Jane",
      signerTitle: "Director",
      signerEmail: "jane@example.org",
      signatureData: "data:image/png;base64,abc",
    });

    expect(result).toBeNull();
  });
});

describe("getCfiaAcceptance", () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it("should fetch acceptance by charity and version", async () => {
    mockRpc.mockResolvedValue({ data: [SAMPLE_ACCEPTANCE], error: null });

    const result = await getCfiaAcceptance("cp-1", "cfia-v1.0");

    expect(mockRpc).toHaveBeenCalledWith("get_cfia_acceptance", {
      p_charity_profile_id: "cp-1",
      p_legal_text_version: "cfia-v1.0",
    });
    expect(result).toEqual(SAMPLE_ACCEPTANCE);
  });

  it("should pass null version when omitted for latest", async () => {
    mockRpc.mockResolvedValue({ data: [SAMPLE_ACCEPTANCE], error: null });

    await getCfiaAcceptance("cp-1");

    expect(mockRpc).toHaveBeenCalledWith("get_cfia_acceptance", {
      p_charity_profile_id: "cp-1",
      p_legal_text_version: null,
    });
  });

  it("should return null when no acceptance exists", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    const result = await getCfiaAcceptance("cp-1", "cfia-v1.0");

    expect(result).toBeNull();
  });

  it("should return null on RPC error", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "not found" },
    });

    const result = await getCfiaAcceptance("cp-1", "cfia-v1.0");

    expect(result).toBeNull();
  });
});

describe("hasCfiaAcceptance", () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it("should return true when acceptance exists", async () => {
    mockRpc.mockResolvedValue({ data: [SAMPLE_ACCEPTANCE], error: null });

    const result = await hasCfiaAcceptance("cp-1", "cfia-v1.0");

    expect(result).toBe(true);
  });

  it("should return false when no acceptance exists", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    const result = await hasCfiaAcceptance("cp-1", "cfia-v1.0");

    expect(result).toBe(false);
  });
});
