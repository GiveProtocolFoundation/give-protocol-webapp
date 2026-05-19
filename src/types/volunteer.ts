import { UUID, Timestamp } from './common';

/* eslint-disable no-unused-vars */

export enum CommitmentType {
  _ONE_TIME = 'one-time', // Prefixed with _ as currently unused
  _SHORT_TERM = 'short-term', // Prefixed with _ as currently unused
  _LONG_TERM = 'long-term' // Prefixed with _ as currently unused
}

export enum OpportunityType {
  _ONSITE = 'onsite', // Prefixed with _ as currently unused
  _REMOTE = 'remote', // Prefixed with _ as currently unused
  _HYBRID = 'hybrid' // Prefixed with _ as currently unused
}

export enum WorkLanguage {
  ENGLISH = 'english', // Used in VolunteerOpportunities.tsx
  SPANISH = 'spanish', // Used in VolunteerOpportunities.tsx
  GERMAN = 'german', // Used in VolunteerOpportunities.tsx
  FRENCH = 'french', // Used in VolunteerOpportunities.tsx
  JAPANESE = 'japanese', // Used in VolunteerOpportunities.tsx
  _CHINESE_SIMPLIFIED = 'chinese_simplified', // Prefixed with _ as currently unused
  _CHINESE_TRADITIONAL = 'chinese_traditional', // Prefixed with _ as currently unused
  _THAI = 'thai', // Prefixed with _ as currently unused
  _VIETNAMESE = 'vietnamese', // Prefixed with _ as currently unused
  _KOREAN = 'korean', // Prefixed with _ as currently unused
  _ARABIC = 'arabic', // Prefixed with _ as currently unused
  _HINDI = 'hindi', // Prefixed with _ as currently unused
  _MULTIPLE = 'multiple' // Prefixed with _ as currently unused
}

/** A volunteer opportunity posted by a charity. */
export interface VolunteerOpportunity {
  id: UUID;
  charityId: UUID;
  title: string;
  description: string;
  skills: string[];
  commitment: CommitmentType;
  location: string;
  type: OpportunityType;
  status: string;
  workLanguage: WorkLanguage;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** A volunteer's application for a specific opportunity. */
export interface VolunteerApplication {
  id: UUID;
  opportunityId: UUID;
  applicantId: UUID;
  fullName: string;
  phoneNumber: string;
  email: string;
  dateOfBirth?: string;
  availability: {
    days: string[];
    times: string[];
  };
  commitmentType: CommitmentType;
  experience?: string;
  skills?: string[];
  certifications?: string[];
  interests?: string[];
  referenceContacts?: {
    name: string;
    contact: string;
  }[];
  workSamples?: string[];
  status: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  acceptanceHash?: string; // Hash created when application is accepted
}

/** A logged block of volunteer hours for a charity opportunity. */
export interface VolunteerHours {
  id: UUID;
  volunteerId: UUID;
  charityId: UUID;
  opportunityId?: UUID;
  hours: number;
  description?: string;
  datePerformed: string;
  status: string;
  createdAt: Timestamp;
  approvedAt?: Timestamp;
  approvedBy?: UUID;
  verificationHash?: string; // Hash created when hours are verified
}

/** On-chain verification record linking an accepted application to verified hours. */
export interface VolunteerVerification {
  id: UUID;
  applicantId: UUID;
  opportunityId: UUID;
  charityId: UUID;
  acceptanceHash: string; // Hash for application acceptance
  verificationHash?: string; // Hash for hours verification
  acceptedAt: Timestamp;
  verifiedAt?: Timestamp;
  blockchainReference?: {
    network: string;
    transactionId: string;
    blockNumber: number;
  };
}