-- Simple AI Leave Management Schema Update
-- Add AI columns to existing leave_requests table

-- Add AI-related columns if they don't exist
ALTER TABLE leave_requests 
ADD COLUMN IF NOT EXISTS ai_confidence DECIMAL(5,2) DEFAULT NULL COMMENT 'AI confidence score (0-100)',
ADD COLUMN IF NOT EXISTS ai_decision VARCHAR(50) DEFAULT NULL COMMENT 'AI decision: AUTO_APPROVED, ESCALATE_TO_MANAGER, ESCALATE_TO_HR, REJECTED',
ADD COLUMN IF NOT EXISTS ai_reasoning TEXT DEFAULT NULL COMMENT 'JSON object with AI reasoning',
ADD COLUMN IF NOT EXISTS emotional_tone VARCHAR(50) DEFAULT NULL COMMENT 'Detected emotional tone',
ADD COLUMN IF NOT EXISTS original_request_text TEXT DEFAULT NULL COMMENT 'Original natural language request',
ADD COLUMN IF NOT EXISTS professional_reason TEXT DEFAULT NULL COMMENT 'AI-rewritten professional reason';

-- Create ai_decision_logs table if not exists
CREATE TABLE IF NOT EXISTS ai_decision_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    leave_request_id INT NOT NULL,
    confidence_score DECIMAL(5,2) NOT NULL,
    decision VARCHAR(50) NOT NULL,
    reasoning TEXT,
    emotional_tone VARCHAR(50),
    urgency_level VARCHAR(20),
    team_capacity DECIMAL(5,2),
    processing_time DECIMAL(10,3),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_leave_request (leave_request_id),
    INDEX idx_decision (decision),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create leave_patterns table if not exists
CREATE TABLE IF NOT EXISTS leave_patterns (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    pattern_type VARCHAR(100) NOT NULL,
    occurrences INT NOT NULL DEFAULT 1,
    confidence DECIMAL(5,2),
    last_detected TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    severity VARCHAR(20) DEFAULT 'LOW',
    details TEXT,
    INDEX idx_user (user_id),
    INDEX idx_pattern_type (pattern_type),
    INDEX idx_severity (severity),
    UNIQUE KEY unique_user_pattern (user_id, pattern_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create hr_feedback table if not exists
CREATE TABLE IF NOT EXISTS hr_feedback (
    id INT PRIMARY KEY AUTO_INCREMENT,
    leave_request_id INT NOT NULL,
    ai_decision VARCHAR(50) NOT NULL,
    hr_decision VARCHAR(50) NOT NULL,
    ai_confidence DECIMAL(5,2),
    is_correct BOOLEAN,
    hr_notes TEXT,
    hr_user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_leave_request (leave_request_id),
    INDEX idx_is_correct (is_correct),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create views
CREATE OR REPLACE VIEW v_ai_performance_summary AS
SELECT 
    DATE(l.created_at) as date,
    COUNT(*) as total_requests,
    SUM(CASE WHEN l.ai_decision = 'AUTO_APPROVED' THEN 1 ELSE 0 END) as auto_approved,
    SUM(CASE WHEN l.ai_decision LIKE 'ESCALATE%' THEN 1 ELSE 0 END) as escalated,
    SUM(CASE WHEN l.ai_decision = 'REJECTED' THEN 1 ELSE 0 END) as rejected,
    AVG(l.ai_confidence) as avg_confidence
FROM leave_requests l
WHERE l.ai_decision IS NOT NULL
GROUP BY DATE(l.created_at)
ORDER BY date DESC;

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
    l.created_at
FROM leave_requests l
JOIN users u ON u.id = l.user_id
WHERE l.status = 'pending'
AND l.ai_decision IN ('ESCALATE_TO_MANAGER', 'ESCALATE_TO_HR')
ORDER BY l.ai_confidence ASC, l.created_at ASC;

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
    lp.last_detected
FROM leave_patterns lp
JOIN users u ON u.id = lp.user_id
WHERE lp.severity IN ('MEDIUM', 'HIGH')
ORDER BY lp.severity DESC, lp.last_detected DESC;

SELECT '✅ AI Leave Management Schema Update Complete!' as Status;
