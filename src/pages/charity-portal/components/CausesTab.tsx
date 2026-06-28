import React, { useCallback } from "react";
import { Link } from "react-router-dom";
import { Plus, MapPin, Clock, Trash2, Edit, Heart, Target } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/hooks/useTranslation";
import { CurrencyDisplay } from "@/components/CurrencyDisplay";
import { MAX_CAUSES_PER_CHARITY } from "@/types/charity";

interface CharityCause {
  id: string;
  name: string;
  description: string;
  target_amount: number;
  raised_amount: number;
  category: string;
  image_url: string | null;
  location: string;
  timeline: string | null;
  status: string;
  created_at: string;
}

interface CausesTabProps {
  causes: CharityCause[];
  onEdit: (_causeId: string) => void;
  onDelete: (_causeId: string) => void;
}

/** Header with title and create button for the causes section. */
const CausesHeader: React.FC<{ activeCount: number; disabled?: boolean }> = ({
  activeCount,
  disabled,
}) => {
  const { t } = useTranslation();
  return (
    <>
      <div className="flex justify-between items-center mb-1">
        <h2 className="text-xl font-semibold text-gray-900">
          {t("cause.causes", "Causes")}
        </h2>
        <Link to="/charity-portal/create-cause">
          <Button className="flex items-center gap-2" disabled={disabled}>
            <Plus className="h-4 w-4" />
            {t("cause.createNew", "Create New")}
          </Button>
        </Link>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        {activeCount} of {MAX_CAUSES_PER_CHARITY} active causes
      </p>
    </>
  );
};

/** Tab panel listing the charity's fundraising causes with progress and management actions. */
export const CausesTab: React.FC<CausesTabProps> = ({
  causes,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation();
  const activeCount = causes.filter((c) => c.status === "active").length;

  const handleEdit = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const causeId = e.currentTarget.dataset.id;
      if (causeId) onEdit(causeId);
    },
    [onEdit],
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const causeId = e.currentTarget.dataset.id;
      if (causeId) onDelete(causeId);
    },
    [onDelete],
  );

  if (causes.length === 0) {
    return (
      <div className="mb-8">
        <CausesHeader activeCount={0} />
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 py-16 text-center">
          <Heart className="h-8 w-8 text-pink-400 mx-auto mb-4 p-4 box-content rounded-full bg-pink-100" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t("cause.noCausesTitle", "No causes yet")}
          </h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            {t(
              "cause.noCausesYet",
              "Create your first cause to start fundraising for specific projects.",
            )}
          </p>
          <Link to="/charity-portal/create-cause">
            <Button className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t("cause.createCause", "Create Cause")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <CausesHeader
        activeCount={activeCount}
        disabled={activeCount >= MAX_CAUSES_PER_CHARITY}
      />

      <div className="space-y-4">
        {causes.map((cause) => (
          <div
            key={cause.id}
            className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow"
          >
            <header className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-semibold text-gray-900">
                  {cause.name}
                </h3>
                <span
                  className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                    {
                      active: "bg-green-100 text-green-800",
                      completed: "bg-blue-100 text-blue-800",
                    }[cause.status] || "bg-gray-100 text-gray-800"
                  }`}
                >
                  {cause.status.charAt(0).toUpperCase() + cause.status.slice(1)}
                </span>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  title="Edit"
                  data-id={cause.id}
                  onClick={handleEdit}
                >
                  <Edit className="h-4 w-4 text-gray-500" />
                </Button>
                <Button
                  variant="ghost"
                  className="p-2 hover:bg-red-50 rounded-lg"
                  title="Delete"
                  data-id={cause.id}
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </header>
            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
              {cause.description}
            </p>
            <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4 text-gray-400" />
                {cause.location}
              </span>
              <span className="flex items-center gap-1">
                <Target className="h-4 w-4 text-gray-400" />
                {cause.category}
              </span>
              {cause.timeline && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-gray-400" />
                  {cause.timeline}
                </span>
              )}
            </div>
            {/* Funding Progress */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 font-medium">
                  Funding Progress
                </span>
                <span className="font-semibold text-gray-900">
                  {Math.round(
                    (cause.raised_amount / cause.target_amount) * 100,
                  )}
                  %
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-emerald-500 h-3 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min((cause.raised_amount / cause.target_amount) * 100, 100)}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">
                  <CurrencyDisplay amount={cause.raised_amount} /> raised
                </span>
                <span className="text-gray-500">
                  Goal: <CurrencyDisplay amount={cause.target_amount} />
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CausesTab;
