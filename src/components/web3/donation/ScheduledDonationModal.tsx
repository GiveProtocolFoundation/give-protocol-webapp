import React, { useCallback } from 'react';
import { ScheduledDonationForm } from './ScheduledDonationForm';
import { TransactionModal } from '@/components/web3/common/TransactionModal';

interface ScheduledDonationModalProps {
  charityName: string;
  charityAddress: string;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Modal that wraps {@link ScheduledDonationForm} for setting up recurring monthly donations.
 * @param props - Component props.
 * @param props.charityName - Name of the charity used in the modal title.
 * @param props.charityAddress - On-chain charity wallet address that will receive donations.
 * @param props.onClose - Handler invoked when the modal is dismissed.
 * @param props.onSuccess - Optional callback invoked after a successful schedule, before closing.
 * @returns The scheduled donation modal element.
 */
export const ScheduledDonationModal: React.FC<ScheduledDonationModalProps> = ({
  charityName,
  charityAddress,
  onClose,
  onSuccess
}) => {
  const handleSuccess = useCallback(() => {
    onSuccess?.();
    onClose();
  }, [onSuccess, onClose]);

  return (
    <TransactionModal
      title={`Schedule Monthly Donations to ${charityName}`}
      onClose={onClose}
    >
      <ScheduledDonationForm
        charityAddress={charityAddress}
        charityName={charityName}
        onSuccess={handleSuccess}
        onClose={onClose}
      />
    </TransactionModal>
  );
};