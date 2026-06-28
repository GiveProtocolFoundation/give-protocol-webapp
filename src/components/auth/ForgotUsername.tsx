import React from "react";
import { ForgotCredentials } from "./ForgotCredentials";

interface ForgotUsernameProps {
  onBack: () => void;
}

/**
 * Wrapper around ForgotCredentials configured for username recovery.
 * @param props - Component props
 * @returns The rendered forgot-username flow
 */
export const ForgotUsername: React.FC<ForgotUsernameProps> = ({ onBack }) => {
  return <ForgotCredentials type="username" onBack={onBack} />;
};
