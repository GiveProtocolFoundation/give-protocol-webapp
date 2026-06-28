-- Add missing INSERT and UPDATE policies for wallet_aliases
-- Users were unable to set wallet aliases due to missing RLS policies

-- Policy for INSERT: Users can insert their own wallet aliases
DROP POLICY IF EXISTS "Users can insert their own wallet aliases" ON wallet_aliases;
CREATE POLICY "Users can insert their own wallet aliases" ON wallet_aliases
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Policy for UPDATE: Users can update their own wallet aliases
DROP POLICY IF EXISTS "Users can update their own wallet aliases" ON wallet_aliases;
CREATE POLICY "Users can update their own wallet aliases" ON wallet_aliases
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy for DELETE: Users can delete their own wallet aliases
DROP POLICY IF EXISTS "Users can delete their own wallet aliases" ON wallet_aliases;
CREATE POLICY "Users can delete their own wallet aliases" ON wallet_aliases
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Add comment explaining the policies
COMMENT ON POLICY "Users can insert their own wallet aliases" ON wallet_aliases IS
  'Allows authenticated users to create wallet aliases for their own account';

COMMENT ON POLICY "Users can update their own wallet aliases" ON wallet_aliases IS
  'Allows authenticated users to update their own wallet aliases';

COMMENT ON POLICY "Users can delete their own wallet aliases" ON wallet_aliases IS
  'Allows authenticated users to delete their own wallet aliases';
