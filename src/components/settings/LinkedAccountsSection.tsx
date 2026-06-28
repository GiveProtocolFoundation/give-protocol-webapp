import React, { useState, useEffect, useCallback } from "react";
import {
  Globe,
  Smartphone,
  AlertCircle,
  CheckCircle2,
  Link as LinkIcon,
  Unlink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { WalletLinkCard } from "@/components/wallet/WalletLinkCard";
import { supabase } from "@/lib/supabase";
import { Logger } from "@/utils/logger";
import type { UserIdentity } from "@supabase/supabase-js";

type OAuthProvider = "google" | "apple";

interface ProviderConfig {
  provider: OAuthProvider;
  label: string;
  icon: React.ReactNode;
}

const PROVIDERS: ProviderConfig[] = [
  {
    provider: "google",
    label: "Google",
    icon: <Globe className="h-5 w-5 text-blue-500" />,
  },
  {
    provider: "apple",
    label: "Apple",
    icon: <Smartphone className="h-5 w-5 text-gray-700 dark:text-gray-300" />,
  },
];

interface ProviderCardProps {
  config: ProviderConfig;
  identity: UserIdentity | undefined;
  onLink: (_provider: OAuthProvider) => Promise<void>;
  onUnlink: (_identity: UserIdentity) => Promise<void>;
  disabled: boolean;
}

/** Card showing OAuth provider link status with connect/disconnect actions. */
const ProviderCard: React.FC<ProviderCardProps> = ({
  config,
  identity,
  onLink,
  onUnlink,
  disabled,
}) => {
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardSuccess, setCardSuccess] = useState<string | null>(null);

  const handleLink = useCallback(async () => {
    setCardError(null);
    setCardSuccess(null);
    try {
      await onLink(config.provider);
    } catch (err) {
      setCardError(
        err instanceof Error
          ? err.message
          : `Failed to connect ${config.label}`,
      );
    }
  }, [onLink, config.provider, config.label]);

  const handleUnlink = useCallback(async () => {
    if (identity === undefined) return;
    setCardError(null);
    setCardSuccess(null);
    try {
      await onUnlink(identity);
      setCardSuccess(`${config.label} disconnected`);
    } catch (err) {
      setCardError(
        err instanceof Error
          ? err.message
          : `Failed to disconnect ${config.label}`,
      );
    }
  }, [onUnlink, identity, config.label]);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-700">
          {config.icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {config.label}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {identity !== undefined
              ? "Connected to your account"
              : "Not connected"}
          </p>
        </div>
      </div>

      {identity !== undefined && (
        <div className="flex items-center gap-2 p-3 mb-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
            Connected
          </span>
        </div>
      )}

      {cardError !== null && (
        <div className="flex items-center gap-2 p-3 mb-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
          <span className="text-sm text-red-600 dark:text-red-400">
            {cardError}
          </span>
        </div>
      )}

      {cardSuccess !== null && cardError === null && (
        <div className="flex items-center gap-2 p-3 mb-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-sm text-emerald-600 dark:text-emerald-400">
            {cardSuccess}
          </span>
        </div>
      )}

      {identity !== undefined ? (
        <Button
          onClick={handleUnlink}
          variant="secondary"
          size="sm"
          disabled={disabled}
          icon={<Unlink className="h-4 w-4" />}
        >
          Disconnect {config.label}
        </Button>
      ) : (
        <Button
          onClick={handleLink}
          size="sm"
          disabled={disabled}
          icon={<LinkIcon className="h-4 w-4" />}
        >
          Connect {config.label}
        </Button>
      )}
    </div>
  );
};

/** Linked Accounts section showing OAuth providers and wallet connection status. */
export const LinkedAccountsSection: React.FC = () => {
  const [identities, setIdentities] = useState<UserIdentity[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    /** Fetch the current user's linked identity providers */
    const loadIdentities = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (cancelled) return;
      if (error) {
        setLoadError("Could not load linked accounts");
        Logger.error("Failed to load user identities", {
          error: error.message,
        });
        return;
      }
      setIdentities(data.user?.identities ?? []);
    };

    loadIdentities();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLink = useCallback(async (provider: OAuthProvider) => {
    setActionLoading(true);
    try {
      const { error } = await supabase.auth.linkIdentity({ provider });
      if (error) {
        throw new Error(error.message);
      }
      // linkIdentity redirects to OAuth; on return the identity list updates
    } catch (err) {
      setActionLoading(false);
      throw err;
    }
    // Don't reset loading — page will navigate away for OAuth redirect
  }, []);

  const handleUnlink = useCallback(async (identity: UserIdentity) => {
    setActionLoading(true);
    try {
      const { error } = await supabase.auth.unlinkIdentity(identity);
      if (error) {
        throw new Error(error.message);
      }
      setIdentities((prev) =>
        prev.filter((i) => i.identity_id !== identity.identity_id),
      );
    } finally {
      setActionLoading(false);
    }
  }, []);

  const findIdentity = useCallback(
    (provider: OAuthProvider): UserIdentity | undefined =>
      identities.find((i) => i.provider === provider),
    [identities],
  );

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 mb-6">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
        Linked Accounts
      </h3>

      {loadError !== null && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
          <span className="text-sm text-red-600 dark:text-red-400">
            {loadError}
          </span>
        </div>
      )}

      <div className="space-y-3">
        {PROVIDERS.map((config) => (
          <ProviderCard
            key={config.provider}
            config={config}
            identity={findIdentity(config.provider)}
            onLink={handleLink}
            onUnlink={handleUnlink}
            disabled={actionLoading}
          />
        ))}

        <WalletLinkCard />
      </div>
    </div>
  );
};
