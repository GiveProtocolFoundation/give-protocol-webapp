-- GIV-790: Expand supported networks to include Ethereum, Arbitrum, Polygon, Avalanche
-- Adds the 4 new EVM chains to the supported_networks seed alongside the
-- existing 6 (Base, Optimism, Moonbeam, Solana, Polkadot, Kusama).
-- Guarded on the GIV-782 seed value so intentional admin edits aren't clobbered.

UPDATE public.platform_config
SET value = '[
      {"chainId":1,"name":"Ethereum"},
      {"chainId":8453,"name":"Base"},
      {"chainId":10,"name":"Optimism"},
      {"chainId":1284,"name":"Moonbeam"},
      {"chainId":42161,"name":"Arbitrum"},
      {"chainId":137,"name":"Polygon"},
      {"chainId":43114,"name":"Avalanche"},
      {"chainId":900001,"name":"Solana"},
      {"chainId":900002,"name":"Polkadot"},
      {"chainId":900003,"name":"Kusama"}
    ]'::jsonb,
    updated_at = NOW()
WHERE key = 'supported_networks'
  AND value @> '[{"chainId":8453},{"chainId":10},{"chainId":1284}]'::jsonb
  AND NOT value @> '[{"chainId":42161}]'::jsonb;

UPDATE public.platform_config
SET value = '["ETH","WETH","USDC","USDT","DAI","OP","ARB","POL","AVAX","WAVAX","GLMR","WGLMR","DOT","SOL","KSM"]'::jsonb,
    updated_at = NOW()
WHERE key = 'supported_tokens'
  AND value = '["ETH","WETH","USDC","USDT","DAI","OP","GLMR","WGLMR","DOT","SOL","KSM"]'::jsonb;
