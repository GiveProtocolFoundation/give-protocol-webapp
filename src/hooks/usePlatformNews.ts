import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Logger } from "@/utils/logger";

/** A platform news item as displayed on the public browse page. */
export interface NewsUpdate {
  id: string;
  title: string;
  excerpt: string;
  /** Link target; null when the admin left it blank (item is not clickable). */
  url: string | null;
  publishedAt: string;
}

/** Row shape returned by the platform_news table. */
export interface PlatformNewsRow {
  id: string;
  title: string;
  content: string;
  url: string | null;
  image_url: string | null;
  published_at: string;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Form data for creating or updating a news item. */
export interface PlatformNewsFormData {
  title: string;
  content: string;
  url: string;
  image_url: string;
  published_at: string;
  category: string;
  is_active: boolean;
}

/**
 * Maps a platform_news DB row to the NewsUpdate shape consumed by NewsUpdatesCard.
 * @param row - Database row from platform_news table
 * @returns NewsUpdate display object
 */
function rowToNewsUpdate(row: PlatformNewsRow): NewsUpdate {
  return {
    id: row.id,
    title: row.title,
    excerpt: row.content,
    url: row.url,
    publishedAt: row.published_at,
  };
}

/**
 * Fetches active platform news from Supabase, ordered by published_at descending.
 * @returns Array of NewsUpdate display objects
 */
async function loadPlatformNews(): Promise<NewsUpdate[]> {
  const { data, error } = await supabase
    .from("platform_news")
    .select("id, title, content, url, published_at")
    .eq("is_active", true)
    .order("published_at", { ascending: false })
    .limit(10);

  if (error) {
    Logger.error("Error fetching platform news", { error });
    throw error;
  }

  return ((data ?? []) as PlatformNewsRow[]).map(rowToNewsUpdate);
}

interface UsePlatformNewsReturn {
  news: NewsUpdate[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook that fetches active platform news from Supabase on mount. Returns an
 * empty list when there is no news or the fetch fails; it never substitutes
 * placeholder content.
 * @returns News items with loading and error state
 */
export function usePlatformNews(): UsePlatformNewsReturn {
  const [news, setNews] = useState<NewsUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    loadPlatformNews()
      .then((data) => {
        if (!mountedRef.current) return;
        setNews(data);
        setLoading(false);
      })
      .catch(() => {
        if (!mountedRef.current) return;
        setNews([]);
        setError("Failed to load platform news");
        setLoading(false);
      });

    return () => {
      mountedRef.current = false;
    };
  }, []);

  return { news, loading, error };
}

interface UseAdminPlatformNewsReturn {
  items: PlatformNewsRow[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  fetchAll: () => Promise<void>;
  /** Each mutation resolves true on success and false when it failed. */
  create: (data: PlatformNewsFormData) => Promise<boolean>;
  update: (id: string, data: PlatformNewsFormData) => Promise<boolean>;
  toggleActive: (id: string, isActive: boolean) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
}

/**
 * Admin hook for full CRUD operations on the platform_news table.
 * Refetches the list after every mutation.
 * @returns CRUD operations and state for admin news management
 */
export function useAdminPlatformNews(): UseAdminPlatformNewsReturn {
  const [items, setItems] = useState<PlatformNewsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("platform_news")
      .select("*")
      .order("published_at", { ascending: false });

    if (!mountedRef.current) return;

    if (fetchError) {
      Logger.error("Error fetching admin platform news", { error: fetchError });
      setError("Failed to load news items");
      setLoading(false);
      return;
    }

    setItems((data ?? []) as PlatformNewsRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchAll();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchAll]);

  const create = useCallback(
    async (formData: PlatformNewsFormData) => {
      setSaving(true);
      setError(null);
      const { error: insertError } = await supabase
        .from("platform_news")
        .insert({
          title: formData.title,
          content: formData.content,
          url: formData.url.trim() || null,
          image_url: formData.image_url || null,
          published_at: formData.published_at || new Date().toISOString(),
          category: formData.category,
          is_active: formData.is_active,
        });

      if (!mountedRef.current) return false;

      if (insertError) {
        Logger.error("Error creating platform news", { error: insertError });
        setError("Failed to create news item");
        setSaving(false);
        return false;
      }

      setSaving(false);
      await fetchAll();
      return true;
    },
    [fetchAll],
  );

  const update = useCallback(
    async (id: string, formData: PlatformNewsFormData) => {
      setSaving(true);
      setError(null);
      const { error: updateError } = await supabase
        .from("platform_news")
        .update({
          title: formData.title,
          content: formData.content,
          url: formData.url.trim() || null,
          image_url: formData.image_url || null,
          published_at: formData.published_at,
          category: formData.category,
          is_active: formData.is_active,
        })
        .eq("id", id);

      if (!mountedRef.current) return false;

      if (updateError) {
        Logger.error("Error updating platform news", { error: updateError });
        setError("Failed to update news item");
        setSaving(false);
        return false;
      }

      setSaving(false);
      await fetchAll();
      return true;
    },
    [fetchAll],
  );

  const toggleActive = useCallback(
    async (id: string, isActive: boolean) => {
      setSaving(true);
      setError(null);
      const { error: toggleError } = await supabase
        .from("platform_news")
        .update({ is_active: isActive })
        .eq("id", id);

      if (!mountedRef.current) return false;

      if (toggleError) {
        Logger.error("Error toggling platform news", { error: toggleError });
        setError("Failed to toggle news item");
        setSaving(false);
        return false;
      }

      setSaving(false);
      await fetchAll();
      return true;
    },
    [fetchAll],
  );

  const remove = useCallback(
    async (id: string) => {
      setSaving(true);
      setError(null);
      const { error: deleteError } = await supabase
        .from("platform_news")
        .delete()
        .eq("id", id);

      if (!mountedRef.current) return false;

      if (deleteError) {
        Logger.error("Error deleting platform news", { error: deleteError });
        setError("Failed to delete news item");
        setSaving(false);
        return false;
      }

      setSaving(false);
      await fetchAll();
      return true;
    },
    [fetchAll],
  );

  return {
    items,
    loading,
    saving,
    error,
    fetchAll,
    create,
    update,
    toggleActive,
    remove,
  };
}
