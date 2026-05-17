import React, { useCallback } from 'react';
import { WithdrawalForm } from './WithdrawalForm';
import { TransactionModal } from '../common/TransactionModal';

interface WithdrawalModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Modal wrapper around {@link WithdrawalForm} used to request a withdrawal.
 * @param props - Component props.
 * @param props.onClose - Handler invoked when the modal is dismissed.
 * @param props.onSuccess - Optional callback invoked after a successful submission, before closing.
 * @returns The withdrawal modal element.
 */
export const WithdrawalModal: React.FC<WithdrawalModalProps> = ({
  onClose,
  onSuccess
}) => {
  const handleSuccess = useCallback(() => {
    onSuccess?.();
    onClose();
  }, [onSuccess, onClose]);

  return (
    <TransactionModal
      title="Request Withdrawal"
      onClose={onClose}
    >
      <WithdrawalForm
        onSuccess={handleSuccess}
      />
    </TransactionModal>
  );
};