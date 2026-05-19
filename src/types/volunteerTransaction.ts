/**
 * Volunteer transaction types for the blockchain
 */

export const VolunteerTransactionTypes = {
  // Volunteer solicitations (donor/volunteer accounts)
  VOLUNTEER_SOLICITATION: "Volunteer Solicitation",
  
  // Volunteer acceptance (charity accounts)
  VOLUNTEER_ACCEPTANCE: "Volunteer Acceptance",
  
  // Volunteer hour records (donor/volunteer accounts)
  VOLUNTEER_HOURS_RECORD: "Volunteer Hours Record",
  
  // Volunteer hour approvals (charity accounts)
  VOLUNTEER_HOURS_APPROVAL: "Volunteer Hours Approval",
  
  // Volunteer endorsements (charities)
  VOLUNTEER_ENDORSEMENT: "Volunteer Endorsement",
} as const;

/** Union of all volunteer transaction type string values. */
export type VolunteerTransactionType = typeof VolunteerTransactionTypes[keyof typeof VolunteerTransactionTypes];

/**
 * Extended metadata for volunteer transactions
 */
export interface VolunteerTransactionMetadata {
  organization: string;
  opportunity?: string;
  description?: string;
  verificationHash?: string;
  blockNumber?: number;
  
  // For hour records and approvals
  hours?: number;
  startTime?: string;
  endTime?: string;
  
  // For endorsements
  skills?: string[];
  endorsementText?: string;
  
  // For solicitations
  applicationText?: string;
  availability?: string;
  
  // For acceptances
  acceptanceDate?: string;
  acceptedBy?: string;
  
  // Common fields
  transactionInitiator?: 'volunteer' | 'charity';
  relatedTransactionId?: string; // Links related transactions
}

/**
 * Helper function to determine if a transaction purpose is a volunteer type
 */
export function isVolunteerTransaction(purpose: string): boolean {
  return Object.values(VolunteerTransactionTypes).includes(purpose as VolunteerTransactionType);
}

/**
 * Helper function to get the initiator type for a volunteer transaction
 */
export function getVolunteerTransactionInitiator(type: VolunteerTransactionType): 'volunteer' | 'charity' {
  switch (type) {
    case VolunteerTransactionTypes.VOLUNTEER_SOLICITATION:
    case VolunteerTransactionTypes.VOLUNTEER_HOURS_RECORD:
      return 'volunteer';
    case VolunteerTransactionTypes.VOLUNTEER_ACCEPTANCE:
    case VolunteerTransactionTypes.VOLUNTEER_HOURS_APPROVAL:
    case VolunteerTransactionTypes.VOLUNTEER_ENDORSEMENT:
      return 'charity';
    default:
      return 'volunteer';
  }
}