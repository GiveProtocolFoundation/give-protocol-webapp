import React, { useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useToast } from "@/contexts/ToastContext";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useAdminPlatformNews,
  type PlatformNewsRow,
  type PlatformNewsFormData,
} from "@/hooks/usePlatformNews";
import { Plus, Edit, Trash2, Eye, EyeOff, Newspaper } from "lucide-react";

const NEWS_CATEGORIES = [
  "general",
  "product",
  "impact",
  "partnership",
  "governance",
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  product: "Product",
  impact: "Impact",
  partnership: "Partnership",
  governance: "Governance",
};

const emptyFormData: PlatformNewsFormData = {
  title: "",
  content: "",
  url: "",
  image_url: "",
  published_at: new Date().toISOString().slice(0, 16),
  category: "general",
  is_active: true,
};

/** Category pill with colour coding. */
function CategoryBadge({ category }: { category: string }) {
  const classes: Record<string, string> = {
    general: "bg-gray-100 text-gray-800",
    product: "bg-blue-100 text-blue-800",
    impact: "bg-emerald-100 text-emerald-800",
    partnership: "bg-purple-100 text-purple-800",
    governance: "bg-amber-100 text-amber-800",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${classes[category] ?? classes.general}`}
    >
      {CATEGORY_LABELS[category] ?? category}
    </span>
  );
}

/** Single news list row with details and actions. */
function NewsListItem({
  item,
  onEdit,
  onToggle,
  onDelete,
}: {
  item: PlatformNewsRow;
  onEdit: (_e: React.MouseEvent<HTMLButtonElement>) => void;
  onToggle: (_e: React.MouseEvent<HTMLButtonElement>) => void;
  onDelete: (_e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const { t } = useTranslation();
  return (
    <Card className="p-4 flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
            {item.title}
          </h3>
          <CategoryBadge category={item.category} />
          {!item.is_active && (
            <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">
              {t("admin.news.inactive", "Inactive")}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {item.content}
        </p>
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
          <span>
            {t("admin.news.publishedOn", "Published {{date}}", {
              date: new Date(item.published_at).toLocaleDateString(),
            })}
          </span>
          {item.url && <span className="truncate max-w-48">{item.url}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          data-news-id={item.id}
          onClick={onToggle}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          aria-label={
            item.is_active
              ? t("admin.news.deactivate", "Deactivate {{title}}", {
                  title: item.title,
                })
              : t("admin.news.activate", "Activate {{title}}", {
                  title: item.title,
                })
          }
        >
          {item.is_active ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
        <button
          type="button"
          data-news-id={item.id}
          onClick={onEdit}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          aria-label={t("admin.news.editItem", "Edit {{title}}", {
            title: item.title,
          })}
        >
          <Edit className="h-4 w-4" />
        </button>
        <button
          type="button"
          data-news-id={item.id}
          onClick={onDelete}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-red-600"
          aria-label={t("admin.news.deleteItem", "Delete {{title}}", {
            title: item.title,
          })}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </Card>
  );
}

/** Form for creating or editing a platform news item. */
function NewsForm({
  formData,
  onSubmit,
  onCancel,
  loading,
  isEdit,
  onFieldChange,
}: {
  formData: PlatformNewsFormData;
  onSubmit: () => void;
  onCancel: () => void;
  loading: boolean;
  isEdit: boolean;
  onFieldChange: (_field: keyof PlatformNewsFormData, _value: string | boolean) => void;
}) {
  const { t } = useTranslation();

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFieldChange("title", e.target.value);
    },
    [onFieldChange],
  );

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onFieldChange("content", e.target.value);
    },
    [onFieldChange],
  );

  const handleUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFieldChange("url", e.target.value);
    },
    [onFieldChange],
  );

  const handleImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFieldChange("image_url", e.target.value);
    },
    [onFieldChange],
  );

  const handleCategoryChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onFieldChange("category", e.target.value);
    },
    [onFieldChange],
  );

  const handleDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFieldChange("published_at", e.target.value);
    },
    [onFieldChange],
  );

  const handleActiveChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFieldChange("is_active", e.target.checked);
    },
    [onFieldChange],
  );

  return (
    <Card className="p-6 mb-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {isEdit
          ? t("admin.news.editNews", "Edit News Item")
          : t("admin.news.createNews", "Create News Item")}
      </h2>

      <div>
        <label
          htmlFor="news-title"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          {t("admin.news.titleLabel", "Title")}
        </label>
        <Input
          id="news-title"
          value={formData.title}
          onChange={handleTitleChange}
          placeholder={t(
            "admin.news.titlePlaceholder",
            "e.g. Quarterly impact report",
          )}
        />
      </div>

      <div>
        <label
          htmlFor="news-content"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          {t("admin.news.contentLabel", "Content / Excerpt")}
        </label>
        <textarea
          id="news-content"
          value={formData.content}
          onChange={handleContentChange}
          rows={3}
          className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-emerald-500 focus:ring-emerald-500"
          placeholder={t(
            "admin.news.contentPlaceholder",
            "Brief description of the news item...",
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="news-url"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {t("admin.news.urlLabel", "Link URL")}
          </label>
          <Input
            id="news-url"
            value={formData.url}
            onChange={handleUrlChange}
            placeholder={t("admin.news.urlPlaceholder", "/news/my-article")}
          />
        </div>

        <div>
          <label
            htmlFor="news-image"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {t("admin.news.imageLabel", "Image URL (optional)")}
          </label>
          <Input
            id="news-image"
            value={formData.image_url}
            onChange={handleImageChange}
            placeholder={t("admin.news.imagePlaceholder", "https://...")}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="news-category"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {t("admin.news.categoryLabel", "Category")}
          </label>
          <select
            id="news-category"
            value={formData.category}
            onChange={handleCategoryChange}
            className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-emerald-500 focus:ring-emerald-500"
          >
            {NEWS_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="news-date"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {t("admin.news.dateLabel", "Publish Date")}
          </label>
          <input
            id="news-date"
            type="datetime-local"
            value={formData.published_at}
            onChange={handleDateChange}
            className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-emerald-500 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="news-active"
          type="checkbox"
          checked={formData.is_active}
          onChange={handleActiveChange}
          className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
        />
        <label
          htmlFor="news-active"
          className="text-sm text-gray-700 dark:text-gray-300"
        >
          {t("admin.news.activeLabel", "Published (visible to public)")}
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          onClick={onSubmit}
          disabled={loading || !formData.title.trim() || !formData.content.trim()}
        >
          {loading
            ? t("admin.news.saving", "Saving...")
            : isEdit
              ? t("admin.news.updateNews", "Update News")
              : t("admin.news.createNewsBtn", "Create News")}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          {t("common.cancel", "Cancel")}
        </Button>
      </div>
    </Card>
  );
}

/**
 * Admin page for managing platform news items.
 * Supports creating, editing, toggling active state, and deleting news.
 */
const AdminPlatformNews: React.FC = () => {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const { items, loading, saving, error, create, update, toggleActive, remove } =
    useAdminPlatformNews();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PlatformNewsFormData>(emptyFormData);

  const handleFieldChange = useCallback(
    (field: keyof PlatformNewsFormData, value: string | boolean) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleCreateClick = useCallback(() => {
    setFormData({
      ...emptyFormData,
      published_at: new Date().toISOString().slice(0, 16),
    });
    setEditingId(null);
    setShowForm(true);
  }, []);

  const handleEditClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const newsId = e.currentTarget.dataset.newsId;
      const item = items.find((n) => n.id === newsId);
      if (!item) return;
      setFormData({
        title: item.title,
        content: item.content,
        url: item.url ?? "",
        image_url: item.image_url ?? "",
        published_at: item.published_at.slice(0, 16),
        category: item.category,
        is_active: item.is_active,
      });
      setEditingId(item.id);
      setShowForm(true);
    },
    [items],
  );

  const handleToggleClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      const newsId = e.currentTarget.dataset.newsId;
      const item = items.find((n) => n.id === newsId);
      if (!item || !newsId) return;
      await toggleActive(newsId, !item.is_active);
      showToast(
        "success",
        item.is_active
          ? t("admin.news.deactivated", "News item hidden")
          : t("admin.news.activated", "News item published"),
      );
    },
    [items, toggleActive, showToast, t],
  );

  const handleDeleteClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      const newsId = e.currentTarget.dataset.newsId;
      if (!newsId) return;
      await remove(newsId);
      showToast("success", t("admin.news.deleted", "News item deleted"));
    },
    [remove, showToast, t],
  );

  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyFormData);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!formData.title.trim() || !formData.content.trim()) return;
    if (editingId) {
      await update(editingId, formData);
      showToast("success", t("admin.news.updated", "News item updated"));
    } else {
      await create(formData);
      showToast("success", t("admin.news.created", "News item created"));
    }
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyFormData);
  }, [formData, editingId, create, update, showToast, t]);

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t("admin.news.title", "Platform News")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t(
              "admin.news.subtitle",
              "Manage news items shown on the public browse page",
            )}
          </p>
        </div>
        {!showForm && (
          <Button
            onClick={handleCreateClick}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {t("admin.news.newItem", "New Item")}
          </Button>
        )}
      </div>

      {error !== null && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {showForm && (
        <NewsForm
          formData={formData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={saving}
          isEdit={editingId !== null}
          onFieldChange={handleFieldChange}
        />
      )}

      <div className="space-y-4">
        {items.map((item) => (
          <NewsListItem
            key={item.id}
            item={item}
            onEdit={handleEditClick}
            onToggle={handleToggleClick}
            onDelete={handleDeleteClick}
          />
        ))}

        {items.length === 0 && (
          <div className="text-center py-16">
            <Newspaper className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-lg text-gray-500 dark:text-gray-400">
              {t("admin.news.noItemsYet", "No news items yet")}
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              {t(
                "admin.news.noItemsMessage",
                "Create your first news item to share updates with your community",
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPlatformNews;
