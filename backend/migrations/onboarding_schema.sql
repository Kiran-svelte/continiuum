-- AI Onboarding System Database Schema
-- Run this in MySQL to create required tables

-- Employee Onboarding Tracking Table
CREATE TABLE IF NOT EXISTS employee_onboarding (
    onboarding_id VARCHAR(30) PRIMARY KEY,
    emp_id VARCHAR(20),
    employee_name VARCHAR(100),
    email VARCHAR(100),
    role VARCHAR(100),
    department VARCHAR(50),
    team VARCHAR(50),
    country VARCHAR(10) DEFAULT 'US',
    work_authorization VARCHAR(50),
    
    -- Dates
    offer_date DATE,
    start_date DATE,
    expected_completion DATE,
    actual_completion DATE,
    
    -- Status
    current_phase ENUM('offer_pending', 'pre_start', 'day_0', 'week_1', 'month_1', 'complete') DEFAULT 'offer_pending',
    status ENUM('in_progress', 'completed', 'blocked', 'cancelled') DEFAULT 'in_progress',
    compliance_score DECIMAL(5,2) DEFAULT 0,
    
    -- Budget
    budget_approved BOOLEAN DEFAULT FALSE,
    budget_code VARCHAR(30),
    
    -- Background Check
    background_check_status ENUM('pending', 'in_progress', 'completed', 'failed') DEFAULT 'pending',
    background_check_initiated DATE,
    background_check_completed DATE,
    
    -- Equipment
    equipment_type VARCHAR(50) DEFAULT 'laptop',
    equipment_ordered BOOLEAN DEFAULT FALSE,
    equipment_delivered BOOLEAN DEFAULT FALSE,
    
    -- AI Processing
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
CREATE TABLE IF NOT EXISTS onboarding_documents (
    doc_id INT AUTO_INCREMENT PRIMARY KEY,
    onboarding_id VARCHAR(30),
    document_name VARCHAR(100),
    document_type VARCHAR(50),
    required BOOLEAN DEFAULT TRUE,
    status ENUM('pending', 'submitted', 'verified', 'rejected') DEFAULT 'pending',
    submitted_date DATE,
    verified_date DATE,
    verified_by VARCHAR(100),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (onboarding_id) REFERENCES employee_onboarding(onboarding_id) ON DELETE CASCADE,
    INDEX idx_onboarding (onboarding_id),
    INDEX idx_status (status)
);

-- Onboarding Tasks
CREATE TABLE IF NOT EXISTS onboarding_tasks (
    task_id INT AUTO_INCREMENT PRIMARY KEY,
    onboarding_id VARCHAR(30),
    task_name VARCHAR(200),
    task_type VARCHAR(50),
    phase ENUM('offer_pending', 'pre_start', 'day_0', 'week_1', 'month_1'),
    assigned_to VARCHAR(100),
    status ENUM('pending', 'in_progress', 'completed', 'blocked') DEFAULT 'pending',
    due_date DATE,
    completed_date DATE,
    auto_generated BOOLEAN DEFAULT FALSE,
    compliance_ref VARCHAR(100),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (onboarding_id) REFERENCES employee_onboarding(onboarding_id) ON DELETE CASCADE,
    INDEX idx_onboarding (onboarding_id),
    INDEX idx_phase (phase),
    INDEX idx_status (status)
);

-- Training Assignments
CREATE TABLE IF NOT EXISTS onboarding_training (
    training_id INT AUTO_INCREMENT PRIMARY KEY,
    onboarding_id VARCHAR(30),
    course_name VARCHAR(200),
    course_type ENUM('mandatory', 'recommended', 'optional') DEFAULT 'mandatory',
    status ENUM('assigned', 'in_progress', 'completed', 'overdue') DEFAULT 'assigned',
    assigned_date DATE,
    due_date DATE,
    completed_date DATE,
    score DECIMAL(5,2),
    compliance_required BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (onboarding_id) REFERENCES employee_onboarding(onboarding_id) ON DELETE CASCADE,
    INDEX idx_onboarding (onboarding_id),
    INDEX idx_status (status)
);

-- System Access Provisioning
CREATE TABLE IF NOT EXISTS onboarding_system_access (
    access_id INT AUTO_INCREMENT PRIMARY KEY,
    onboarding_id VARCHAR(30),
    system_name VARCHAR(100),
    access_type VARCHAR(50),
    status ENUM('pending', 'provisioned', 'active', 'revoked') DEFAULT 'pending',
    requested_date DATE,
    provisioned_date DATE,
    provisioned_by VARCHAR(100),
    account_id VARCHAR(100),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (onboarding_id) REFERENCES employee_onboarding(onboarding_id) ON DELETE CASCADE,
    INDEX idx_onboarding (onboarding_id),
    INDEX idx_system (system_name)
);

-- Onboarding Audit Log
CREATE TABLE IF NOT EXISTS onboarding_audit_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    onboarding_id VARCHAR(30),
    action VARCHAR(100),
    action_type VARCHAR(50),
    phase VARCHAR(20),
    triggered_by VARCHAR(100),
    trigger_rule VARCHAR(50),
    compliance_ref VARCHAR(100),
    details JSON,
    outcome ENUM('success', 'failure', 'pending'),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (onboarding_id) REFERENCES employee_onboarding(onboarding_id) ON DELETE CASCADE,
    INDEX idx_onboarding (onboarding_id),
    INDEX idx_action (action_type),
    INDEX idx_created (created_at)
);

-- Equipment Inventory (for constraint checks)
CREATE TABLE IF NOT EXISTS equipment_inventory (
    equipment_id INT AUTO_INCREMENT PRIMARY KEY,
    equipment_type VARCHAR(50),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    status ENUM('available', 'assigned', 'maintenance', 'retired') DEFAULT 'available',
    assigned_to VARCHAR(30),
    purchase_date DATE,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_type_status (equipment_type, status)
);

-- Phase Transition History
CREATE TABLE IF NOT EXISTS onboarding_phase_history (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    onboarding_id VARCHAR(30),
    from_phase VARCHAR(20),
    to_phase VARCHAR(20),
    transition_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    compliance_score DECIMAL(5,2),
    transitioned_by VARCHAR(100),
    auto_transition BOOLEAN DEFAULT FALSE,
    notes TEXT,
    
    FOREIGN KEY (onboarding_id) REFERENCES employee_onboarding(onboarding_id) ON DELETE CASCADE,
    INDEX idx_onboarding (onboarding_id)
);
