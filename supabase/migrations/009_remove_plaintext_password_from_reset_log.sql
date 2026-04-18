-- Migration: 009_remove_plaintext_password_from_reset_log.sql
-- ---------------------------------------------------------
-- Removes the new_password column that was storing plaintext
-- passwords in the password_reset_log table.
--
-- Run this AFTER deploying the updated password-reset route
-- (which no longer writes to new_password).
-- ---------------------------------------------------------

ALTER TABLE password_reset_log DROP COLUMN IF EXISTS new_password;

-- Verify the column is gone
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'password_reset_log'
    AND column_name = 'new_password'
  ) THEN
    RAISE EXCEPTION 'FAILED: new_password column still exists';
  ELSE
    RAISE NOTICE 'OK: new_password column successfully removed';
  END IF;
END $$;
