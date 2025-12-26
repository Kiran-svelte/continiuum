-- AI LEAVE MANAGEMENT SYSTEM - DATABASE SCHEMA ENHANCEMENTS
-- ANTIGRAVITY_AI_DIRECTIVE: ACTIVE
-- REALITY_ENFORCED: TRUE

-- ============================================================
-- 1. UPDATE EXISTING leave_requests TABLE
-- ============================================================

-- Add AI-related columns to leave_requests
ALTER TABLE leave_requests 
ADD COLUMN IF NOT EXISTS ai_confidence DECIMAL(5,2) DEFAULT NULL COMMENT 'AI confidence score (0-100)',
ADD COLUMN IF NOT EXISTS ai_decision VARCHAR(50) DEFAULT NULL COMMENT 'AI decision: AUTO_APPROVED, ESCALATE_TO_MANAGER, ESCALATE_TO_HR, REJECTED',
ADD COLUMN IF NOT EXISTS ai_reasoning TEXT DEFAULT NULL COMMENT 'JSON object with AI reasoning',
ADD COLUMN IF NOT EXISTS emotional_tone VARCHAR(50) DEFAULT NULL COMMENT 'Detected emotional tone: stressed, casual, formal, anxious, neutral',
ADD COLUMN IF NOT EXISTS original_request_text TEXT DEFAULT NULL COMMENT 'Original natural language request',
ADD COLUMN IF NOT EXISTS professional_reason TEXT DEFAULT NULL COMMENT 'AI-rewritten professional reason';

-- ============================================================
-- 2. AI DECISION LOGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_decision_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    leave_request_id INT NOT NULL,
    confidence_score DECIMAL(5,2) NOT NULL COMMENT 'Confidence score (0-100)',
    decision VARCHAR(50) NOT NULL COMMENT 'AUTO_APPROVED, ESCALATE_TO_MANAGER, ESCALATE_TO_HR, REJECTED',
    reasoning TEXT COMMENT 'JSON object with detailed reasoning',
    emotional_tone VARCHAR(50) COMMENT 'Detected emotional tone',
    urgency_level VARCHAR(20) COMMENT 'HIGH, MEDIUM, LOW',
    team_capacity DECIMAL(5,2) COMMENT 'Team capacity percentage at time of request',
    processing_time DECIMAL(10,3) COMMENT 'AI processing time in seconds',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_leave_request (leave_request_id),
    INDEX idx_decision (decision),
    INDEX idx_created_at (created_at),
    
    FOREIGN KEY (leave_request_id) REFERENCES leave_requests(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Logs all AI decisions for tracking and learning';

-- ============================================================
-- 3. LEAVE PATTERNS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS leave_patterns (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    pattern_type VARCHAR(100) NOT NULL COMMENT 'Type of pattern detected',
    occurrences INT NOT NULL DEFAULT 1 COMMENT 'Number of times pattern occurred',
    confidence DECIMAL(5,2) COMMENT 'Pattern detection confidence (0-100)',
    last_detected TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    severity VARCHAR(20) DEFAULT 'LOW' COMMENT 'LOW, MEDIUM, HIGH',
    details TEXT COMMENT 'JSON object with pattern details',
    
    INDEX idx_user (user_id),
    INDEX idx_pattern_type (pattern_type),
    INDEX idx_severity (severity),
    INDEX idx_last_detected (last_detected),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_pattern (user_id, pattern_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Tracks leave request patterns for anomaly detection';

-- ============================================================
-- 4. AI TRAINING HISTORY TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_training_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    model_version VARCHAR(50) NOT NULL COMMENT 'Model version identifier',
    model_type VARCHAR(50) NOT NULL COMMENT 'leave-agent, recruitment-agent, etc.',
    accuracy DECIMAL(5,2) COMMENT 'Model accuracy percentage',
    training_data_path VARCHAR(255) COMMENT 'Path to training data file',
    training_records INT COMMENT 'Number of records used for training',
    training_duration DECIMAL(10,2) COMMENT 'Training duration in seconds',
    notes TEXT COMMENT 'Training notes or changes',
    trained_by INT COMMENT 'Admin user ID who triggered training',
    trained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_model_type (model_type),
    INDEX idx_trained_at (trained_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Tracks AI model training history';

-- ============================================================
-- 5. AI METRICS TABLE (Daily Aggregates)
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_metrics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    date DATE NOT NULL UNIQUE,
    total_requests INT DEFAULT 0,
    auto_approved INT DEFAULT 0,
    escalated_manager INT DEFAULT 0,
    escalated_hr INT DEFAULT 0,
    rejected INT DEFAULT 0,
    avg_confidence DECIMAL(5,2) COMMENT 'Average confidence score',
    avg_processing_time DECIMAL(10,3) COMMENT 'Average processing time in seconds',
    accuracy DECIMAL(5,2) COMMENT 'Accuracy vs HR decisions',
    false_positives INT DEFAULT 0 COMMENT 'Auto-approved but should have been rejected',
    false_negatives INT DEFAULT 0 COMMENT 'Rejected but should have been approved',
    employee_satisfaction DECIMAL(3,2) COMMENT 'Average satisfaction score (0-5)',
    
    INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Daily AI performance metrics';

-- ============================================================
-- 6. AI CONFIGURATION TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_configuration (
    id INT PRIMARY KEY AUTO_INCREMENT,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    description TEXT,
    updated_by INT COMMENT 'Admin user ID',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_config_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI system configuration';

-- Insert default configurations
INSERT INTO ai_configuration (config_key, config_value, description) VALUES
('auto_approve_threshold', '85.0', 'Confidence threshold for auto-approval (0-100)'),
('escalate_threshold', '60.0', 'Confidence threshold for escalation vs rejection (0-100)'),
('pattern_detection_enabled', 'true', 'Enable pattern detection'),
('pattern_detection_days', '90', 'Days to look back for pattern detection'),
('emotional_tone_detection', 'true', 'Enable emotional tone detection'),
('professional_rewrite_enabled', 'true', 'Enable AI rewriting of reasons'),
('max_auto_approve_days', '5', 'Maximum days for auto-approval without escalation')
ON DUPLICATE KEY UPDATE config_value=VALUES(config_value);

-- ============================================================
-- 7. HR FEEDBACK TABLE (For AI Learning)
-- ============================================================

CREATE TABLE IF NOT EXISTS hr_feedback (
    id INT PRIMARY KEY AUTO_INCREMENT,
    leave_request_id INT NOT NULL,
    ai_decision VARCHAR(50) NOT NULL COMMENT 'Original AI decision',
    hr_decision VARCHAR(50) NOT NULL COMMENT 'Actual HR decision',
    ai_confidence DECIMAL(5,2) COMMENT 'AI confidence at time of decision',
    is_correct BOOLEAN COMMENT 'Whether AI decision matched HR decision',
    hr_notes TEXT COMMENT 'HR notes on why they agreed/disagreed',
    hr_user_id INT COMMENT 'HR user who made the decision',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_leave_request (leave_request_id),
    INDEX idx_is_correct (is_correct),
    INDEX idx_created_at (created_at),
    
    FOREIGN KEY (leave_request_id) REFERENCES leave_requests(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='HR feedback for AI learning and improvement';

-- ============================================================
-- 8. TEAM CAPACITY CACHE TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS team_capacity_cache (
    id INT PRIMARY KEY AUTO_INCREMENT,
    department VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    total_employees INT NOT NULL,
    on_leave INT NOT NULL,
    capacity_percentage DECIMAL(5,2) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_dept_date (department, date),
    INDEX idx_date (date),
    INDEX idx_department (department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Cached team capacity calculations for performance';

-- ============================================================
-- 9. CREATE VIEWS FOR EASY QUERYING
-- ============================================================

-- View: AI Performance Summary
CREATE OR REPLACE VIEW v_ai_performance_summary AS
SELECT 
    DATE(l.created_at) as date,
    COUNT(*) as total_requests,
    SUM(CASE WHEN l.ai_decision = 'AUTO_APPROVED' THEN 1 ELSE 0 END) as auto_approved,
    SUM(CASE WHEN l.ai_decision LIKE 'ESCALATE%' THEN 1 ELSE 0 END) as escalated,
    SUM(CASE WHEN l.ai_decision = 'REJECTED' THEN 1 ELSE 0 END) as rejected,
    AVG(l.ai_confidence) as avg_confidence,
    AVG(adl.processing_time) as avg_processing_time
FROM leave_requests l
LEFT JOIN ai_decision_logs adl ON adl.leave_request_id = l.id
WHERE l.ai_decision IS NOT NULL
GROUP BY DATE(l.created_at)
ORDER BY date DESC;

-- View: Priority Review Queue for HR
CREATE OR REPLACE VIEW v_hr_priority_queue AS
SELECT 
    l.id,
    l.user_id,
    u.name as employee_name,
    u.department,
    l.leave_type,
    l.start_date,
    l.end_date,
    l.original_request_text,
    l.professional_reason,
    l.ai_confidence,
    l.ai_decision,
    l.emotional_tone,
    adl.urgency_level,
    adl.team_capacity,
    l.created_at,
    -- Priority score (lower is higher priority)
    CASE 
        WHEN adl.urgency_level = 'HIGH' THEN 1
        WHEN adl.urgency_level = 'MEDIUM' THEN 2
        ELSE 3
    END as priority_score
FROM leave_requests l
JOIN users u ON u.id = l.user_id
LEFT JOIN ai_decision_logs adl ON adl.leave_request_id = l.id
WHERE l.status = 'pending'
AND l.ai_decision IN ('ESCALATE_TO_MANAGER', 'ESCALATE_TO_HR')
ORDER BY priority_score ASC, l.ai_confidence ASC, l.created_at ASC;

-- View: Pattern Alerts for HR
CREATE OR REPLACE VIEW v_pattern_alerts AS
SELECT 
    lp.id,
    lp.user_id,
    u.name as employee_name,
    u.department,
    lp.pattern_type,
    lp.occurrences,
    lp.confidence,
    lp.severity,
    lp.last_detected,
    lp.details
FROM leave_patterns lp
JOIN users u ON u.id = lp.user_id
WHERE lp.severity IN ('MEDIUM', 'HIGH')
ORDER BY lp.severity DESC, lp.last_detected DESC;

-- ============================================================
-- 10. STORED PROCEDURES
-- ============================================================

DELIMITER //

-- Procedure: Update Daily AI Metrics
CREATE PROCEDURE IF NOT EXISTS sp_update_daily_ai_metrics(IN target_date DATE)
BEGIN
    INSERT INTO ai_metrics (
        date, total_requests, auto_approved, escalated_manager, 
        escalated_hr, rejected, avg_confidence, avg_processing_time
    )
    SELECT 
        target_date,
        COUNT(*) as total_requests,
        SUM(CASE WHEN ai_decision = 'AUTO_APPROVED' THEN 1 ELSE 0 END),
        SUM(CASE WHEN ai_decision = 'ESCALATE_TO_MANAGER' THEN 1 ELSE 0 END),
        SUM(CASE WHEN ai_decision = 'ESCALATE_TO_HR' THEN 1 ELSE 0 END),
        SUM(CASE WHEN ai_decision = 'REJECTED' THEN 1 ELSE 0 END),
        AVG(ai_confidence),
        AVG(adl.processing_time)
    FROM leave_requests l
    LEFT JOIN ai_decision_logs adl ON adl.leave_request_id = l.id
    WHERE DATE(l.created_at) = target_date
    AND l.ai_decision IS NOT NULL
    ON DUPLICATE KEY UPDATE
        total_requests = VALUES(total_requests),
        auto_approved = VALUES(auto_approved),
        escalated_manager = VALUES(escalated_manager),
        escalated_hr = VALUES(escalated_hr),
        rejected = VALUES(rejected),
        avg_confidence = VALUES(avg_confidence),
        avg_processing_time = VALUES(avg_processing_time);
END //

-- Procedure: Calculate AI Accuracy
CREATE PROCEDURE IF NOT EXISTS sp_calculate_ai_accuracy(IN target_date DATE)
BEGIN
    DECLARE total INT;
    DECLARE correct INT;
    DECLARE accuracy DECIMAL(5,2);
    
    SELECT COUNT(*) INTO total
    FROM hr_feedback
    WHERE DATE(created_at) = target_date;
    
    IF total > 0 THEN
        SELECT COUNT(*) INTO correct
        FROM hr_feedback
        WHERE DATE(created_at) = target_date
        AND is_correct = TRUE;
        
        SET accuracy = (correct / total) * 100;
        
        UPDATE ai_metrics
        SET accuracy = accuracy
        WHERE date = target_date;
    END IF;
END //

DELIMITER ;

-- ============================================================
-- 11. TRIGGERS
-- ============================================================

DELIMITER //

-- Trigger: Auto-log HR feedback when leave status changes
CREATE TRIGGER IF NOT EXISTS trg_log_hr_feedback
AFTER UPDATE ON leave_requests
FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status AND NEW.ai_decision IS NOT NULL THEN
        INSERT INTO hr_feedback (
            leave_request_id,
            ai_decision,
            hr_decision,
            ai_confidence,
            is_correct
        ) VALUES (
            NEW.id,
            NEW.ai_decision,
            NEW.status,
            NEW.ai_confidence,
            CASE 
                WHEN NEW.ai_decision = 'AUTO_APPROVED' AND NEW.status = 'approved' THEN TRUE
                WHEN NEW.ai_decision LIKE 'ESCALATE%' AND NEW.status IN ('approved', 'rejected') THEN TRUE
                ELSE FALSE
            END
        );
    END IF;
END //

DELIMITER ;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Check if all tables exist
SELECT 
    TABLE_NAME,
    TABLE_ROWS,
    CREATE_TIME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'company'
AND TABLE_NAME IN (
    'ai_decision_logs',
    'leave_patterns',
    'ai_training_history',
    'ai_metrics',
    'ai_configuration',
    'hr_feedback',
    'team_capacity_cache'
)
ORDER BY TABLE_NAME;

-- Check if leave_requests columns were added
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    COLUMN_COMMENT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'company'
AND TABLE_NAME = 'leave_requests'
AND COLUMN_NAME IN (
    'ai_confidence',
    'ai_decision',
    'ai_reasoning',
    'emotional_tone',
    'original_request_text',
    'professional_reason'
)
ORDER BY COLUMN_NAME;

-- ============================================================
-- SAMPLE DATA FOR TESTING
-- ============================================================

-- Insert sample AI configuration
-- (Already done above in INSERT statement)

-- ============================================================
-- CLEANUP (if needed)
-- ============================================================

-- To drop all AI tables (USE WITH CAUTION):
/*
DROP TABLE IF EXISTS hr_feedback;
DROP TABLE IF EXISTS team_capacity_cache;
DROP TABLE IF EXISTS ai_metrics;
DROP TABLE IF EXISTS ai_training_history;
DROP TABLE IF EXISTS leave_patterns;
DROP TABLE IF EXISTS ai_decision_logs;
DROP TABLE IF EXISTS ai_configuration;

ALTER TABLE leave_requests 
DROP COLUMN IF EXISTS ai_confidence,
DROP COLUMN IF EXISTS ai_decision,
DROP COLUMN IF EXISTS ai_reasoning,
DROP COLUMN IF EXISTS emotional_tone,
DROP COLUMN IF EXISTS original_request_text,
DROP COLUMN IF EXISTS professional_reason;
*/

-- ============================================================
-- END OF MIGRATION
-- ============================================================

SELECT '✅ AI Leave Management Database Schema Migration Complete!' as Status;
