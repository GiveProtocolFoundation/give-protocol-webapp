import { ReactNode, CSSProperties } from "react";
import { Charity, Campaign, CharityCategory } from "./charity";
import { TokenAmount } from "./blockchain";

// Base Component Props
/** Common props accepted by most UI components. */
export interface BaseComponentProps {
  className?: string;
  style?: CSSProperties;
  testId?: string;
  children?: ReactNode;
}

// Charity Component Props
/** Props for a card displaying a single charity. */
export interface CharityCardProps extends BaseComponentProps {
  charity: Charity;
  onDonate?: (_charityId: string) => void; // Prefixed as unused
  onShare?: (_charityId: string) => void; // Prefixed as unused
  showStats?: boolean;
  compact?: boolean;
}

/** Props for a list or grid of charity cards. */
export interface CharityListProps extends BaseComponentProps {
  charities: Charity[];
  loading?: boolean;
  error?: Error;
  onCharityClick?: (_charity: Charity) => void; // Prefixed as unused
  layout?: "grid" | "list";
  showPagination?: boolean;
}

/** Props for the charity category filter panel. */
export interface CharityFilterProps extends BaseComponentProps {
  categories: CharityCategory[];
  selectedCategories: CharityCategory[];
  onCategoryChange: (_categories: CharityCategory[]) => void; // Prefixed as unused
  showVerifiedOnly: boolean;
  onVerifiedChange: (_verified: boolean) => void; // Prefixed as unused
}

// Campaign Component Props
/** Props for a card displaying a single fundraising campaign. */
export interface CampaignCardProps extends BaseComponentProps {
  campaign: Campaign;
  onDonate?: (_campaignId: string) => void; // Prefixed as unused
  showProgress?: boolean;
  showTimeLeft?: boolean;
}

/** Props for a list or grid of campaign cards. */
export interface CampaignListProps extends BaseComponentProps {
  campaigns: Campaign[];
  loading?: boolean;
  error?: Error;
  onCampaignClick?: (_campaign: Campaign) => void; // Prefixed as unused
  layout?: "grid" | "list";
}

// Form Component Props
/** Props for the donation amount entry form. */
export interface DonationFormProps extends BaseComponentProps {
  charityId: string;
  campaignId?: string;
  onSubmit: (_amount: TokenAmount) => Promise<void>; // Prefixed as unused
  onCancel?: () => void;
  minAmount?: TokenAmount;
  maxAmount?: TokenAmount;
}

// Context Types
/** Shape of the CharityContext value. */
export interface CharityContextType {
  selectedCharity?: Charity;
  setSelectedCharity: (_charity?: Charity) => void; // Prefixed as unused
  loading: boolean;
  error?: Error;
}

/** Shape of the DonationContext value. */
export interface DonationContextType {
  pendingDonations: PendingDonation[];
  addDonation: (_donation: Omit<PendingDonation, "status">) => void; // Prefixed as unused
  removeDonation: (_donationId: string) => void; // Prefixed as unused
}

/** A donation queued for submission. */
export interface PendingDonation {
  id: string;
  charityId: string;
  campaignId?: string;
  amount: TokenAmount;
  status: "pending" | "processing" | "completed" | "failed";
}

// UI Component Props
/** Props for the Button component. */
export interface ButtonProps extends BaseComponentProps {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

/** Props for text and number input fields. */
export interface InputProps extends BaseComponentProps {
  label?: string;
  error?: string;
  helperText?: string;
  type?: "text" | "number" | "email" | "password";
  value: string | number;
  onChange: (_value: string) => void; // Prefixed as unused
  required?: boolean;
  disabled?: boolean;
}

/** Props for the LoadingSpinner component. */
export interface LoadingSpinnerProps extends BaseComponentProps {
  size?: "sm" | "md" | "lg";
  color?: "primary" | "secondary" | "white";
}
