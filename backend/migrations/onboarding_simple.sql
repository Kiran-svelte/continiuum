-- AI Onboarding System - Simplified Schema
-- Run this to create required tables

-- Drop existing tables if they exist
DROP TABLE IF EXISTS onboarding_phase_history;
DROP TABLE IF EXISTS equipment_inventory;
DROP TABLE IF EXISTS onboarding_audit_log;
DROP TABLE IF EXISTS onboarding_system_access;
DROP TABLE IF EXISTS onboarding_training;
DROP TABLE IF EXISTS onboarding_tasks_new;
DROP TABLE IF EXISTS onboarding_documents_new;
DROP TABLE IF EXISTS employee_onboarding_new;

-- Employee Onboarding Tracking Table
CREATE TABLE IF NOT EXISTS employee_onboarding_new (
    onboarding_id VARCHAR(30) PRIMARY KEY,
    emp_id VARCHAR(20),
    employee_name VARCHAR(100),
    email VARCHAR(100),
    role VARCHAR(100),
    department VARCHAR(50),
    team VARCHAR(50),
    country VARCHAR(10) DEFAULT 'US',
    work_authorization VARCHAR(50),
    offer_date DATE,
    start_date DATE,
    expected_completion DATE,
    actual_completion DATE,
    current_phase VARCHAR(20) DEFAULT 'offer_pending',
    status VARCHAR(20) DEFAULT 'in_progress',
    compliance_score DECIMAL(5,2) DEFAULT 0,
    budget_approved TINYINT DEFAULT 0,
    budget_code VARCHAR(30),
    background_check_status VARCHAR(20) DEFAULT 'pending',
    background_check_initiated DATE,
    background_check_completed DATE,
    equipment_type VARCHAR(50) DEFAULT 'laptop',
    equipment_ordered TINYINT DEFAULT 0,
    equipment_delivered TINYINT DEFAULT 0,
    ai_engine_used VARCHAR(50) DEFAULT 'Onboarding Constraint Engine v1.0',
    last_constraint_check DATETIME,
    constraint_violations INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_emp_id (emp_id),
    INDEX idx_phase (current_phase),
    INDEX idx_status (status),
    INDEX idx_country (country)
);

-- Onboarding Documents Tracking
CREATE TABLE IF NOT EXISTS onboarding_documents_new (
    doc_id INT AUTO_INCREMENT PRIMARY KEY,
    onboarding_id VARCHAR(30),
    document_name VARCHAR(100),
    document_type VARCHAR(50),
    required TINYINT DEFAULT 1,
    status VARCHAR(20) DEFAULT 'pending',
    submitted_date DATE,
    verified_date DATE,
    verified_by VARCHAR(100),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_onboarding (onboarding_id),
    INDEX idx_status (status)
);

-- Onboarding Tasks
CREATE TABLE IF NOT EXISTS onboarding_tasks_new (
    task_id INT AUTO_INCREMENT PRIMARY KEY,
    onboarding_id VARCHAR(30),
    task_name VARCHAR(200),
    task_type VARCHAR(50),
    phase VARCHAR(20),
    assigned_to VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',
    due_date DATE,
    completed_date DATE,
    auto_generated TINYINT DEFAULT 0,
    compliance_ref VARCHAR(100),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_onboarding (onboarding_id),
    INDEX idx_phase (phase),
    INDEX idx_status (status)
);

-- Training Assignments
CREATE TABLE IF NOT EXISTS onboarding_training (
    training_id INT AUTO_INCREMENT PRIMARY KEY,
    onboarding_id VARCHAR(30),
    course_name VARCHAR(200),
    course_type VARCHAR(20) DEFAULT 'mandatory',
    status VARCHAR(20) DEFAULT 'assigned',
    assigned_date DATE,
    due_date DATE,
    completed_date DATE,
    score DECIMAL(5,2),
    compliance_required TINYINT DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_onboarding (onboarding_id),
    INDEX idx_status (status)
);

-- System Access Provisioning
CREATE TABLE IF NOT EXISTS onboarding_system_access (
    access_id INT AUTO_INCREMENT PRIMARY KEY,
    onboarding_id VARCHAR(30),
    system_name VARCHAR(100),
    access_type VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending',
    account_id VARCHAR(100),
    requested_date DATE,
    provisioned_date DATE,
    provisioned_by VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_onboarding (onboarding_id),
    INDEX idx_status (status)
);

-- Audit Log for compliance tracking
CREATE TABLE IF NOT EXISTS onboarding_audit_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    onboarding_id VARCHAR(30),
    action VARCHAR(100),
    action_type VARCHAR(30) DEFAULT 'automated',
    phase VARCHAR(20),
    triggered_by VARCHAR(100),
    trigger_rule VARCHAR(50),
    compliance_ref VARCHAR(100),
    outcome VARCHAR(20),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_onboarding (onboarding_id),
    INDEX idx_action (action),
    INDEX idx_rule (trigger_rule)
);

-- Equipment Inventory
CREATE TABLE IF NOT EXISTS equipment_inventory (
    equipment_id INT AUTO_INCREMENT PRIMARY KEY,
    equipment_type VARCHAR(50),
    quantity_available INT DEFAULT 0,
    quantity_reserved INT DEFAULT 0,
    location VARCHAR(100),
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_type (equipment_type)
);

-- Phase History for tracking progression
CREATE TABLE IF NOT EXISTS onboarding_phase_history (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    onboarding_id VARCHAR(30),
    from_phase VARCHAR(20),
    to_phase VARCHAR(20),
    compliance_score DECIMAL(5,2),
    transitioned_by VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_onboarding (onboarding_id)
);

-- Rename new tables to replace old ones (if they exist)
DROP TABLE IF EXISTS employee_onboarding;
DROP TABLE IF EXISTS onboarding_documents;
DROP TABLE IF EXISTS onboarding_tasks;

RENAME TABLE employee_onboarding_new TO employee_onboarding;
RENAME TABLE onboarding_documents_new TO onboarding_documents;
RENAME TABLE onboarding_tasks_new TO onboarding_tasks;

SELECT 'Onboarding tables created successfully!' AS result;
