-- Database Migration: Constraint-Based Leave System
-- Database: company

SET FOREIGN_KEY_CHECKS = 0;

-- 0. Users Table (for authentication)
DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('employee', 'hr', 'admin') DEFAULT 'employee',
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 1. Employees Table
DROP TABLE IF EXISTS employees;
CREATE TABLE employees (
    emp_id VARCHAR(20) PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    department VARCHAR(50),
    position VARCHAR(50),
    manager_id VARCHAR(20),
    hire_date DATE,
    employment_type ENUM('full-time', 'part-time', 'contract'),
    work_location VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Leave Balances Table
DROP TABLE IF EXISTS leave_balances;
CREATE TABLE leave_balances (
    balance_id INT AUTO_INCREMENT PRIMARY KEY,
    emp_id VARCHAR(20),
    leave_type VARCHAR(30),
    total_entitled INT DEFAULT 0,
    used_so_far INT DEFAULT 0,
    remaining INT GENERATED ALWAYS AS (total_entitled - used_so_far) STORED,
    fiscal_year YEAR,
    FOREIGN KEY (emp_id) REFERENCES employees(emp_id),
    UNIQUE KEY unique_balance (emp_id, leave_type, fiscal_year)
);

-- 3. Teams Table
DROP TABLE IF EXISTS teams;
CREATE TABLE teams (
    team_id VARCHAR(20) PRIMARY KEY,
    team_name VARCHAR(100),
    department VARCHAR(50),
    manager_id VARCHAR(20),
    min_coverage INT DEFAULT 3,
    max_concurrent_leave INT DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Team Members Table
DROP TABLE IF EXISTS team_members;
CREATE TABLE team_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_id VARCHAR(20),
    emp_id VARCHAR(20),
    role_in_team VARCHAR(50),
    is_primary_team BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (team_id) REFERENCES teams(team_id),
    FOREIGN KEY (emp_id) REFERENCES employees(emp_id)
);

-- 5. Leave Requests Table
DROP TABLE IF EXISTS leave_requests;
CREATE TABLE leave_requests (
    request_id VARCHAR(50) PRIMARY KEY,
    emp_id VARCHAR(20),
    leave_type VARCHAR(30),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INT,
    reason TEXT,
    status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
    constraint_engine_decision JSON,
    approved_by VARCHAR(20),
    approval_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (emp_id) REFERENCES employees(emp_id)
);

-- 6. Constraint Rules Table
DROP TABLE IF EXISTS constraint_rules;
CREATE TABLE constraint_rules (
    rule_id VARCHAR(50) PRIMARY KEY,
    rule_name VARCHAR(100),
    rule_type ENUM('coverage', 'timing', 'balance', 'blackout', 'priority'),
    rule_condition JSON NOT NULL,
    rule_action VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    applies_to_departments JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Blackout Dates Table
DROP TABLE IF EXISTS blackout_dates;
CREATE TABLE blackout_dates (
    blackout_id INT AUTO_INCREMENT PRIMARY KEY,
    blackout_name VARCHAR(100),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    applies_to_departments JSON,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Constraint Decisions Log Table
DROP TABLE IF EXISTS constraint_decisions_log;
CREATE TABLE constraint_decisions_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    request_id VARCHAR(50),
    emp_id VARCHAR(20),
    constraint_engine_version VARCHAR(20),
    rules_evaluated JSON,
    rules_violated JSON,
    rules_passed JSON,
    final_decision VARCHAR(20),
    decision_reason TEXT,
    processing_time_ms INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_request (request_id),
    INDEX idx_employee_date (emp_id, created_at)
);

-- SEEDING SAMPLE DATA (Real Data for Models)
-- Users (passwords: employee123, hr123, admin123 respectively - bcrypt hashed)
INSERT INTO users (name, email, password, role, is_active) VALUES
('Employee User', 'employee@company.com', '$2b$10$VB6aw/BXfN9PepbnDdQPROxvngi0qmjpJjtM2OJirE3jFPU8rUru2', 'employee', TRUE),
('HR User', 'hr@company.com', '$2b$10$GjPsIUovmUVxHI51JAzMAeCAWkfElq90T6m2V5QShChV7QnBLcfGK', 'hr', TRUE),
('Admin User', 'admin@company.com', '$2b$10$0UyK981bnefkr2tlYdHCMeTzBkUHEw8Ia5odegbxoTmEaeEf/psee', 'admin', TRUE);

INSERT INTO employees VALUES
('EMP001', 'Rajesh Kumar', 'rajesh.kumar@company.com', 'Engineering', 'Senior Developer', 'MGR001', '2022-01-15', 'full-time', 'Bangalore', NOW()),
('EMP002', 'Priya Sharma', 'priya.sharma@company.com', 'Marketing', 'Marketing Manager', 'MGR002', '2021-03-22', 'full-time', 'Mumbai', NOW()),
('EMP003', 'Amit Patel', 'amit.patel@company.com', 'Engineering', 'DevOps Engineer', 'MGR001', '2023-06-10', 'full-time', 'Hyderabad', NOW()),
('EMP004', 'Sneha Reddy', 'sneha.reddy@company.com', 'HR', 'HR Executive', 'MGR003', '2020-11-05', 'full-time', 'Bangalore', NOW()),
('EMP005', 'Vikram Singh', 'vikram.singh@company.com', 'Sales', 'Sales Lead', 'MGR004', '2019-08-30', 'full-time', 'Delhi', NOW()),
('EMP006', 'Junior Dev', 'jr.dev@company.com', 'Engineering', 'Junior Developer', 'MGR001', '2023-01-01', 'full-time', 'Bangalore', NOW()),
('EMP007', 'QA Tester', 'qa@company.com', 'Engineering', 'QA Engineer', 'MGR001', '2023-01-01', 'full-time', 'Bangalore', NOW()),
('MGR001', 'Arun Mehta', 'arun.mehta@company.com', 'Engineering', 'Engineering Manager', 'DIR001', '2018-05-12', 'full-time', 'Bangalore', NOW()),
('MGR003', 'Deepika Nair', 'deepika.nair@company.com', 'HR', 'HR Manager', 'DIR001', '2017-09-18', 'full-time', 'Bangalore', NOW());

INSERT INTO leave_balances (emp_id, leave_type, total_entitled, used_so_far, fiscal_year) VALUES
('EMP001', 'sick', 12, 3, 2024), ('EMP001', 'vacation', 18, 8, 2024), ('EMP001', 'personal', 5, 1, 2024),
('EMP002', 'sick', 12, 2, 2024), ('EMP002', 'vacation', 18, 12, 2024), ('EMP002', 'personal', 5, 0, 2024),
('EMP003', 'sick', 12, 0, 2024), ('EMP003', 'vacation', 15, 5, 2024), ('EMP003', 'personal', 3, 0, 2024);

INSERT INTO teams VALUES
('TEAM001', 'Backend Engineering', 'Engineering', 'MGR001', 4, 3, NOW()),
('TEAM002', 'Digital Marketing', 'Marketing', 'MGR002', 2, 4, NOW()),
('TEAM003', 'HR Operations', 'HR', 'MGR003', 2, 2, NOW());

INSERT INTO team_members (team_id, emp_id, role_in_team, is_primary_team) VALUES
('TEAM001', 'EMP001', 'Senior Developer', TRUE),
('TEAM001', 'EMP003', 'DevOps Engineer', TRUE),
('TEAM001', 'EMP006', 'Junior Developer', TRUE),
('TEAM001', 'EMP007', 'QA Engineer', TRUE),
('TEAM003', 'EMP004', 'HR Executive', TRUE);

INSERT INTO constraint_rules VALUES
('RULE001', 'Minimum Team Coverage', 'coverage', '{"operator": ">=", "field": "team_present", "value": 3}', 'DENY', TRUE, '["Engineering", "Support"]', NOW()),
('RULE002', 'Max Concurrent Leave', 'coverage', '{"operator": "<=", "field": "on_leave", "value": 3}', 'DENY', TRUE, NULL, NOW()),
('RULE003', 'Vacation Notice Period', 'timing', '{"operator": ">=", "field": "days_notice", "value": 3, "leave_type": "vacation"}', 'DENY', TRUE, NULL, NOW()),
('RULE004', 'Sick Leave Immediate', 'timing', '{"operator": ">=", "field": "days_notice", "value": 0, "leave_type": "sick"}', 'ALLOW', TRUE, NULL, NOW()),
('RULE005', 'Sufficient Leave Balance', 'balance', '{"operator": ">", "field": "remaining_balance", "value": 0}', 'DENY', TRUE, NULL, NOW()),
('RULE006', 'Year-End Blackout', 'blackout', '{"start_date": "2024-12-24", "end_date": "2025-01-02", "reason": "Year-end closure"}', 'DENY', TRUE, NULL, NOW()),
('RULE007', 'Sick Leave Priority', 'priority', '{"priority_level": 3, "leave_type": "sick"}', 'PRIORITIZE', TRUE, NULL, NOW());

INSERT INTO blackout_dates (blackout_name, start_date, end_date, applies_to_departments, reason) VALUES
('Year-End Closure', '2024-12-24', '2025-01-02', NULL, 'Company-wide holiday'),
('Q1 Product Launch', '2024-04-08', '2024-04-12', '["Engineering", "Product"]', 'Critical product release'),
('Audit Period', '2024-03-25', '2024-03-29', '["Finance", "HR"]', 'Financial audit');

SET FOREIGN_KEY_CHECKS = 1;
