-- Remove problematic triggers and functions that use digest
DROP TRIGGER IF EXISTS child_data_hash_trigger ON "Child";
DROP TRIGGER IF EXISTS dochody_data_hash_trigger ON "Dochody";
DROP TRIGGER IF EXISTS form_submission_audit_trigger ON "FormSubmission";
DROP FUNCTION IF EXISTS generate_data_hash();
DROP FUNCTION IF EXISTS log_form_submission_changes();
