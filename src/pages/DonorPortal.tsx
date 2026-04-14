import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useDonorData } from '@/hooks/useDonorData';
import { DonorStats } from '@/components/donor/DonorStats';
import { DonationHistory } from '@/components/donor/DonationHistory';
import { Transaction } from '@/types/contribution';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export const DonorPortal: React.FC = () => {
  const { user, userType } = useAuth();
  const { loading: profileLoading } = useProfile();
  const { data, loading: dataLoading, error } = useDonorData();

  // Convert donation data to Transaction format for the DonationHistory component
  const formatDonationsAsTransactions = (): Transaction[] => {
    if (!data?.donations) return [];
    
    return data.donations.map(donation => ({
      id: donation.id,
      hash: donation.id, // Using ID as hash for sample data
      from: '0x1234567890123456789012345678901234567890', // Sample sender address
      to: '0x0987654321098765432109876543210987654321', // Sample recipient address
      amount: donation.amount,
      cryptoType: 'GLMR', // Default to GLMR
      fiatValue: donation.amount, // Using the same value for sample data
      fee: donation.amount * 0.001, // Sample fee calculation
      timestamp: donation.date,
      status: 'completed',
      purpose: 'Donation',
      metadata: {
        organization: donation.charity,
        impactGrowth: donation.impactGrowth
      }
    }));
  };

  if (!user) {
    return <Navigate to="/login?type=donor" />;
  }

  if (profileLoading || dataLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 p-4 rounded-md text-red-700">
          {error}
        </div>
      </div>
    );
  }

  // Redirect charity users to charity portal
  if (userType === 'charity') {
    return <Navigate to="/charity-portal" />;
  }

  const transactions = formatDonationsAsTransactions();

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Donor Dashboard</h1>
        <p className="mt-2 text-gray-600">Welcome back!</p>
      </div>

      {data && (
        <>
          <DonorStats
            totalDonated={data.totalDonated}
            impactGrowth={data.impactGrowth}
            charitiesSupported={data.charitiesSupported}
          />
          <div className="mt-8">
            <DonationHistory donations={transactions} />
          </div>
        </>
      )}
    </main>
  );
};

export default DonorPortal;