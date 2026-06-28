import React, { useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ValidationStatusBadge } from "./ValidationStatusBadge";
import {
  SelfReportedHoursDisplay,
  ACTIVITY_TYPE_LABELS,
  ValidationStatus,
} from "@/types/selfReportedHours";
import { formatDate } from "@/utils/date";
import { Calendar, MapPin, Building2, Edit2, Trash2, Eye } from "lucide-react";

interface SelfReportedHoursCardProps {
  record: SelfReportedHoursDisplay;
  onView: (_id: string) => void;
  onEdit: (_id: string) => void;
  onDelete: (_id: string) => void;
}

/** Inner content of a self-reported hours card with details and action buttons. */
const HoursCardBody: React.FC<{
  record: SelfReportedHoursDisplay;
  activityTypeLabel: string;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ record, activityTypeLabel, onView, onEdit, onDelete }) => (
  <div className="flex items-start justify-between gap-4">
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-3 mb-2">
        <ValidationStatusBadge
          status={record.validationStatus}
          daysUntilExpiration={record.daysUntilExpiration}
        />
        <span className="text-lg font-semibold text-gray-900">
          {record.hours} {record.hours === 1 ? "hour" : "hours"}
        </span>
      </div>
      <div className="flex items-center gap-2 text-gray-700 mb-1">
        <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
        <span className="truncate font-medium">
          {record.organizationDisplayName}
        </span>
        {record.isVerifiedOrganization && (
          <span className="text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded flex-shrink-0">
            Verified
          </span>
        )}
      </div>
      <p className="text-sm text-gray-600 mb-2">{activityTypeLabel}</p>
      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
        <span className="flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          {formatDate(record.activityDate, false)}
        </span>
        {record.location && (
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {record.location}
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-gray-600 line-clamp-2">
        {record.description}
      </p>
      {record.validationStatus === ValidationStatus.REJECTED &&
        record.rejectionNotes && (
          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
            <span className="font-medium">Rejection reason:</span>{" "}
            {record.rejectionNotes}
          </div>
        )}
    </div>
    <div className="flex flex-col gap-2 flex-shrink-0">
      <Button
        variant="ghost"
        size="sm"
        onClick={onView}
        icon={<Eye className="h-4 w-4" />}
      >
        View
      </Button>
      {record.canEdit && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          icon={<Edit2 className="h-4 w-4" />}
        >
          Edit
        </Button>
      )}
      {record.canDelete && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          icon={<Trash2 className="h-4 w-4" />}
          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
        >
          Delete
        </Button>
      )}
    </div>
  </div>
);

/**
 * Card component displaying a single self-reported hours record
 * @param props - Component props
 * @returns JSX element
 */
export const SelfReportedHoursCard: React.FC<SelfReportedHoursCardProps> = ({
  record,
  onView,
  onEdit,
  onDelete,
}) => {
  const handleView = useCallback(() => {
    onView(record.id);
  }, [onView, record.id]);

  const handleEdit = useCallback(() => {
    onEdit(record.id);
  }, [onEdit, record.id]);

  const handleDelete = useCallback(() => {
    onDelete(record.id);
  }, [onDelete, record.id]);

  const activityTypeLabel =
    ACTIVITY_TYPE_LABELS[record.activityType] || "Unknown";

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <HoursCardBody
        record={record}
        activityTypeLabel={activityTypeLabel}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </Card>
  );
};

export default SelfReportedHoursCard;
