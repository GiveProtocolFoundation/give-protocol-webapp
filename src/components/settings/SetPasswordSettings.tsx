import React, { useState, useEffect, useCallback } from "react";
import { KeyRound, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordStrengthBar } from "@/components/auth/PasswordStrengthBar";
import { supabase } from "@/lib/supabase";
import { Logger } from "@/utils/logger";

/** Password settings card — set password for first-time or change existing. */
export const SetPasswordSettings: React.FC = () => {
  const [hasEmailIdentity, setHasEmailIdentity] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    /** Determine whether the current user has an email identity attached. */
    const checkIdentities = async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      const hasEmail = Boolean(
        data.user?.identities?.some((i) => i.provider === "email"),
      );
      setHasEmailIdentity(hasEmail);
    };

    checkIdentities();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleExpand = useCallback(() => {
    setExpanded(true);
    setValidationError(null);
    setSaveError(null);
    setSaveSuccess(false);
  }, []);

  const handleCancel = useCallback(() => {
    setExpanded(false);
    setNewPassword("");
    setConfirmPassword("");
    setValidationError(null);
    setSaveError(null);
  }, []);

  const handleNewPasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setNewPassword(e.target.value);
      setValidationError(null);
    },
    [],
  );

  const handleConfirmPasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setConfirmPassword(e.target.value);
      setValidationError(null);
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setValidationError(null);
      setSaveError(null);
      setSaveSuccess(false);

      if (newPassword.length < 8) {
        setValidationError("Password must be at least 8 characters");
        return;
      }

      if (newPassword !== confirmPassword) {
        setValidationError("Passwords do not match");
        return;
      }

      setSaving(true);
      try {
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (error) {
          throw new Error(error.message);
        }
        setSaveSuccess(true);
        setExpanded(false);
        setNewPassword("");
        setConfirmPassword("");
        if (!hasEmailIdentity) {
          setHasEmailIdentity(true);
        }
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to update password";
        setSaveError(msg);
        Logger.error("Password update failed", { error: msg });
      } finally {
        setSaving(false);
      }
    },
    [newPassword, confirmPassword, hasEmailIdentity],
  );

  const title = hasEmailIdentity ? "Change Password" : "Set Password";
  const description = hasEmailIdentity
    ? "Update your account password"
    : "Add a password to sign in with your email";

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-700">
          <KeyRound className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {description}
          </p>
        </div>
      </div>

      {saveSuccess && !expanded && (
        <div className="flex items-center gap-2 p-3 mb-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-sm text-emerald-600 dark:text-emerald-400">
            Password updated successfully
          </span>
        </div>
      )}

      {expanded ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Input
              label="New password"
              id="settings-new-password"
              type="password"
              value={newPassword}
              onChange={handleNewPasswordChange}
              placeholder="Min. 8 characters"
              autoComplete="new-password"
            />
            <div className="mt-2">
              <PasswordStrengthBar password={newPassword} />
            </div>
          </div>

          <Input
            label="Confirm password"
            id="settings-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={handleConfirmPasswordChange}
            placeholder="Re-enter new password"
            autoComplete="new-password"
            error={validationError ?? undefined}
          />

          {saveError !== null && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
              <span className="text-sm text-red-600 dark:text-red-400">
                {saveError}
              </span>
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Saving…" : title}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="secondary" size="sm" onClick={handleExpand}>
          {title}
        </Button>
      )}
    </div>
  );
};
