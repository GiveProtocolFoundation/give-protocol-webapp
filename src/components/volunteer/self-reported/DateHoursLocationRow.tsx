import React from "react";
import { Calendar, Clock, MapPin } from "lucide-react";
import {
  MIN_HOURS_PER_RECORD,
  MAX_HOURS_PER_RECORD,
} from "@/types/selfReportedHours";

const INPUT_BASE_CLASSES =
  "h-11 w-full rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:border-transparent";
const INPUT_WITH_ICON_CLASSES = `${INPUT_BASE_CLASSES} pl-10 pr-4`;
const INPUT_WITH_SUFFIX_CLASSES = `${INPUT_BASE_CLASSES} pl-10 pr-12`;

interface DateHoursLocationRowProps {
  activityDate: string;
  hours: number;
  location: string;
  today: string;
  errors: Record<string, string>;
  showExpirationWarning: boolean;
  daysLeft?: number;
  isExpired: boolean;
  onInputChange: (
    _event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => void;
}

/** Row component for date, hours, and location fields in the self-reported hours form. */
export const DateHoursLocationRow: React.FC<DateHoursLocationRowProps> = ({
  activityDate,
  hours,
  location,
  today,
  errors,
  showExpirationWarning,
  daysLeft,
  isExpired,
  onInputChange,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      {/* Activity Date */}
      <div>
        <label
          htmlFor="activityDate"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Date <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            id="activityDate"
            type="date"
            name="activityDate"
            value={activityDate}
            onChange={onInputChange}
            max={today}
            required
            className={`${INPUT_WITH_ICON_CLASSES} ${errors.activityDate ? "border-red-300 focus:ring-red-500" : ""}`}
          />
        </div>
        {errors.activityDate !== undefined && (
          <p className="mt-1.5 text-xs text-red-600">{errors.activityDate}</p>
        )}
        {showExpirationWarning && (
          <p className="mt-1.5 text-xs text-amber-600 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Only {daysLeft} days left to request validation
          </p>
        )}
        {isExpired && (
          <p className="mt-1.5 text-xs text-gray-500">
            Hours logged more than 90 days ago cannot be validated
          </p>
        )}
      </div>

      {/* Hours */}
      <div>
        <label
          htmlFor="hours"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Hours <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            id="hours"
            type="number"
            name="hours"
            value={hours}
            onChange={onInputChange}
            min={MIN_HOURS_PER_RECORD}
            max={MAX_HOURS_PER_RECORD}
            step={0.5}
            required
            className={`${INPUT_WITH_SUFFIX_CLASSES} ${errors.hours ? "border-red-300 focus:ring-red-500" : ""}`}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">
            hrs
          </span>
        </div>
        {errors.hours !== undefined && (
          <p className="mt-1.5 text-xs text-red-600">{errors.hours}</p>
        )}
      </div>

      {/* Location */}
      <div>
        <label
          htmlFor="location"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Location <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            id="location"
            name="location"
            value={location}
            onChange={onInputChange}
            placeholder="City or Remote"
            className={INPUT_WITH_ICON_CLASSES}
          />
        </div>
      </div>
    </div>
  );
};

export default DateHoursLocationRow;
