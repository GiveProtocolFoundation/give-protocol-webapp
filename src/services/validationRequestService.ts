import { supabase } from "@/lib/supabase";
import {
  ValidationRequest,
  ValidationResponseInput,
  ValidationQueueItem,
  ValidationStatus,
  RejectionReason,
  SelfReportedHours,
  VALIDATION_WINDOW_DAYS,
} from "@/types/selfReportedHours";
import { generateVerificationHash } from "@/utils/volunteer";
import { Logger } from "@/utils/logger";

/**
 * Maps database row to ValidationRequest interface
 * @param row - Database row object
 * @returns ValidationRequest object
 */
function mapRowToValidationRequest(
  row: Record<string, unknown>,
): ValidationRequest {
  return {
    id: row.id as string,
    selfReportedHoursId: row.self_reported_hours_id as string,
    organizationId: row.organization_id as string,
    volunteerId: row.volunteer_id as string,
    status: row.status as ValidationRequest["status"],
    expiresAt: new Date(row.expires_at as string).getTime(),
    respondedAt: row.responded_at
      ? new Date(row.responded_at as string).getTime()
      : undefined,
    respondedBy: row.responded_by as string | undefined,
    rejectionReason: row.rejection_reason as RejectionReason | undefined,
    rejectionNotes: row.rejection_notes as string | undefined,
    isResubmission: Boolean(row.is_resubmission),
    originalRequestId: row.original_request_id as string | undefined,
    createdAt: new Date(row.created_at as string).getTime(),
    updatedAt: new Date(row.updated_at as string).getTime(),
  };
}

/**
 * Maps database row to SelfReportedHours interface
 * @param row - Database row object
 * @returns SelfReportedHours object
 */
function mapRowToSelfReportedHours(
  row: Record<string, unknown>,
): SelfReportedHours {
  return {
    id: row.id as string,
    volunteerId: row.volunteer_id as string,
    activityDate: row.activity_date as string,
    hours: Number(row.hours),
    activityType: row.activity_type as SelfReportedHours["activityType"],
    description: row.description as string,
    location: row.location as string | undefined,
    organizationId: row.organization_id as string | undefined,
    organizationName: row.organization_name as string | undefined,
    organizationContactEmail: row.organization_contact_email as
      | string
      | undefined,
    validationStatus: row.validation_status as ValidationStatus,
    validationRequestId: row.validation_request_id as string | undefined,
    validatedAt: row.validated_at
      ? new Date(row.validated_at as string).getTime()
      : undefined,
    validatedBy: row.validated_by as string | undefined,
    rejectionReason:
      row.rejection_reason as SelfReportedHours["rejectionReason"],
    rejectionNotes: row.rejection_notes as string | undefined,
    sbtTokenId: row.sbt_token_id as number | undefined,
    blockchainTxHash: row.blockchain_tx_hash as string | undefined,
    verificationHash: row.verification_hash as string | undefined,
    createdAt: new Date(row.created_at as string).getTime(),
    updatedAt: new Date(row.updated_at as string).getTime(),
  };
}

/**
 * Gets pending validation requests for an organization
 * @param organizationId - The organization's profile ID
 * @returns Array of validation queue items
 */
export async function getOrganizationValidationQueue(
  organizationId: string,
): Promise<ValidationQueueItem[]> {
  // Fetch validation requests with self_reported_hours and volunteer profile in a single query.
  // GDPR Art. 5(1)(c) data minimisation: do NOT select volunteer email — charity admins only
  // need the display name to make an approve/reject decision. See GIV-406.
  const { data, error } = await supabase
    .from("validation_requests")
    .select(
      `
      *,
      self_reported_hours:self_reported_hours_id (*),
      volunteer:volunteer_id (user_id, display_name)
    `,
    )
    .eq("organization_id", organizationId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    Logger.error("Error fetching validation queue", { error, organizationId });
    throw new Error(`Failed to fetch validation queue: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  const now = new Date().getTime();

  return data.map((row) => {
    const request = mapRowToValidationRequest(row);
    const hoursData = row.self_reported_hours as Record<string, unknown>;
    const volunteerProfile = row.volunteer as {
      user_id: string;
      display_name: string | null;
    } | null;

    const daysUntilExpiration = Math.ceil(
      (request.expiresAt - now) / (1000 * 60 * 60 * 24),
    );

    return {
      requestId: request.id,
      selfReportedHours: mapRowToSelfReportedHours(hoursData),
      volunteerName: volunteerProfile?.display_name || "Anonymous Volunteer",
      daysUntilExpiration: Math.max(0, daysUntilExpiration),
      isResubmission: request.isResubmission,
    };
  });
}

/**
 * Gets count of pending validation requests for an organization
 * @param organizationId - The organization's profile ID
 * @returns Number of pending requests
 */
export async function getValidationQueueCount(
  organizationId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("validation_requests")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "pending");

  if (error) {
    Logger.error("Error fetching validation queue count", {
      error,
      organizationId,
    });
    return 0;
  }

  return count || 0;
}

/**
 * Processes a validation response (approve or reject)
 * @param input - The validation response input
 * @param respondedBy - The user ID of the responder
 */
export async function processValidationResponse(
  input: ValidationResponseInput,
  respondedBy: string,
): Promise<void> {
  // Get the request
  const { data: request, error: requestError } = await supabase
    .from("validation_requests")
    .select("self_reported_hours_id, status, organization_id")
    .eq("id", input.requestId)
    .single();

  if (requestError) {
    Logger.error("Error fetching validation request", {
      error: requestError,
      requestId: input.requestId,
    });
    throw new Error("Validation request not found");
  }

  if (request.status !== "pending") {
    throw new Error("This request has already been processed");
  }

  const newStatus = input.approved ? "approved" : "rejected";
  const now = new Date().toISOString();

  // Update the validation request
  const { error: updateRequestError } = await supabase
    .from("validation_requests")
    .update({
      status: newStatus,
      responded_at: now,
      responded_by: respondedBy,
      rejection_reason: input.rejectionReason || null,
      rejection_notes: input.rejectionNotes || null,
    })
    .eq("id", input.requestId);

  if (updateRequestError) {
    Logger.error("Error updating validation request", {
      error: updateRequestError,
      requestId: input.requestId,
    });
    throw new Error(`Failed to update request: ${updateRequestError.message}`);
  }

  // Build update for hours record
  const hoursUpdate: Record<string, unknown> = {
    validation_status: input.approved
      ? ValidationStatus.VALIDATED
      : ValidationStatus.REJECTED,
    rejection_reason: input.rejectionReason || null,
    rejection_notes: input.rejectionNotes || null,
  };

  if (input.approved) {
    hoursUpdate.validated_at = now;
    hoursUpdate.validated_by = respondedBy;

    // Generate verification hash for validated records
    const { data: hoursData } = await supabase
      .from("self_reported_hours")
      .select("*")
      .eq("id", request.self_reported_hours_id)
      .single();

    if (hoursData) {
      hoursUpdate.verification_hash = generateVerificationHash({
        hoursId: request.self_reported_hours_id,
        volunteerId: hoursData.volunteer_id,
        organizationId: request.organization_id,
        hours: hoursData.hours,
        activityDate: hoursData.activity_date,
        activityType: hoursData.activity_type,
        validatedAt: now,
      });
    }
  }

  // Update the hours record
  const { error: updateHoursError } = await supabase
    .from("self_reported_hours")
    .update(hoursUpdate)
    .eq("id", request.self_reported_hours_id);

  if (updateHoursError) {
    Logger.error("Error updating hours record", {
      error: updateHoursError,
      hoursId: request.self_reported_hours_id,
    });
    throw new Error(
      `Failed to update hours record: ${updateHoursError.message}`,
    );
  }
}

/**
 * Batch approves multiple validation requests
 * @param requestIds - Array of request IDs to approve
 * @param respondedBy - The user ID of the responder
 * @returns Results with success and failed arrays
 */
export async function batchApproveRequests(
  requestIds: string[],
  respondedBy: string,
): Promise<{ success: string[]; failed: string[] }> {
  const results = { success: [] as string[], failed: [] as string[] };

  for (const requestId of requestIds) {
    try {
      await processValidationResponse(
        { requestId, approved: true },
        respondedBy,
      );
      results.success.push(requestId);
    } catch (error) {
      Logger.error("Batch approve failed for request", {
        requestId,
        error: error instanceof Error ? error.message : String(error),
      });
      results.failed.push(requestId);
    }
  }

  return results;
}

/**
 * Batch rejects multiple validation requests
 * @param requestIds - Array of request IDs to reject
 * @param respondedBy - The user ID of the responder
 * @param rejectionReason - The reason for rejection
 * @param rejectionNotes - Optional notes
 * @returns Results with success and failed arrays
 */
export async function batchRejectRequests(
  requestIds: string[],
  respondedBy: string,
  rejectionReason: RejectionReason,
  rejectionNotes?: string,
): Promise<{ success: string[]; failed: string[] }> {
  const results = { success: [] as string[], failed: [] as string[] };

  for (const requestId of requestIds) {
    try {
      await processValidationResponse(
        { requestId, approved: false, rejectionReason, rejectionNotes },
        respondedBy,
      );
      results.success.push(requestId);
    } catch (error) {
      Logger.error("Batch reject failed for request", {
        requestId,
        error: error instanceof Error ? error.message : String(error),
      });
      results.failed.push(requestId);
    }
  }

  return results;
}

/**
 * Cancels a pending validation request
 * @param requestId - The request ID
 * @param volunteerId - The volunteer's user ID (for ownership check)
 */
export async function cancelValidationRequest(
  requestId: string,
  volunteerId: string,
): Promise<void> {
  // Get the request
  const { data: request, error: requestError } = await supabase
    .from("validation_requests")
    .select("volunteer_id, self_reported_hours_id, status")
    .eq("id", requestId)
    .single();

  if (requestError) {
    throw new Error("Request not found");
  }

  if (request.volunteer_id !== volunteerId) {
    throw new Error("Access denied");
  }

  if (request.status !== "pending") {
    throw new Error("Can only cancel pending requests");
  }

  // Update request status
  const { error: updateRequestError } = await supabase
    .from("validation_requests")
    .update({ status: "cancelled" })
    .eq("id", requestId);

  if (updateRequestError) {
    throw new Error(`Failed to cancel request: ${updateRequestError.message}`);
  }

  // Update hours record
  const { error: updateHoursError } = await supabase
    .from("self_reported_hours")
    .update({
      validation_status: ValidationStatus.UNVALIDATED,
      validation_request_id: null,
    })
    .eq("id", request.self_reported_hours_id);

  if (updateHoursError) {
    Logger.warn("Failed to update hours after cancellation", {
      error: updateHoursError,
    });
  }
}

/**
 * Resubmits a rejected validation request (appeal)
 * @param originalRequestId - The original rejected request ID
 * @param volunteerId - The volunteer's user ID
 */
export async function resubmitValidationRequest(
  originalRequestId: string,
  volunteerId: string,
): Promise<string> {
  // Get the original request
  const { data: originalRequest, error: requestError } = await supabase
    .from("validation_requests")
    .select("*, self_reported_hours:self_reported_hours_id (activity_date)")
    .eq("id", originalRequestId)
    .single();

  if (requestError) {
    throw new Error("Original request not found");
  }

  if (originalRequest.volunteer_id !== volunteerId) {
    throw new Error("Access denied");
  }

  if (originalRequest.status !== "rejected") {
    throw new Error("Can only resubmit rejected requests");
  }

  // Check if validation window is still open
  const hoursData = originalRequest.self_reported_hours as {
    activity_date: string;
  } | null;
  if (!hoursData) {
    throw new Error("Hours record not found");
  }

  const activityDate = new Date(hoursData.activity_date);
  const expiresAt = new Date(activityDate);
  expiresAt.setDate(expiresAt.getDate() + VALIDATION_WINDOW_DAYS);

  if (expiresAt < new Date()) {
    throw new Error("Validation window has expired");
  }

  // Create new request as resubmission
  const { data: newRequest, error: insertError } = await supabase
    .from("validation_requests")
    .insert({
      self_reported_hours_id: originalRequest.self_reported_hours_id,
      organization_id: originalRequest.organization_id,
      volunteer_id: volunteerId,
      expires_at: expiresAt.toISOString(),
      is_resubmission: true,
      original_request_id: originalRequestId,
    })
    .select("id")
    .single();

  if (insertError) {
    throw new Error(`Failed to create resubmission: ${insertError.message}`);
  }

  // Update hours record
  await supabase
    .from("self_reported_hours")
    .update({
      validation_status: ValidationStatus.PENDING,
      validation_request_id: newRequest.id,
      rejection_reason: null,
      rejection_notes: null,
    })
    .eq("id", originalRequest.self_reported_hours_id);

  return newRequest.id;
}

/**
 * Gets validation request history for a specific hours record
 * @param selfReportedHoursId - The hours record ID
 * @param volunteerId - The volunteer's user ID (for ownership check)
 * @returns Array of validation requests
 */
export async function getValidationHistory(
  selfReportedHoursId: string,
  volunteerId: string,
): Promise<ValidationRequest[]> {
  const { data, error } = await supabase
    .from("validation_requests")
    .select("*")
    .eq("self_reported_hours_id", selfReportedHoursId)
    .eq("volunteer_id", volunteerId)
    .order("created_at", { ascending: false });

  if (error) {
    Logger.error("Error fetching validation history", {
      error,
      selfReportedHoursId,
    });
    throw new Error(`Failed to fetch history: ${error.message}`);
  }

  return (data || []).map(mapRowToValidationRequest);
}
