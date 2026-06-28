-- Add missing fields to volunteer_applications table to match form requirements
-- This migration adds fields for skills, commitment type, experience, and other application data

-- Rename phone to phone_number for consistency (idempotent)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'volunteer_applications' AND column_name = 'phone') THEN
    ALTER TABLE volunteer_applications RENAME COLUMN phone TO phone_number;
  END IF;
END $$;

-- Rename message to experience for clarity (idempotent)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'volunteer_applications' AND column_name = 'message') THEN
    ALTER TABLE volunteer_applications RENAME COLUMN message TO experience;
  END IF;
END $$;

-- Add new columns for structured application data
ALTER TABLE volunteer_applications
ADD COLUMN IF NOT EXISTS commitment_type text CHECK (commitment_type IN ('one-time', 'short-term', 'long-term')),
ADD COLUMN IF NOT EXISTS skills text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS certifications text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS availability jsonb DEFAULT '{"days": [], "times": []}'::jsonb;

-- Add RLS policy for volunteers to insert their own applications
DROP POLICY IF EXISTS "Volunteers can insert own applications" ON volunteer_applications;

CREATE POLICY "Volunteers can insert own applications" ON volunteer_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (applicant_id = auth.uid());

-- Add RLS policy for volunteers to read their own applications
DROP POLICY IF EXISTS "Volunteers can read own applications" ON volunteer_applications;

CREATE POLICY "Volunteers can read own applications" ON volunteer_applications
  FOR SELECT
  TO authenticated
  USING (applicant_id = auth.uid());

-- Add RLS policy for charities to read applications for their opportunities
DROP POLICY IF EXISTS "Charities can read applications for their opportunities" ON volunteer_applications;

CREATE POLICY "Charities can read applications for their opportunities" ON volunteer_applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = volunteer_applications.charity_id
      AND profiles.user_id = auth.uid()
      AND profiles.type = 'charity'
    )
  );

-- Add RLS policy for charities to update application status
DROP POLICY IF EXISTS "Charities can update application status" ON volunteer_applications;

CREATE POLICY "Charities can update application status" ON volunteer_applications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = volunteer_applications.charity_id
      AND profiles.user_id = auth.uid()
      AND profiles.type = 'charity'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = volunteer_applications.charity_id
      AND profiles.user_id = auth.uid()
      AND profiles.type = 'charity'
    )
  );

-- Add comments for documentation
COMMENT ON COLUMN volunteer_applications.phone_number IS 'Volunteer phone number (optional)';
COMMENT ON COLUMN volunteer_applications.experience IS 'Volunteer relevant experience description (required)';
COMMENT ON COLUMN volunteer_applications.commitment_type IS 'Type of commitment: one-time, short-term, or long-term (required)';
COMMENT ON COLUMN volunteer_applications.skills IS 'Array of volunteer skills and areas of interest (required)';
COMMENT ON COLUMN volunteer_applications.interests IS 'Array of volunteer interests (optional)';
COMMENT ON COLUMN volunteer_applications.certifications IS 'Array of volunteer certifications (optional)';
COMMENT ON COLUMN volunteer_applications.availability IS 'Volunteer availability schedule (days and times)';
