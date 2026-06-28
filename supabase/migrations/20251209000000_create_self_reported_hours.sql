-- Create self_reported_hours table for volunteer self-reporting
-- This is separate from the existing volunteer_hours table which tracks hours through formal applications

-- Create activity type enum for categorization
DO $$ BEGIN
  CREATE TYPE activity_type_enum AS ENUM (
    'direct_service',
    'administrative_support',
    'professional_technical',
    'event_support',
    'mentoring_teaching',
    'leadership_coordination',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create validation status enum
DO $$ BEGIN
  CREATE TYPE validation_status_enum AS ENUM (
    'pending',
    'validated',
    'rejected',
    'unvalidated',
    'expired'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create rejection reason enum
DO $$ BEGIN
  CREATE TYPE rejection_reason_enum AS ENUM (
    'hours_inaccurate',
    'date_incorrect',
    'activity_not_recognized',
    'volunteer_not_recognized',
    'description_insufficient',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create self_reported_hours table
CREATE TABLE IF NOT EXISTS self_reported_hours (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  volunteer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Activity Details
  activity_date DATE NOT NULL,
  hours DECIMAL(4,1) NOT NULL,
  activity_type activity_type_enum NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(255),

  -- Organization (mutually exclusive)
  -- organization_id references profiles where type='charity' for verified orgs
  organization_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  organization_name VARCHAR(255),
  organization_contact_email VARCHAR(255),

  -- Validation Status
  validation_status validation_status_enum NOT NULL DEFAULT 'unvalidated',
  validation_request_id UUID,
  validated_at TIMESTAMP WITH TIME ZONE,
  validated_by UUID REFERENCES auth.users(id),
  rejection_reason rejection_reason_enum,
  rejection_notes TEXT,

  -- Blockchain/SBT
  sbt_token_id BIGINT,
  blockchain_tx_hash VARCHAR(66),
  verification_hash VARCHAR(66),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT valid_hours CHECK (hours >= 0.5 AND hours <= 24),
  CONSTRAINT valid_description_length CHECK (
    char_length(description) >= 50 AND char_length(description) <= 500
  ),
  CONSTRAINT valid_activity_date CHECK (activity_date <= CURRENT_DATE),
  CONSTRAINT valid_org_reference CHECK (
    (organization_id IS NOT NULL AND organization_name IS NULL) OR
    (organization_id IS NULL AND organization_name IS NOT NULL)
  )
);

-- Create validation_requests table
CREATE TABLE IF NOT EXISTS validation_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  self_reported_hours_id UUID NOT NULL REFERENCES self_reported_hours(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Request Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'expired')),

  -- Expiration (90 days from activity date)
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Response Details
  responded_at TIMESTAMP WITH TIME ZONE,
  responded_by UUID REFERENCES auth.users(id),
  rejection_reason rejection_reason_enum,
  rejection_notes TEXT,

  -- Appeal/Resubmit
  is_resubmission BOOLEAN DEFAULT FALSE,
  original_request_id UUID REFERENCES validation_requests(id),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add foreign key from self_reported_hours to validation_requests
ALTER TABLE self_reported_hours
ADD CONSTRAINT fk_validation_request
FOREIGN KEY (validation_request_id) REFERENCES validation_requests(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_self_reported_hours_volunteer ON self_reported_hours(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_self_reported_hours_org ON self_reported_hours(organization_id);
CREATE INDEX IF NOT EXISTS idx_self_reported_hours_status ON self_reported_hours(validation_status);
CREATE INDEX IF NOT EXISTS idx_self_reported_hours_activity_date ON self_reported_hours(activity_date);
CREATE INDEX IF NOT EXISTS idx_self_reported_hours_volunteer_status ON self_reported_hours(volunteer_id, validation_status);

CREATE INDEX IF NOT EXISTS idx_validation_requests_org ON validation_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_validation_requests_volunteer ON validation_requests(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_validation_requests_status ON validation_requests(status);
CREATE INDEX IF NOT EXISTS idx_validation_requests_expires ON validation_requests(expires_at);
CREATE INDEX IF NOT EXISTS idx_validation_requests_hours ON validation_requests(self_reported_hours_id);

-- Enable Row Level Security
ALTER TABLE self_reported_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for self_reported_hours

-- Volunteers can insert their own records
DROP POLICY IF EXISTS "Volunteers can insert own self-reported hours" ON self_reported_hours;
CREATE POLICY "Volunteers can insert own self-reported hours" ON self_reported_hours
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = volunteer_id);

-- Volunteers can read their own records
DROP POLICY IF EXISTS "Volunteers can read own self-reported hours" ON self_reported_hours;
CREATE POLICY "Volunteers can read own self-reported hours" ON self_reported_hours
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = volunteer_id);

-- Volunteers can update their own unvalidated records
DROP POLICY IF EXISTS "Volunteers can update own unvalidated records" ON self_reported_hours;
CREATE POLICY "Volunteers can update own unvalidated records" ON self_reported_hours
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) = volunteer_id
    AND validation_status != 'validated'
  );

-- Volunteers can delete their own non-validated records
DROP POLICY IF EXISTS "Volunteers can delete own non-validated records" ON self_reported_hours;
CREATE POLICY "Volunteers can delete own non-validated records" ON self_reported_hours
  FOR DELETE
  TO authenticated
  USING (
    (SELECT auth.uid()) = volunteer_id
    AND validation_status != 'validated'
  );

-- Organizations can read records requesting their validation
DROP POLICY IF EXISTS "Organizations can read records for validation" ON self_reported_hours;
CREATE POLICY "Organizations can read records for validation" ON self_reported_hours
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
    )
  );

-- Organizations can update validation status of their records
DROP POLICY IF EXISTS "Organizations can update validation status" ON self_reported_hours;
CREATE POLICY "Organizations can update validation status" ON self_reported_hours
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
    )
  );

-- RLS Policies for validation_requests

-- Volunteers can read their own validation requests
DROP POLICY IF EXISTS "Volunteers can read own validation requests" ON validation_requests;
CREATE POLICY "Volunteers can read own validation requests" ON validation_requests
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = volunteer_id);

-- Volunteers can cancel their own pending requests
DROP POLICY IF EXISTS "Volunteers can update own pending requests" ON validation_requests;
CREATE POLICY "Volunteers can update own pending requests" ON validation_requests
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) = volunteer_id
    AND status = 'pending'
  );

-- Organizations can read validation requests for their org
DROP POLICY IF EXISTS "Organizations can read validation requests" ON validation_requests;
CREATE POLICY "Organizations can read validation requests" ON validation_requests
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
    )
  );

-- Organizations can update validation requests for their org
DROP POLICY IF EXISTS "Organizations can respond to validation requests" ON validation_requests;
CREATE POLICY "Organizations can respond to validation requests" ON validation_requests
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
    )
  );

-- System can insert validation requests (via service)
DROP POLICY IF EXISTS "Authenticated users can insert validation requests" ON validation_requests;
CREATE POLICY "Authenticated users can insert validation requests" ON validation_requests
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = volunteer_id);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_self_reported_hours_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER set_self_reported_hours_updated_at
  BEFORE UPDATE ON self_reported_hours
  FOR EACH ROW
  EXECUTE FUNCTION update_self_reported_hours_updated_at();

CREATE TRIGGER set_validation_requests_updated_at
  BEFORE UPDATE ON validation_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_self_reported_hours_updated_at();

-- Add helpful comments
COMMENT ON TABLE self_reported_hours IS 'Self-reported volunteer hours by donors/volunteers, requiring optional organization validation';
COMMENT ON TABLE validation_requests IS 'Validation requests sent to organizations to verify self-reported volunteer hours';
COMMENT ON COLUMN self_reported_hours.validation_status IS 'Status: pending (awaiting org response), validated (org approved), rejected (org denied), unvalidated (no org on platform), expired (90-day window passed)';
COMMENT ON COLUMN validation_requests.expires_at IS '90 days from activity_date - after this, validation cannot be completed';
