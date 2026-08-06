import React from "react";
import { AddTokenForm } from "@/components/admin/AddTokenForm";
import { useContractOwner } from "@/hooks/web3/useContractOwner";
import { useWeb3 } from "@/contexts/Web3Context";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";

/**
 * Admin page for managing accepted tokens in the donation contract
 */
const TokenManagement: React.FC = () => {
  const { address } = useWeb3();
  const { owner, isOwner, isLoading } = useContractOwner();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Token Management</h1>
        <p className="mt-2 text-gray-600">
          Manage which tokens are accepted for donations
        </p>
      </div>

      {!isLoading && owner && (
        <div className="mb-6 p-4 bg-gray-50 rounded-xl max-w-2xl">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Contract Owner
              </span>
              <code className="text-xs bg-white px-2 py-1 rounded border">
                {owner}
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Your Address
              </span>
              <code className="text-xs bg-white px-2 py-1 rounded border">
                {address || "Not connected"}
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Owner Status
              </span>
              <div className="flex items-center gap-2">
                {isOwner ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-semibold text-green-700">
                      You are the owner
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span className="text-sm font-semibold text-red-700">
                      Not the owner
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {!isOwner && !isLoading && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl max-w-2xl">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-red-900 mb-1">
                Not Authorized
              </h3>
              <p className="text-sm text-red-800">
                You are not the contract owner. Only the contract owner can add
                tokens. Please connect with the wallet that deployed the
                contract.
              </p>
            </div>
          </div>
        </div>
      )}

      <AddTokenForm />

      <div className="mt-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg max-w-2xl">
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">
          Important Notes
        </h3>
        <ul className="list-disc list-inside space-y-2 text-sm text-yellow-800">
          <li>Only the contract owner can add accepted tokens</li>
          <li>
            Tokens must be whitelisted before they can be used for donations
          </li>
          <li>
            Use the zero address (0x0000...0000) to accept native tokens
          </li>
          <li>
            Once added, tokens cannot be removed without calling
            removeAcceptedToken
          </li>
        </ul>
      </div>
    </div>
  );
};

export default TokenManagement;
