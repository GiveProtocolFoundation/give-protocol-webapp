import React, { useState, useCallback } from "react";
import { useWalletAlias } from "@/hooks/useWalletAlias";
import { useWeb3 } from "@/contexts/Web3Context";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Wallet, Edit, Trash2, AlertCircle, Check } from "lucide-react";
import { shortenAddress } from "@/utils/web3";

/** Settings panel for managing wallet aliases displayed on the contribution tracker. */
export const WalletAliasSettings: React.FC = () => {
  const { user } = useAuth();
  const { address, isConnected } = useWeb3();
  const { alias, aliases, loading, error, setWalletAlias, deleteWalletAlias } =
    useWalletAlias();
  const { showToast } = useToast();
  const [newAlias, setNewAlias] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setValidationError(null);

      // Validate alias
      if (!newAlias.trim()) {
        setValidationError("Alias cannot be empty");
        return;
      }

      if (newAlias.length < 3 || newAlias.length > 20) {
        setValidationError("Alias must be between 3 and 20 characters");
        return;
      }

      if (!/^[a-zA-Z0-9_-]+$/.test(newAlias)) {
        setValidationError(
          "Alias can only contain letters, numbers, underscores, and hyphens",
        );
        return;
      }

      const success = await setWalletAlias(newAlias);
      if (success) {
        setNewAlias("");
        setEditMode(false);
      }
    },
    [newAlias, setWalletAlias],
  );

  const handleEdit = useCallback(() => {
    setNewAlias(alias || "");
    setEditMode(true);
    setValidationError(null);
  }, [alias]);

  const handleCancel = useCallback(() => {
    setNewAlias("");
    setEditMode(false);
    setValidationError(null);
  }, []);

  const handleDeleteRequest = useCallback((aliasId: string) => {
    setDeleteConfirmId(aliasId);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (deleteConfirmId) {
      try {
        await deleteWalletAlias(deleteConfirmId);
        showToast("success", "Wallet alias deleted successfully");
      } catch (err) {
        showToast(
          "error",
          "Failed to delete wallet alias",
          err instanceof Error ? err.message : "Unknown error",
        );
      }
      setDeleteConfirmId(null);
    }
  }, [deleteConfirmId, deleteWalletAlias, showToast]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirmId(null);
  }, []);

  const handleAliasChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setNewAlias(e.target.value);
    },
    [],
  );

  // Callback handlers for better performance
  const handleStartEdit = useCallback(() => setEditMode(true), []);
  const createDeleteHandler = useCallback(
    (aliasId: string) => {
      return () => handleDeleteRequest(aliasId);
    },
    [handleDeleteRequest],
  );

  if (!user) {
    return (
      <Card className="p-6">
        <div className="flex items-center mb-4">
          <Wallet className="h-5 w-5 text-gray-500 mr-2" />
          <h2 className="text-xl font-semibold text-gray-900">Wallet Alias</h2>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-4 flex items-start">
          <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-900">
              Authentication Required
            </p>
            <p className="text-sm text-amber-700 mt-1">
              Please sign in to set a wallet alias. Wallet aliases are tied to
              your account.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (!isConnected) {
    return (
      <Card className="p-6">
        <div className="flex items-center mb-4">
          <Wallet className="h-5 w-5 text-gray-500 mr-2" />
          <h2 className="text-xl font-semibold text-gray-900">Wallet Alias</h2>
        </div>
        <div className="bg-emerald-50/40 border-l-2 border-emerald-500 border-y border-r border-emerald-100 rounded-r-md py-2.5 pl-4 pr-3 flex items-center gap-3">
          <Wallet className="h-4 w-4 text-emerald-700 shrink-0" />
          <p className="text-sm text-gray-700">
            <span className="font-medium text-gray-900">
              Wallet not connected.
            </span>{" "}
            <span className="text-gray-500">
              Connect your wallet to set a public alias that will be displayed
              on the contribution tracker.
            </span>
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Wallet className="h-5 w-5 text-gray-500 mr-2" />
          <h2 className="text-xl font-semibold text-gray-900">Wallet Alias</h2>
        </div>
        {!editMode && alias && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleEdit}
            className="flex items-center"
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">
          Set a public alias for your wallet address. This alias will be
          displayed on the contribution tracker instead of your wallet address.
        </p>
        <div className="bg-gray-50 p-3 rounded-md">
          <p className="text-sm text-gray-500">Current Wallet</p>
          <p className="font-mono text-gray-900">
            {shortenAddress(address || "")}
          </p>
        </div>
      </div>

      {editMode ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Wallet Alias"
            value={newAlias}
            onChange={handleAliasChange}
            placeholder="Enter a public alias for your wallet"
            error={validationError || undefined}
          />
          <div className="flex space-x-3">
            <Button
              type="submit"
              disabled={loading}
              className="flex items-center"
            >
              <Check className="h-4 w-4 mr-1" />
              {loading ? "Saving..." : "Save Alias"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div>
          {alias ? (
            <div className="bg-emerald-50 p-3 rounded-md mb-4">
              <p className="text-sm text-gray-500">Current Alias</p>
              <p className="font-medium text-emerald-900">{alias}</p>
            </div>
          ) : (
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                You haven&apos;t set an alias for this wallet yet. Set an alias
                to make your contributions more recognizable.
              </p>
              <Button onClick={handleStartEdit} className="mt-3">
                Set Wallet Alias
              </Button>
            </div>
          )}
        </div>
      )}

      {aliases.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            Your Wallet Aliases
          </h3>
          <div className="space-y-3">
            {aliases.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center p-3 bg-gray-50 rounded-md"
              >
                <div>
                  <p className="font-medium text-gray-900">{item.alias}</p>
                  <p className="text-xs text-gray-500 font-mono">
                    {shortenAddress(item.walletAddress)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={createDeleteHandler(item.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4 space-y-4">
            <header className="flex items-center">
              <AlertCircle className="h-6 w-6 text-red-500 mr-3" />
              <h3 className="text-lg font-medium text-gray-900">
                Confirm Deletion
              </h3>
            </header>

            <p className="text-sm text-gray-600">
              Are you sure you want to delete this wallet alias? This action
              cannot be undone.
            </p>

            <footer className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="secondary"
                onClick={handleDeleteCancel}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleDeleteConfirm}
                className="bg-red-600 hover:bg-red-700 text-gray-900"
              >
                Delete
              </Button>
            </footer>
          </div>
        </div>
      )}
    </Card>
  );
};
