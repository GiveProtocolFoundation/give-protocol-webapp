import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Search, Download } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { DonationLeaderboard } from "@/components/contribution/DonationLeaderboard";
import { VolunteerLeaderboard } from "@/components/contribution/VolunteerLeaderboard";
import { GlobalStats } from "@/components/contribution/GlobalStats";
import { RegionFilter } from "@/components/contribution/RegionFilter";
import { TimeRangeFilter } from "@/components/contribution/TimeRangeFilter";
import { useWalletAlias } from "@/hooks/useWalletAlias";
import { useWeb3 } from "@/contexts/Web3Context";
import { useToast } from "@/contexts/ToastContext";
import { Logger } from "@/utils/logger";
import { useTranslation } from "@/hooks/useTranslation";
import {
  exportLeaderboardToPDF,
  exportDonationLeaderboardToCSV,
  exportVolunteerLeaderboardToCSV,
  DonationLeaderData,
  VolunteerLeaderData,
} from "@/utils/leaderboardExport";

type TimeRange = "all" | "year" | "month" | "week";
type Region = "all" | "na" | "eu" | "asia" | "africa" | "sa" | "oceania";

/** Filter bar for the contribution tracker with search, time range, region, and export controls. */
const ContributionFilters: React.FC<{
  searchTerm: string;
  onSearchChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
  timeRange: TimeRange;
  onTimeRangeChange: (_value: TimeRange) => void;
  region: Region;
  onRegionChange: (_value: Region) => void;
  showOptOut: boolean;
  onOptOutChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportCsv: () => void;
  onExportPdf: () => void;
  isConnected: boolean;
  alias: string | null;
  onChangeAlias: () => void;
  onSetAlias: () => void;
}> = ({
  searchTerm,
  onSearchChange,
  timeRange,
  onTimeRangeChange,
  region,
  onRegionChange,
  showOptOut,
  onOptOutChange,
  onExportCsv,
  onExportPdf,
  isConnected,
  alias,
  onChangeAlias,
  onSetAlias,
}) => {
  const { t } = useTranslation();
  return (
    <div className="mb-8 bg-white p-6 rounded-lg shadow-md flex flex-col gap-4">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="flex-grow relative">
          <input
            type="text"
            placeholder={t(
              "tracker.searchPlaceholder",
              "Search contributors...",
            )}
            value={searchTerm}
            onChange={onSearchChange}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
        <TimeRangeFilter value={timeRange} onChange={onTimeRangeChange} />
        <Button
          variant="secondary"
          onClick={onExportCsv}
          className="flex items-center"
        >
          <Download className="h-4 w-4 mr-2" />
          {t("tracker.exportCSV", "Export CSV")}
        </Button>
        <Button
          variant="secondary"
          onClick={onExportPdf}
          className="flex items-center"
        >
          <Download className="h-4 w-4 mr-2" />
          {t("tracker.exportPDF", "Export PDF")}
        </Button>
      </div>
      <div className="mt-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <RegionFilter value={region} onChange={onRegionChange} />
        <label className="flex items-center space-x-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={showOptOut}
            onChange={onOptOutChange}
            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span>
            {t(
              "tracker.hideContributions",
              "Hide my contributions from rankings",
            )}
          </span>
        </label>
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
  const [region, setRegion] = useState<Region>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showOptOut, setShowOptOut] = useState(false);
  const [showAliasModal, setShowAliasModal] = useState(false);
  const [newAlias, setNewAlias] = useState("");
  const { alias, setWalletAlias } = useWalletAlias();
  const { isConnected, address } = useWeb3();
  const { showToast } = useToast();
  const { t } = useTranslation();
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
          region,
          includeTimestamp: true,
        };

        if (format === "csv") {
          // For CSV, we need to get mock data since the components use mock data
          // In a real implementation, we'd extract data from the components or API
          if (activeTab === "donations") {
            // Mock donation leaderboard data for export
            const donationData: DonationLeaderData[] = [
              {
                rank: 1,
                displayName: "Anonymous Hero",
                totalDonated: 50000,
                alias: "Anonymous Hero",
              },
              {
                rank: 2,
                displayName: "Giving Soul",
                totalDonated: 35000,
                alias: "Giving Soul",
              },
              {
                rank: 3,
                displayName: "Kind Heart",
                totalDonated: 25000,
                alias: "Kind Heart",
              },
              {
                rank: 4,
                displayName: "Hope Giver",
                totalDonated: 15000,
                alias: "Hope Giver",
              },
              {
                rank: 5,
                displayName: "Change Maker",
                totalDonated: 10000,
                alias: "Change Maker",
              },
            ];
            exportDonationLeaderboardToCSV(donationData, exportOptions);
            showToast(
              "success",
              t("tracker.exportComplete", "Export Complete"),
              t(
                "tracker.exportDonationCSV",
                "Donation leaderboard exported as CSV",
              ),
            );
          } else {
            // Mock volunteer leaderboard data for export
            const volunteerData: VolunteerLeaderData[] = [
              {
                rank: 1,
                displayName: "Community Builder",
                hours: 120,
                endorsements: 45,
                skills: [
                  "Web Development",
                  "Project Management",
                  "Community Building",
                ],
                alias: "Community Builder",
              },
              {
                rank: 2,
                displayName: "Helping Hand",
                hours: 95,
                endorsements: 38,
                skills: ["Event Planning", "Fundraising", "Social Media"],
                alias: "Helping Hand",
              },
              {
                rank: 3,
                displayName: "Skill Sharer",
                hours: 85,
                endorsements: 32,
                skills: ["Web Development", "Teaching", "Mentoring"],
                alias: "Skill Sharer",
              },
            ];
            exportVolunteerLeaderboardToCSV(volunteerData, exportOptions);
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
    [timeRange, region, activeTab, showToast, t],
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

  const handleOptOutChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setShowOptOut(e.target.checked);
    },
    [],
  );

  const handleTimeRangeChange = useCallback((value: TimeRange) => {
    setTimeRange(value);
  }, []);

  const handleRegionChange = useCallback((value: Region) => {
    setRegion(value);
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
        region={region}
        onRegionChange={handleRegionChange}
        showOptOut={showOptOut}
        onOptOutChange={handleOptOutChange}
        onExportCsv={handleExportCsv}
        onExportPdf={handleExportPdf}
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
              timeRange={timeRange}
              region={region}
              searchTerm={searchTerm}
            />
          </div>
        </TabsContent>

        <TabsContent value="volunteer">
          <div
            ref={volunteerLeaderboardRef}
            className="bg-white rounded-lg shadow-md p-6"
          >
            <VolunteerLeaderboard
              timeRange={timeRange}
              region={region}
              searchTerm={searchTerm}
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
