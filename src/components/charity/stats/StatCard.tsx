import React from "react";
import { DivideIcon as LucideIcon } from "lucide-react";
import { CurrencyDisplay } from "@/components/CurrencyDisplay";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  iconColor: string;
  iconBgColor: string;
}

/**
 * Dashboard card displaying a labeled statistic with an icon and currency value.
 * @param props - Component props
 * @returns The rendered stat card
 */
export const StatCard: React.FC<StatCardProps> = ({
  icon: Icon,
  label,
  value,
  iconColor,
  iconBgColor,
}) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center">
        <div className={`p-3 rounded-full ${iconBgColor}`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="text-2xl font-semibold text-gray-900">
            <CurrencyDisplay amount={value} />
          </p>
        </div>
      </div>
    </div>
  );
};
