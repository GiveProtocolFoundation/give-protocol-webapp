// Contribution Types
/** The source type of a contribution (donation, formal volunteering, or self-reported hours). */
export type ContributionSourceType =
  | "donation"
  | "formal_volunteer"
  | "self_reported";

/** Filter options for querying contribution history. */
export interface ContributionFilters {
  organization: string;
  category: string;
  region: string;
  timeRange: string;
  sources?: ContributionSourceType[];
}

/** Breakdown of volunteer hours by formal vs self-reported categories. */
export interface VolunteerHoursBreakdown {
  formal: number;
  selfReported: {
    validated: number;
    pending: number;
    unvalidated: number;
    total: number;
  };
  total: number; // formal + validated self-reported
}

/** Props for the DonationStats display component. */
export interface DonationStatsProps {
  stats?: {
    totalDonated: number;
    volunteerHours: number | VolunteerHoursBreakdown;
    skillsEndorsed: number;
    organizationsHelped?: number;
  };
  isPersonal?: boolean;
}

/** A single entry in a donation leaderboard. */
export interface LeaderboardEntry {
  id: string;
  alias: string;
  walletAddress: string;
  displayName?: string;
  totalDonated: number;
  rank: number;
  donationCount?: number;
  organizationsSupported?: number;
}

/** Aggregate volunteer statistics for a user. */
export interface VolunteerStats {
  totalHours: number;
  skillsEndorsed: number;
  organizationsHelped: number;
  recentAchievements: Achievement[];
}

/** A badge or milestone earned by a volunteer. */
export interface Achievement {
  id: string;
  title: string;
  organization: string;
  date: string;
}

/** A single donation record. */
export interface Donation {
  id: string;
  amount: number;
  organization: string;
  date: string;
  status: "completed" | "pending";
}

/** A single entry in a volunteer-hours leaderboard. */
export interface VolunteerLeader {
  id: string;
  alias: string;
  walletAddress: string;
  displayName?: string;
  hours: number;
  endorsements: number;
  rank: number;
}

// Transaction data for blockchain transactions
/** A transaction record covering both crypto and fiat payment flows. */
export interface Transaction {
  id: string;
  hash?: string;
  from?: string;
  to?: string;
  amount: number;
  cryptoType?: string;
  fiatValue?: number;
  fee?: number;
  timestamp: string;
  status: "pending" | "completed" | "failed";
  purpose?: string;
  metadata?: TransactionMetadata;
}

// Enhanced metadata structure for all transaction types
/** Extended metadata attached to transaction records for all contribution types. */
export interface TransactionMetadata extends Record<string, unknown> {
  // Common fields
  organization?: string;
  category?: string;
  description?: string;
  verificationHash?: string;
  blockNumber?: number;

  // Volunteer-specific fields
  opportunity?: string;
  hours?: number;
  startTime?: string;
  endTime?: string;
  skills?: string[];
  endorsementText?: string;
  applicationText?: string;
  availability?: string;
  acceptanceDate?: string;
  acceptedBy?: string;
  transactionInitiator?: "volunteer" | "charity";
  relatedTransactionId?: string;

  // Fiat donation fields
  isFiatDonation?: boolean;
  paymentMethod?: string;
  helcimTransactionId?: string;
  disbursementStatus?: string;
  cardLastFour?: string;
}

/** Options controlling which data is included in a transaction CSV export. */
export interface TransactionExportOptions {
  includePersonalInfo?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  cryptoTypes?: string[];
}
