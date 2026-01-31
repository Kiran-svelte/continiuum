-- Check orphaned company_settings
SELECT cs.id, cs.company_id FROM company_settings cs LEFT JOIN companies c ON cs.company_id = c.id WHERE c.id IS NULL;
