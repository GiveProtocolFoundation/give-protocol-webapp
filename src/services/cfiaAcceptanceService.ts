import { supabase } from "@/lib/supabase";
import type {
  CfiaAcceptance,
  RecordCfiaAcceptanceParams,
} from "@/types/cfiaAcceptance";
import { Logger } from "@/utils/logger";

/**
 * Records a CFIA acceptance via the record_cfia_acceptance RPC.
 * The RPC captures server-side timestamp, IP, and user-agent automatically.
 * @param params - The acceptance parameters including signer info and signature
 * @returns The created acceptance record, or null on error
 */
export async function recordCfiaAcceptance(
  params: RecordCfiaAcceptanceParams,
): Promise<CfiaAcceptance | null> {
  try {
    const { data, error } = await supabase.rpc("record_cfia_acceptance", {
      p_charity_profile_id: params.charityProfileId,
      p_legal_text_version: params.legalTextVersion,
      p_legal_text_hash: params.legalTextHash ?? null,
      p_signer_name: params.signerName,
      p_signer_title: params.signerTitle,
      p_signer_email: params.signerEmail,
      p_signature_data: params.signatureData,
    });

    if (error) {
      Logger.error("Error recording CFIA acceptance", {
        error,
        charityProfileId: params.charityProfileId,
      });
      return null;
    }

    const rows = (data || []) as CfiaAcceptance[];
    return rows[0] || null;
  } catch (error) {
    Logger.error("CFIA acceptance recording failed", {
      error: error instanceof Error ? error.message : String(error),
      charityProfileId: params.charityProfileId,
    });
    return null;
  }
}

/**
 * Fetches the latest CFIA acceptance for a charity, optionally filtered by version.
 * @param charityProfileId - The charity profile UUID
 * @param legalTextVersion - Optional version filter; omit for latest of any version
 * @returns The acceptance record, or null if none exists
 */
export async function getCfiaAcceptance(
  charityProfileId: string,
  legalTextVersion?: string,
): Promise<CfiaAcceptance | null> {
  try {
    const { data, error } = await supabase.rpc("get_cfia_acceptance", {
      p_charity_profile_id: charityProfileId,
      p_legal_text_version: legalTextVersion ?? null,
    });

    if (error) {
      Logger.error("Error fetching CFIA acceptance", {
        error,
        charityProfileId,
        legalTextVersion,
      });
      return null;
    }

    const rows = (data || []) as CfiaAcceptance[];
    return rows[0] || null;
  } catch (error) {
    Logger.error("CFIA acceptance fetch failed", {
      error: error instanceof Error ? error.message : String(error),
      charityProfileId,
    });
    return null;
  }
}

/**
 * Checks whether a charity has accepted the specified CFIA version.
 * Convenience wrapper around getCfiaAcceptance for boolean checks.
 * @param charityProfileId - The charity profile UUID
 * @param legalTextVersion - The version to check
 * @returns true if the charity has accepted that version
 */
export async function hasCfiaAcceptance(
  charityProfileId: string,
  legalTextVersion: string,
): Promise<boolean> {
  const acceptance = await getCfiaAcceptance(
    charityProfileId,
    legalTextVersion,
  );
  return acceptance !== null;
}
