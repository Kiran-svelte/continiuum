# CONSTRAINTS ENGINE - Replaces RAG completely
# No PDFs, no vector databases, just math

from datetime import datetime, timedelta
import json

class ConstraintSolver:
    def __init__(self):
        # Your "policy knowledge" - hardcoded as constraints
        self.constraints = {
            # Team coverage rules
            'min_daily_coverage': 2,  # At least 2 people must be present
            'max_concurrent_leave': 2,  # Max 2 people off same day
            
            # Leave type priorities (higher = more important)
            'priorities': {
                'sick': 3.0,
                'emergency': 2.5,
                'bereavement': 2.5,
                'maternity': 2.0,
                'paternity': 2.0,
                'vacation': 1.0,
                'personal': 1.0
            },
            
            # Blackout dates (no leaves allowed)
            'blackout_dates': [
                '2024-12-25',  # Christmas
                '2024-12-31',  # Year end
                '2024-04-10'   # Company event
            ],
            
            # Notice periods (days in advance required)
            'notice_required': {
                'sick': 0,      # Can take immediately
                'emergency': 0,
                'vacation': 2,  # 2 days notice
                'personal': 1   # 1 day notice
            }
        }
    
    def solve_leave_request(self, employee_data, team_state):
        """
        Solves if leave should be approved using constraint satisfaction
        """
        violations = []
        
        # CONSTRAINT 1: Check blackout dates
        if employee_data['date'] in self.constraints['blackout_dates']:
            violations.append(f"Blackout date: {employee_data['date']}")
        
        # CONSTRAINT 2: Check notice period
        notice_days = self.days_until(employee_data['date'])
        required_notice = self.constraints['notice_required'].get(employee_data['type'], 0)
        if notice_days < required_notice:
            violations.append(f"Need {required_notice} days notice, only {notice_days} given")
        
        # CONSTRAINT 3: Check team coverage
        if not self.check_team_coverage(employee_data, team_state):
            violations.append("Team would be understaffed")
        
        # CONSTRAINT 4: Check max concurrent leaves
        if not self.check_concurrent_limit(employee_data, team_state):
            violations.append("Too many people already on leave")
        
        # CONSTRAINT 5: Check leave balance
        if not self.check_balance(employee_data):
            violations.append(f"Insufficient {employee_data['type']} leave balance")
        
        # DECISION
        if violations:
            return {
                'approved': False,
                'violations': violations,
                'priority_score': self.constraints['priorities'].get(employee_data['type'], 1.0)
            }
        else:
            return {
                'approved': True,
                'priority_score': self.constraints['priorities'].get(employee_data['type'], 1.0),
                'message': self.generate_approval_message(employee_data)
            }
    
    def check_team_coverage(self, new_request, team_state):
        """Constraint: Minimum people must be present"""
        # Count how many would be present if this request is approved
        currently_present = team_state['total_team_size'] - team_state['already_on_leave']
        
        if new_request['employee_id'] in team_state['working_today']:
            currently_present -= 1  # This employee would be absent
        
        return currently_present >= self.constraints['min_daily_coverage']
    
    def check_concurrent_limit(self, new_request, team_state):
        """Constraint: Max people can be off simultaneously"""
        would_be_on_leave = team_state['already_on_leave']
        
        if new_request['employee_id'] not in team_state['on_leave_today']:
            would_be_on_leave += 1
        
        return would_be_on_leave <= self.constraints['max_concurrent_leave']
    
    def check_balance(self, employee_data):
        """Constraint: Employee has enough leave balance"""
        # In real system, fetch from database
        balances = {
            'vacation': 15,
            'sick': 10,
            'personal': 5
        }
        return balances.get(employee_data['type'], 0) > 0
    
    def days_until(self, date_str):
        """Calculate days until given date"""
        target_date = datetime.strptime(date_str, '%Y-%m-%d')
        today = datetime.now()
        return (target_date - today).days
    
    def generate_approval_message(self, employee_data):
        """Generate human-readable approval message"""
        messages = {
            'sick': "✅ Sick leave approved. Feel better soon!",
            'vacation': "✅ Vacation approved. Enjoy your time off!",
            'personal': "✅ Personal leave approved.",
            'emergency': "✅ Emergency leave approved."
        }
        return messages.get(employee_data['type'], "✅ Leave approved.")

# Singleton instance
constraint_solver = ConstraintSolver()