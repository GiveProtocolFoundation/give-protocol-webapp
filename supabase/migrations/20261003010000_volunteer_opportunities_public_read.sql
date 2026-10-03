-- Public read access for volunteer opportunities.
--
-- The existing SELECT policy is `TO authenticated`, so signed-out visitors to
-- /opportunities saw an empty list. Active, non-moderated opportunities are
-- public listings (the page is browsable before sign-in; applying requires it).

DROP POLICY IF EXISTS "volunteer_opportunities_public_select"
  ON public.volunteer_opportunities;

CREATE POLICY "volunteer_opportunities_public_select"
  ON public.volunteer_opportunities
  FOR SELECT
  TO anon
  USING (status = 'active' AND moderation_status = 'visible');
