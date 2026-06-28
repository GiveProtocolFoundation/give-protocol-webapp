-- Create volunteer_hours table and related volunteer system tables
-- This table was referenced in the code but never actually created in the database

-- Create volunteer_hours table first
CREATE TABLE IF NOT EXISTS volunteer_hours (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  volunteer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  charity_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  hours DECIMAL(5,2) NOT NULL CHECK (hours > 0),
  date_performed DATE NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create volunteer_applications table (referenced in code)
CREATE TABLE IF NOT EXISTS volunteer_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id UUID NOT NULL REFERENCES volunteer_opportunities(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  charity_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  message TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- Create volunteer_verifications table (referenced in code)
CREATE TABLE IF NOT EXISTS volunteer_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  volunteer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  charity_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  volunteer_hours_id UUID NOT NULL REFERENCES volunteer_hours(id) ON DELETE CASCADE,
  verification_method VARCHAR(50) NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified_by UUID REFERENCES auth.users(id),
  nft_token_id BIGINT,
  blockchain_tx_hash VARCHAR(255)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_volunteer_hours_volunteer_id ON volunteer_hours(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_hours_charity_id ON volunteer_hours(charity_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_hours_status ON volunteer_hours(status);
CREATE INDEX IF NOT EXISTS idx_volunteer_hours_charity_status ON volunteer_hours(charity_id, status);
CREATE INDEX IF NOT EXISTS idx_volunteer_hours_date ON volunteer_hours(date_performed);

CREATE INDEX IF NOT EXISTS idx_volunteer_applications_opportunity_id ON volunteer_applications(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_applications_charity_id ON volunteer_applications(charity_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_applications_applicant_id ON volunteer_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_applications_status ON volunteer_applications(status);

CREATE INDEX IF NOT EXISTS idx_volunteer_verifications_volunteer_id ON volunteer_verifications(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_verifications_charity_id ON volunteer_verifications(charity_id);

-- Enable Row Level Security
ALTER TABLE volunteer_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_verifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for volunteer_hours
DROP POLICY IF EXISTS "Volunteers can insert own volunteer hours" ON volunteer_hours;
CREATE POLICY "Volunteers can insert own volunteer hours" ON volunteer_hours
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = volunteer_id);

DROP POLICY IF EXISTS "Volunteers can read own volunteer hours" ON volunteer_hours;
CREATE POLICY "Volunteers can read own volunteer hours" ON volunteer_hours
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = volunteer_id);

DROP POLICY IF EXISTS "Charities can read volunteer hours for their charity" ON volunteer_hours;
CREATE POLICY "Charities can read volunteer hours for their charity" ON volunteer_hours
  FOR SELECT
  TO authenticated
  USING (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));

DROP POLICY IF EXISTS "Charities can update volunteer hours for their charity" ON volunteer_hours;
CREATE POLICY "Charities can update volunteer hours for their charity" ON volunteer_hours
  FOR UPDATE
  TO authenticated
  USING (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));

-- Create RLS policies for volunteer_applications
DROP POLICY IF EXISTS "Users can view own applications" ON volunteer_applications;
CREATE POLICY "Users can view own applications" ON volunteer_applications
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = applicant_id);

DROP POLICY IF EXISTS "Users can create applications" ON volunteer_applications;
CREATE POLICY "Users can create applications" ON volunteer_applications
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = applicant_id);

DROP POLICY IF EXISTS "Charities can view applications for their opportunities" ON volunteer_applications;
CREATE POLICY "Charities can view applications for their opportunities" ON volunteer_applications
  FOR SELECT
  TO authenticated
  USING (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));

DROP POLICY IF EXISTS "Charities can update applications for their opportunities" ON volunteer_applications;
CREATE POLICY "Charities can update applications for their opportunities" ON volunteer_applications
  FOR UPDATE
  TO authenticated
  USING (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));

-- Create RLS policies for volunteer_verifications
DROP POLICY IF EXISTS "Volunteers can read own verifications" ON volunteer_verifications;
CREATE POLICY "Volunteers can read own verifications" ON volunteer_verifications
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = volunteer_id);

DROP POLICY IF EXISTS "Charities can create verifications for their volunteers" ON volunteer_verifications;
CREATE POLICY "Charities can create verifications for their volunteers" ON volunteer_verifications
  FOR INSERT
  TO authenticated
  WITH CHECK (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));

DROP POLICY IF EXISTS "Charities can read verifications for their volunteers" ON volunteer_verifications;
CREATE POLICY "Charities can read verifications for their volunteers" ON volunteer_verifications
  FOR SELECT
  TO authenticated
  USING (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));

-- Add helpful comments
COMMENT ON TABLE volunteer_hours IS 'Tracks volunteer hours submitted by volunteers and approved by charities';
COMMENT ON TABLE volunteer_applications IS 'Applications submitted by volunteers for volunteer opportunities';  
COMMENT ON TABLE volunteer_verifications IS 'Blockchain verifications of completed volunteer hours';

COMMENT ON POLICY "Charities can read volunteer hours for their charity" ON volunteer_hours IS 
'Critical policy that allows charity portal to query volunteer hours for statistics and pending approvals. Fixes 500 errors.';