import { UUID, Timestamp } from './common';

/** Base profile shared by all user types (donor, charity, admin). */
export interface UserProfile {
  id: UUID;
  userId: UUID;
  type: 'donor' | 'charity' | 'admin';
  createdAt: Timestamp;
}

/** Extended profile for donor accounts, including giving preferences and totals. */
export interface DonorProfile extends UserProfile {
  preferredCategories?: UUID[];
  donationFrequency?: 'one-time' | 'monthly' | 'quarterly' | 'yearly';
  totalDonated: number;
}

/** Extended profile for charity accounts, including description and balance information. */
export interface CharityProfile extends UserProfile {
  name: string;
  description: string;
  category: string;
  imageUrl?: string;
  totalReceived: number;
  availableBalance: number;
}

/** Per-user notification and privacy preferences. */
export interface UserPreferences {
  id: UUID;
  userId: UUID;
  notificationPreferences: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
    donationReceipts?: boolean;
    marketingUpdates?: boolean;
    impactReports?: boolean;
  };
  privacySettings: {
    showDonations?: boolean;
    showVolunteerHours?: boolean;
    showSkillEndorsements?: boolean;
    publicProfile?: boolean;
  };
}

/** A human-readable alias linked to a wallet address for a given user. */
export interface WalletAlias {
  id: UUID;
  userId: UUID;
  walletAddress: string;
  alias: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
