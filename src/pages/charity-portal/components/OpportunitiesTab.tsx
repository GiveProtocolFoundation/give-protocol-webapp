import React, { useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  MapPin,
  Globe,
  Clock,
  Trash2,
  Edit,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/hooks/useTranslation";
import { MAX_OPPORTUNITIES_PER_CHARITY } from "@/types/charity";

interface CharityOpportunity {
  id: string;
  title: string;
  description: string;
  skills: string[];
  commitment: string;
  location: string;
  type: string;
  work_language: string;
  status: string;
  created_at: string;
}

interface OpportunitiesTabProps {
  opportunities: CharityOpportunity[];
  onEdit: (_opportunityId: string) => void;
  onDelete: (_opportunityId: string) => void;
}

/** Header with title and create button for the opportunities section. */
const OpportunitiesHeader: React.FC<{
  activeCount: number;
  disabled?: boolean;
}> = ({ activeCount, disabled }) => {
  const { t } = useTranslation();
  return (
    <>
      <div className="flex justify-between items-center mb-1">
        <h2 className="text-xl font-semibold text-gray-900">
          {t("volunteer.opportunities", "Volunteer Opportunities")}
        </h2>
        <Link to="/charity-portal/create-opportunity">
          <Button className="flex items-center gap-2" disabled={disabled}>
            <Plus className="h-4 w-4" />
            {t("volunteer.createNew", "Create New")}
          </Button>
        </Link>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        {activeCount} of {MAX_OPPORTUNITIES_PER_CHARITY} active opportunities
      </p>
    </>
  );
};

/** Tab panel listing the charity's volunteer opportunities with create/edit actions. */
export const OpportunitiesTab: React.FC<OpportunitiesTabProps> = ({
  opportunities,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation();
  const activeCount = opportunities.filter((o) => o.status === "active").length;

  const handleEdit = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const opportunityId = e.currentTarget.dataset.id;
      if (opportunityId) onEdit(opportunityId);
    },
    [onEdit],
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const opportunityId = e.currentTarget.dataset.id;
      if (opportunityId) onDelete(opportunityId);
    },
    [onDelete],
  );

  if (opportunities.length === 0) {
    return (
      <div className="mb-8">
        <OpportunitiesHeader activeCount={0} />
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 py-16 text-center">
          <Briefcase className="h-8 w-8 text-emerald-400 mx-auto mb-4 p-4 box-content rounded-full bg-emerald-100" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t("volunteer.noOpportunitiesTitle", "No opportunities yet")}
          </h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            {t(
              "volunteer.noOpportunitiesYet",
              "Create your first volunteer opportunity to start recruiting helpers.",
            )}
          </p>
          <Link to="/charity-portal/create-opportunity">
            <Button className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t("volunteer.createOpportunity", "Create Opportunity")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <OpportunitiesHeader
        activeCount={activeCount}
        disabled={activeCount >= MAX_OPPORTUNITIES_PER_CHARITY}
      />

      <div className="space-y-4">
        {opportunities.map((opportunity) => (
          <div
            key={opportunity.id}
            className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow"
          >
            <header className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-semibold text-gray-900">
                  {opportunity.title}
                </h3>
                <span
                  className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                    {
                      active: "bg-green-100 text-green-800",
                      filled: "bg-blue-100 text-blue-800",
                    }[opportunity.status] || "bg-gray-100 text-gray-800"
                  }`}
                >
                  {opportunity.status.charAt(0).toUpperCase() +
                    opportunity.status.slice(1)}
                </span>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  title="Edit"
                  data-id={opportunity.id}
                  onClick={handleEdit}
                >
                  <Edit className="h-4 w-4 text-gray-500" />
                </Button>
                <Button
                  variant="ghost"
                  className="p-2 hover:bg-red-50 rounded-lg"
                  title="Delete"
                  data-id={opportunity.id}
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </header>
            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
              {opportunity.description.replaceAll(/[<>]/g, "")}
            </p>
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4 text-gray-400" />
                {opportunity.location}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-gray-400" />
                {opportunity.commitment}
              </span>
              <span className="flex items-center gap-1">
                <Globe className="h-4 w-4 text-gray-400" />
                {opportunity.type}
              </span>
            </div>
            {opportunity.skills && opportunity.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-gray-100">
                {opportunity.skills.slice(0, 5).map((skill) => (
                  <span
                    key={skill}
                    className="px-2.5 py-1 text-xs bg-emerald-50 text-emerald-700 rounded-full font-medium"
                  >
                    {skill}
                  </span>
                ))}
                {opportunity.skills.length > 5 && (
                  <span className="px-2.5 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                    +{opportunity.skills.length - 5} more
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default OpportunitiesTab;
