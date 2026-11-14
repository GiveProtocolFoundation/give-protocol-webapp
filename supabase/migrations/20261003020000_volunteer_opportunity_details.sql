-- Detail fields for volunteer opportunities.
--
-- `description` (rich-text HTML, already captured by the create form) remains
-- the full description. These columns add the structured details volunteers
-- commonly look for before applying. All are optional so existing rows remain
-- valid.

ALTER TABLE public.volunteer_opportunities
  ADD COLUMN IF NOT EXISTS requirements TEXT,
  ADD COLUMN IF NOT EXISTS benefits TEXT,
  ADD COLUMN IF NOT EXISTS schedule TEXT,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS application_deadline DATE,
  ADD COLUMN IF NOT EXISTS volunteers_needed INTEGER,
  ADD COLUMN IF NOT EXISTS minimum_age INTEGER,
  ADD COLUMN IF NOT EXISTS background_check_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS training_provided BOOLEAN NOT NULL DEFAULT false;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'volunteer_opportunities_volunteers_needed_positive'
  ) THEN
    ALTER TABLE public.volunteer_opportunities
      ADD CONSTRAINT volunteer_opportunities_volunteers_needed_positive
      CHECK (volunteers_needed IS NULL OR volunteers_needed > 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'volunteer_opportunities_minimum_age_range'
  ) THEN
    ALTER TABLE public.volunteer_opportunities
      ADD CONSTRAINT volunteer_opportunities_minimum_age_range
      CHECK (minimum_age IS NULL OR (minimum_age >= 0 AND minimum_age <= 120));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'volunteer_opportunities_date_order'
  ) THEN
    ALTER TABLE public.volunteer_opportunities
      ADD CONSTRAINT volunteer_opportunities_date_order
      CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date);
  END IF;
END $$;

COMMENT ON COLUMN public.volunteer_opportunities.requirements IS 'Qualifications/requirements, one per line';
COMMENT ON COLUMN public.volunteer_opportunities.benefits IS 'What volunteers gain (training, certificates, etc.), one per line';
COMMENT ON COLUMN public.volunteer_opportunities.schedule IS 'Free-text schedule, e.g. "Tuesdays 6-8pm"';
COMMENT ON COLUMN public.volunteer_opportunities.end_date IS 'NULL means ongoing';
