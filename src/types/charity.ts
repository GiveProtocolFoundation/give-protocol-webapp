import { Timestamp, UUID } from "./common";
import { TokenAmount } from "./blockchain";

export enum CharityCategory {
  _EDUCATION = "education", // Prefixed with _ as currently unused
  _HEALTHCARE = "healthcare", // Prefixed with _ as currently unused
  _ENVIRONMENT = "environment", // Prefixed with _ as currently unused
  _POVERTY = "poverty", // Prefixed with _ as currently unused
  _DISASTER_RELIEF = "disaster_relief", // Prefixed with _ as currently unused
  _ANIMAL_WELFARE = "animal_welfare", // Prefixed with _ as currently unused
  _ARTS_CULTURE = "arts_culture", // Prefixed with _ as currently unused
  _COMMUNITY = "community", // Prefixed with _ as currently unused
}

/** Core fields shared by all charity records. */
export interface CharityBase {
  readonly id: UUID;
  name: string;
  description: string;
  category: CharityCategory;
  status: string;
  walletAddress: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Supplemental metadata for a charity, including media URLs and social links. */
export interface CharityMeta {
  logoUrl?: string;
  bannerUrl?: string;
  website?: string;
  socialLinks: Partial<
    Record<"twitter" | "facebook" | "instagram" | "linkedin", string>
  >;
  documents: CharityDocument[];
}

/** A compliance or reporting document associated with a charity. */
export interface CharityDocument {
  id: UUID;
  type: "registration" | "audit" | "report";
  url: string;
  verifiedAt?: Timestamp;
}

/** Aggregated donation and impact statistics for a charity. */
export interface CharityStats {
  totalDonations: number;
  totalAmount: TokenAmount;
  donorCount: number;
  avgDonation: TokenAmount;
  successRate: number;
  impactMetrics: ImpactMetric[];
}

/** A single quantifiable impact measurement for a charity. */
export interface ImpactMetric {
  id: UUID;
  name: string;
  value: number;
  unit: string;
  category: string;
  timestamp: Timestamp;
}

/** Verification status and supporting documents for a charity. */
export interface CharityVerification {
  isVerified: boolean;
  verifiedAt?: Timestamp;
  verifiedBy?: UUID;
  documents: VerificationDocument[];
}

/** An individual document submitted for charity verification. */
export interface VerificationDocument {
  id: UUID;
  type: string;
  status: "pending" | "verified" | "rejected";
  verifiedAt?: Timestamp;
  verifiedBy?: UUID;
}

/** Full charity record including metadata, stats, verification, and campaigns. */
export interface Charity extends CharityBase {
  meta: CharityMeta;
  stats: CharityStats;
  verification: CharityVerification;
  campaigns: Campaign[];
}

/** A fundraising campaign run by a charity. */
export interface Campaign {
  readonly id: UUID;
  charityId: UUID;
  title: string;
  description: string;
  targetAmount: TokenAmount;
  currentAmount: TokenAmount;
  startDate: Timestamp;
  endDate: Timestamp;
  status: CampaignStatus;
  updates: CampaignUpdate[];
}

/** Lifecycle state of a fundraising campaign. */
export type CampaignStatus =
  | "draft"
  | "active"
  | "paused"
  | "completed"
  | "cancelled";

/** A progress update posted to a campaign, with optional attachments. */
export interface CampaignUpdate {
  readonly id: UUID;
  campaignId: UUID;
  title: string;
  content: string;
  createdAt: Timestamp;
  attachments: CampaignAttachment[];
}

/** An image or document attached to a campaign update. */
export interface CampaignAttachment {
  id: UUID;
  type: "image" | "document";
  url: string;
  mimeType: string;
}

/**
 * Represents a specific cause/project that a charity is running.
 * Each charity can have a maximum of 3 active causes at any time.
 */
export interface Cause {
  id: string;
  name: string;
  description: string;
  targetAmount: number;
  raisedAmount: number;
  charityId: string;
  category: string;
  image: string;
  impact?: string[];
  timeline?: string;
  location?: string;
  partners?: string[];
  status?: "active" | "completed" | "paused";
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Structured impact statistic for cause detail pages and charity profiles.
 */
export interface ImpactStat {
  value: string;
  label: string;
  icon?: string;
}

/**
 * Extended cause data for the cause detail page template.
 */
export interface CauseProfileData extends Cause {
  impact: string[];
  impactStats?: ImpactStat[];
  timeline: string;
  location: string;
  partners: string[];
  problem?: string;
  solution?: string;
}

/**
 * Organization address structure for charity profiles
 */
export interface OrganizationAddress {
  street?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  country?: string;
}

/**
 * Organization contact information
 */
export interface OrganizationContact {
  phone?: string;
  email?: string;
  website?: string;
}

/**
 * Social media links for organizations
 */
export interface OrganizationSocialLinks {
  twitter?: string;
  facebook?: string;
  linkedin?: string;
  instagram?: string;
}

/**
 * Complete organization profile data stored in profiles.meta
 */
export interface OrganizationProfile {
  yearFounded?: number;
  address?: OrganizationAddress;
  contact?: OrganizationContact;
  socialLinks?: OrganizationSocialLinks;
}

/**
 * Form data type for the Organization Profile form
 */
export interface OrganizationProfileFormData {
  yearFounded: string;
  street: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  twitter: string;
  facebook: string;
  linkedin: string;
  instagram: string;
}

/**
 * Charity details stored in the charity_details table
 */
export interface CharityDetails {
  name: string;
  description: string;
  category: string;
  image_url: string;
  mission_statement?: string;
  impact_stats?: ImpactStat[];
  impact_highlights?: string[];
}

/** Maximum number of causes a charity can have active at once */
export const MAX_CAUSES_PER_CHARITY = 3;

/** Maximum number of volunteer opportunities a charity can have active at once */
export const MAX_OPPORTUNITIES_PER_CHARITY = 3;

/**
 * Type guard to check if charity has reached cause limit
 */
export function hasReachedCauseLimit(activeCauses: number): boolean {
  return activeCauses >= MAX_CAUSES_PER_CHARITY;
}

/**
 * Type guard to check if charity has reached opportunity limit
 */
export function hasReachedOpportunityLimit(
  activeOpportunities: number,
): boolean {
  return activeOpportunities >= MAX_OPPORTUNITIES_PER_CHARITY;
}
