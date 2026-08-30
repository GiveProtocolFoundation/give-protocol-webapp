import { supabase } from "../lib/supabase";

/**
 * Authenticates a user with email and password credentials.
 *
 * @function signInWithEmail
 * @param {string} email - The user's email address
 * @param {string} password - The user's password
 * @returns {Promise<AuthResponse>} The authentication response from Supabase
 * @throws {AuthError} When authentication fails
 * @example
 * ```typescript
 * try {
 *   const { user, session } = await signInWithEmail('user@example.com', 'password');
 *   console.log('Signed in:', user.email);
 * } catch (error) {
 *   console.error('Sign in failed:', error.message);
 * }
 * ```
 */
export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

/**
 * Registers a new user with email, password, and account type.
 *
 * @function signUpWithEmail
 * @param {string} email - The user's email address
 * @param {string} password - The user's password
 * @param {'donor' | 'charity'} type - The account type (donor or charity)
 * @param {object} [metadata={}] - Additional user metadata
 * @returns {Promise<AuthResponse>} The registration response from Supabase
 * @throws {AuthError} When registration fails
 * @example
 * ```typescript
 * try {
 *   const result = await signUpWithEmail(
 *     'user@example.com',
 *     'password123',
 *     'donor',
 *     { firstName: 'John', lastName: 'Doe' }
 *   );
 *   console.log('User registered:', result.user?.email);
 * } catch (error) {
 *   console.error('Sign up failed:', error.message);
 * }
 * ```
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  type: "donor" | "charity",
  metadata = {},
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        type,
        ...metadata,
      },
      emailRedirectTo: `${window.location.origin}/auth/callback?email=${encodeURIComponent(email)}`,
    },
  });

  if (error) throw error;
  return data;
}

/**
 * Creates a user profile record in the database.
 *
 * @function createProfile
 * @param {string} userId - The authenticated user's ID
 * @param {'donor' | 'charity'} type - The profile type (donor or charity)
 * @returns {Promise<void>} Resolves when profile is created successfully
 * @throws {DatabaseError} When profile creation fails
 * @example
 * ```typescript
 * try {
 *   await createProfile('user-123', 'donor');
 *   console.log('Profile created successfully');
 * } catch (error) {
 *   console.error('Profile creation failed:', error.message);
 * }
 * ```
 */
export async function createProfile(userId: string, type: "donor" | "charity") {
  const { error } = await supabase.from("profiles").insert({
    user_id: userId,
    type,
  });

  if (error) throw error;
}
