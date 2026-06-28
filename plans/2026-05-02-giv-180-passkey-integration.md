# GIV-180: Passkey (WebAuthn/FIDO2) Integration — Technical Plan

**Author:** CTO (d248f580)
**Date:** 2026-05-02
**Status:** Active
**Parent:** GIV-178 (Signup Form Refactor)

---

## 1. Problem Statement

Give Protocol currently supports email/password and wallet-signature authentication.
Passkeys (WebAuthn/FIDO2) provide a phishing-resistant, passwordless option that
improves security and reduces sign-up friction — especially on mobile devices with
biometric hardware.

## 2. Architecture Decision

### Why custom edge functions (not Supabase native)?

Supabase Auth does not natively support WebAuthn. We implement passkey
challenge/response as Supabase Edge Functions, following the existing `wallet-auth`
pattern. This keeps all auth flows consistent and under our control.

### Library choice

**@simplewebauthn/server v11** (via `npm:` specifier in Deno) for server-side
CBOR parsing, attestation verification, and assertion verification.

**@simplewebauthn/browser v11** for client-side `navigator.credentials` wrapping.

Rationale: Most widely adopted WebAuthn library, TypeScript-native, actively
maintained, handles edge cases in COSE key parsing and attestation formats.

### Relying Party Configuration

| Field                   | Value                                                 |
| ----------------------- | ----------------------------------------------------- |
| RP ID                   | `giveprotocol.io`                                     |
| RP Name                 | `Give Protocol`                                       |
| Origin                  | `https://giveprotocol.io`                             |
| Attestation             | `none` (no hardware attestation needed)               |
| User Verification       | `preferred` (biometric when available)                |
| Authenticator Selection | `platform` preferred, `cross-platform` allowed        |
| Resident Key            | `preferred` (discoverable credentials when supported) |
| Challenge TTL           | 5 minutes                                             |

**Dev override:** When `VITE_SUPABASE_URL` contains `localhost` or `127.0.0.1`,
RP ID = `localhost`, Origin = `http://localhost:5173`.

## 3. Database Schema

### Table: `user_passkeys`

```sql
CREATE TABLE public.user_passkeys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id   TEXT NOT NULL,           -- base64url-encoded credential ID
  public_key      TEXT NOT NULL,           -- base64url-encoded COSE public key
  counter         BIGINT NOT NULL DEFAULT 0, -- signature counter (clone detection)
  transports      TEXT[] DEFAULT '{}',     -- e.g. {'internal','hybrid'}
  device_name     TEXT,                    -- user-friendly label
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at    TIMESTAMPTZ,
  UNIQUE(credential_id)
);

CREATE INDEX idx_user_passkeys_user_id ON public.user_passkeys(user_id);
CREATE INDEX idx_user_passkeys_credential_id ON public.user_passkeys(credential_id);
```

### Table: `passkey_challenges`

```sql
CREATE TABLE public.passkey_challenges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge   TEXT NOT NULL,              -- base64url-encoded challenge
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL for login
  email       TEXT,                       -- for registration before user exists
  type        TEXT NOT NULL CHECK (type IN ('registration', 'authentication')),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '5 minutes'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_passkey_challenges_challenge ON public.passkey_challenges(challenge);
```

### RLS Policies

```sql
-- user_passkeys: users can read/delete their own passkeys
ALTER TABLE public.user_passkeys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own passkeys"
  ON public.user_passkeys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own passkeys"
  ON public.user_passkeys FOR DELETE
  USING (auth.uid() = user_id);

-- Service role inserts (from edge functions)
CREATE POLICY "Service role can manage passkeys"
  ON public.user_passkeys FOR ALL
  USING (auth.role() = 'service_role');

-- passkey_challenges: service role only (edge functions manage lifecycle)
ALTER TABLE public.passkey_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage challenges"
  ON public.passkey_challenges FOR ALL
  USING (auth.role() = 'service_role');
```

### Cleanup

Expired challenges cleaned by edge functions (delete before insert pattern)
or optional cron. No separate cron function needed initially.

## 4. Edge Functions

### 4a. `passkey-register-options` (POST, authenticated)

**Input:** `{ deviceName?: string }`
**Output:** `PublicKeyCredentialCreationOptionsJSON`

Flow:

1. Extract user from Authorization header
2. Fetch existing passkeys for `excludeCredentials`
3. Generate registration options via SimpleWebAuthn
4. Store challenge in `passkey_challenges` (type='registration', user_id set)
5. Return options to browser

### 4b. `passkey-register-verify` (POST, authenticated)

**Input:** `RegistrationResponseJSON`
**Output:** `{ success: true, credentialId: string }`

Flow:

1. Extract user from Authorization header
2. Look up challenge from `passkey_challenges` (user_id + type='registration')
3. Verify registration response via SimpleWebAuthn
4. Store credential in `user_passkeys`
5. Delete used challenge
6. Update `user_identities.primary_auth_method` if first passkey? (No — keep existing)
7. Return success

### 4c. `passkey-login-options` (POST, unauthenticated)

**Input:** `{}` (empty — discoverable credential flow)
**Output:** `PublicKeyCredentialRequestOptionsJSON`

Flow:

1. Generate authentication options (no allowCredentials — discoverable)
2. Store challenge in `passkey_challenges` (type='authentication', user_id=NULL)
3. Return options

### 4d. `passkey-login-verify` (POST, unauthenticated)

**Input:** `AuthenticationResponseJSON`
**Output:** `{ success: true, session: { access_token, refresh_token, ... } }`

Flow:

1. Look up credential by `credential_id` from response in `user_passkeys`
2. Look up challenge from `passkey_challenges`
3. Verify authentication response via SimpleWebAuthn
4. Update counter + last_used_at in `user_passkeys`
5. Delete used challenge
6. Generate Supabase session for user (using `auth.admin.generateLink` or custom JWT)
7. Return session (same shape as wallet-auth response)

**Session generation strategy:** Use `supabase.auth.admin.generateLink({ type: 'magiclink', email })` to get a token, then exchange it. Alternatively, mint a custom JWT with the Supabase JWT secret — matching the `wallet-auth` pattern which creates users and signs them in via admin API.

## 5. Frontend

### 5a. `usePasskeyAuth` Hook

```typescript
interface UsePasskeyAuth {
  isSupported: boolean; // PublicKeyCredential available
  isConditionalSupported: boolean; // Autofill-assisted passkey
  registerPasskey(deviceName?: string): Promise<void>;
  loginWithPasskey(): Promise<{ session: Session; isNewUser: false }>;
  loading: boolean;
  error: string | null;
}
```

Implementation:

- `isSupported` = `typeof PublicKeyCredential !== 'undefined'`
- `isConditionalSupported` = `PublicKeyCredential.isConditionalMediationAvailable?.()`
- Registration: calls register-options → `startRegistration()` → register-verify
- Login: calls login-options → `startAuthentication()` → login-verify

### 5b. `useUnifiedAuth` Integration

Add to existing hook:

- `signInWithPasskey(): Promise<void>` — delegates to `usePasskeyAuth.loginWithPasskey()`
- `registerPasskey(deviceName?: string): Promise<void>` — for logged-in users
- `authMethod` type extended: `"email" | "wallet" | "passkey" | null`

### 5c. UI Changes

**Auth.tsx (Login page):**

- Add "Sign in with passkey" button below email form (when `isSupported`)
- Uses device-native UI (fingerprint/face prompt)

**AuthSignup.tsx (Signup page):**

- Passkey signup flow: email input → "Create account with passkey" button
- Calls: create account with random password → register passkey → session

**Settings page (future):**

- List registered passkeys (device_name, created_at, last_used_at)
- "Add passkey" button
- "Remove passkey" per-credential

## 6. Signup Flow (Passwordless)

```
User → enters email
     → clicks "Create account with passkey"
     → signUpWithEmail(email, randomPassword, metadata)
     → on success, registerPasskey() called immediately
     → browser prompts biometric/PIN
     → credential stored server-side
     → session established, user redirected
```

The random password ensures backward compatibility with Supabase Auth (which
requires a password field). The user never sees or uses this password — they
authenticate via passkey going forward.

## 7. Security Considerations

1. **Challenge binding:** Challenges are single-use, server-stored, 5-min TTL
2. **Counter validation:** Reject if authenticator counter doesn't increment (clone detection)
3. **Origin validation:** Server validates origin matches RP ID
4. **No attestation required:** We trust any FIDO2 authenticator
5. **Credential ID uniqueness:** DB constraint prevents duplicate registration
6. **Rate limiting:** Existing RateLimiter applies to login attempts
7. **Fallback:** Passkey is additive — email/password always works

## 8. Subtask Breakdown

| #   | Title                                                              | Assignee | Depends On | Priority |
| --- | ------------------------------------------------------------------ | -------- | ---------- | -------- |
| 1   | Database migration: user_passkeys + passkey_challenges             | Engineer | —          | High     |
| 2   | Edge functions: passkey-register-options + passkey-register-verify | Engineer | #1         | High     |
| 3   | Edge functions: passkey-login-options + passkey-login-verify       | Engineer | #1         | High     |
| 4   | Frontend: usePasskeyAuth hook + useUnifiedAuth integration         | Engineer | #2, #3     | High     |
| 5   | Frontend: Auth/AuthSignup page passkey buttons                     | Engineer | #4         | High     |
| 6   | Tests: hook tests + edge function verification                     | Engineer | #4, #5     | Medium   |

Subtasks 2 and 3 can run in parallel. Subtask 4 depends on both.

## 9. Environment Variables (New)

Edge function secrets (Supabase Dashboard):

- `PASSKEY_RP_ID` — `giveprotocol.io` (or `localhost` for dev)
- `PASSKEY_RP_NAME` — `Give Protocol`
- `PASSKEY_ORIGIN` — `https://giveprotocol.io` (or `http://localhost:5173`)

Frontend:

- No new VITE\_ vars needed (RP config derived from window.location)

## 10. npm Dependencies (New)

- `@simplewebauthn/browser@^11.0.0` — Frontend (npm install)
- `npm:@simplewebauthn/server@^11.0.0` — Edge functions (Deno npm: specifier)
