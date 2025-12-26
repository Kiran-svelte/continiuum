-- Add leave balance columns to users table
-- Run this in phpMyAdmin or MySQL Workbench

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS sick_leave_balance INT DEFAULT 10,
ADD COLUMN IF NOT EXISTS annual_leave_balance INT DEFAULT 20,
ADD COLUMN IF NOT EXISTS emergency_leave_balance INT DEFAULT 5;

-- Update existing users with default balances
UPDATE users 
SET 
    sick_leave_balance = 10,
    annual_leave_balance = 20,
    emergency_leave_balance = 5
WHERE sick_leave_balance IS NULL;

-- Add department column if not exists
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT 'General';

-- Update existing users with departments
UPDATE users SET department = 'Engineering' WHERE role = 'employee';
UPDATE users SET department = 'Human Resources' WHERE role = 'hr';
UPDATE users SET department = 'Administration' WHERE role = 'admin';
