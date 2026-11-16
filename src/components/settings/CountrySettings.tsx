import React, { useState, useEffect, useCallback, useMemo } from "react";
import { MapPin } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";
import { useTranslation } from "@/hooks/useTranslation";
import { useCountries } from "@/hooks/useCountries";
import { Card } from "@/components/ui/Card";
import { getOwnCountry, setOwnCountry } from "@/services/giverCountryService";

/**
 * Returns a country's name in the app language, falling back to the English name.
 * @param code - ISO 3166-1 alpha-2 country code
 * @param fallback - English name to use when the language has no name for it
 * @param language - The app language code
 * @returns The display name
 */
function getCountryLabel(
  code: string,
  fallback: string,
  language: string,
): string {
  try {
    const name = new Intl.DisplayNames([language], { type: "region" }).of(code);
    return name !== undefined && name !== code ? name : fallback;
  } catch {
    return fallback;
  }
}

/** Settings panel where a user optionally shares their country, used for the giver region filter. */
export const CountrySettings: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { t, language } = useTranslation();
  const { countries } = useCountries();
  const [country, setCountry] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return undefined;
    let active = true;
    getOwnCountry(userId)
      .then((saved) => {
        if (!active) return;
        setCountry(saved ?? "");
        setLoaded(true);
      })
      .catch(() => {
        // Leave the control disabled: saving before the stored value loads could overwrite it.
        if (active) {
          setLoadFailed(true);
        }
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const options = useMemo(
    () =>
      countries
        .map((entry) => ({
          code: entry.code,
          label: getCountryLabel(entry.code, entry.name, language),
        }))
        .sort((a, b) => a.label.localeCompare(b.label, language)),
    [countries, language],
  );

  const handleChange = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (!userId) return;
      const previous = country;
      const next = e.target.value;
      setCountry(next);
      setSaving(true);
      try {
        await setOwnCountry(userId, next === "" ? null : next);
        showToast("success", t("settings.country.saved", "Country saved"));
      } catch {
        setCountry(previous);
        showToast(
          "error",
          t("settings.country.saveFailed", "Could not save your country"),
        );
      } finally {
        setSaving(false);
      }
    },
    [userId, country, showToast, t],
  );

  if (!userId) {
    return null;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center mb-2">
        <MapPin className="h-5 w-5 text-gray-500 mr-2" aria-hidden="true" />
        <h2 className="text-xl font-semibold text-gray-900">
          {t("settings.country.title", "Country")}
        </h2>
      </div>
      <p id="country-help" className="text-sm text-gray-500 mb-3">
        {t(
          "settings.country.help",
          "Optional. Your country is never displayed, but it places you in a region when rankings are filtered by giver region.",
        )}
      </p>
      <select
        id="country"
        value={country}
        onChange={handleChange}
        disabled={!loaded || saving}
        aria-label={t("settings.country.label", "Your country")}
        aria-describedby="country-help"
        className="w-full max-w-sm rounded-[10px] border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
      >
        <option value="">{t("settings.country.none", "Not specified")}</option>
        {options.map((option) => (
          <option key={option.code} value={option.code}>
            {option.label}
          </option>
        ))}
      </select>
      {loadFailed && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {t("settings.country.loadFailed", "Could not load your country")}
        </p>
      )}
    </Card>
  );
};
