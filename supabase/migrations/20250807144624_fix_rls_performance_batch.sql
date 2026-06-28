-- Fix RLS performance issues by wrapping auth.uid() in subqueries
-- This prevents re-evaluation for each row


-- Fix withdrawal_requests.Charities can create withdrawals
DROP POLICY IF EXISTS "Charities can create withdrawals" ON withdrawal_requests;
CREATE POLICY "Charities can create withdrawals" ON withdrawal_requests
  USING (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));


-- Fix withdrawal_requests.Admin can update withdrawal status
DROP POLICY IF EXISTS "Admin can update withdrawal status" ON withdrawal_requests;
CREATE POLICY "Admin can update withdrawal status" ON withdrawal_requests
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'admin'
  ));


-- Fix profiles.Users can insert own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  USING ((SELECT auth.uid()) = user_id);


-- Fix profile_update_approvals.Charities can view their own profile update approvals
DROP POLICY IF EXISTS "Charities can view their own profile update approvals" ON profile_update_approvals;
CREATE POLICY "Charities can view their own profile update approvals" ON profile_update_approvals
  USING (profile_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));


-- Fix profile_update_approvals.Charities can create profile update requests
DROP POLICY IF EXISTS "Charities can create profile update requests" ON profile_update_approvals;
CREATE POLICY "Charities can create profile update requests" ON profile_update_approvals
  USING (profile_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));


-- Fix charity_documents.Charities can upload own documents
DROP POLICY IF EXISTS "Charities can upload own documents" ON charity_documents;
CREATE POLICY "Charities can upload own documents" ON charity_documents
  USING (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));


-- Fix rate_limits.Admins can view rate limits
DROP POLICY IF EXISTS "Admins can view rate limits" ON rate_limits;
CREATE POLICY "Admins can view rate limits" ON rate_limits
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'admin'
  ));


-- Fix audit_logs.Anyone can view their own audit logs
DROP POLICY IF EXISTS "Anyone can view their own audit logs" ON audit_logs;
CREATE POLICY "Anyone can view their own audit logs" ON audit_logs
  USING ((SELECT auth.uid()) = user_id);


-- Fix profiles.Users can update own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  USING ((SELECT auth.uid()) = user_id);


-- Fix donations.Users can view their own donations
DROP POLICY IF EXISTS "Users can view their own donations" ON donations;
CREATE POLICY "Users can view their own donations" ON donations
  USING ((SELECT auth.uid()) = donor_id);


-- Fix volunteer_profiles.Users can view their own volunteer profile
DROP POLICY IF EXISTS "Users can view their own volunteer profile" ON volunteer_profiles;
CREATE POLICY "Users can view their own volunteer profile" ON volunteer_profiles
  USING ((SELECT auth.uid()) = user_id);


-- Fix volunteer_profiles.Users can create their own volunteer profile
DROP POLICY IF EXISTS "Users can create their own volunteer profile" ON volunteer_profiles;
CREATE POLICY "Users can create their own volunteer profile" ON volunteer_profiles
  USING ((SELECT auth.uid()) = user_id);


-- Fix volunteer_profiles.Users can update their own volunteer profile
DROP POLICY IF EXISTS "Users can update their own volunteer profile" ON volunteer_profiles;
CREATE POLICY "Users can update their own volunteer profile" ON volunteer_profiles
  USING ((SELECT auth.uid()) = user_id);


-- Fix waitlist.Admins can read waitlist data
DROP POLICY IF EXISTS "Admins can read waitlist data" ON waitlist;
CREATE POLICY "Admins can read waitlist data" ON waitlist
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'admin'
  ));


-- Fix user_skills.Users can read own skills
DROP POLICY IF EXISTS "Users can read own skills" ON user_skills;
CREATE POLICY "Users can read own skills" ON user_skills
  USING ((SELECT auth.uid()) = user_id);


-- Fix volunteer_hours.Users can create own volunteer hours
DROP POLICY IF EXISTS "Users can create own volunteer hours" ON volunteer_hours;
CREATE POLICY "Users can create own volunteer hours" ON volunteer_hours
  USING ((SELECT auth.uid()) = volunteer_id);


-- Fix volunteer_hours.Charities can approve volunteer hours
DROP POLICY IF EXISTS "Charities can approve volunteer hours" ON volunteer_hours;
CREATE POLICY "Charities can approve volunteer hours" ON volunteer_hours
  USING (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));


-- Fix volunteer_opportunities.Charities can manage own opportunities
DROP POLICY IF EXISTS "Charities can manage own opportunities" ON volunteer_opportunities;
CREATE POLICY "Charities can manage own opportunities" ON volunteer_opportunities
  USING (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));


-- Fix volunteer_applications.Users can view own applications
DROP POLICY IF EXISTS "Users can view own applications" ON volunteer_applications;
CREATE POLICY "Users can view own applications" ON volunteer_applications
  USING ((SELECT auth.uid()) = applicant_id);


-- Fix volunteer_applications.Charities can view applications for their opportunities
DROP POLICY IF EXISTS "Charities can view applications for their opportunities" ON volunteer_applications;
CREATE POLICY "Charities can view applications for their opportunities" ON volunteer_applications
  USING (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));


-- Fix volunteer_applications.Charities can update applications
DROP POLICY IF EXISTS "Charities can update applications" ON volunteer_applications;
CREATE POLICY "Charities can update applications" ON volunteer_applications
  USING (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));


-- Fix volunteer_verifications.Charities can create verifications
DROP POLICY IF EXISTS "Charities can create verifications" ON volunteer_verifications;
CREATE POLICY "Charities can create verifications" ON volunteer_verifications
  USING (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));


-- Fix volunteer_verifications.Charities can update own verifications
DROP POLICY IF EXISTS "Charities can update own verifications" ON volunteer_verifications;
CREATE POLICY "Charities can update own verifications" ON volunteer_verifications
  USING (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));


-- Fix wallet_aliases.Users can manage their own wallet aliases
DROP POLICY IF EXISTS "Users can manage their own wallet aliases" ON wallet_aliases;
CREATE POLICY "Users can manage their own wallet aliases" ON wallet_aliases
  USING ((SELECT auth.uid()) = user_id);


-- Fix donations.Donors can read own donations
DROP POLICY IF EXISTS "Donors can read own donations" ON donations;
CREATE POLICY "Donors can read own donations" ON donations
  USING (donor_profile_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid())
  ));


-- Fix donations.Charities can read received donations
DROP POLICY IF EXISTS "Charities can read received donations" ON donations;
CREATE POLICY "Charities can read received donations" ON donations
  USING (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));


-- Fix withdrawal_requests.Charities can view own withdrawals
DROP POLICY IF EXISTS "Charities can view own withdrawals" ON withdrawal_requests;
CREATE POLICY "Charities can view own withdrawals" ON withdrawal_requests
  USING (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));


-- Fix donor_profiles.Donors can read own profile
DROP POLICY IF EXISTS "Donors can read own profile" ON donor_profiles;
CREATE POLICY "Donors can read own profile" ON donor_profiles
  USING (profile_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid())
  ));


-- Fix donor_profiles.Donors can update own profile
DROP POLICY IF EXISTS "Donors can update own profile" ON donor_profiles;
CREATE POLICY "Donors can update own profile" ON donor_profiles
  USING (profile_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid())
  ));


-- Fix user_preferences.Users can manage own preferences
DROP POLICY IF EXISTS "Users can manage own preferences" ON user_preferences;
CREATE POLICY "Users can manage own preferences" ON user_preferences
  USING ((SELECT auth.uid()) = user_id);


-- Fix volunteer_hours.Users can read own volunteer hours
DROP POLICY IF EXISTS "Users can read own volunteer hours" ON volunteer_hours;
CREATE POLICY "Users can read own volunteer hours" ON volunteer_hours
  USING ((SELECT auth.uid()) = volunteer_id);


-- Fix charity_documents.Charities can read own documents
DROP POLICY IF EXISTS "Charities can read own documents" ON charity_documents;
CREATE POLICY "Charities can read own documents" ON charity_documents
  USING (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));


-- Fix impact_metrics.Charities can create own impact metrics
DROP POLICY IF EXISTS "Charities can create own impact metrics" ON impact_metrics;
CREATE POLICY "Charities can create own impact metrics" ON impact_metrics
  USING (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));


-- Fix volunteer_applications.Users can create applications
DROP POLICY IF EXISTS "Users can create applications" ON volunteer_applications;
CREATE POLICY "Users can create applications" ON volunteer_applications
  USING ((SELECT auth.uid()) = applicant_id);


-- Fix skill_endorsements.Users can create endorsements
DROP POLICY IF EXISTS "Users can create endorsements" ON skill_endorsements;
CREATE POLICY "Users can create endorsements" ON skill_endorsements
  USING ((SELECT auth.uid()) = endorser_id);


-- Fix user_skills.Users can manage own skills
DROP POLICY IF EXISTS "Users can manage own skills" ON user_skills;
CREATE POLICY "Users can manage own skills" ON user_skills
  USING ((SELECT auth.uid()) = user_id);


-- Fix charity_details.Charities can update own details
DROP POLICY IF EXISTS "Charities can update own details" ON charity_details;
CREATE POLICY "Charities can update own details" ON charity_details
  USING (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));


-- Fix charity_approvals.Admins can view all charity approvals
DROP POLICY IF EXISTS "Admins can view all charity approvals" ON charity_approvals;
CREATE POLICY "Admins can view all charity approvals" ON charity_approvals
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'admin'
  ));


-- Fix charity_approvals.Admins can update charity approvals
DROP POLICY IF EXISTS "Admins can update charity approvals" ON charity_approvals;
CREATE POLICY "Admins can update charity approvals" ON charity_approvals
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'admin'
  ));


-- Fix charity_approvals.Charities can view their own approvals
DROP POLICY IF EXISTS "Charities can view their own approvals" ON charity_approvals;
CREATE POLICY "Charities can view their own approvals" ON charity_approvals
  USING (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));


-- Fix charity_approvals.Charities can create approval requests
DROP POLICY IF EXISTS "Charities can create approval requests" ON charity_approvals;
CREATE POLICY "Charities can create approval requests" ON charity_approvals
  USING (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));


-- Fix profile_update_approvals.Admins can view all profile update approvals
DROP POLICY IF EXISTS "Admins can view all profile update approvals" ON profile_update_approvals;
CREATE POLICY "Admins can view all profile update approvals" ON profile_update_approvals
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'admin'
  ));


-- Fix profile_update_approvals.Admins can update profile update approvals
DROP POLICY IF EXISTS "Admins can update profile update approvals" ON profile_update_approvals;
CREATE POLICY "Admins can update profile update approvals" ON profile_update_approvals
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'admin'
  ));


-- Fix volunteer_profiles.Admins can view all volunteer profiles
DROP POLICY IF EXISTS "Admins can view all volunteer profiles" ON volunteer_profiles;
CREATE POLICY "Admins can view all volunteer profiles" ON volunteer_profiles
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'admin'
  ));


-- Fix volunteer_profiles.Charities can view volunteer profiles of applicants
DROP POLICY IF EXISTS "Charities can view volunteer profiles of applicants" ON volunteer_profiles;
CREATE POLICY "Charities can view volunteer profiles of applicants" ON volunteer_profiles
  USING (charity_id IN (
    SELECT id FROM profiles WHERE user_id = (SELECT auth.uid()) AND type = 'charity'
  ));

