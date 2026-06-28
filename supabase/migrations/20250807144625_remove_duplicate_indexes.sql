-- Remove duplicate indexes to improve write performance

-- Table: charity_documents
-- Keeping index: charity_documents_charity_id_idx
DROP INDEX IF EXISTS idx_charity_documents_charity_id;

-- Table: donor_profiles
-- Keeping index: donor_profiles_profile_id_idx
DROP INDEX IF EXISTS idx_donor_profiles_profile_id;

-- Table: impact_metrics
-- Keeping index: idx_impact_metrics_charity_id
DROP INDEX IF EXISTS impact_metrics_charity_id_idx;

-- Table: profiles
-- Keeping index: profiles_user_id_key
DROP INDEX IF EXISTS unique_user_profile;

-- Table: volunteer_applications
-- Keeping index: idx_volunteer_applications_applicant_id
DROP INDEX IF EXISTS volunteer_applications_applicant_id_idx;

-- Table: volunteer_applications
-- Keeping index: idx_volunteer_applications_opportunity_id
DROP INDEX IF EXISTS volunteer_applications_opportunity_id_idx;

-- Table: volunteer_opportunities
-- Keeping index: idx_volunteer_opportunities_charity_id
DROP INDEX IF EXISTS volunteer_opportunities_charity_id_idx;

