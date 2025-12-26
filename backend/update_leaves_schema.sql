-- Add notes column for AI decisions
ALTER TABLE leaves 
ADD COLUMN notes TEXT NULL AFTER reason;

-- Add index for faster queries
CREATE INDEX idx_user_status ON leaves(user_id, status);
CREATE INDEX idx_dates ON leaves(start_date, end_date);
