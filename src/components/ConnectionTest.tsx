import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "./ui/Button";

/** Supabase connection status display. */
const SupabaseStatusSection: React.FC<{
  status: "checking" | "success" | "error";
  statusColor: string;
  statusText: string;
  error: string;
}> = ({ statusColor, statusText, error }) => (
  <div>
    <h3 className="text-lg font-semibold mb-2">Supabase Connection</h3>
    <div className="flex items-center space-x-2">
      <div className={`w-3 h-3 rounded-full ${statusColor}`} />
      <span>{statusText}</span>
    </div>
    {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
  </div>
);

/** Web3 wallet connection status display. */
const Web3StatusSection: React.FC<{
  isConnected: boolean;
  chainId: number | null;
  web3Error: Error | null;
  onConnect: () => void;
}> = ({ isConnected, chainId, web3Error, onConnect }) => (
  <div>
    <h3 className="text-lg font-semibold mb-2">Web3 Connection</h3>
    <div className="flex items-center space-x-2 mb-2">
      <div
        className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
      />
      <span>{isConnected ? "Wallet connected" : "Wallet not connected"}</span>
    </div>
    {chainId && (
      <p className="text-sm text-gray-600 mb-2">
        Connected to chain ID:{" "}
        {chainId}
      </p>
    )}
    {web3Error && (
      <p className="text-sm text-red-600 mb-2">{web3Error.message}</p>
    )}
    {!isConnected && (
      <Button onClick={onConnect} className="mt-2">
        Connect Wallet
      </Button>
    )}
  </div>
);

/**
 * Component that tests Supabase and Web3 connections and displays status.
 * @returns JSX.Element - The rendered connection test component.
 */
export const ConnectionTest: React.FC = () => {
  const [supabaseStatus, setSupabaseStatus] = useState<
    "checking" | "success" | "error"
  >("checking");
  const [supabaseError, setSupabaseError] = useState<string>("");
  const { connect, isConnected, chainId, error: web3Error } = useWeb3();

  /**
   * Tests the Supabase connection by querying the profiles table count.
   * @returns Promise<void> - Resolves when the test completes and updates status.
   */
  const testSupabaseConnection = async () => {
    try {
      const { data: _data, error } = await supabase
        .from("profiles")
        .select("count");
      if (error) throw error;
      setSupabaseStatus("success");
    } catch (err) {
      setSupabaseStatus("error");
      setSupabaseError(
        err instanceof Error ? err.message : "Failed to connect to Supabase",
      );
    }
  };

  useEffect(() => {
    testSupabaseConnection();
  }, []);

  /**
   * Returns the CSS class name for a given connection status.
   * @param status - One of "checking", "success", or "error".
   * @returns string - CSS class corresponding to the status color.
   */
  const getStatusColor = (status: "checking" | "success" | "error") => {
    if (status === "checking") return "bg-yellow-500";
    if (status === "success") return "bg-green-500";
    return "bg-red-500";
  };

  // Extract nested ternary for status text
  const getStatusText = (status: "checking" | "success" | "error") => {
    if (status === "checking") return "Checking connection...";
    if (status === "success") return "Connected to Supabase";
    return "Connection failed";
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md space-y-6">
      <h2 className="text-2xl font-bold">Connection Test</h2>

      <SupabaseStatusSection
        status={supabaseStatus}
        statusColor={getStatusColor(supabaseStatus)}
        statusText={getStatusText(supabaseStatus)}
        error={supabaseError}
      />

      <Web3StatusSection
        isConnected={isConnected}
        chainId={chainId}
        web3Error={web3Error}
        onConnect={connect}
      />
    </div>
  );
};
