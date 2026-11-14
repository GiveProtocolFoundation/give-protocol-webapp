import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Download, EyeOff } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { DonationLeaderboard } from "@/components/contribution/DonationLeaderboard";
import { VolunteerLeaderboard } from "@/components/contribution/VolunteerLeaderboard";
import { GlobalStats } from "@/components/contribution/GlobalStats";
import { TimeRangeFilter } from "@/components/contribution/TimeRangeFilter";
import { useWalletAlias } from "@/hooks/useWalletAlias";
import { useWeb3 } from "@/contexts/Web3Context";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/contexts/AuthContext";
import { Logger } from "@/utils/logger";
import { useTranslation } from "@/hooks/useTranslation";
import { usePageTitle } from "@/hooks/usePageTitle";
import { getPeriodStartDate } from "@/utils/date";
import {
  getRankingsHidden,
  setRankingsHidden,
} from "@/services/privacySettingsService";
import {
  exportLeaderboardToPDF,
  exportDonationLeaderboardToCSV,
  exportVolunteerLeaderboardToCSV,
  DonationLeaderData,
  VolunteerLeaderData,
} from "@/utils/leaderboardExport";

type TimeRange = "all" | "year" | "month" | "week";

/** Props for the "hide my contributions" control. */
interface RankingsPrivacyProps {
  hidden: boolean;
  saving: boolean;
  onChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Prominent toggle that hides the signed-in user's contributions from public rankings.
 * @param props - Current hidden state, saving flag and change handler
 * @returns The privacy control
 */
const RankingsPrivacyToggle: React.FC<RankingsPrivacyProps> = ({
  hidden,
  saving,
  onChange,
}) => {
  const { t } = useTranslation();
  return (
    <label
      htmlFor="hide-contributions"
      className="flex items-start gap-3 rounded-[10px] border border-emerald-100 bg-emerald-50 p-4 cursor-pointer md:max-w-xl"
    >
      <input
        id="hide-contributions"
        type="checkbox"
        checked={hidden}
        disabled={saving}
        onChange={onChange}
        aria-describedby="hide-contributions-help"
        className="mt-0.5 h-5 w-5 shrink-0 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-50"
      />
      <span className="flex flex-col gap-1">
        <span className="flex items-center gap-2 font-medium text-gray-900">
          <EyeOff className="h-4 w-4 text-emerald-700" aria-hidden="true" />
          {t(
            "tracker.hideContributions",
            "Hide my contributions from rankings",
          )}
        </span>
        <span id="hide-contributions-help" className="text-sm text-gray-600">
          {t(
            "tracker.hideContributionsHelp",
            "Your name and totals will not appear in public donation or volunteer rankings. You can change this at any time.",
          )}
        </span>
      </span>
    </label>
  );
};

/** Filter bar for the contribution tracker with search, time range, export and privacy controls. */
const ContributionFilters: React.FC<{
  searchTerm: string;
  onSearchChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
  timeRange: TimeRange;
  onTimeRangeChange: (_value: TimeRange) => void;
  exportDisabled: boolean;
  onExportCsv: () => void;
  onExportPdf: () => void;
  privacy: RankingsPrivacyProps | null;
  isConnected: boolean;
  alias: string | null;
  onChangeAlias: () => void;
  onSetAlias: () => void;
}> = ({
  searchTerm,
  onSearchChange,
  timeRange,
  onTimeRangeChange,
  exportDisabled,
  onExportCsv,
  onExportPdf,
  privacy,
  isConnected,
  alias,
  onChangeAlias,
  onSetAlias,
}) => {
  const { t } = useTranslation();
  const searchPlaceholder = t(
    "tracker.searchPlaceholder",
    "Search contributors...",
  );
  return (
    <div className="mb-8 bg-white p-6 rounded-lg shadow-md flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="flex-grow relative">
          <input
            type="search"
            aria-label={searchPlaceholder}
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={onSearchChange}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-[10px] shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          <Search
            className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
            aria-hidden="true"
          />
        </div>
        <TimeRangeFilter value={timeRange} onChange={onTimeRangeChange} />
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={onExportCsv}
            disabled={exportDisabled}
            className="flex items-center"
          >
            <Download className="h-4 w-4 mr-2" aria-hidden="true" />
            {t("tracker.exportCSV", "Export CSV")}
          </Button>
          <Button
            variant="secondary"
            onClick={onExportPdf}
            disabled={exportDisabled}
            className="flex items-center"
          >
            <Download className="h-4 w-4 mr-2" aria-hidden="true" />
            {t("tracker.exportPDF", "Export PDF")}
          </Button>
        </div>
      </div>
      {(privacy !== null || isConnected) && (
        <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between border-t border-gray-100 pt-4">
          {privacy !== null && (
            <RankingsPrivacyToggle
              hidden={privacy.hidden}
              saving={privacy.saving}
              onChange={privacy.onChange}
            />
          )}
          {isConnected && alias && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {t("tracker.yourAlias", "Your alias:")}{" "}
                <span className="font-medium text-emerald-600">{alias}</span>
              </span>
              <Button variant="secondary" size="sm" onClick={onChangeAlias}>
                {t("tracker.changeAlias", "Change")}
              </Button>
            </div>
          )}
          {isConnected && !alias && (
            <Button variant="secondary" size="sm" onClick={onSetAlias}>
              {t("tracker.setWalletAlias", "Set Wallet Alias")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

/** Modal for setting a wallet alias on the contribution tracker. */
const AliasModal: React.FC<{
  newAlias: string;
  onAliasChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
  onClose: () => void;
}> = ({ newAlias, onAliasChange, onSave, onClose }) => {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">
          {t("tracker.aliasTitle", "Set Wallet Alias")}
        </h2>
        <p className="text-gray-600">
          {t(
            "tracker.aliasDescription",
            "Your alias will be displayed on the contribution tracker instead of your wallet address.",
          )}
        </p>
        <div>
          <label
            htmlFor="alias-input"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {t("tracker.aliasLabel", "Alias")}
          </label>
          <input
            id="alias-input"
            type="text"
            value={newAlias}
            onChange={onAliasChange}
            placeholder={t(
              "tracker.aliasPlaceholder",
              "Enter your preferred alias",
            )}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
        <footer className="flex justify-end space-x-3">
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button onClick={onSave}>
            {t("tracker.saveAlias", "Save Alias")}
          </Button>
        </footer>
      </div>
    </div>
  );
};

/** Public contribution tracker page with filterable donation and volunteer data. */
export const ContributionTracker: React.FC = () => {
  const location = useLocation();
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [rankingsHidden, setRankingsHiddenState] = useState(false);
  const [privacySaving, setPrivacySaving] = useState(false);
  const [privacyLoaded, setPrivacyLoaded] = useState(false);
  const [donationRows, setDonationRows] = useState<DonationLeaderData[]>([]);
  const [volunteerRows, setVolunteerRows] = useState<VolunteerLeaderData[]>([]);
  const [showAliasModal, setShowAliasModal] = useState(false);
  const [newAlias, setNewAlias] = useState("");
  const { alias, setWalletAlias } = useWalletAlias();
  const { isConnected, address } = useWeb3();
  const { showToast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const userId = user?.id;
  const since = useMemo(() => getPeriodStartDate(timeRange), [timeRange]);
  usePageTitle(t("nav.contributions", "Contribution Tracker"));
  const [activeTab, setActiveTab] = useState<"donations" | "volunteer">(
    (location.state?.activeTab as "donations" | "volunteer") || "donations",
  );

  // Refs to access leaderboard components for export
  const donationLeaderboardRef = useRef<HTMLDivElement>(null);
  const volunteerLeaderboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  const handleExport = useCallback(
    async (format: "csv" | "pdf") => {
      try {
        Logger.info(`Exporting contributions as ${format}`, { format });

        const exportOptions = {
          timeRange,
          region: "all",
          includeTimestamp: true,
        };

        if (format === "csv") {
          if (activeTab === "donations") {
            exportDonationLeaderboardToCSV(donationRows, exportOptions);
            showToast(
              "success",
              t("tracker.exportComplete", "Export Complete"),
              t(
                "tracker.exportDonationCSV",
                "Donation leaderboard exported as CSV",
              ),
            );
          } else {
            exportVolunteerLeaderboardToCSV(volunteerRows, exportOptions);
            showToast(
              "success",
              t("tracker.exportComplete", "Export Complete"),
              t(
                "tracker.exportVolunteerCSV",
                "Volunteer leaderboard exported as CSV",
              ),
            );
          }
        } else if (format === "pdf") {
          // For PDF, capture the visible leaderboard elements
          const donationElement =
            activeTab === "donations" ? donationLeaderboardRef.current : null;
          const volunteerElement =
            activeTab === "volunteer" ? volunteerLeaderboardRef.current : null;

          if (donationElement || volunteerElement) {
            await exportLeaderboardToPDF(
              donationElement,
              volunteerElement,
              exportOptions,
            );
            showToast(
              "success",
              t("tracker.exportComplete", "Export Complete"),
              t("tracker.exportPDFSuccess", "Leaderboard exported as PDF"),
            );
          } else {
            showToast(
              "error",
              t("tracker.exportFailed", "Export Failed"),
              t("tracker.exportNoData", "No data available to export"),
            );
          }
        }
      } catch (error) {
        Logger.error("Export failed", { error, format });
        showToast(
          "error",
          t("tracker.exportFailed", "Export Failed"),
          t("tracker.exportError", "An error occurred while exporting data"),
        );
      }
    },
    [timeRange, activeTab, donationRows, volunteerRows, showToast, t],
  );

  const handleExportCsv = useCallback(
    () => handleExport("csv"),
    [handleExport],
  );
  const handleExportPdf = useCallback(
    () => handleExport("pdf"),
    [handleExport],
  );
  const handleShowAliasModal = useCallback(() => setShowAliasModal(true), []);
  const handleHideAliasModal = useCallback(() => setShowAliasModal(false), []);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value as "donations" | "volunteer");
  }, []);
  const handleChangeAlias = useCallback(() => {
    setNewAlias(alias);
    setShowAliasModal(true);
  }, [alias]);

  const handleSetAlias = useCallback(async () => {
    if (!isConnected || !address) {
      showToast(
        "error",
        t("tracker.walletNotConnected", "Wallet not connected"),
        t(
          "tracker.connectWalletForAlias",
          "Please connect your wallet to set an alias",
        ),
      );
      return;
    }

    if (!newAlias.trim()) {
      showToast(
        "error",
        t("tracker.invalidAlias", "Invalid alias"),
        t("tracker.enterValidAlias", "Please enter a valid alias"),
      );
      return;
    }

    const success = await setWalletAlias(newAlias);
    if (success) {
      setNewAlias("");
      setShowAliasModal(false);
    }
  }, [isConnected, address, newAlias, showToast, setWalletAlias, t]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
    },
    [],
  );

  const handleNewAliasChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setNewAlias(e.target.value);
    },
    [],
  );

  useEffect(() => {
    setPrivacyLoaded(false);
    if (!userId) {
      setRankingsHiddenState(false);
      return undefined;
    }
    let cancelled = false;
    getRankingsHidden(userId)
      .then((hidden) => {
        if (cancelled) return;
        setRankingsHiddenState(hidden);
        setPrivacyLoaded(true);
      })
      .catch((error: unknown) => {
        Logger.warn("Could not load rankings visibility", { error });
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleOptOutChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!userId) return;
      const hidden = e.target.checked;
      setRankingsHiddenState(hidden);
      setPrivacySaving(true);
      try {
        await setRankingsHidden(userId, hidden);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["donorLeaderboard"] }),
          queryClient.invalidateQueries({ queryKey: ["volunteerLeaderboard"] }),
        ]);
        showToast(
          "success",
          t("tracker.privacySaved", "Privacy setting saved"),
        );
      } catch (error) {
        Logger.error("Failed to save rankings visibility", { error });
        setRankingsHiddenState(!hidden);
        showToast(
          "error",
          t(
            "tracker.privacySaveFailed",
            "Could not save your privacy setting. Please try again.",
          ),
        );
      } finally {
        setPrivacySaving(false);
      }
    },
    [userId, queryClient, showToast, t],
  );

  const privacyControl = useMemo<RankingsPrivacyProps | null>(
    () =>
      userId
        ? {
            hidden: rankingsHidden,
            saving: privacySaving || !privacyLoaded,
            onChange: handleOptOutChange,
          }
        : null,
    [userId, rankingsHidden, privacySaving, privacyLoaded, handleOptOutChange],
  );

  const activeRowCount =
    activeTab === "donations" ? donationRows.length : volunteerRows.length;

  const handleTimeRangeChange = useCallback((value: TimeRange) => {
    setTimeRange(value);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        {t("tracker.title", "Global Impact Rankings")}
      </h1>
      <p className="mb-8 text-gray-600">
        {t(
          "tracker.subtitle",
          "Track and celebrate the collective impact of our community",
        )}
      </p>

      {/* Global Stats */}
      <GlobalStats />

      {/* Filters */}
      <ContributionFilters
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        timeRange={timeRange}
        onTimeRangeChange={handleTimeRangeChange}
        exportDisabled={activeRowCount === 0}
        onExportCsv={handleExportCsv}
        onExportPdf={handleExportPdf}
        privacy={privacyControl}
        isConnected={isConnected}
        alias={alias}
        onChangeAlias={handleChangeAlias}
        onSetAlias={handleShowAliasModal}
      />

      {/* Alias Modal */}
      {showAliasModal && (
        <AliasModal
          newAlias={newAlias}
          onAliasChange={handleNewAliasChange}
          onSave={handleSetAlias}
          onClose={handleHideAliasModal}
        />
      )}

      {/* Rankings Tabs */}
      <Tabs
        defaultValue={activeTab}
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-6"
      >
        <TabsList>
          <TabsTrigger value="donations">
            {t("tracker.donationRankings", "Donation Rankings")}
          </TabsTrigger>
          <TabsTrigger value="volunteer">
            {t("tracker.volunteerRankings", "Volunteer Rankings")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="donations">
          <div
            ref={donationLeaderboardRef}
            className="bg-white rounded-lg shadow-md p-6"
          >
            <DonationLeaderboard
              since={since}
              searchTerm={searchTerm}
              onRowsChange={setDonationRows}
            />
          </div>
        </TabsContent>

        <TabsContent value="volunteer">
          <div
            ref={volunteerLeaderboardRef}
            className="bg-white rounded-lg shadow-md p-6"
          >
            <VolunteerLeaderboard
              since={since}
              searchTerm={searchTerm}
              onRowsChange={setVolunteerRows}
              highlightSkill={location.state?.skill}
              section={location.state?.section}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContributionTracker;
