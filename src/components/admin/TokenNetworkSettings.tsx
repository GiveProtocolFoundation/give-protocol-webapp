/**
 * Structured Token & Network settings for the admin System Settings page.
 * Renders the full chain registry with per-network enable toggles and a
 * per-token checkbox list, persisted to the platform_config table
 * (supported_networks / supported_tokens keys).
 */

import React, { useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type {
  PlatformConfigEntry,
  PlatformConfigKey,
  PlatformConfigValue,
} from "@/types/adminPlatformConfig";
import {
  NETWORK_OPTIONS,
  TOKEN_OPTIONS,
  parseEnabledChainIds,
  parseEnabledTokens,
  serializeEnabledNetworks,
} from "./tokenNetworkUtils";
import type { AdminNetworkOption, AdminTokenOption } from "./tokenNetworkUtils";

// ─── Row sub-components ───────────────────────────────────────────────────────

function NetworkRow({
  option,
  enabled,
  saving,
  onToggle,
}: {
  option: AdminNetworkOption;
  enabled: boolean;
  saving: boolean;
  onToggle: (_e: React.ChangeEvent<HTMLInputElement>) => void;
}): React.ReactElement {
  return (
    <label
      className={`flex items-center gap-3 py-2.5 px-1 border-b border-gray-100 last:border-0 ${
        option.available ? "cursor-pointer" : "opacity-60"
      }`}
    >
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
        checked={enabled}
        disabled={!option.available || saving}
        data-chain-id={option.chainId}
        onChange={onToggle}
      />
      <span className="flex-1 text-sm font-medium text-gray-800">
        {option.name}
        <span className="ml-2 text-xs font-normal text-gray-400">
          {option.ecosystem}
        </span>
      </span>
      {option.available ? (
        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
          Available
        </span>
      ) : (
        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
          {option.unavailableReason}
        </span>
      )}
    </label>
  );
}

/**
 * Renders a single token checkbox row.
 * @param props - Token option, enabled/saving state, and toggle handler
 * @returns Token row element
 */
function TokenRow({
  option,
  enabled,
  saving,
  onToggle,
}: {
  option: AdminTokenOption;
  enabled: boolean;
  saving: boolean;
  onToggle: (_e: React.ChangeEvent<HTMLInputElement>) => void;
}): React.ReactElement {
  return (
    <label className="flex items-center gap-3 py-2 px-1 cursor-pointer">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
        checked={enabled}
        disabled={saving}
        data-symbol={option.symbol}
        onChange={onToggle}
      />
      <span className="text-sm font-medium text-gray-800">{option.symbol}</span>
      <span className="text-xs text-gray-400">{option.name}</span>
    </label>
  );
}

/**
 * Shows the last-updated timestamp and author for a config entry.
 * @param props - Platform config entry
 * @returns Metadata line, or null when the entry has never been updated
 */
function SectionMeta({
  entry,
}: {
  entry: PlatformConfigEntry;
}): React.ReactElement | null {
  if (entry.updatedAt === null) return null;
  const updated = new Date(entry.updatedAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return (
    <p className="text-xs text-gray-400 mt-2">
      Last updated: {updated}
      {entry.updatedBy !== null && ` by ${entry.updatedBy}`}
    </p>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface TokenNetworkSettingsProps {
  /** All platform config entries (only the token/network keys are used) */
  configs: PlatformConfigEntry[];
  /** Whether config data is still being fetched */
  loading: boolean;
  /** Whether a save is in flight */
  saving: boolean;
  /** Persists a config value; resolves true on success */
  onSave: (_key: PlatformConfigKey, _value: PlatformConfigValue) => void;
  /** Opens the raw JSON editor for a config entry */
  onEditRaw: (_entry: PlatformConfigEntry) => void;
}

/**
 * Renders the structured Token & Network configuration tab: network enable
 * toggles driven by the chain registry and a token checkbox list, both
 * persisted to platform_config.
 * @param props - Component props (see TokenNetworkSettingsProps)
 * @returns The token/network settings element
 */
export function TokenNetworkSettings({
  configs,
  loading,
  saving,
  onSave,
  onEditRaw,
}: TokenNetworkSettingsProps): React.ReactElement {
  const networksEntry = configs.find((e) => e.key === "supported_networks");
  const tokensEntry = configs.find((e) => e.key === "supported_tokens");

  const storedChainIds = useMemo(
    () => parseEnabledChainIds(networksEntry?.value),
    [networksEntry],
  );
  const storedTokens = useMemo(
    () => parseEnabledTokens(tokensEntry?.value),
    [tokensEntry],
  );

  const [draftChainIds, setDraftChainIds] = useState<Set<number> | null>(null);
  const [draftTokens, setDraftTokens] = useState<Set<string> | null>(null);

  const enabledChainIds = draftChainIds ?? storedChainIds;
  const enabledTokens = draftTokens ?? storedTokens;

  const networksDirty =
    draftChainIds !== null &&
    (draftChainIds.size !== storedChainIds.size ||
      [...draftChainIds].some((id) => !storedChainIds.has(id)));
  const tokensDirty =
    draftTokens !== null &&
    (draftTokens.size !== storedTokens.size ||
      [...draftTokens].some((s) => !storedTokens.has(s)));

  const handleNetworkToggle = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const chainId = Number(e.currentTarget.dataset.chainId);
      if (Number.isNaN(chainId)) return;
      setDraftChainIds((prev) => {
        const next = new Set(prev ?? storedChainIds);
        if (next.has(chainId)) {
          next.delete(chainId);
        } else {
          next.add(chainId);
        }
        return next;
      });
    },
    [storedChainIds],
  );

  const handleTokenToggle = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const symbol = e.currentTarget.dataset.symbol;
      if (symbol === undefined || symbol === "") return;
      setDraftTokens((prev) => {
        const next = new Set(prev ?? storedTokens);
        if (next.has(symbol)) {
          next.delete(symbol);
        } else {
          next.add(symbol);
        }
        return next;
      });
    },
    [storedTokens],
  );

  const handleSaveNetworks = useCallback(() => {
    onSave("supported_networks", serializeEnabledNetworks(enabledChainIds));
  }, [onSave, enabledChainIds]);

  const handleSaveTokens = useCallback(() => {
    const known = TOKEN_OPTIONS.filter((t) => enabledTokens.has(t.symbol)).map(
      (t) => t.symbol,
    );
    const extras = [...enabledTokens].filter(
      (s) => !TOKEN_OPTIONS.some((t) => t.symbol === s),
    );
    onSave("supported_tokens", [...known, ...extras]);
  }, [onSave, enabledTokens]);

  const handleEditNetworksRaw = useCallback(() => {
    if (networksEntry !== undefined) onEditRaw(networksEntry);
  }, [onEditRaw, networksEntry]);

  const handleEditTokensRaw = useCallback(() => {
    if (tokensEntry !== undefined) onEditRaw(tokensEntry);
  }, [onEditRaw, tokensEntry]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (networksEntry === undefined && tokensEntry === undefined) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-500 text-sm">
          No token or network configuration found.
        </p>
      </Card>
    );
  }

  const unknownTokens = [...enabledTokens].filter(
    (s) => !TOKEN_OPTIONS.some((t) => t.symbol === s),
  );

  return (
    <div className="space-y-6">
      {networksEntry !== undefined && (
        <Card className="p-5">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-800">
                Donation Networks
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Networks donors can use for on-chain donations. Networks marked
                unavailable require contract deployment before they can be
                enabled.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleEditNetworksRaw}
            >
              Edit JSON
            </Button>
          </div>
          <div>
            {NETWORK_OPTIONS.map((option) => (
              <NetworkRow
                key={option.chainId}
                option={option}
                enabled={enabledChainIds.has(option.chainId)}
                saving={saving}
                onToggle={handleNetworkToggle}
              />
            ))}
          </div>
          <div className="flex items-center justify-between mt-3">
            <SectionMeta entry={networksEntry} />
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveNetworks}
              disabled={!networksDirty || saving}
            >
              {saving ? "Saving…" : "Save Networks"}
            </Button>
          </div>
        </Card>
      )}

      {tokensEntry !== undefined && (
        <Card className="p-5">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-800">
                Accepted Tokens
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Token symbols accepted for on-chain donations across enabled
                networks.
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleEditTokensRaw}>
              Edit JSON
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3">
            {TOKEN_OPTIONS.map((option) => (
              <TokenRow
                key={option.symbol}
                option={option}
                enabled={enabledTokens.has(option.symbol)}
                saving={saving}
                onToggle={handleTokenToggle}
              />
            ))}
            {unknownTokens.map((symbol) => (
              <TokenRow
                key={symbol}
                option={{ symbol, name: "Custom token" }}
                enabled
                saving={saving}
                onToggle={handleTokenToggle}
              />
            ))}
          </div>
          <div className="flex items-center justify-between mt-3">
            <SectionMeta entry={tokensEntry} />
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveTokens}
              disabled={!tokensDirty || saving}
            >
              {saving ? "Saving…" : "Save Tokens"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
