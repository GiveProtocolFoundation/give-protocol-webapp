import React, { forwardRef } from "react";
import { cn } from "../../utils/cn";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

/**
 * Reusable button component with multiple variants, sizes, and animation effects.
 * Supports icons, full-width styling, accessibility features, and ref forwarding.
 *
 * @function Button
 * @param {ButtonProps} props - Component props extending HTML button attributes
 * @param {'primary' | 'secondary' | 'danger' | 'ghost'} [props.variant='primary'] - Button visual style
 * @param {'sm' | 'md' | 'lg'} [props.size='md'] - Button size
 * @param {boolean} [props.fullWidth=false] - Whether button spans full width
 * @param {React.ReactNode} [props.icon] - Optional icon to display
 * @param {'left' | 'right'} [props.iconPosition='left'] - Icon placement
 * @param {string} [props.className] - Additional CSS classes
 * @param {React.ReactNode} props.children - Button content
 * @param {React.Ref<HTMLButtonElement>} ref - Forwarded ref to the button element
 * @returns {JSX.Element} The rendered button component
 * @example
 * ```typescript
 * // Primary button with icon
 * <Button variant="primary" icon={<SaveIcon />}>
 *   Save Changes
 * </Button>
 *
 * // Full-width secondary button
 * <Button variant="secondary" fullWidth size="lg">
 *   Cancel
 * </Button>
 *
 * // Danger button with right icon
 * <Button variant="danger" icon={<TrashIcon />} iconPosition="right">
 *   Delete
 * </Button>
 *
 * // Button with ref for positioning
 * const buttonRef = useRef<HTMLButtonElement>(null);
 * <Button ref={buttonRef}>Click me</Button>
 * ```
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    fullWidth = false,
    icon,
    iconPosition = "left",
    className,
    children,
    ...props
  },
  ref
) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-[10px] focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 ease-in-out";

  const variants = {
    primary:
      "bg-emerald-700 hover:bg-emerald-800 text-white focus:ring-emerald-500 shadow-cta hover:shadow-[0_4px_18px_rgba(5,150,105,0.5)] transform hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm",
    secondary:
      "bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 border border-gray-300 focus:ring-emerald-500 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm",
    danger:
      "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm",
    ghost:
      "bg-transparent hover:bg-gray-100 text-gray-700 hover:text-gray-900 focus:ring-gray-500 transform hover:-translate-y-0.5 active:translate-y-0",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button
      ref={ref}
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        fullWidth ? "w-full" : "",
        props.disabled
          ? "opacity-60 cursor-not-allowed transform-none hover:shadow-none"
          : "",
        className,
      )}
      {...props}
    >
      {icon && iconPosition === "left" && <span className="mr-2">{icon}</span>}
      {children}
      {icon && iconPosition === "right" && <span className="ml-2">{icon}</span>}
    </button>
  );
});
