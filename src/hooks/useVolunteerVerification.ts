import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/contexts/ToastContext';
import { 
  VolunteerApplication, 
  VolunteerHours, 
  VolunteerVerification 
} from '@/types/volunteer';
import { 
  createAcceptanceHash, 
  createVerificationHash, 
  recordVerificationOnChain 
} from '@/utils/volunteer';
import { Logger } from '@/utils/logger';

/**
 * Hook for charity coordinators to accept volunteer applications, verify hours,
 * and look up verification records. Requires the signed-in user to own the
 * associated charity opportunity or hours record.
 * @returns Actions (acceptApplication, verifyHours, getVerificationByHash) and loading/error state
 */
export const useVolunteerVerification = () => {
  const { profile } = useProfile();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Accepts a volunteer application and creates a verification hash
   * @param applicationId The ID of the application to accept
   */
  const acceptApplication = async (applicationId: string) => {
    if (!profile?.id) {
      setError('User profile not found');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      // Get application details
      const { data: application, error: fetchError } = await supabase
        .from('volunteer_applications')
        .select(`
          id,
          opportunity_id,
          applicant_id,
          volunteer_opportunities(charity_id)
        `)
        .eq('id', applicationId)
        .single();

      if (fetchError) throw fetchError;
      if (!application) throw new Error('Application not found');

      // Check if user has permission (is the charity that owns the opportunity)
      const charityId = application.volunteer_opportunities.charity_id;
      if (charityId !== profile.id) {
        throw new Error('You do not have permission to accept this application');
      }

      // Update application status
      const { error: updateError } = await supabase
        .from('volunteer_applications')
        .update({
          status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (updateError) throw updateError;

      // Create acceptance hash
      const formattedApplication: VolunteerApplication = {
        id: application.id,
        opportunityId: application.opportunity_id,
        applicantId: application.applicant_id,
        charityId,
        fullName: '', // Not needed for hash generation
        phoneNumber: '', // Not needed for hash generation
        email: '', // Not needed for hash generation
        availability: { days: [], times: [] }, // Not needed for hash generation
        commitmentType: 'one-time', // Not needed for hash generation
        status: 'approved',
        createdAt: '', // Not needed for hash generation
        updatedAt: new Date().toISOString()
      };

      const hash = await createAcceptanceHash(formattedApplication);

      showToast('success', 'Application accepted', 'Verification hash created');
      return hash;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to accept application';
      setError(message);
      showToast('error', 'Error', message);
      Logger.error('Application acceptance failed', { error: err, applicationId });
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verifies volunteer hours and creates a verification hash
   * @param hoursId The ID of the hours record to verify
   */
  const verifyHours = async (hoursId: string) => {
    if (!profile?.id) {
      setError('User profile not found');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      // Get hours details
      const { data: hours, error: fetchError } = await supabase
        .from('volunteer_hours')
        .select('*')
        .eq('id', hoursId)
        .single();

      if (fetchError) throw fetchError;
      if (!hours) throw new Error('Hours record not found');

      // Check if user has permission (is the charity that received the volunteer hours)
      if (hours.charity_id !== profile.id) {
        throw new Error('You do not have permission to verify these hours');
      }

      // Update hours status
      const { error: updateError } = await supabase
        .from('volunteer_hours')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: profile.id
        })
        .eq('id', hoursId);

      if (updateError) throw updateError;

      // Create verification hash
      const formattedHours: VolunteerHours = {
        id: hours.id,
        volunteerId: hours.volunteer_id,
        charityId: hours.charity_id,
        opportunityId: hours.opportunity_id,
        hours: hours.hours,
        description: hours.description,
        datePerformed: hours.date_performed,
        status: 'approved',
        createdAt: hours.created_at,
        approvedAt: new Date().toISOString(),
        approvedBy: profile.id
      };

      const hash = await createVerificationHash(formattedHours);

      // Record on blockchain (in a real implementation)
      try {
        const verification: VolunteerVerification = {
          id: '', // Will be generated by Supabase
          applicantId: hours.volunteer_id,
          opportunityId: hours.opportunity_id || '',
          charityId: hours.charity_id,
          acceptanceHash: '', // Not needed for this operation
          verificationHash: hash,
          acceptedAt: '', // Not needed for this operation
          verifiedAt: new Date().toISOString()
        };

        const blockchainRecord = await recordVerificationOnChain(verification);

        // Update verification record with blockchain reference
        const { error: blockchainUpdateError } = await supabase
          .from('volunteer_verifications')
          .update({
            blockchainReference: {
              network: 'base',
              transactionId: blockchainRecord.transactionId,
              blockNumber: blockchainRecord.blockNumber
            }
          })
          .eq('verificationHash', hash);

        if (blockchainUpdateError) {
          Logger.warn('Failed to update blockchain reference', { 
            error: blockchainUpdateError, 
            hash 
          });
        }
      } catch (blockchainError) {
        // Log but don't fail the whole operation
        Logger.error('Failed to record on blockchain', { 
          error: blockchainError, 
          hoursId 
        });
      }

      showToast('success', 'Hours verified', 'Verification hash created');
      return hash;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to verify hours';
      setError(message);
      showToast('error', 'Error', message);
      Logger.error('Hours verification failed', { error: err, hoursId });
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Gets verification details by hash
   * @param hash The verification hash to look up
   */
  const getVerificationByHash = async (hash: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('volunteer_verifications')
        .select(`
          id,
          applicantId:applicant_id,
          opportunityId:opportunity_id,
          charityId:charity_id,
          acceptanceHash:acceptance_hash,
          verificationHash:verification_hash,
          acceptedAt:accepted_at,
          verifiedAt:verified_at,
          blockchainReference:blockchain_reference,
          profiles:applicantId(id, user_id),
          volunteer_opportunities:opportunityId(
            id, 
            title,
            charity_id,
            charity_details:charity_id(name)
          )
        `)
        .or(`acceptance_hash.eq.${hash},verification_hash.eq.${hash}`)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get verification';
      setError(message);
      Logger.error('Verification lookup failed', { error: err, hash });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    acceptApplication,
    verifyHours,
    getVerificationByHash,
    loading,
    error
  };
};