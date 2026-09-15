import React from "react";

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Icon element rendered inside the input field (only needs size classes like h-4 w-4). */
  icon: React.ReactNode;
  /** Optional element rendered on the right side of the input (e.g. password toggle). */
  rightElement?: React.ReactNode;
}

/** Input field with a left-aligned icon overlay and optional right-aligned element. Encapsulates the relative/absolute positioning pattern. */
export const FormInput: React.FC<FormInputProps> = ({
  icon,
  rightElement,
  className,
  ...props
}) => (
  <div className="relative">
    <span
      aria-hidden="true"
      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
    >
      {icon}
    </span>
    <input
      className={
        className ||
        `w-full pl-10 ${rightElement ? "pr-10" : "pr-3"} py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white transition-colors`
      }
      {...props}
    />
    {rightElement && (
      <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
        {rightElement}
      </span>
    )}
  </div>
);

