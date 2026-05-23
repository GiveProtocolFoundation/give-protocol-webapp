/** Claim and verification lifecycle state of a charity profile. */
export type CharityProfileStatus = "unclaimed" | "claimed-pending" | "verified";

/** Type of wallet assigned to a charity (platform-managed custodial or existing EVM). */
export type WalletType = "new_custodial" | "existing_evm";

export type WalletDesignationStatus =
  | "unset"
  | "pending_signature_verification"
  | "pending_email_confirmation"
  | "active"
  | "pending_change_cooldown";

export type PaymentProcessor = "helcim" | "paypal";

/** Full charity profile record as stored in the database. */
export interface CharityProfile {
  id: string;
  ein: string;
  name: string;
  mission: string | null;
  location: string | null;
  website: string | null;
  logo_url: string | null;
  photo_urls: string[];
  ntee_code: string | null;
  founded: string | null;
  irs_status: string | null;
  employees: number | null;
  status: CharityProfileStatus;
  nominations_count: number;
  interested_donors_count: number;
  authorized_signer_name: string | null;
  authorized_signer_title: string | null;
  authorized_signer_email: string | null;
  authorized_signer_phone: string | null;
  claimed_by: string | null;
  wallet_address: string | null;
  wallet_type: WalletType | null;
  wallet_designation_status?: WalletDesignationStatus;
  payment_processor: PaymentProcessor | null;
  claimed_at: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  banner_image_url: string | null | undefined;
  photo_1_url: string | null | undefined;
  photo_2_url: string | null | undefined;
  description: string | null | undefined;
  mission_statement: string | null | undefined;
  contact_email: string | null | undefined;
  claimed_by_user_id: string | null | undefined;
}

/** A nomination submitted by a donor for a charity to join the platform. */
export interface CharityNomination {
  id: string;
  charity_id: string;
  nominator_email: string | null;
  created_at: string;
}
