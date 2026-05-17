import React from "react";
import { DivideIcon as LucideIcon } from "lucide-react";
import { Button } from "../../ui/Button";
import { useWeb3 } from "../../../contexts/Web3Context";

/**
 * Joins truthy class name fragments into a single space-separated string.
 * @param classes - Class names or falsy values to combine.
 * @returns The combined class string with falsy values removed.
 */
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

interface TransactionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Button that triggers a Web3 transaction; disabled until the user has a connected wallet.
 * @param props - Component props.
 * @param props.icon - Lucide icon component rendered before the label.
 * @param props.label - Button text.
 * @param props.onClick - Click handler invoked when the button is pressed.
 * @param props.disabled - When `true`, force the button into a disabled state.
 * @param props.className - Additional class names appended to the button.
 * @returns The transaction button element.
 */
export const TransactionButton: React.FC<TransactionButtonProps> = ({
  icon: Icon,
  label,
  onClick,
  disabled,
  className,
}) => {
  const { isConnected } = useWeb3();

  return (
    <Button
      onClick={onClick}
      disabled={disabled || !isConnected}
      className={cn(
        "shadow-sm hover:shadow-md rounded-md transition-all duration-200",
        className,
      )}
      icon={<Icon className="h-5 w-5" />}
    >
      <span>{label}</span>
    </Button>
  );
};
