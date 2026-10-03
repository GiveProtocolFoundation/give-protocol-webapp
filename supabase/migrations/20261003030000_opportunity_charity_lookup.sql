-- Public lookup of the charity that hosts a volunteer opportunity.
--
-- volunteer_opportunities.charity_id references profiles(id), and profiles is
-- readable only by its owner or an admin, so signed-out visitors could not
-- resolve the hosting charity's name or EIN. This function exposes just those
-- two public fields, and only for charities that currently have a public
-- (active, visible) opportunity.

CREATE OR REPLACE FUNCTION public.get_opportunity_charities(p_charity_ids uuid[])
RETURNS TABLE (profile_id uuid, name text, ein text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (p.id)
    p.id AS profile_id,
    COALESCE(cp.name, p.name) AS name,
    cp.ein AS ein
  FROM profiles p
  LEFT JOIN charity_profiles cp ON cp.claimed_by = p.user_id
  WHERE p.id = ANY (p_charity_ids)
    AND p.type = 'charity'
    AND EXISTS (
      SELECT 1
      FROM volunteer_opportunities vo
      WHERE vo.charity_id = p.id
        AND vo.status = 'active'
        AND vo.moderation_status = 'visible'
    )
  ORDER BY p.id, cp.claimed_at NULLS LAST;
$$;

REVOKE ALL ON FUNCTION public.get_opportunity_charities(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_opportunity_charities(uuid[]) TO anon, authenticated;
