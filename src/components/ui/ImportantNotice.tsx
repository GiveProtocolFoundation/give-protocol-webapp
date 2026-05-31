import React from "react";
import { AlertTriangle } from "lucide-react";

interface ImportantNoticeProps {
  children: React.ReactNode;
  variant?: "warning" | "info" | "highlight";
}

/**
 * Renders a styled callout box used to highlight important content.
 * @param props - Component props.
 * @param props.children - Notice content rendered inside the callout.
 * @param props.variant - Visual style: `warning`, `info`, or `highlight`. Defaults to `info`.
 * @returns The notice element.
 */
export const ImportantNotice: React.FC<ImportantNoticeProps> = ({
  children,
  variant = "info",
}) => {
  const baseClasses = "p-4 my-6 rounded-lg border-l-4";

  const variantClasses = {
    warning:
      "bg-yellow-50 dark:bg-yellow-900/30 border-yellow-400 dark:border-yellow-600 text-yellow-800 dark:text-yellow-200",
    info: "bg-blue-50 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600 text-blue-800 dark:text-blue-200",
    highlight:
      "bg-gray-50 dark:bg-gray-800 border-gray-400 dark:border-gray-600 text-gray-800 dark:text-gray-200",
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]}`}>
      {variant === "warning" && (
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <div>{children}</div>
        </div>
      )}
      {variant !== "warning" && children}
    </div>
  );
};
