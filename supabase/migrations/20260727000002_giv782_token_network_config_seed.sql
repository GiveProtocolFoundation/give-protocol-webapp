-- GIV-782: Token & Network settings
-- The original seed left supported_networks as Base-only and supported_tokens
-- as ETH/USDC, which does not reflect the chains the donation flow actually
-- integrates (Base, Optimism, Moonbeam, Solana, Polkadot, Kusama).
-- Expand both seeds to the real integrated set. Non-EVM chains use the
-- synthetic chain IDs from src/config/contracts.ts (Solana 900001,
-- Polkadot 900002, Kusama 900003).
-- Both updates are guarded on the original seed value so an intentional
-- admin edit is never clobbered; the script is idempotent.

UPDATE public.platform_config
SET value = '[
      {"chainId":8453,"name":"Base"},
      {"chainId":10,"name":"Optimism"},
      {"chainId":1284,"name":"Moonbeam"},
      {"chainId":900001,"name":"Solana"},
      {"chainId":900002,"name":"Polkadot"},
      {"chainId":900003,"name":"Kusama"}
    ]'::jsonb,
    updated_at = NOW()
WHERE key = 'supported_networks'
  AND value = '[{"chainId":8453,"name":"Base"}]'::jsonb;

UPDATE public.platform_config
SET value = '["ETH","WETH","USDC","USDT","DAI","OP","GLMR","WGLMR","DOT","SOL","KSM"]'::jsonb,
    updated_at = NOW()
WHERE key = 'supported_tokens'
  AND value = '["ETH","USDC"]'::jsonb;
