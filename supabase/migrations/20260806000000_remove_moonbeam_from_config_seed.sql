-- Remove Moonbeam (chain ID 1284) and Moonbase Alpha (chain ID 1287)
-- from token_network_config seed data.
-- These chains are no longer supported by Give Protocol.

DELETE FROM token_network_config WHERE chain_id = 1284;
DELETE FROM token_network_config WHERE chain_id = 1287;
