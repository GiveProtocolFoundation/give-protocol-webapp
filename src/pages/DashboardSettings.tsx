import React from "react";
import { Settings } from "lucide-react";
import { LinkedAccountsSection } from "@/components/settings/LinkedAccountsSection";
import { PhoneSettings } from "@/components/settings/PhoneSettings";
import { SetPasswordSettings } from "@/components/settings/SetPasswordSettings";
import { WalletAliasSettings } from "@/components/settings/WalletAliasSettings";
import { PrivacySettings } from "@/components/settings/PrivacySettings";
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";
import { useTranslation } from "@/hooks/useTranslation";

/** Dashboard settings page with linked accounts, phone, password, and account preferences. */
const DashboardSettings: React.FC = () => {
  const { user, email, authMethod } = useUnifiedAuth();
  const { t } = useTranslation();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800">
          <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t("settings.title", "Settings")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t(
              "settings.manageDescription",
              "Manage your account and preferences",
            )}
          </p>
        </div>
      </div>

      {/* Account info */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 mb-6 text-sm">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          {t("settings.account", "Account")}
        </h3>
        {email !== null && (
          <div className="flex justify-between mb-2">
            <span className="text-gray-500 dark:text-gray-400">
              {t("settings.email", "Email")}
            </span>
            <span className="text-gray-900 dark:text-white">{email}</span>
          </div>
        )}
        {user?.displayName !== null && user?.displayName !== undefined && (
          <div className="flex justify-between mb-2">
            <span className="text-gray-500 dark:text-gray-400">
              {t("settings.displayName", "Display name")}
            </span>
            <span className="text-gray-900 dark:text-white">
              {user.displayName}
            </span>
          </div>
        )}
        <div className="flex justify-between mb-2">
          <span className="text-gray-500 dark:text-gray-400">
            {t("settings.authMethod", "Auth method")}
          </span>
          <span className="text-gray-900 dark:text-white capitalize">
            {authMethod ?? "email"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">
            {t("settings.role", "Role")}
          </span>
          <span className="text-gray-900 dark:text-white capitalize">
            {user?.role ?? "donor"}
          </span>
        </div>
      </div>

      {/* Linked accounts — Google, Apple, Wallet */}
      <LinkedAccountsSection />

      {/* Phone number — optional, for urgent impact alerts */}
      <PhoneSettings />

      {/* Password — set or change */}
      <SetPasswordSettings />

      {/* Wallet alias settings */}
      <div className="mb-6">
        <WalletAliasSettings />
      </div>

      {/* Privacy — GDPR data export and account erasure */}
      <PrivacySettings />
    </div>
  );
};

export default DashboardSettings;
