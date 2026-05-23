import { Timestamp, UUID } from "./common";
import { TokenAmount } from "./blockchain";

export enum CharityCategory {
  EDUCATION = "education",
  HEALTH_MEDICAL = "health_medical",
  MENTAL_HEALTH = "mental_health",
  ENVIRONMENT_CONSERVATION = "environment_conservation",
  HUMAN_SERVICES = "human_services",
  HOUSING_SHELTER = "housing_shelter",
  FOOD_SECURITY_NUTRITION = "food_security_nutrition",
  ARTS_CULTURE_HUMANITIES = "arts_culture_humanities",
  RELIGION_SPIRITUAL = "religion_spiritual",
  ANIMAL_WELFARE = "animal_welfare",
  DISASTER_RELIEF = "disaster_relief",
  INTERNATIONAL_DEVELOPMENT = "international_development",
  CIVIL_RIGHTS_ADVOCACY = "civil_rights_advocacy",
  WOMEN_GENDER_EQUALITY = "women_gender_equality",
  COMMUNITY_ECONOMIC_DEVELOPMENT = "community_economic_development",
  YOUTH_DEVELOPMENT = "youth_development",
  SCIENCE_TECHNOLOGY = "science_technology",
  GRANTMAKING_FOUNDATIONS = "grantmaking_foundations",
  PUBLIC_SAFETY = "public_safety",
  SPORTS_RECREATION = "sports_recreation",
  OTHER = "other",
}

/** Human-readable labels for each CharityCategory value. */
export const CHARITY_CATEGORY_LABELS: Record<CharityCategory, string> = {
  [CharityCategory.EDUCATION]: "Education",
  [CharityCategory.HEALTH_MEDICAL]: "Health & Medical",
  [CharityCategory.MENTAL_HEALTH]: "Mental Health",
  [CharityCategory.ENVIRONMENT_CONSERVATION]: "Environment & Conservation",
  [CharityCategory.HUMAN_SERVICES]: "Human Services",
  [CharityCategory.HOUSING_SHELTER]: "Housing & Shelter",
  [CharityCategory.FOOD_SECURITY_NUTRITION]: "Food Security & Nutrition",
  [CharityCategory.ARTS_CULTURE_HUMANITIES]: "Arts, Culture & Humanities",
  [CharityCategory.RELIGION_SPIRITUAL]: "Religion & Spiritual Organizations",
  [CharityCategory.ANIMAL_WELFARE]: "Animal Welfare",
  [CharityCategory.DISASTER_RELIEF]: "Disaster Relief & Humanitarian Aid",
  [CharityCategory.INTERNATIONAL_DEVELOPMENT]: "International Development",
  [CharityCategory.CIVIL_RIGHTS_ADVOCACY]: "Civil Rights & Advocacy",
  [CharityCategory.WOMEN_GENDER_EQUALITY]: "Women's & Gender Equality",
  [CharityCategory.COMMUNITY_ECONOMIC_DEVELOPMENT]:
    "Community & Economic Development",
  [CharityCategory.YOUTH_DEVELOPMENT]: "Youth Development",
  [CharityCategory.SCIENCE_TECHNOLOGY]: "Science & Technology",
  [CharityCategory.GRANTMAKING_FOUNDATIONS]: "Grantmaking & Foundations",
  [CharityCategory.PUBLIC_SAFETY]: "Public Safety",
  [CharityCategory.SPORTS_RECREATION]: "Sports & Recreation",
  [CharityCategory.OTHER]: "Other",
};

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

export interface CharityMeta {
  logoUrl?: string;
  bannerUrl?: string;
  website?: string;
  socialLinks: Partial<
    Record<"twitter" | "facebook" | "instagram" | "linkedin", string>
  >;
  documents: CharityDocument[];
}

export interface CharityDocument {
  id: UUID;
  type: "registration" | "audit" | "report";
  url: string;
  verifiedAt?: Timestamp;
}

export interface CharityStats {
  totalDonations: number;
  totalAmount: TokenAmount;
  donorCount: number;
  avgDonation: TokenAmount;
  successRate: number;
  impactMetrics: ImpactMetric[];
}

export interface ImpactMetric {
  id: UUID;
  name: string;
  value: number;
  unit: string;
  category: string;
  timestamp: Timestamp;
}

export interface CharityVerification {
  isVerified: boolean;
  verifiedAt?: Timestamp;
  verifiedBy?: UUID;
  documents: VerificationDocument[];
}

export interface VerificationDocument {
  id: UUID;
  type: string;
  status: "pending" | "verified" | "rejected";
  verifiedAt?: Timestamp;
  verifiedBy?: UUID;
}

export interface Charity extends CharityBase {
  meta: CharityMeta;
  stats: CharityStats;
  verification: CharityVerification;
  campaigns: Campaign[];
}

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

export type CampaignStatus =
  | "draft"
  | "active"
  | "paused"
  | "completed"
  | "cancelled";

export interface CampaignUpdate {
  readonly id: UUID;
  campaignId: UUID;
  title: string;
  content: string;
  createdAt: Timestamp;
  attachments: CampaignAttachment[];
}

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
