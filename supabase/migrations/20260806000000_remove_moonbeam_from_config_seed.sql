-- GIV-868: Remove Moonbeam (chain ID 1284) and Moonbase Alpha (chain ID 1287)
-- from the platform_config seed data (supported_networks / supported_tokens).
-- These chains are no longer supported by Give Protocol.
--
-- Networks and tokens are stored as JSONB arrays on public.platform_config,
-- not as rows in a dedicated table, so the removal is a jsonb filter rather
-- than a DELETE. Idempotent: re-running finds nothing left to remove.

UPDATE public.platform_config
SET value = (
      SELECT COALESCE(jsonb_agg(network), '[]'::jsonb)
      FROM jsonb_array_elements(value) AS network
      WHERE (network->>'chainId')::numeric NOT IN (1284, 1287)
    ),
    updated_at = NOW()
WHERE key = 'supported_networks';

UPDATE public.platform_config
SET value = (
      SELECT COALESCE(jsonb_agg(token), '[]'::jsonb)
      FROM jsonb_array_elements(value) AS token
      WHERE token NOT IN ('"GLMR"', '"WGLMR"')
    ),
    updated_at = NOW()
WHERE key = 'supported_tokens';
