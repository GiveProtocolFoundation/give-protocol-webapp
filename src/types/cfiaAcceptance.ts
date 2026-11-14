/**
 * CFIA (Charitable Fundraising Industry Agreement) acceptance types.
 *
 * The legal text itself is finalized in a separate legal-drafting session.
 * These types model the acceptance record and the signature-capture flow.
 */

/** A recorded CFIA acceptance as stored in the database. */
export interface CfiaAcceptance {
  id: string;
  charity_profile_id: string;
  user_id: string;
  legal_text_version: string;
  legal_text_hash: string | null;
  signer_name: string;
  signer_title: string;
  signer_email: string;
  signature_data: string;
  ip_address: string | null;
  user_agent: string | null;
  accepted_at: string;
}

/** Parameters required to record a new CFIA acceptance. */
export interface RecordCfiaAcceptanceParams {
  charityProfileId: string;
  legalTextVersion: string;
  legalTextHash?: string | null;
  signerName: string;
  signerTitle: string;
  signerEmail: string;
  signatureData: string;
}

/** UI-facing state machine for the CFIA acceptance flow. */
export type CfiaAcceptanceFlowState =
  | "loading"
  | "not_available"
  | "pending"
  | "reviewing"
  | "signing"
  | "submitting"
  | "accepted"
  | "error";
