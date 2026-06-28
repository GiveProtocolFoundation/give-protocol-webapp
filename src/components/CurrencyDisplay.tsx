import React from "react";
import { useCurrency } from "@/hooks/useCurrency";
import { cn } from "@/utils/cn";

interface CurrencyDisplayProps {
  amount: number;
  className?: string;
}

/**
 * Renders a monetary amount formatted according to the user's currency preference.
 * @param props - Component props.
 * @param props.amount - The numeric amount to display.
 * @param props.className - Optional class names applied to the wrapping span.
 * @returns A `<span>` containing the formatted amount.
 */
export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  amount,
  className,
}) => {
  const { formatAmount } = useCurrency();

  return <span className={cn(className)}>{formatAmount(amount)}</span>;
};
