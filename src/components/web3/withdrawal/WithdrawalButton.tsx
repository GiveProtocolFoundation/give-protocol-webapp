import React, { useState, useCallback } from "react";
import { Wallet } from "lucide-react";
import { WithdrawalModal } from "./WithdrawalModal";
import { TransactionButton } from "../common/TransactionButton";

interface WithdrawalButtonProps {
  onSuccess?: () => void;
}

/**
 * Button that opens the {@link WithdrawalModal} and forwards the success callback.
 * @param props - Component props.
 * @param props.onSuccess - Optional callback invoked after a successful withdrawal request.
 * @returns The withdrawal trigger button and (when open) the withdrawal modal.
 */
export const WithdrawalButton: React.FC<WithdrawalButtonProps> = ({
  onSuccess,
}) => {
  const [showModal, setShowModal] = useState(false);

  const handleOpenModal = useCallback(() => {
    setShowModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
  }, []);

  return (
    <>
      <TransactionButton
        icon={Wallet}
        label="Withdraw"
        onClick={handleOpenModal}
      />

      {showModal && (
        <WithdrawalModal onClose={handleCloseModal} onSuccess={onSuccess} />
      )}
    </>
  );
};
