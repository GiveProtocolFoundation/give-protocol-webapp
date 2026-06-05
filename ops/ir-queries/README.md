# Incident Response Queries

Pre-built query templates for time-critical incident response, designed to run under the `ir_readonly` Postgres role with no standing production credentials.

## Quick Start

1. Obtain `ir_readonly` credentials from the vault (see [Access Control](#access-control) below).
2. Connect to the Supabase pooler using the issued credentials.
3. Set the application name for audit trail:
   ```sql
   SET application_name = 'ir-query-<incident-id>';
   ```
4. Run the appropriate query template with your parameters.
5. After use, notify the credential issuer to rotate the password immediately.

## Query Templates

### `ir-impact-scope.sql`

Determines whether EU/EEA/UK-GDPR donors are present in an affected time window — required by IRP-001 v1.1 §5.2 Step 6a within 30 minutes of incident activation.

**Parameters:**

| Parameter          | Type          | Description                                                      |
| ------------------ | ------------- | ---------------------------------------------------------------- |
| `p_window_start`   | `timestamptz` | Start of incident window (UTC, inclusive)                        |
| `p_window_end`     | `timestamptz` | End of incident window (UTC, inclusive)                          |
| `p_affected_route` | `text`        | ILIKE pattern for affected route/surface; use `%` for all routes |

**Output:**

- **Query A** — Distinct donor counts by ISO 3166-1 alpha-2 country, with `gdpr_bloc` flag (`EU`, `EEA`, `UK-GDPR`, or `NON-GDPR`) and percentage of total.
- **Query B** — Deduped `donor_id` list for GDPR-scoped donors only. No PII columns — IDs feed the GDPR export function as a separate audited step.

**PII guardrail:** The query returns donor IDs only, never names, emails, or other PII. Contact retrieval requires a separate GDPR export step with legal-counsel review.

## Access Control

The `ir_readonly` Postgres role provides read-only access to a minimal set of tables needed for incident response queries. It has **no standing credentials** — login is granted only during active incidents with a time-limited password.

For the full role provisioning SQL and rationale, see the [GIV-339 plan](/GIV/issues/GIV-339#document-plan) §Step 1.

### Per-Incident Credential Issuance

At incident activation time (IRP-001 §5.2 Step 6a), a credential issuer (CEO or CTO) runs:

```sql
ALTER ROLE ir_readonly WITH LOGIN PASSWORD '<FRESH_PASSWORD>'
  VALID UNTIL (now() + interval '4 hours');
```

- Generate `<FRESH_PASSWORD>` using the vault's password generator (32+ characters).
- The `VALID UNTIL` clause auto-expires login after 4 hours as a hard backstop.
- Deliver the password to the Head of Data via a secure, ephemeral channel (never Slack, email, or plaintext).

See [GIV-339 plan](/GIV/issues/GIV-339#document-plan) §Step 2 for the full procedure.

### Mandatory Session Prelude

Every Head of Data session **MUST** begin with:

```sql
SET application_name = 'ir-query-<incident-id>';
```

Replace `<incident-id>` with the assigned incident identifier (e.g., `INC-2026-09-001`).

**Why this is required:** Supabase logs include `application_name` in every query log entry. Setting it to a structured value ties every executed query back to a specific incident ticket, creating a tamper-evident audit trail. Without this, queries appear as anonymous connections and cannot be attributed during post-incident review.

### Post-Incident Credential Rotation

Immediately after the Head of Data completes the query work, the credential issuer **MUST** revoke login and clear the password:

```sql
ALTER ROLE ir_readonly WITH NOLOGIN;
ALTER ROLE ir_readonly WITH PASSWORD NULL;
```

Do not rely on `VALID UNTIL` expiry alone — always rotate explicitly. See [GIV-339 plan](/GIV/issues/GIV-339#document-plan) §Step 2.

### Vault Item

- **Title:** `Supabase ir_readonly — IR break-glass`
- **Access scope:** CEO, CTO, Head of Data only
- The password field is empty at rest and populated only during an active incident.
- No credentials, connection strings, or vault item IDs are stored in this repository.

### What is NOT Granted

The `ir_readonly` role is explicitly denied access to the following (mirroring the REVOKE statements in [GIV-339 plan](/GIV/issues/GIV-339#document-plan) §Step 1):

| Denied resource      | Reason                                                                                                                                  |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `auth.users`         | Contains raw auth credentials and email addresses                                                                                       |
| `deletion_audit_log` | Internal audit data outside IR query scope                                                                                              |
| `wallet_aliases`     | Wallet identity data outside IR query scope                                                                                             |
| `donations`          | Not required by current query templates; minimise blast radius. If a future revision needs this table, file a new access-change ticket. |
| All write privileges | INSERT, UPDATE, DELETE, TRUNCATE, DDL — structurally blocked via default privilege revocations                                          |

## Schema Notes

Country resolution in `ir-impact-scope.sql` uses a three-level COALESCE:

1. `profiles.country_code`
2. `profiles.meta->>'country_code'`
3. `profiles.meta->>'country'`
4. Falls back to `UNKNOWN`

If the schema changes (e.g., column renames), update the query template and re-test.

## Maintenance Triggers

Update this directory when:

- The `ir_readonly` role grants change (new tables added or removed).
- The `ir-impact-scope.sql` query template is revised.
- IRP-001 activation procedures change.
- New query templates are added for other incident types.
