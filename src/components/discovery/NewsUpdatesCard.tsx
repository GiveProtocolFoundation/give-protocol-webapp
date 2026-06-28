import React from "react";
import { Newspaper, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import type { NewsUpdate } from "@/data/newsUpdates";
import { usePlatformNews } from "@/hooks/usePlatformNews";
import { useTranslation } from "@/hooks/useTranslation";

interface NewsUpdatesCardProps {
  items?: NewsUpdate[];
  limit?: number;
}

/** Formats an ISO date string into the browser's locale-aware "MMM d, yyyy" form. */
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

/**
 * Latest platform news shown on the charity hub. Fetches from the Supabase platform_news
 * table, falling back to static data if the fetch fails or returns empty.
 * Callers may still pass an `items` override to bypass the hook entirely.
 */
export const NewsUpdatesCard: React.FC<NewsUpdatesCardProps> = ({
  items,
  limit = 4,
}) => {
  const { t } = useTranslation();
  const { news: fetched } = usePlatformNews();
  const source = items ?? fetched;
  const visible = source.slice(0, limit);

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
        <Newspaper aria-hidden="true" className="h-5 w-5" />
        <h2 className="text-sm font-semibold uppercase tracking-wider">
          {t("browse.news.heading", "Platform News")}
        </h2>
      </div>

      <ul className="mt-4 divide-y divide-gray-200 dark:divide-gray-800">
        {visible.map((item) => (
          <li key={item.id} className="py-3 first:pt-0 last:pb-0">
            <Link
              to={item.url}
              className="group flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                  {item.title}
                </p>
                <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {item.excerpt}
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  {formatDate(item.publishedAt)}
                </p>
              </div>
              <ArrowRight
                aria-hidden="true"
                className="mt-1 h-4 w-4 text-gray-400 group-hover:text-emerald-600 shrink-0"
              />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
};
