-- GIV-784: Public platform config RPC for donor network/token filtering.
-- Exposes only supported_networks and supported_tokens to anon/authenticated.
-- Donors cannot call admin_get_config; this whitelisted SECURITY DEFINER RPC
-- is the safe public path. Idempotent: CREATE OR REPLACE + GRANT are safe to
-- re-run. Apply after 20260727000002_giv782_token_network_config_seed.sql.

CREATE OR REPLACE FUNCTION public.get_public_platform_config()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_networks jsonb;
  v_tokens   jsonb;
BEGIN
  SELECT value INTO v_networks
    FROM public.platform_config
   WHERE key = 'supported_networks';

  SELECT value INTO v_tokens
    FROM public.platform_config
   WHERE key = 'supported_tokens';

  RETURN jsonb_build_object(
    'supported_networks', COALESCE(v_networks, '[]'::jsonb),
    'supported_tokens',   COALESCE(v_tokens,   '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_platform_config() TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_platform_config() TO authenticated;
