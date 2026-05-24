import React, { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/lib/supabase";
import { Logger } from "@/utils/logger";
import { Plus, Edit, Archive, Heart } from "lucide-react";

interface PortfolioFundRow {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  image_url: string | null;
  charity_ids: string[];
  status: string;
  created_at: string;
}

interface CharityOption {
  id: string;
  name: string;
  ein: string;
}

interface FundFormData {
  name: string;
  description: string;
  category: string;
  image_url: string;
  charity_ids: string[];
}

const FUND_CATEGORIES = [
  "Environment",
  "Education",
  "Health",
  "Poverty Relief",
  "Animal Welfare",
  "Arts & Culture",
  "Community Development",
  "International Aid",
  "General",
] as const;

const emptyFormData: FundFormData = {
  name: "",
  description: "",
  category: "",
  image_url: "",
  charity_ids: [],
};

/** Status badge with colour coding. */
function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const classes: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    paused: "bg-yellow-100 text-yellow-800",
    archived: "bg-gray-100 text-gray-800",
  };
  const labels: Record<string, string> = {
    active: t("admin.portfolio.statusActive", "active"),
    paused: t("admin.portfolio.statusPaused", "paused"),
    archived: t("admin.portfolio.statusArchived", "archived"),
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${classes[status] ?? classes.archived}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

/** Scrollable list of charities with selection state for the fund form. */
function CharitySelector({
  charities,
  selectedIds,
  onToggle,
}: {
  charities: CharityOption[];
  selectedIds: string[];
  onToggle: (charityId: string) => void;
}) {
  const { t } = useTranslation();
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const cid = e.currentTarget.dataset.charityId;
      if (cid) onToggle(cid);
    },
    [onToggle],
  );

  return (
    <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
      {charities.map((charity) => {
        const isSelected = selectedIds.includes(charity.id);
        return (
          <button
            key={charity.id}
            type="button"
            data-charity-id={charity.id}
            onClick={handleClick}
            className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
              isSelected
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "hover:bg-gray-50 text-gray-700"
            }`}
          >
            {charity.name}
            <span className="text-xs text-gray-400 ml-2">({charity.ein})</span>
          </button>
        );
      })}
      {charities.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">
          {t("admin.portfolio.noCharitiesFound", "No verified charities found")}
        </p>
      )}
    </div>
  );
}

/** Single fund row with details and edit/archive actions. */
function FundListItem({
  fund,
  onEdit,
  onArchive,
}: {
  fund: PortfolioFundRow;
  onEdit: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onArchive: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const { t } = useTranslation();
  const charityCount = fund.charity_ids?.length ?? 0;
  return (
    <Card className="p-4 flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-gray-900 truncate">{fund.name}</h3>
          <StatusBadge status={fund.status} />
        </div>
        {fund.description && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {fund.description}
          </p>
        )}
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          {fund.category && <span>{fund.category}</span>}
          <span>
            {charityCount}{" "}
            {charityCount === 1
              ? t("admin.portfolio.charity", "charity")
              : t("admin.portfolio.charities", "charities")}
          </span>
          <span>
            {t("admin.portfolio.createdOn", "Created {{date}}", {
              date: new Date(fund.created_at).toLocaleDateString(),
            })}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          data-fund-id={fund.id}
          onClick={onEdit}
          className="p-2 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700"
          aria-label={`Edit ${fund.name}`}
        >
          <Edit className="h-4 w-4" />
        </button>
        {fund.status !== "archived" && (
          <button
            type="button"
            data-fund-id={fund.id}
            onClick={onArchive}
            className="p-2 rounded-md hover:bg-gray-100 text-gray-500 hover:text-red-600"
            aria-label={`Archive ${fund.name}`}
          >
            <Archive className="h-4 w-4" />
          </button>
        )}
      </div>
    </Card>
  );
}

/** Form for creating or editing a portfolio fund. */
function FundForm({
  formData,
  charities,
  onSubmit,
  onCancel,
  loading,
  isEdit,
  onFieldChange,
  onCharityToggle,
}: {
  formData: FundFormData;
  charities: CharityOption[];
  onSubmit: () => void;
  onCancel: () => void;
  loading: boolean;
  isEdit: boolean;
  onFieldChange: (field: keyof FundFormData, value: string) => void;
  onCharityToggle: (charityId: string) => void;
}) {
  const { t } = useTranslation();
  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFieldChange("name", e.target.value);
    },
    [onFieldChange],
  );

  const handleDescChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onFieldChange("description", e.target.value);
    },
    [onFieldChange],
  );

  const handleCategoryChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onFieldChange("category", e.target.value);
    },
    [onFieldChange],
  );

  const handleImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFieldChange("image_url", e.target.value);
    },
    [onFieldChange],
  );

  return (
    <Card className="p-6 mb-6 space-y-4">
      <h2 className="text-lg font-semibold">
        {isEdit
          ? t("admin.portfolio.editFund", "Edit Fund")
          : t("admin.portfolio.createNewFund", "Create New Fund")}
      </h2>
      <div>
        <label
          htmlFor="fund-name"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {t("admin.portfolio.fundName", "Fund Name")}
        </label>
        <Input
          id="fund-name"
          value={formData.name}
          onChange={handleNameChange}
          placeholder={t(
            "admin.portfolio.fundNamePlaceholder",
            "e.g. Environmental Impact Fund",
          )}
        />
      </div>

      <div>
        <label
          htmlFor="fund-description"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {t("admin.portfolio.description", "Description")}
        </label>
        <textarea
          id="fund-description"
          value={formData.description}
          onChange={handleDescChange}
          rows={3}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
          placeholder={t(
            "admin.portfolio.descriptionPlaceholder",
            "Describe the fund's purpose and impact focus...",
          )}
        />
      </div>

      <div>
        <label
          htmlFor="fund-category"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {t("admin.portfolio.category", "Category")}
        </label>
        <select
          id="fund-category"
          value={formData.category}
          onChange={handleCategoryChange}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
        >
          <option value="">
            {t("admin.portfolio.selectCategory", "Select a category")}
          </option>
          {FUND_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="fund-image"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {t("admin.portfolio.imageUrl", "Image URL")}
        </label>
        <Input
          id="fund-image"
          value={formData.image_url}
          onChange={handleImageChange}
          placeholder={t("admin.portfolio.imageUrlPlaceholder", "https://...")}
        />
      </div>

      <div>
        <p className="block text-sm font-medium text-gray-700 mb-2">
          {t(
            "admin.portfolio.selectCharities",
            "Select Charities ({{count}} selected)",
            {
              count: formData.charity_ids.length,
            },
          )}
        </p>
        <CharitySelector
          charities={charities}
          selectedIds={formData.charity_ids}
          onToggle={onCharityToggle}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button onClick={onSubmit} disabled={loading || !formData.name}>
          {loading
            ? t("admin.portfolio.saving", "Saving...")
            : isEdit
              ? t("admin.portfolio.updateFund", "Update Fund")
              : t("admin.portfolio.createFund", "Create Fund")}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          {t("common.cancel", "Cancel")}
        </Button>
      </div>
    </Card>
  );
}

/**
 * Admin page for managing portfolio funds.
 * Supports creating, editing, and archiving curated giving portfolios.
 */
const AdminPortfolioFunds: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [funds, setFunds] = useState<PortfolioFundRow[]>([]);
  const [charities, setCharities] = useState<CharityOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FundFormData>(emptyFormData);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [fundsRes, charitiesRes] = await Promise.all([
        supabase
          .from("portfolio_funds")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("charity_profiles")
          .select("id, name, ein")
          .eq("status", "verified"),
      ]);

      if (fundsRes.error) throw fundsRes.error;
      if (charitiesRes.error) throw charitiesRes.error;

      setFunds(fundsRes.data ?? []);
      setCharities(charitiesRes.data ?? []);
    } catch (err) {
      Logger.error("Failed to load admin portfolio data", { error: err });
      showToast("error", t("admin.portfolio.errorLoad", "Failed to load data"));
    } finally {
      setLoading(false);
    }
  }, [showToast, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFieldChange = useCallback(
    (field: keyof FundFormData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleCharityToggle = useCallback((charityId: string) => {
    setFormData((prev) => {
      const ids = prev.charity_ids.includes(charityId)
        ? prev.charity_ids.filter((id) => id !== charityId)
        : [...prev.charity_ids, charityId];
      return { ...prev, charity_ids: ids };
    });
  }, []);

  const handleCreateClick = useCallback(() => {
    setFormData(emptyFormData);
    setEditingId(null);
    setShowForm(true);
  }, []);

  const handleEditClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const fundId = e.currentTarget.dataset.fundId;
      const fund = funds.find((f) => f.id === fundId);
      if (!fund) return;
      setFormData({
        name: fund.name,
        description: fund.description ?? "",
        category: fund.category ?? "",
        image_url: fund.image_url ?? "",
        charity_ids: fund.charity_ids ?? [],
      });
      setEditingId(fund.id);
      setShowForm(true);
    },
    [funds],
  );

  const handleArchiveClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      const fundId = e.currentTarget.dataset.fundId;
      if (!fundId) return;
      const { error } = await supabase
        .from("portfolio_funds")
        .update({ status: "archived" })
        .eq("id", fundId);
      if (error) {
        showToast(
          "error",
          t("admin.portfolio.errorArchive", "Failed to archive fund"),
        );
      } else {
        showToast(
          "success",
          t("admin.portfolio.fundArchived", "Fund archived"),
        );
        loadData();
      }
    },
    [showToast, loadData, t],
  );

  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyFormData);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!formData.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        category: formData.category || null,
        image_url: formData.image_url.trim() || null,
        charity_ids: formData.charity_ids,
        created_by: user?.id ?? null,
      };

      if (editingId) {
        const { created_by: _unused, ...updatePayload } = payload;
        const { error } = await supabase
          .from("portfolio_funds")
          .update(updatePayload)
          .eq("id", editingId);
        if (error) throw error;
        showToast("success", t("admin.portfolio.fundUpdated", "Fund updated"));
      } else {
        const { error } = await supabase
          .from("portfolio_funds")
          .insert(payload);
        if (error) throw error;
        showToast("success", t("admin.portfolio.fundCreated", "Fund created"));
      }

      setShowForm(false);
      setEditingId(null);
      setFormData(emptyFormData);
      loadData();
    } catch (err) {
      Logger.error("Failed to save portfolio fund", { error: err });
      showToast("error", t("admin.portfolio.errorSave", "Failed to save fund"));
    } finally {
      setSaving(false);
    }
  }, [formData, editingId, user?.id, showToast, loadData, t]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t("admin.portfolio.title", "Portfolio Funds")}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t(
              "admin.portfolio.subtitle",
              "Create and manage curated giving portfolios",
            )}
          </p>
        </div>
        {!showForm && (
          <Button
            onClick={handleCreateClick}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {t("admin.portfolio.newFund", "New Fund")}
          </Button>
        )}
      </div>

      {showForm && (
        <FundForm
          formData={formData}
          charities={charities}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={saving}
          isEdit={editingId !== null}
          onFieldChange={handleFieldChange}
          onCharityToggle={handleCharityToggle}
        />
      )}

      <div className="space-y-4">
        {funds.map((fund) => (
          <FundListItem
            key={fund.id}
            fund={fund}
            onEdit={handleEditClick}
            onArchive={handleArchiveClick}
          />
        ))}

        {funds.length === 0 && (
          <div className="text-center py-16">
            <Heart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg text-gray-500">
              {t("admin.portfolio.noFundsYet", "No portfolio funds yet")}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {t(
                "admin.portfolio.noFundsMessage",
                "Create your first fund to group charities for bundled donations",
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPortfolioFunds;
