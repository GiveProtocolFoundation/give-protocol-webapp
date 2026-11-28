-- Giver country, for the "Giver region" filter on the contribution tracker.
--
-- profiles gains an optional ISO 3166-1 alpha-2 country, set by the user in
-- Settings. profiles is readable only by its owner and admins, so the
-- leaderboards cannot read other givers' countries. They ask a SECURITY DEFINER
-- function instead, which answers only "which of these givers fall inside (or
-- outside) this set of countries" and returns ids, never a country. It also
-- drops anyone who has hidden their contributions, using the same visibility
-- check the rest of the tracker relies on.

-- 1. The column. Nullable: no country means the giver shows as "Unspecified".
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_country_iso_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_country_iso_check
  CHECK (country IS NULL OR country ~ '^[A-Z]{2}$');

COMMENT ON COLUMN public.profiles.country IS
  'Optional ISO 3166-1 alpha-2 country the user chose to share. Never exposed '
  'directly to other users; see filter_givers_by_country().';

-- 2. Membership test used by the contribution leaderboards.
CREATE OR REPLACE FUNCTION public.filter_givers_by_country(
  p_ids uuid[],
  p_field text,
  p_countries text[],
  p_invert boolean DEFAULT false
)
RETURNS TABLE (id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.giver_id
  FROM unnest(
    CASE
      WHEN p_field IN ('showDonations', 'showVolunteerHours')
           AND cardinality(p_ids) <= 5000
      THEN p_ids
      ELSE ARRAY[]::uuid[]
    END
  ) AS i(giver_id)
  LEFT JOIN LATERAL (
    -- Donor leaderboard ids are profiles.id, volunteer ids are auth user ids.
    SELECT pr.country
    FROM profiles pr
    WHERE pr.user_id = i.giver_id OR pr.id = i.giver_id
    LIMIT 1
  ) c ON true
  WHERE public.user_allows_public_visibility(i.giver_id, p_field)
    AND COALESCE(c.country = ANY (p_countries), false) <> p_invert;
$$;

COMMENT ON FUNCTION public.filter_givers_by_country(uuid[], text, text[], boolean) IS
  'Returns the given giver ids (auth user ids or profiles.id) whose profile '
  'country is in p_countries, or is not in it (or unset) when p_invert is true. '
  'Excludes givers who hide p_field from public view. Returns ids only, never a '
  'country. p_field must be showDonations or showVolunteerHours; anything else, '
  'or more than 5000 ids, returns no rows.';

REVOKE ALL ON FUNCTION public.filter_givers_by_country(uuid[], text, text[], boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.filter_givers_by_country(uuid[], text, text[], boolean)
  TO anon, authenticated, service_role;
