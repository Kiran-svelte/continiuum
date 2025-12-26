-- =====================================================
-- SEED DATA FOR HR SYSTEMS
-- =====================================================

-- Insert Onboarding Workflows
INSERT INTO onboarding_workflows (workflow_name, department, position_type, total_steps, estimated_days) VALUES
('Engineering Onboarding', 'Engineering', 'full-time', 15, 30),
('Sales Onboarding', 'Sales', 'full-time', 12, 21),
('HR Onboarding', 'HR', 'full-time', 10, 14),
('General Onboarding', NULL, 'full-time', 8, 14);

-- Insert Onboarding Tasks for Engineering
INSERT INTO onboarding_tasks (workflow_id, task_name, task_description, task_type, assigned_to, day_offset, duration_hours, is_mandatory) VALUES
(1, 'Complete I-9 Form', 'Submit employment eligibility verification', 'document', 'employee', 0, 1, TRUE),
(1, 'Submit ID Documents', 'Provide government-issued ID and work authorization', 'document', 'employee', 0, 1, TRUE),
(1, 'Sign Employment Contract', 'Review and sign employment agreement', 'document', 'employee', 0, 1, TRUE),
(1, 'IT Equipment Setup', 'Laptop, monitors, and peripherals configuration', 'setup', 'it', 1, 4, TRUE),
(1, 'Email & Accounts Setup', 'Create corporate email and system accounts', 'setup', 'it', 1, 2, TRUE),
(1, 'Security Compliance Training', 'Complete mandatory security awareness training', 'training', 'employee', 2, 2, TRUE),
(1, 'Code of Conduct Review', 'Read and acknowledge company policies', 'compliance', 'employee', 2, 1, TRUE),
(1, 'Meet Your Manager', 'One-on-one introduction with direct manager', 'meeting', 'manager', 3, 1, TRUE),
(1, 'Team Introduction', 'Meet team members and understand roles', 'introduction', 'manager', 3, 2, TRUE),
(1, 'Development Environment Setup', 'Install IDE, tools, and clone repositories', 'setup', 'employee', 4, 4, TRUE),
(1, 'Codebase Walkthrough', 'Overview of architecture and key modules', 'training', 'manager', 5, 3, TRUE),
(1, 'First Task Assignment', 'Receive and start first development task', 'setup', 'manager', 7, 1, TRUE),
(1, 'HR Benefits Enrollment', 'Complete benefits selection', 'document', 'hr', 5, 2, TRUE),
(1, '30-Day Check-in', 'Progress review with manager and HR', 'meeting', 'hr', 30, 1, TRUE),
(1, 'Buddy Program Introduction', 'Connect with assigned onboarding buddy', 'introduction', 'employee', 1, 1, FALSE);

-- Insert Performance Cycle
INSERT INTO performance_cycles (cycle_name, cycle_type, start_date, end_date, status) VALUES
('2025 Annual Review', 'annual', '2025-01-01', '2025-12-31', 'active'),
('Q4 2025 Review', 'quarterly', '2025-10-01', '2025-12-31', 'active');

-- Insert Competency Framework
INSERT INTO competency_framework (competency_name, competency_description, category, level_definitions, is_core) VALUES
('Technical Excellence', 'Demonstrates strong technical skills and continuous learning', 'Technical', '{"1": "Learning basics", "2": "Applying knowledge", "3": "Independent contributor", "4": "Expert/Mentor", "5": "Industry leader"}', TRUE),
('Communication', 'Effectively communicates ideas and collaborates with others', 'Soft Skills', '{"1": "Basic communication", "2": "Clear articulation", "3": "Persuasive communication", "4": "Strategic communication", "5": "Executive presence"}', TRUE),
('Problem Solving', 'Analyzes complex problems and develops effective solutions', 'Technical', '{"1": "Follows procedures", "2": "Solves routine problems", "3": "Handles complexity", "4": "Strategic problem solver", "5": "Innovator"}', TRUE),
('Leadership', 'Inspires and guides others toward achieving goals', 'Leadership', '{"1": "Self-leadership", "2": "Team contributor", "3": "Team leader", "4": "Department leader", "5": "Organization leader"}', FALSE),
('Customer Focus', 'Prioritizes customer needs and delivers value', 'Business', '{"1": "Understands customers", "2": "Responds to needs", "3": "Anticipates needs", "4": "Drives customer success", "5": "Customer champion"}', TRUE);

-- Insert Job Postings
INSERT INTO job_postings (job_title, department, location, employment_type, experience_min, experience_max, salary_min, salary_max, job_description, requirements, skills_required, hiring_manager, status, posted_date, closing_date) VALUES
('Senior Software Engineer', 'Engineering', 'Bangalore', 'full-time', 5, 10, 2500000, 4000000, 'We are looking for a Senior Software Engineer to join our backend team. You will be responsible for designing and implementing scalable microservices.', '["Bachelor degree in CS or related field", "5+ years of software development experience", "Strong knowledge of Node.js or Python", "Experience with cloud platforms (AWS/GCP)"]', '["Node.js", "Python", "PostgreSQL", "Docker", "Kubernetes", "REST APIs"]', 'EMP001', 'open', '2025-12-01', '2026-01-31'),
('Product Manager', 'Product', 'Mumbai', 'full-time', 3, 7, 2000000, 3500000, 'Join our product team to drive product strategy and roadmap for our enterprise solutions.', '["3+ years of product management experience", "Strong analytical skills", "Experience with agile methodologies"]', '["Product Strategy", "User Research", "Data Analysis", "Agile", "Roadmap Planning"]', 'EMP002', 'open', '2025-12-15', '2026-02-15'),
('HR Business Partner', 'HR', 'Delhi', 'full-time', 4, 8, 1500000, 2500000, 'Strategic HR role partnering with business leaders to drive people initiatives.', '["4+ years of HR experience", "Strong business acumen", "Experience with HRIS systems"]', '["Employee Relations", "Performance Management", "HR Analytics", "Change Management"]', 'EMP003', 'open', '2025-12-20', '2026-01-20');

-- Insert Interview Stages for Senior Software Engineer
INSERT INTO interview_stages (job_id, stage_name, stage_order, stage_type, duration_minutes, is_mandatory) VALUES
(1, 'Phone Screening', 1, 'phone_screen', 30, TRUE),
(1, 'Technical Assessment', 2, 'technical', 90, TRUE),
(1, 'System Design Round', 3, 'technical', 60, TRUE),
(1, 'Behavioral Interview', 4, 'behavioral', 45, TRUE),
(1, 'HR Discussion', 5, 'hr', 30, TRUE),
(1, 'Final Round with Director', 6, 'final', 45, FALSE);

-- Insert Sample Candidates
INSERT INTO candidates (job_id, first_name, last_name, email, phone, current_company, current_title, experience_years, expected_salary, notice_period, source, skills, status, ai_match_score) VALUES
(1, 'Arjun', 'Patel', 'arjun.patel@email.com', '+91-9876543210', 'TechCorp India', 'Software Engineer', 6, 3200000, 30, 'linkedin', '["Node.js", "Python", "AWS", "Docker", "PostgreSQL", "MongoDB"]', 'shortlisted', 85.5),
(1, 'Meera', 'Sharma', 'meera.sharma@email.com', '+91-9876543211', 'Digital Solutions', 'Senior Developer', 7, 3500000, 60, 'referral', '["Java", "Spring Boot", "Kubernetes", "AWS", "Microservices"]', 'interviewing', 78.2),
(1, 'Vikram', 'Singh', 'vikram.singh@email.com', '+91-9876543212', 'StartupXYZ', 'Tech Lead', 8, 4000000, 45, 'indeed', '["Node.js", "React", "AWS", "Docker", "CI/CD", "System Design"]', 'new', 92.1),
(2, 'Priya', 'Reddy', 'priya.reddy@email.com', '+91-9876543213', 'ProductFirst', 'Associate PM', 4, 2800000, 30, 'linkedin', '["Product Strategy", "Agile", "Data Analysis", "User Research"]', 'screening', 81.0);

-- Insert Scheduled Interviews
INSERT INTO interviews (candidate_id, stage_id, interviewer_id, scheduled_date, scheduled_time, duration_minutes, meeting_link, status) VALUES
(1, 1, 'EMP001', '2025-12-27', '10:00:00', 30, 'https://meet.company.com/interview-123', 'scheduled'),
(2, 2, 'EMP001', '2025-12-26', '14:00:00', 90, 'https://meet.company.com/interview-456', 'confirmed');

-- Insert Performance Goals for existing employees
INSERT INTO performance_goals (emp_id, cycle_id, goal_title, goal_description, goal_type, category, target_metric, target_value, weight_percentage, status, due_date) VALUES
('EMP001', 1, 'Deliver Q4 Features', 'Complete all assigned features for Q4 release on time', 'individual', 'Delivery', 'Features Completed', 8, 30, 'in_progress', '2025-12-31'),
('EMP001', 1, 'Code Quality Improvement', 'Reduce bug count in owned modules by 25%', 'individual', 'Quality', 'Bug Reduction %', 25, 20, 'in_progress', '2025-12-31'),
('EMP001', 1, 'Mentor Junior Developers', 'Conduct weekly code reviews and mentoring sessions', 'individual', 'Leadership', 'Sessions Conducted', 48, 20, 'in_progress', '2025-12-31'),
('EMP001', 1, 'Technical Documentation', 'Document all APIs and system architecture', 'individual', 'Documentation', 'Docs Completed', 10, 15, 'approved', '2025-12-31'),
('EMP001', 1, 'Learn New Technology', 'Complete Kubernetes certification', 'individual', 'Learning', 'Certification', 1, 15, 'in_progress', '2025-12-31'),
('EMP002', 1, 'Revenue Target', 'Achieve quarterly sales target', 'individual', 'Sales', 'Revenue (Lakhs)', 50, 40, 'in_progress', '2025-12-31'),
('EMP002', 1, 'Customer Retention', 'Maintain 95% customer retention rate', 'individual', 'Customer Success', 'Retention %', 95, 30, 'in_progress', '2025-12-31'),
('EMP002', 1, 'New Client Acquisition', 'Onboard 5 new enterprise clients', 'individual', 'Sales', 'New Clients', 5, 30, 'in_progress', '2025-12-31');

-- Insert a new employee for onboarding demo
INSERT INTO employees (emp_id, full_name, email, department, position, manager_id, hire_date, employment_type) VALUES
('EMP010', 'Amit Kumar', 'amit.kumar@company.com', 'Engineering', 'Software Engineer', 'EMP001', '2025-12-26', 'full-time');

-- Start onboarding for new employee
INSERT INTO employee_onboarding (emp_id, workflow_id, start_date, expected_completion, status, progress_percentage, assigned_buddy, assigned_hr) VALUES
('EMP010', 1, '2025-12-26', '2026-01-25', 'in_progress', 20, 'EMP001', 'EMP003');

-- Insert onboarding task progress
INSERT INTO onboarding_task_progress (onboarding_id, task_id, emp_id, status, started_at, completed_at, completed_by) VALUES
(1, 1, 'EMP010', 'completed', '2025-12-26 09:00:00', '2025-12-26 09:30:00', 'EMP010'),
(1, 2, 'EMP010', 'completed', '2025-12-26 09:30:00', '2025-12-26 10:00:00', 'EMP010'),
(1, 3, 'EMP010', 'completed', '2025-12-26 10:00:00', '2025-12-26 11:00:00', 'EMP010'),
(1, 4, 'EMP010', 'in_progress', '2025-12-26 11:00:00', NULL, NULL),
(1, 5, 'EMP010', 'pending', NULL, NULL, NULL),
(1, 6, 'EMP010', 'pending', NULL, NULL, NULL),
(1, 7, 'EMP010', 'pending', NULL, NULL, NULL),
(1, 8, 'EMP010', 'pending', NULL, NULL, NULL);

-- Insert leave balances for new employee
INSERT INTO leave_balances (emp_id, leave_type, total_entitled, used_so_far, fiscal_year) VALUES
('EMP010', 'Sick Leave', 10, 0, 2025),
('EMP010', 'Annual Leave', 15, 0, 2025),
('EMP010', 'Emergency Leave', 3, 0, 2025);
