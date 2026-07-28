import { useState, useEffect } from "react";
import {
  getPublicPlatformConfig,
  type PublicPlatformConfig,
} from "@/services/publicPlatformConfigService";

// One fetch per page load, shared across all hook instances.
let _cached: PublicPlatformConfig | null = null;
let _pending: Promise<PublicPlatformConfig> | null = null;

function fetchOnce(): Promise<PublicPlatformConfig> {
  if (_cached) return Promise.resolve(_cached);
  if (!_pending) {
    _pending = getPublicPlatformConfig()
      .then((cfg) => {
        _cached = cfg;
        return cfg;
      })
      .catch((err: unknown) => {
        _pending = null;
        throw err;
      });
  }
  return _pending;
}

export interface UsePlatformConfigResult {
  /**
   * Admin-enabled chain IDs from platform_config.supported_networks.
   * null while loading or on fetch error — callers should show all chains.
   */
  supportedNetworks: number[] | null;
  /**
   * Admin-enabled token symbols from platform_config.supported_tokens.
   * null while loading or on fetch error — callers should show all tokens.
   */
  supportedTokens: string[] | null;
  loading: boolean;
}

/**
 * Returns the public platform config (network and token allow-lists set by
 * admin). Fetches once per page load; subsequent hook instances share the
 * cached result. Returns null fields on error so callers gracefully fall back
 * to full hard-coded chain/token lists.
 * @returns UsePlatformConfigResult
 */
export function usePlatformConfig(): UsePlatformConfigResult {
  const [result, setResult] = useState<UsePlatformConfigResult>({
    supportedNetworks: null,
    supportedTokens: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    fetchOnce()
      .then((cfg) => {
        if (!cancelled) {
          setResult({
            supportedNetworks: cfg.supportedNetworks,
            supportedTokens: cfg.supportedTokens,
            loading: false,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResult({
            supportedNetworks: null,
            supportedTokens: null,
            loading: false,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return result;
}
