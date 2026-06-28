import React from "react";
import { ForgotCredentials } from "./ForgotCredentials";

interface ForgotPasswordProps {
  onBack: () => void;
}

/**
 * Wrapper around ForgotCredentials configured for password recovery.
 * @param props - Component props
 * @returns The rendered forgot-password flow
 */
export const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBack }) => {
  return <ForgotCredentials type="password" onBack={onBack} />;
};
