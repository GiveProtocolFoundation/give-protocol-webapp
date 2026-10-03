import React from "react";
import { Newspaper, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { usePlatformNews, type NewsUpdate } from "@/hooks/usePlatformNews";
import { useTranslation } from "@/hooks/useTranslation";
import { classifyNewsLink } from "@/utils/newsLinks";

interface NewsUpdatesCardProps {
  items?: NewsUpdate[];
  limit?: number;
}

/**
 * Formats an ISO date string using the active app language.
 * @param iso - ISO date string
 * @param language - BCP 47 language tag
 * @returns A short localized date, or the input when it can't be parsed
 */
function formatDate(iso: string, language: string): string {
  try {
    return new Date(iso).toLocaleDateString(language, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

interface NewsItemBodyProps {
  item: NewsUpdate;
  language: string;
  showArrow: boolean;
}

/** Title, excerpt and date for one news item. */
function NewsItemBody({ item, language, showArrow }: NewsItemBodyProps) {
  return (
    <>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
          {item.title}
        </p>
        <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {item.excerpt}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {formatDate(item.publishedAt, language)}
        </p>
      </div>
      {showArrow && (
        <ArrowRight
          aria-hidden="true"
          className="mt-1 h-4 w-4 text-gray-400 group-hover:text-emerald-600 shrink-0"
        />
      )}
    </>
  );
}

const ROW_CLASS = "group flex items-start justify-between gap-3";

/**
 * Latest platform news shown on the browse page. Items come from the Supabase
 * platform_news table (managed at /admin/platform-news); the card renders
 * nothing when there is no news. Callers may pass an `items` override.
 * Links open in-app for relative paths and in a new tab for external URLs;
 * items without a valid link are shown as plain text.
 */
export const NewsUpdatesCard: React.FC<NewsUpdatesCardProps> = ({
  items,
  limit = 4,
}) => {
  const { t, language } = useTranslation();
  const { news: fetched } = usePlatformNews();
  const visible = (items ?? fetched).slice(0, limit);

  if (visible.length === 0) return null;

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
        <Newspaper aria-hidden="true" className="h-5 w-5" />
        <h2 className="text-sm font-semibold uppercase tracking-wider">
          {t("browse.news.heading", "Platform News")}
        </h2>
      </div>

      <ul className="mt-4 divide-y divide-gray-200 dark:divide-gray-800">
        {visible.map((item) => {
          const kind = classifyNewsLink(item.url);
          return (
            <li key={item.id} className="py-3 first:pt-0 last:pb-0">
              {kind === "internal" && item.url !== null && (
                <Link to={item.url} className={ROW_CLASS}>
                  <NewsItemBody item={item} language={language} showArrow />
                </Link>
              )}
              {kind === "external" && item.url !== null && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={ROW_CLASS}
                >
                  <NewsItemBody item={item} language={language} showArrow />
                </a>
              )}
              {kind === "none" && (
                <div className={ROW_CLASS}>
                  <NewsItemBody
                    item={item}
                    language={language}
                    showArrow={false}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
};
