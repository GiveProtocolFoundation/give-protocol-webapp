/**
 * Wallet tier classification for charity receiving wallets.
 * - `safe`: Gnosis Safe multisig (recommended default)
 * - `institutional`: Qualified custodian (Fireblocks, Anchorage, etc.)
 * - `eoa`: Single-signer externally owned account (discouraged)
 */
export type CharityWalletType = "eoa" | "safe" | "institutional";

/**
 * Charity wallet onboarding lifecycle.
 * - `pending`: collected, awaiting confirmation
 * - `test_transaction_sent`: a test transaction has been dispatched
 * - `test_transaction_confirmed`: the test transaction was confirmed on-chain
 * - `official`: established for ongoing donation transactions
 */
export type WalletOnboardingStatus =
  | "pending"
  | "test_transaction_sent"
  | "test_transaction_confirmed"
  | "official";

/**
 * A charity's registered receiving wallet record from the `charity_wallets` table.
 * Stores wallet-type-specific metadata (Safe signer config, custodian details,
 * EOA risk acknowledgment) alongside the wallet address and chain.
 */
export interface CharityWallet {
  /** Primary key (UUID). */
  id: string;
  /** FK to charity_profiles.id. */
  charity_profile_id: string;
  /** On-chain wallet address. */
  wallet_address: string;
  /** EVM chain ID (e.g. 8453 for Base mainnet). */
  chain_id: number;
  /** Wallet tier classification. */
  wallet_type: CharityWalletType;
  /** Number of signers on a Safe multisig. Required when wallet_type='safe'. */
  signer_count: number | null;
  /** Approval threshold for Safe multisig. Required when wallet_type='safe'. */
  signer_threshold: number | null;
  /** Custodian name for institutional wallets. Required when wallet_type='institutional'. */
  custodian_name: string | null;
  /** URL to the custodian attestation document. Required when wallet_type='institutional'. */
  custodian_attestation_doc_url: string | null;
  /** EIP-191 or EIP-1271 signature proving wallet control. */
  proof_of_control_signature: string | null;
  /** Message that was signed for proof of control. */
  proof_of_control_message: string | null;
  /** Timestamp when proof of control was verified. */
  proof_of_control_verified_at: string | null;
  /** Timestamp when EOA risk was acknowledged. Required when wallet_type='eoa'. */
  risk_acknowledgment_at: string | null;
  /** User who acknowledged EOA risk. Required when wallet_type='eoa'. */
  risk_acknowledgment_user_id: string | null;
  /** Whether this is the primary receiving wallet for its charity+chain. */
  is_primary: boolean;
  /** Onboarding lifecycle status (pending → test transaction → official). */
  onboarding_status: WalletOnboardingStatus;
  /** On-chain tx hash of the test transaction confirming wallet control. */
  test_transaction_hash: string | null;
  /** Test-transaction amount as a decimal string (avoids float precision). */
  test_transaction_amount: string | null;
  /** Token contract address used for the test transaction. */
  test_transaction_token_address: string | null;
  /** Timestamp when the test transaction was confirmed on-chain. */
  test_transaction_confirmed_at: string | null;
  /** Row creation timestamp. */
  created_at: string;
  /** Row last-updated timestamp. */
  updated_at: string;
}
