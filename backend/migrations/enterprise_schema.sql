-- Enterprise Multi-Tenant Database Schema
-- Supports multiple clients, environments, audit logging, metrics

-- =============================================================================
-- CLIENT & TENANT MANAGEMENT
-- =============================================================================

CREATE TABLE IF NOT EXISTS enterprise_clients (
    client_id VARCHAR(20) PRIMARY KEY,
    client_key VARCHAR(50) UNIQUE NOT NULL,
    client_name VARCHAR(100) NOT NULL,
    industry VARCHAR(50) NOT NULL,
    primary_contact_email VARCHAR(100),
    primary_contact_name VARCHAR(100),
    data_retention_years INT DEFAULT 7,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',
    INDEX idx_industry (industry),
    INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS client_environments (
    env_id INT AUTO_INCREMENT PRIMARY KEY,
    client_id VARCHAR(20) NOT NULL,
    environment VARCHAR(20) NOT NULL,
    subdomain VARCHAR(100),
    database_name VARCHAR(100),
    auto_approve TINYINT DEFAULT 0,
    hr_review_required TINYINT DEFAULT 1,
    description TEXT,
    config_json JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_client_env (client_id, environment),
    INDEX idx_client (client_id),
    INDEX idx_env (environment)
);

CREATE TABLE IF NOT EXISTS client_compliance_requirements (
    req_id INT AUTO_INCREMENT PRIMARY KEY,
    client_id VARCHAR(20) NOT NULL,
    compliance_framework VARCHAR(50) NOT NULL,
    certification_date DATE,
    expiry_date DATE,
    status VARCHAR(20) DEFAULT 'active',
    audit_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_client (client_id),
    INDEX idx_framework (compliance_framework)
);

-- =============================================================================
-- APPROVAL CHAIN TRACKING
-- =============================================================================

CREATE TABLE IF NOT EXISTS approval_requests (
    request_id VARCHAR(30) PRIMARY KEY,
    client_id VARCHAR(20) NOT NULL,
    environment VARCHAR(20) NOT NULL,
    request_type VARCHAR(50) NOT NULL,
    approval_level VARCHAR(30) NOT NULL,
    requestor_id VARCHAR(20),
    requestor_name VARCHAR(100),
    request_data JSON,
    status VARCHAR(20) DEFAULT 'pending',
    current_approver VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at DATETIME,
    INDEX idx_client (client_id),
    INDEX idx_status (status),
    INDEX idx_level (approval_level)
);

CREATE TABLE IF NOT EXISTS approval_chain_history (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    request_id VARCHAR(30) NOT NULL,
    approval_level VARCHAR(30) NOT NULL,
    approver_id VARCHAR(20),
    approver_name VARCHAR(100),
    action VARCHAR(20) NOT NULL,
    comments TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_request (request_id),
    INDEX idx_approver (approver_id)
);

-- =============================================================================
-- ROLLBACK & INCIDENT MANAGEMENT
-- =============================================================================

CREATE TABLE IF NOT EXISTS system_incidents (
    incident_id VARCHAR(30) PRIMARY KEY,
    client_id VARCHAR(20),
    incident_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    trigger_rule VARCHAR(100),
    trigger_value DECIMAL(10,2),
    threshold_value DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'active',
    mode_before VARCHAR(30),
    mode_after VARCHAR(30),
    actions_taken JSON,
    recovery_steps JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    resolved_by VARCHAR(100),
    resolution_notes TEXT,
    INDEX idx_client (client_id),
    INDEX idx_type (incident_type),
    INDEX idx_status (status),
    INDEX idx_severity (severity)
);

CREATE TABLE IF NOT EXISTS rollback_history (
    rollback_id INT AUTO_INCREMENT PRIMARY KEY,
    client_id VARCHAR(20),
    environment VARCHAR(20),
    rollback_type VARCHAR(50) NOT NULL,
    reason TEXT,
    from_version VARCHAR(50),
    to_version VARCHAR(50),
    initiated_by VARCHAR(100),
    status VARCHAR(20) DEFAULT 'in_progress',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    INDEX idx_client (client_id),
    INDEX idx_env (environment)
);

-- =============================================================================
-- METRICS & MONITORING
-- =============================================================================

CREATE TABLE IF NOT EXISTS system_metrics (
    metric_id INT AUTO_INCREMENT PRIMARY KEY,
    client_id VARCHAR(20),
    metric_name VARCHAR(50) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit VARCHAR(20),
    target_value DECIMAL(15,4),
    alert_threshold DECIMAL(15,4),
    is_alert TINYINT DEFAULT 0,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_client (client_id),
    INDEX idx_name (metric_name),
    INDEX idx_recorded (recorded_at),
    INDEX idx_alert (is_alert)
);

CREATE TABLE IF NOT EXISTS metrics_daily_summary (
    summary_id INT AUTO_INCREMENT PRIMARY KEY,
    client_id VARCHAR(20),
    summary_date DATE NOT NULL,
    avg_constraint_check_ms DECIMAL(10,2),
    avg_api_response_ms DECIMAL(10,2),
    avg_workflow_minutes DECIMAL(10,2),
    total_requests INT DEFAULT 0,
    error_count INT DEFAULT 0,
    error_rate_percent DECIMAL(5,2),
    uptime_percent DECIMAL(5,2) DEFAULT 100,
    compliance_score DECIMAL(5,2),
    satisfaction_score DECIMAL(3,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_client_date (client_id, summary_date),
    INDEX idx_date (summary_date)
);

CREATE TABLE IF NOT EXISTS success_metrics_tracking (
    tracking_id INT AUTO_INCREMENT PRIMARY KEY,
    client_id VARCHAR(20),
    metric_category VARCHAR(50) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    current_value DECIMAL(15,4),
    target_value DECIMAL(15,4),
    baseline_value DECIMAL(15,4),
    improvement_percent DECIMAL(10,2),
    measured_date DATE NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_client (client_id),
    INDEX idx_category (metric_category),
    INDEX idx_date (measured_date)
);

-- =============================================================================
-- SECURITY & AUDIT LOGGING
-- =============================================================================

CREATE TABLE IF NOT EXISTS security_audit_log (
    audit_id INT AUTO_INCREMENT PRIMARY KEY,
    client_id VARCHAR(20),
    user_id VARCHAR(20),
    session_id VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(50),
    result VARCHAR(20) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_data JSON,
    response_summary TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_client (client_id),
    INDEX idx_user (user_id),
    INDEX idx_action (action),
    INDEX idx_created (created_at),
    INDEX idx_result (result)
);

CREATE TABLE IF NOT EXISTS pii_access_log (
    access_id INT AUTO_INCREMENT PRIMARY KEY,
    client_id VARCHAR(20),
    user_id VARCHAR(20),
    employee_id VARCHAR(20) NOT NULL,
    pii_field VARCHAR(50) NOT NULL,
    access_reason VARCHAR(200),
    approved_by VARCHAR(100),
    accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_client (client_id),
    INDEX idx_employee (employee_id),
    INDEX idx_field (pii_field),
    INDEX idx_accessed (accessed_at)
);

CREATE TABLE IF NOT EXISTS data_retention_log (
    retention_id INT AUTO_INCREMENT PRIMARY KEY,
    client_id VARCHAR(20),
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(50) NOT NULL,
    record_date DATE NOT NULL,
    retention_years INT NOT NULL,
    deletion_scheduled DATE,
    deletion_executed DATE,
    status VARCHAR(20) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_client (client_id),
    INDEX idx_status (status),
    INDEX idx_scheduled (deletion_scheduled)
);

-- =============================================================================
-- DISASTER RECOVERY TRACKING
-- =============================================================================

CREATE TABLE IF NOT EXISTS backup_history (
    backup_id INT AUTO_INCREMENT PRIMARY KEY,
    client_id VARCHAR(20),
    backup_type VARCHAR(30) NOT NULL,
    backup_size_mb DECIMAL(15,2),
    backup_location VARCHAR(255),
    is_offsite TINYINT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'completed',
    started_at DATETIME,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    verified_at DATETIME,
    notes TEXT,
    INDEX idx_client (client_id),
    INDEX idx_type (backup_type),
    INDEX idx_completed (completed_at)
);

CREATE TABLE IF NOT EXISTS failover_events (
    event_id INT AUTO_INCREMENT PRIMARY KEY,
    client_id VARCHAR(20),
    event_type VARCHAR(50) NOT NULL,
    from_region VARCHAR(50),
    to_region VARCHAR(50),
    trigger_reason TEXT,
    rto_achieved_minutes INT,
    rpo_achieved_minutes INT,
    data_loss_records INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'completed',
    started_at DATETIME,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_client (client_id),
    INDEX idx_type (event_type)
);

-- =============================================================================
-- DEPLOYMENT TRACKING
-- =============================================================================

CREATE TABLE IF NOT EXISTS deployment_history (
    deployment_id INT AUTO_INCREMENT PRIMARY KEY,
    client_id VARCHAR(20),
    environment VARCHAR(20) NOT NULL,
    version VARCHAR(50) NOT NULL,
    previous_version VARCHAR(50),
    deployment_type VARCHAR(30) DEFAULT 'normal',
    status VARCHAR(20) DEFAULT 'pending',
    deployed_by VARCHAR(100),
    approved_by VARCHAR(100),
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    rollback_available TINYINT DEFAULT 1,
    notes TEXT,
    INDEX idx_client (client_id),
    INDEX idx_env (environment),
    INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS deployment_approvals (
    approval_id INT AUTO_INCREMENT PRIMARY KEY,
    deployment_id INT NOT NULL,
    approval_stage VARCHAR(50) NOT NULL,
    approver_id VARCHAR(20),
    approver_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',
    comments TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    actioned_at DATETIME,
    INDEX idx_deployment (deployment_id),
    INDEX idx_status (status)
);

-- =============================================================================
-- INITIAL DATA NOTICE
-- =============================================================================

-- NOTE: No demo/seed data is inserted here.
-- Client data comes from real registrations via the API.
-- All data in these tables represents actual business records.

SELECT 'Enterprise multi-tenant schema created successfully!' AS result;
