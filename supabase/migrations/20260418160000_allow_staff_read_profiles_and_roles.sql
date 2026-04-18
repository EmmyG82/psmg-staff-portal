-- Allow all authenticated users to read all profiles.
-- Previously only admins could view other users' profiles, which caused
-- author names to show as "Unknown" on the Messages page for non-admin users.
CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow all authenticated users to read all user_roles.
-- Previously only admins could view other users' roles, which caused
-- the Announcement badge to not render for non-admin users viewing
-- messages posted by admins.
CREATE POLICY "Authenticated users can view all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (true);
