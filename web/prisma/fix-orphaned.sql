-- Fix orphaned company_settings records
DELETE FROM company_settings WHERE company_id NOT IN (SELECT id FROM companies);
