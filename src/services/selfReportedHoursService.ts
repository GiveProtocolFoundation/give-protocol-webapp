import { supabase } from "@/lib/supabase";
import {
  SelfReportedHours,
  SelfReportedHoursInput,
  SelfReportedHoursDisplay,
  SelfReportedHoursFilters,
  ValidationStatus,
  VolunteerHoursStats,
  VALIDATION_WINDOW_DAYS,
  MIN_HOURS_PER_RECORD,
  MAX_HOURS_PER_RECORD,
  MIN_DESCRIPTION_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  calculateDaysUntilExpiration,
  canEditRecord,
  canDeleteRecord,
  canRequestValidation,
} from "@/types/selfReportedHours";
import { Logger } from "@/utils/logger";

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
    charityOrgId: row.charity_org_id
      ? (row.charity_org_id as string)
      : undefined,
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
 * Maps SelfReportedHours to display type with computed fields
 * @param hours - SelfReportedHours object
 * @returns SelfReportedHoursDisplay object
 */
function mapToDisplay(hours: SelfReportedHours): SelfReportedHoursDisplay {
  const isVerifiedOrganization = Boolean(hours.organizationId);
  const daysUntilExpiration = calculateDaysUntilExpiration(hours.activityDate);

  return {
    ...hours,
    organizationDisplayName: hours.organizationName || "Unknown Organization",
    isVerifiedOrganization,
    daysUntilExpiration,
    canEdit: canEditRecord(hours.validationStatus),
    canDelete: canDeleteRecord(hours.validationStatus),
    canRequestValidation: canRequestValidation(
      hours.validationStatus,
      hours.activityDate,
      isVerifiedOrganization,
    ),
  };
}

/**
 * Validates self-reported hours input
 * @param input - The input to validate
 * @returns Object with isValid flag and errors array
 */
function validateInput(input: SelfReportedHoursInput): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate activity date
  const activityDate = new Date(input.activityDate);
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  if (activityDate > today) {
    errors.push("Activity date cannot be in the future");
  }

  // Validate hours
  if (
    input.hours < MIN_HOURS_PER_RECORD ||
    input.hours > MAX_HOURS_PER_RECORD
  ) {
    errors.push(
      `Hours must be between ${MIN_HOURS_PER_RECORD} and ${MAX_HOURS_PER_RECORD}`,
    );
  }

  // Validate description length
  if (input.description.length < MIN_DESCRIPTION_LENGTH) {
    errors.push(
      `Description must be at least ${MIN_DESCRIPTION_LENGTH} characters`,
    );
  }
  if (input.description.length > MAX_DESCRIPTION_LENGTH) {
    errors.push(
      `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`,
    );
  }

  // Validate organization
  if (input.platformCharityId) {
    if (input.organizationId) {
      errors.push(
        "Cannot specify both platform charity ID and organization ID",
      );
    }
    if (!input.organizationName) {
      errors.push(
        "Organization name is required when logging hours for an on-platform organization",
      );
    }
  } else {
    if (!input.organizationId && !input.organizationName) {
      errors.push("Either organization ID or organization name is required");
    }
    if (input.organizationId && input.organizationName) {
      errors.push("Cannot specify both organization ID and organization name");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Creates a validation request for a self-reported hours record
 * @param selfReportedHoursId - ID of the hours record
 * @param organizationId - ID of the organization
 * @param volunteerId - ID of the volunteer
 * @param activityDate - Date of the activity
 * @returns The created validation request ID
 */
async function createValidationRequest(
  selfReportedHoursId: string,
  organizationId: string,
  volunteerId: string,
  activityDate: string,
): Promise<string> {
  const expiresAt = new Date(activityDate);
  expiresAt.setDate(expiresAt.getDate() + VALIDATION_WINDOW_DAYS);

  const { data, error } = await supabase
    .from("validation_requests")
    .insert({
      self_reported_hours_id: selfReportedHoursId,
      organization_id: organizationId,
      volunteer_id: volunteerId,
      expires_at: expiresAt.toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create validation request: ${error.message}`);
  }

  // Update the hours record with the request ID
  await supabase
    .from("self_reported_hours")
    .update({ validation_request_id: data.id })
    .eq("id", selfReportedHoursId);

  return data.id;
}

/**
 * Resolves a registry on-platform charity reference to the charity's
 * profiles.id (GIV-959).
 *
 * The organization autocomplete reports platform orgs by their
 * charity_profiles.id, while self_reported_hours.organization_id (and
 * validation_requests.organization_id) reference profiles(id). Map between
 * them via charity_profiles.claimed_by → profiles.user_id.
 *
 * @param platformCharityId - charity_profiles.id of the selected org
 * @returns The charity account's profiles.id, or null when the charity
 * profile is unclaimed (no charity account exists to validate hours)
 */
async function resolveCharityProfileId(
  platformCharityId: string,
): Promise<string | null> {
  const { data: charityProfile, error: charityProfileError } = await supabase
    .from("charity_profiles")
    .select("claimed_by")
    .eq("id", platformCharityId)
    .maybeSingle();

  if (charityProfileError) {
    Logger.warn("Failed to look up charity profile for platform org", {
      error: charityProfileError,
      platformCharityId,
    });
    return null;
  }

  if (!charityProfile?.claimed_by) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", charityProfile.claimed_by)
    .eq("type", "charity")
    .maybeSingle();

  if (profileError) {
    Logger.warn("Failed to look up charity account profile for platform org", {
      error: profileError,
      platformCharityId,
    });
    return null;
  }

  return profile?.id ?? null;
}

/**
 * Creates a new self-reported volunteer hours record
 * @param volunteerId - The user ID of the volunteer
 * @param input - The hours record input
 * @returns The created record
 */
export async function createSelfReportedHours(
  volunteerId: string,
  input: SelfReportedHoursInput,
): Promise<SelfReportedHours> {
  // Verify the authenticated user matches the volunteerId
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    Logger.error("Authentication error in createSelfReportedHours", {
      error: authError,
      volunteerId,
    });
    throw new Error("You must be logged in to log volunteer hours");
  }

  if (user.id !== volunteerId) {
    Logger.error("User ID mismatch in createSelfReportedHours", {
      authenticatedUserId: user.id,
      providedVolunteerId: volunteerId,
    });
    throw new Error("Authentication mismatch - please refresh and try again");
  }

  // Validate input
  const validation = validateInput(input);
  if (!validation.isValid) {
    throw new Error(validation.errors.join("; "));
  }

  // Determine the persisted organization reference (GIV-959).
  // Registry on-platform orgs arrive as platformCharityId (charity_profiles.id);
  // resolve that to the charity account's profiles.id so the insert satisfies
  // the organization_id → profiles(id) foreign key. Unclaimed platform
  // charities have no charity account, so fall back to the organization name
  // (the table's valid_org_reference XOR constraint requires exactly one).
  let organizationId: string | null = input.organizationId ?? null;
  let organizationName: string | null = input.organizationName ?? null;

  if (input.platformCharityId) {
    const charityProfileId = await resolveCharityProfileId(
      input.platformCharityId,
    );

    if (charityProfileId) {
      organizationId = charityProfileId;
      organizationName = null;
    } else {
      organizationId = null;
    }
  }

  // Determine initial validation status
  let validationStatus: ValidationStatus = ValidationStatus.UNVALIDATED;

  if (organizationId) {
    // Check if validation window is still open
    const daysLeft = calculateDaysUntilExpiration(input.activityDate);
    if (daysLeft !== undefined && daysLeft > 0) {
      validationStatus = ValidationStatus.PENDING;
    } else {
      validationStatus = ValidationStatus.EXPIRED;
    }
  }

  const { data, error } = await supabase
    .from("self_reported_hours")
    .insert({
      volunteer_id: volunteerId,
      activity_date: input.activityDate,
      hours: input.hours,
      activity_type: input.activityType,
      description: input.description,
      location: input.location || null,
      organization_id: organizationId,
      charity_org_id: input.charityOrgId || null,
      organization_name: organizationName,
      organization_contact_email: input.organizationContactEmail || null,
      validation_status: validationStatus,
    })
    .select()
    .single();

  if (error) {
    Logger.error("Error creating self-reported hours", { error, volunteerId });
    throw new Error(`Failed to create record: ${error.message}`);
  }

  const record = mapRowToSelfReportedHours(data);

  // If verified org and not expired, create validation request
  if (organizationId && validationStatus === ValidationStatus.PENDING) {
    try {
      await createValidationRequest(
        record.id,
        organizationId,
        volunteerId,
        input.activityDate,
      );
    } catch (requestError) {
      Logger.warn("Failed to create validation request", {
        error: requestError,
        recordId: record.id,
      });
      // Don't fail the whole operation, just log the warning
    }
  }

  return record;
}

/**
 * Fetches self-reported hours for a volunteer with optional filters
 * @param volunteerId - The user ID of the volunteer
 * @param filters - Optional filters to apply
 * @returns Array of display records
 */
export async function getVolunteerSelfReportedHours(
  volunteerId: string,
  filters?: SelfReportedHoursFilters,
): Promise<SelfReportedHoursDisplay[]> {
  let query = supabase
    .from("self_reported_hours")
    .select("*")
    .eq("volunteer_id", volunteerId)
    .order("activity_date", { ascending: false });

  // Apply filters
  if (filters?.status) {
    query = query.eq("validation_status", filters.status);
  }
  if (filters?.organizationId) {
    query = query.eq("organization_id", filters.organizationId);
  }
  if (filters?.activityType) {
    query = query.eq("activity_type", filters.activityType);
  }
  if (filters?.dateFrom) {
    query = query.gte("activity_date", filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte("activity_date", filters.dateTo);
  }

  const { data, error } = await query;

  if (error) {
    Logger.error("Error fetching self-reported hours", {
      error,
      volunteerId,
      filters,
    });
    throw new Error(`Failed to fetch records: ${error.message}`);
  }

  return (data || []).map((row) => {
    const hours = mapRowToSelfReportedHours(row);
    return mapToDisplay(hours);
  });
}

/**
 * Gets a single self-reported hours record by ID
 * @param id - The record ID
 * @param volunteerId - The volunteer's user ID (for ownership check)
 * @returns The record or null if not found
 */
export async function getSelfReportedHoursById(
  id: string,
  volunteerId: string,
): Promise<SelfReportedHoursDisplay | null> {
  const { data, error } = await supabase
    .from("self_reported_hours")
    .select("*")
    .eq("id", id)
    .eq("volunteer_id", volunteerId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }
    Logger.error("Error fetching self-reported hours by ID", {
      error,
      id,
      volunteerId,
    });
    throw new Error(`Failed to fetch record: ${error.message}`);
  }

  const hours = mapRowToSelfReportedHours(data);
  return mapToDisplay(hours);
}

/**
 * Gets aggregate statistics for a volunteer's hours
 * @param volunteerId - The volunteer's user ID
 * @returns Statistics object
 */
export async function getVolunteerHoursStats(
  volunteerId: string,
): Promise<VolunteerHoursStats> {
  const { data, error } = await supabase
    .from("self_reported_hours")
    .select("hours, validation_status")
    .eq("volunteer_id", volunteerId);

  if (error) {
    Logger.error("Error fetching volunteer hours stats", {
      error,
      volunteerId,
    });
    throw new Error(`Failed to fetch stats: ${error.message}`);
  }

  const stats: VolunteerHoursStats = {
    totalValidatedHours: 0,
    totalUnvalidatedHours: 0,
    totalPendingHours: 0,
    totalRejectedHours: 0,
    totalExpiredHours: 0,
    recordCount: data?.length || 0,
    recordsByStatus: {
      [ValidationStatus.PENDING]: 0,
      [ValidationStatus.VALIDATED]: 0,
      [ValidationStatus.REJECTED]: 0,
      [ValidationStatus.UNVALIDATED]: 0,
      [ValidationStatus.EXPIRED]: 0,
    },
  };

  for (const record of data || []) {
    const hours = Number(record.hours);
    const status = record.validation_status as ValidationStatus;

    stats.recordsByStatus[status]++;

    switch (status) {
      case ValidationStatus.VALIDATED: {
        stats.totalValidatedHours += hours;
        break;
      }
      case ValidationStatus.PENDING: {
        stats.totalPendingHours += hours;
        break;
      }
      case ValidationStatus.REJECTED: {
        stats.totalRejectedHours += hours;
        break;
      }
      case ValidationStatus.EXPIRED: {
        stats.totalExpiredHours += hours;
        break;
      }
      case ValidationStatus.UNVALIDATED:
      default: {
        stats.totalUnvalidatedHours += hours;
        break;
      }
    }
  }

  return stats;
}

/**
 * Validates and builds update data for self-reported hours
 * @throws Error if validation fails
 */
function buildUpdateData(
  input: Partial<SelfReportedHoursInput>,
): Record<string, unknown> {
  const updateData: Record<string, unknown> = {};

  if (input.activityDate !== undefined) {
    if (new Date(input.activityDate) > new Date()) {
      throw new Error("Activity date cannot be in the future");
    }
    updateData.activity_date = input.activityDate;
  }

  if (input.hours !== undefined) {
    if (
      input.hours < MIN_HOURS_PER_RECORD ||
      input.hours > MAX_HOURS_PER_RECORD
    ) {
      throw new Error(
        `Hours must be between ${MIN_HOURS_PER_RECORD} and ${MAX_HOURS_PER_RECORD}`,
      );
    }
    updateData.hours = input.hours;
  }

  if (input.activityType !== undefined) {
    updateData.activity_type = input.activityType;
  }

  if (input.description !== undefined) {
    if (input.description.length < MIN_DESCRIPTION_LENGTH) {
      throw new Error(
        `Description must be at least ${MIN_DESCRIPTION_LENGTH} characters`,
      );
    }
    if (input.description.length > MAX_DESCRIPTION_LENGTH) {
      throw new Error(
        `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`,
      );
    }
    updateData.description = input.description;
  }

  if (input.location !== undefined) {
    updateData.location = input.location || null;
  }

  return updateData;
}

/**
 * Updates a self-reported hours record (only if editable)
 * @param id - The record ID
 * @param volunteerId - The volunteer's user ID
 * @param input - The fields to update
 * @returns The updated record
 */
export async function updateSelfReportedHours(
  id: string,
  volunteerId: string,
  input: Partial<SelfReportedHoursInput>,
): Promise<SelfReportedHours> {
  const { data: existing, error: fetchError } = await supabase
    .from("self_reported_hours")
    .select("volunteer_id, validation_status")
    .eq("id", id)
    .single();

  if (fetchError) {
    Logger.error("Error fetching record for update", { error: fetchError, id });
    throw new Error("Record not found");
  }

  if (existing.volunteer_id !== volunteerId) {
    throw new Error("Access denied");
  }

  if (!canEditRecord(existing.validation_status as ValidationStatus)) {
    throw new Error("Cannot edit validated records");
  }

  const updateData = buildUpdateData(input);

  const { data, error } = await supabase
    .from("self_reported_hours")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    Logger.error("Error updating self-reported hours", { error, id });
    throw new Error(`Failed to update record: ${error.message}`);
  }

  return mapRowToSelfReportedHours(data);
}

/**
 * Deletes a self-reported hours record (only if deletable)
 * @param id - The record ID
 * @param volunteerId - The volunteer's user ID
 */
export async function deleteSelfReportedHours(
  id: string,
  volunteerId: string,
): Promise<void> {
  // First check if record exists and is deletable
  const { data: existing, error: fetchError } = await supabase
    .from("self_reported_hours")
    .select("volunteer_id, validation_status")
    .eq("id", id)
    .single();

  if (fetchError) {
    Logger.error("Error fetching record for delete", { error: fetchError, id });
    throw new Error("Record not found");
  }

  if (existing.volunteer_id !== volunteerId) {
    throw new Error("Access denied");
  }

  if (!canDeleteRecord(existing.validation_status as ValidationStatus)) {
    throw new Error("Cannot delete validated records");
  }

  const { error } = await supabase
    .from("self_reported_hours")
    .delete()
    .eq("id", id);

  if (error) {
    Logger.error("Error deleting self-reported hours", { error, id });
    throw new Error(`Failed to delete record: ${error.message}`);
  }
}

/**
 * Requests validation for an existing unvalidated record
 * @param id - The record ID
 * @param volunteerId - The volunteer's user ID
 * @param organizationId - The organization to request validation from
 */
export async function requestValidation(
  id: string,
  volunteerId: string,
  organizationId: string,
): Promise<void> {
  // Get the existing record
  const { data: existing, error: fetchError } = await supabase
    .from("self_reported_hours")
    .select("volunteer_id, validation_status, activity_date, organization_id")
    .eq("id", id)
    .single();

  if (fetchError) {
    throw new Error("Record not found");
  }

  if (existing.volunteer_id !== volunteerId) {
    throw new Error("Access denied");
  }

  // Check if validation can be requested
  const daysLeft = calculateDaysUntilExpiration(existing.activity_date);
  if (daysLeft === undefined) {
    throw new Error("Validation window has expired for this activity");
  }

  if (existing.validation_status === ValidationStatus.PENDING) {
    throw new Error("Validation request already pending");
  }

  if (existing.validation_status === ValidationStatus.VALIDATED) {
    throw new Error("Record is already validated");
  }

  // Create validation request
  const requestId = await createValidationRequest(
    id,
    organizationId,
    volunteerId,
    existing.activity_date,
  );

  // Update the hours record
  await supabase
    .from("self_reported_hours")
    .update({
      organization_id: organizationId,
      organization_name: null,
      validation_status: ValidationStatus.PENDING,
      validation_request_id: requestId,
    })
    .eq("id", id);
}
