/** JSON-serializable value type used throughout Supabase-generated types. */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/** Auto-generated Supabase database schema type. */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          type: "donor" | "charity";
          name?: string;
          meta?: {
            logoUrl?: string;
            location?: string;
            description?: string;
            yearFounded?: number;
            address?: {
              street?: string;
              city?: string;
              stateProvince?: string;
              postalCode?: string;
              country?: string;
            };
            contact?: {
              phone?: string;
              email?: string;
              website?: string;
            };
            socialLinks?: {
              twitter?: string;
              facebook?: string;
              linkedin?: string;
              instagram?: string;
            };
            [key: string]: unknown;
          };
          /** AES-256-GCM encrypted JSON blob: {contact:{email,phone},address:{...}} */
          pii_encrypted?: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: "donor" | "charity";
          name?: string;
          meta?: {
            logoUrl?: string;
            location?: string;
            description?: string;
            yearFounded?: number;
            /** @deprecated contact.email and contact.phone will be moved to pii_encrypted */
            address?: {
              street?: string;
              city?: string;
              stateProvince?: string;
              postalCode?: string;
              country?: string;
            };
            contact?: {
              phone?: string;
              email?: string;
              website?: string;
            };
            socialLinks?: {
              twitter?: string;
              facebook?: string;
              linkedin?: string;
              instagram?: string;
            };
            [key: string]: unknown;
          };
          /** AES-256-GCM encrypted JSON blob: {contact:{email,phone},address:{...}} */
          pii_encrypted?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: "donor" | "charity";
          name?: string;
          meta?: {
            logoUrl?: string;
            location?: string;
            description?: string;
            yearFounded?: number;
            address?: {
              street?: string;
              city?: string;
              stateProvince?: string;
              postalCode?: string;
              country?: string;
            };
            contact?: {
              phone?: string;
              email?: string;
              website?: string;
            };
            socialLinks?: {
              twitter?: string;
              facebook?: string;
              linkedin?: string;
              instagram?: string;
            };
            [key: string]: unknown;
          };
          /** AES-256-GCM encrypted JSON blob: {contact:{email,phone},address:{...}} */
          pii_encrypted?: string;
          created_at?: string;
        };
      };
      volunteer_hours: {
        Row: {
          id: string;
          volunteer_id: string;
          charity_id: string;
          hours: number;
          date_performed: string;
          description: string;
          status: "pending" | "approved" | "rejected";
          created_at: string;
          updated_at: string;
          volunteer?: {
            id: string;
            user_id: string;
          };
        };
        Insert: {
          id?: string;
          volunteer_id: string;
          charity_id: string;
          hours: number;
          date_performed: string;
          description: string;
          status?: "pending" | "approved" | "rejected";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          volunteer_id?: string;
          charity_id?: string;
          hours?: number;
          date_performed?: string;
          description?: string;
          status?: "pending" | "approved" | "rejected";
          created_at?: string;
          updated_at?: string;
        };
      };
      volunteer_opportunities: {
        Row: {
          id: string;
          charity_id: string;
          title: string;
          description: string;
          skills: string[];
          commitment: string;
          location: string;
          type: string;
          work_language: string;
          status: "active" | "inactive" | "completed";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          charity_id: string;
          title: string;
          description: string;
          skills: string[];
          commitment: string;
          location: string;
          type: string;
          work_language: string;
          status?: "active" | "inactive" | "completed";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          charity_id?: string;
          title?: string;
          description?: string;
          skills?: string[];
          commitment?: string;
          location?: string;
          type?: string;
          work_language?: string;
          status?: "active" | "inactive" | "completed";
          created_at?: string;
          updated_at?: string;
        };
      };
      volunteer_applications: {
        Row: {
          id: string;
          opportunity_id: string;
          applicant_id: string;
          charity_id: string;
          /** @deprecated Will be dropped after backfill + 30-day hold. Use full_name_encrypted. */
          full_name: string;
          /** @deprecated Will be dropped after backfill + 30-day hold. Use email_encrypted + email_hmac. */
          email: string;
          /** @deprecated Will be dropped after backfill + 30-day hold. Use phone_encrypted. */
          phone?: string;
          /** AES-256-GCM encrypted full name. Format: v{ver}:<b64_iv>:<b64_ct> */
          full_name_encrypted?: string;
          /** AES-256-GCM encrypted email. Format: v{ver}:<b64_iv>:<b64_ct> */
          email_encrypted?: string;
          /** HMAC-SHA256 blind index of email for equality lookups */
          email_hmac?: string;
          /** AES-256-GCM encrypted phone. Format: v{ver}:<b64_iv>:<b64_ct> */
          phone_encrypted?: string;
          message?: string;
          status: "pending" | "approved" | "rejected";
          applied_at: string;
          reviewed_at?: string;
          reviewed_by?: string;
          consent_given?: boolean;
          international_transfers_consent?: boolean;
          age_confirmation?: boolean;
          privacy_notice_acknowledged?: boolean;
          consent_given_at?: string;
          consent_version?: string;
          opportunity?: {
            id: string;
            title: string;
          };
        };
        Insert: {
          id?: string;
          opportunity_id: string;
          applicant_id: string;
          charity_id: string;
          /** @deprecated Use full_name_encrypted instead */
          full_name?: string;
          /** @deprecated Use email_encrypted + email_hmac instead */
          email?: string;
          /** @deprecated Use phone_encrypted instead */
          phone?: string;
          full_name_encrypted?: string;
          email_encrypted?: string;
          email_hmac?: string;
          phone_encrypted?: string;
          message?: string;
          status?: "pending" | "approved" | "rejected";
          applied_at?: string;
          reviewed_at?: string;
          reviewed_by?: string;
          consent_given?: boolean;
          international_transfers_consent?: boolean;
          age_confirmation?: boolean;
          privacy_notice_acknowledged?: boolean;
          consent_given_at?: string;
          consent_version?: string;
        };
        Update: {
          id?: string;
          opportunity_id?: string;
          applicant_id?: string;
          charity_id?: string;
          /** @deprecated Use full_name_encrypted instead */
          full_name?: string;
          /** @deprecated Use email_encrypted + email_hmac instead */
          email?: string;
          /** @deprecated Use phone_encrypted instead */
          phone?: string;
          full_name_encrypted?: string;
          email_encrypted?: string;
          email_hmac?: string;
          phone_encrypted?: string;
          message?: string;
          status?: "pending" | "approved" | "rejected";
          applied_at?: string;
          reviewed_at?: string;
          reviewed_by?: string;
          consent_given?: boolean;
          international_transfers_consent?: boolean;
          age_confirmation?: boolean;
          privacy_notice_acknowledged?: boolean;
          consent_given_at?: string;
          consent_version?: string;
        };
      };
      key_rotation_jobs: {
        Row: {
          id: string;
          dek_version_from: number;
          dek_version_to: number;
          target_table: string;
          rows_total: number;
          rows_done: number;
          status: "pending" | "running" | "done" | "failed";
          error_message?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          dek_version_from: number;
          dek_version_to: number;
          target_table: string;
          rows_total?: number;
          rows_done?: number;
          status?: "pending" | "running" | "done" | "failed";
          error_message?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          dek_version_from?: number;
          dek_version_to?: number;
          target_table?: string;
          rows_total?: number;
          rows_done?: number;
          status?: "pending" | "running" | "done" | "failed";
          error_message?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      volunteer_verifications: {
        Row: {
          id: string;
          volunteer_id: string;
          charity_id: string;
          volunteer_hours_id: string;
          verification_method: string;
          verified_at: string;
          verified_by?: string;
          nft_token_id?: number;
          blockchain_tx_hash?: string;
        };
        Insert: {
          id?: string;
          volunteer_id: string;
          charity_id: string;
          volunteer_hours_id: string;
          verification_method: string;
          verified_at?: string;
          verified_by?: string;
          nft_token_id?: number;
          blockchain_tx_hash?: string;
        };
        Update: {
          id?: string;
          volunteer_id?: string;
          charity_id?: string;
          volunteer_hours_id?: string;
          verification_method?: string;
          verified_at?: string;
          verified_by?: string;
          nft_token_id?: number;
          blockchain_tx_hash?: string;
        };
      };
    };
  };
}
