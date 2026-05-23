import React from 'react';
import { ScheduledDonations } from '@/components/donor/ScheduledDonations';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { useWeb3 } from '@/contexts/Web3Context';
import { Button } from '@/components/ui/Button';

/**
 * Page component that displays a donor's scheduled (recurring) donations.
 * @returns React element with the scheduled donations UI or a redirect
 */
const ScheduledDonationsPage: React.FC = () => {
  const { user, userType } = useAuth();
  const { isConnected, connect } = useWeb3();

  if (!user) {
    return <Navigate to="/login?type=donor" />;
  }

  // Redirect charity users to charity portal
  if (userType === 'charity') {
    return <Navigate to="/charity-portal" />;
  }

  if (!isConnected) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-6">
            To view your scheduled donations, please connect your wallet.
          </p>
          <Button onClick={connect}>Connect Wallet</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Scheduled Donations</h1>
        <p className="mt-2 text-gray-600">Manage your monthly donation schedules</p>
      </div>

      <ScheduledDonations />
    </div>
  );
};

export default ScheduledDonationsPage;