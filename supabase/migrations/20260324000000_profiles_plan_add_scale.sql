-- Rozszerza dozwolone wartości kolumny profiles.plan o 'scale' (aplikacja: lib/types.ts, lib/plans.ts).
-- Uruchom w Supabase → SQL Editor, jeśli nie używasz CLI migracji.

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN ('free', 'starter', 'pro', 'scale'));
