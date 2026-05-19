import { UUID, Timestamp, ISO8601Date } from "./common";

/**
 * Activity types for volunteer work categorization
 */
export enum ActivityType {
  DIRECT_SERVICE = "direct_service",
  ADMINISTRATIVE_SUPPORT = "administrative_support",
  PROFESSIONAL_TECHNICAL = "professional_technical",
  EVENT_SUPPORT = "event_support",
  MENTORING_TEACHING = "mentoring_teaching",
  LEADERSHIP_COORDINATION = "leadership_coordination",
  GOVERNANCE = "governance",
  ADVOCACY_AWARENESS = "advocacy_awareness",
  FUNDRAISING = "fundraising",
  TRANSPORTATION_DELIVERY = "transportation_delivery",
  DIGITAL_VIRTUAL = "digital_virtual",
  PHYSICAL_LABOR = "physical_labor",
  ENVIRONMENTAL_STEWARDSHIP = "environmental_stewardship",
  OTHER = "other",
}

/**
 * Human-readable labels for activity types (short form)
 */
export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  [ActivityType.DIRECT_SERVICE]: "Direct Service",
  [ActivityType.ADMINISTRATIVE_SUPPORT]: "Administrative Support",
  [ActivityType.PROFESSIONAL_TECHNICAL]: "Professional/Technical Skills",
  [ActivityType.EVENT_SUPPORT]: "Event Support",
  [ActivityType.MENTORING_TEACHING]: "Mentoring/Teaching",
  [ActivityType.LEADERSHIP_COORDINATION]: "Leadership/Coordination",
  [ActivityType.GOVERNANCE]: "Governance",
  [ActivityType.ADVOCACY_AWARENESS]: "Advocacy/Awareness",
  [ActivityType.FUNDRAISING]: "Fundraising",
  [ActivityType.TRANSPORTATION_DELIVERY]: "Transportation/Delivery",
  [ActivityType.DIGITAL_VIRTUAL]: "Digital/Virtual",
  [ActivityType.PHYSICAL_LABOR]: "Physical Labor/Construction",
  [ActivityType.ENVIRONMENTAL_STEWARDSHIP]: "Environmental Stewardship",
  [ActivityType.OTHER]: "Other",
};

/**
 * Descriptions for activity types (for dropdown hints)
 */
export const ACTIVITY_TYPE_DESCRIPTIONS: Record<ActivityType, string> = {
  [ActivityType.DIRECT_SERVICE]:
    "Hands-on work with beneficiaries (food service, habitat builds)",
  [ActivityType.ADMINISTRATIVE_SUPPORT]:
    "Office work, data entry, filing, phone coverage",
  [ActivityType.PROFESSIONAL_TECHNICAL]:
    "Pro bono professional work (legal, accounting, IT, design)",
  [ActivityType.EVENT_SUPPORT]: "Event setup, registration, logistics, cleanup",
  [ActivityType.MENTORING_TEACHING]:
    "Tutoring, coaching, skills training, youth mentorship",
  [ActivityType.LEADERSHIP_COORDINATION]:
    "Volunteer team lead, program coordination, project management",
  [ActivityType.GOVERNANCE]:
    "Board membership, committee service, advisory roles",
  [ActivityType.ADVOCACY_AWARENESS]:
    "Public speaking, outreach campaigns, community education",
  [ActivityType.FUNDRAISING]:
    "Donor outreach, peer-to-peer campaigns, grant writing support",
  [ActivityType.TRANSPORTATION_DELIVERY]:
    "Meal delivery, client transport, supply distribution",
  [ActivityType.DIGITAL_VIRTUAL]:
    "Remote volunteering, translations, online tutoring, virtual assistance",
  [ActivityType.PHYSICAL_LABOR]:
    "Building, renovation, painting, warehouse sorting, facility maintenance",
  [ActivityType.ENVIRONMENTAL_STEWARDSHIP]:
    "Park cleanups, trail maintenance, community gardens, conservation",
  [ActivityType.OTHER]: "Describe in the description field",
};

/**
 * Validation status for self-reported hours records
 */
export enum ValidationStatus {
  PENDING = "pending",
  VALIDATED = "validated",
  REJECTED = "rejected",
  UNVALIDATED = "unvalidated",
  EXPIRED = "expired",
}

/**
 * Reasons for rejecting a validation request
 */
export enum RejectionReason {
  HOURS_INACCURATE = "hours_inaccurate",
  DATE_INCORRECT = "date_incorrect",
  ACTIVITY_NOT_RECOGNIZED = "activity_not_recognized",
  VOLUNTEER_NOT_RECOGNIZED = "volunteer_not_recognized",
  DESCRIPTION_INSUFFICIENT = "description_insufficient",
  OTHER = "other",
}

/**
 * Human-readable labels for rejection reasons
 */
export const REJECTION_REASON_LABELS: Record<RejectionReason, string> = {
  [RejectionReason.HOURS_INACCURATE]: "Hours claimed are inaccurate",
  [RejectionReason.DATE_INCORRECT]: "Activity date is incorrect",
  [RejectionReason.ACTIVITY_NOT_RECOGNIZED]: "Activity not recognized",
  [RejectionReason.VOLUNTEER_NOT_RECOGNIZED]: "Volunteer not recognized",
  [RejectionReason.DESCRIPTION_INSUFFICIENT]: "Description is insufficient",
  [RejectionReason.OTHER]: "Other reason",
};

/**
 * Core self-reported volunteer hours record
 */
export interface SelfReportedHours {
  id: UUID;
  volunteerId: UUID;

  // Activity Details
  activityDate: ISO8601Date;
  hours: number;
  activityType: ActivityType;
  description: string;
  location?: string;

  // Organization - Either verified org (organizationId) or free-text (organizationName)
  organizationId?: UUID;
  charityOrgId?: UUID;
  organizationName?: string;
  organizationContactEmail?: string;

  // Validation
  validationStatus: ValidationStatus;
  validationRequestId?: UUID;
  validatedAt?: Timestamp;
  validatedBy?: UUID;
  rejectionReason?: RejectionReason;
  rejectionNotes?: string;

  // Blockchain/SBT
  sbtTokenId?: number;
  blockchainTxHash?: string;
  verificationHash?: string;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Validation request for organization approval
 */
export interface ValidationRequest {
  id: UUID;
  selfReportedHoursId: UUID;
  organizationId: UUID;
  volunteerId: UUID;

  status: "pending" | "approved" | "rejected" | "cancelled" | "expired";
  expiresAt: Timestamp;

  respondedAt?: Timestamp;
  respondedBy?: UUID;
  rejectionReason?: RejectionReason;
  rejectionNotes?: string;

  isResubmission: boolean;
  originalRequestId?: UUID;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Form input for creating/updating self-reported hours
 */
export interface SelfReportedHoursInput {
  activityDate: string;
  hours: number;
  activityType: ActivityType;
  description: string;
  location?: string;
  organizationId?: UUID;
  charityOrgId?: UUID;
  organizationName?: string;
  organizationContactEmail?: string;
}

/**
 * Input for processing a validation response
 */
export interface ValidationResponseInput {
  requestId: UUID;
  approved: boolean;
  rejectionReason?: RejectionReason;
  rejectionNotes?: string;
}

/**
 * Extended display type with computed fields for UI
 */
export interface SelfReportedHoursDisplay extends SelfReportedHours {
  organizationDisplayName: string;
  isVerifiedOrganization: boolean;
  daysUntilExpiration?: number;
  canEdit: boolean;
  canDelete: boolean;
  canRequestValidation: boolean;
}

/**
 * Item in the organization's validation queue
 */
export interface ValidationQueueItem {
  requestId: UUID;
  selfReportedHours: SelfReportedHours;
  volunteerName: string;
  volunteerEmail: string;
  daysUntilExpiration: number;
  isResubmission: boolean;
}

/**
 * Aggregate statistics for volunteer hours
 */
export interface VolunteerHoursStats {
  totalValidatedHours: number;
  totalUnvalidatedHours: number;
  totalPendingHours: number;
  totalRejectedHours: number;
  totalExpiredHours: number;
  recordCount: number;
  recordsByStatus: Record<ValidationStatus, number>;
}

/**
 * Filter options for querying self-reported hours
 */
export interface SelfReportedHoursFilters {
  status?: ValidationStatus;
  organizationId?: UUID;
  charityOrgId?: UUID;
  activityType?: ActivityType;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Organization search result for autocomplete
 */
export interface OrganizationSearchResult {
  id: UUID;
  name: string;
  isVerified: boolean;
  location?: string;
  logoUrl?: string;
}

/**
 * Validation window configuration
 */
export const VALIDATION_WINDOW_DAYS = 90;

/** Minimum hours that can be logged in a single self-reported record. */
export const MIN_HOURS_PER_RECORD = 0.5;
/** Maximum hours that can be logged in a single self-reported record. */
export const MAX_HOURS_PER_RECORD = 24;

/** Minimum character count required for an activity description. */
export const MIN_DESCRIPTION_LENGTH = 50;
/** Maximum character count allowed for an activity description. */
export const MAX_DESCRIPTION_LENGTH = 500;

/**
 * Calculate days until validation expiration
 * @param activityDate - The date of the volunteer activity
 * @returns Number of days remaining, or undefined if already expired
 */
export function calculateDaysUntilExpiration(
  activityDate: string,
): number | undefined {
  const activity = new Date(activityDate);
  const expirationDate = new Date(activity);
  expirationDate.setDate(expirationDate.getDate() + VALIDATION_WINDOW_DAYS);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = expirationDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : undefined;
}

/**
 * Check if a record's validation window has expired
 * @param activityDate - The date of the volunteer activity
 * @returns True if the 90-day window has passed
 */
export function isValidationExpired(activityDate: string): boolean {
  return calculateDaysUntilExpiration(activityDate) === undefined;
}

/**
 * Check if a record can be edited (only unvalidated records)
 * @param status - The validation status of the record
 * @returns True if the record can be edited
 */
export function canEditRecord(status: ValidationStatus): boolean {
  return (
    status === ValidationStatus.UNVALIDATED ||
    status === ValidationStatus.REJECTED ||
    status === ValidationStatus.EXPIRED
  );
}

/**
 * Check if a record can be deleted (only non-validated records)
 * @param status - The validation status of the record
 * @returns True if the record can be deleted
 */
export function canDeleteRecord(status: ValidationStatus): boolean {
  return status !== ValidationStatus.VALIDATED;
}

/**
 * Check if a validation request can be created for this record
 * @param status - The validation status
 * @param activityDate - The activity date
 * @param hasVerifiedOrg - Whether the record is linked to a verified org
 * @returns True if validation can be requested
 */
export function canRequestValidation(
  status: ValidationStatus,
  activityDate: string,
  hasVerifiedOrg: boolean,
): boolean {
  if (!hasVerifiedOrg) return false;
  if (status === ValidationStatus.VALIDATED) return false;
  if (status === ValidationStatus.PENDING) return false;
  return !isValidationExpired(activityDate);
}
