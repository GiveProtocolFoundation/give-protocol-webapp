import React from 'react';

interface WithdrawalStatusProps {
  status: 'pending' | 'approved' | 'rejected';
}

/**
 * Renders a small status pill with color coding for a charity withdrawal request.
 * @param props - Component props.
 * @param props.status - Withdrawal status: `pending`, `approved`, or `rejected`.
 * @returns The status pill element.
 */
export const WithdrawalStatus: React.FC<WithdrawalStatusProps> = ({ status }) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusStyles()}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};