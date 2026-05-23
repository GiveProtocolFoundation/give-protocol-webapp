import React, { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useVolunteerVerification } from '@/hooks/useVolunteerVerification';
import { VolunteerVerificationCard } from '@/components/volunteer/VolunteerVerificationCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Logger } from '@/utils/logger';
import { VolunteerVerification } from '@/types/volunteer';

/**
 * Page component for verifying a volunteer contribution by its unique hash.
 * @returns React element showing verification status or a loading spinner
 */
const VerifyContribution: React.FC = () => {
  const { hash } = useParams<{ hash: string }>();
  const navigate = useNavigate();
  const { getVerificationByHash, loading, error } = useVolunteerVerification();
  const [verification, setVerification] = React.useState<VolunteerVerification | null>(null);
  const [verificationChecked, setVerificationChecked] = React.useState(false);

  React.useEffect(() => {
    if (hash) {
      /** Fetches verification record for the given hash from the backend. */
      const fetchVerification = async () => {
        try {
          const result = await getVerificationByHash(hash);
          setVerification(result);
          setVerificationChecked(true);
        } catch (err) {
          Logger.error('Verification lookup failed:', err);
          setVerificationChecked(true);
        }
      };
      
      fetchVerification();
    }
  }, [hash, getVerificationByHash]);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center py-12">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Verifying contribution&hellip;</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Button
        variant="ghost"
        onClick={handleBack}
        className="mb-6 flex items-center text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Volunteer Contribution Verification</h1>
        </div>

        <div className="p-6">
          {!verificationChecked && (
            <div className="text-center py-8">
              <p className="text-gray-500">No verification hash provided.</p>
            </div>
          )}
          {verificationChecked && verification && (
            <div className="space-y-6">
              <div className="flex items-center p-4 bg-green-50 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-500 mr-3" />
                <div>
                  <h2 className="text-lg font-medium text-green-800">Verification Successful</h2>
                  <p className="text-sm text-green-700">
                    This volunteer contribution has been verified and recorded on the blockchain.
                  </p>
                </div>
              </div>

              <VolunteerVerificationCard
                verification={{
                  id: verification.id,
                  applicantName: verification.profiles?.name || 'Unknown Volunteer',
                  opportunityTitle: verification.volunteer_opportunities?.title || 'Unknown Opportunity',
                  charityName: verification.volunteer_opportunities?.charity_details?.name || 'Unknown Organization',
                  acceptanceHash: verification.acceptanceHash,
                  verificationHash: verification.verificationHash,
                  acceptedAt: verification.acceptedAt,
                  verifiedAt: verification.verifiedAt,
                  blockchainReference: verification.blockchainReference
                }}
              />
            </div>
          )}
          {verificationChecked && !verification && (
            <div className="flex items-center p-4 bg-yellow-50 rounded-lg">
              <AlertCircle className="h-6 w-6 text-yellow-500 mr-3" />
              <div>
                <h2 className="text-lg font-medium text-yellow-800">Verification Failed</h2>
                <p className="text-sm text-yellow-700">
                  The verification hash {hash} could not be found or is invalid.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyContribution;