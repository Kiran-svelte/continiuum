from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta
import logging
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

class ConstraintEngine:
    def evaluate(self, data):
        start_time = datetime.now()
        violations = []
        suggestions = []
        
        # 1. Extract Data
        text = data.get('text', '').lower()
        employee_id = data.get('employee_id')
        extracted = data.get('extracted_info', {})
        team_state = data.get('team_state', {})
        balance = data.get('leave_balance', {})
        
        # 2. Rule Evaluation
        
        # RULE 006: Blackout Check
        blackout_periods = team_state.get('blackoutDates', [])
        for bp in blackout_periods:
            violations.append(f"Blackout Period: {bp['blackout_name']} ({bp['reason']})")

        # RULE 001: Minimum Team Coverage
        team_info = team_state.get('team', {})
        team_size = team_info.get('teamSize', 0)
        on_leave = team_info.get('alreadyOnLeave', 0)
        min_coverage = team_info.get('min_coverage', 3)
        
        # If this request is approved, how many will be present?
        would_be_present = team_size - (on_leave + 1)
        if would_be_present < min_coverage:
            violations.append(f"RULE001: Team coverage critical. Need {min_coverage} present, only {would_be_present} would remain.")
            suggestions.append("Try dates where other team members have returned.")

        # RULE 002: Max Concurrent Leave
        max_concurrent = team_info.get('max_concurrent_leave', 3)
        if (on_leave + 1) > max_concurrent:
            violations.append(f"RULE002: Max concurrent leave reached ({max_concurrent}).")

        # RULE 005: Sufficient Balance
        leave_type = extracted.get('type', 'vacation')
        remaining = balance.get('remaining', 0)
        duration = extracted.get('duration', 1)
        
        if remaining < duration:
            violations.append(f"RULE005: Insufficient {leave_type} balance. Requested {duration}, remaining {remaining}.")

        # RULE 003: Timing / Notice Period
        try:
            req_date = datetime.strptime(extracted['dates'][0], '%Y-%m-%d')
            notice_days = (req_date - datetime.now()).days
            if leave_type == 'vacation' and notice_days < 3:
                violations.append("RULE003: Vacation requires 3 days notice.")
        except:
            pass

        # RULE 007: Priority Override
        # If it's a sick leave, we might approve even with coverage violations
        is_sick = leave_type == 'sick'
        approved = len(violations) == 0
        
        if is_sick and any('RULE001' in v for v in violations):
            # Special logic for sick leave priority
            approved = True 
            violations = [v for v in violations if 'RULE001' not in v] # remove coverage violation
            message = "✅ Sick leave approved due to high priority, despite coverage warning. 🏥"
        elif approved:
            message = f"✅ Leave approved! Enjoy your {leave_type}. 🏖️"
        else:
            message = "❌ Request denied by Constraint Engine."

        if not approved and not suggestions:
            suggestions.append("Try shifting dates by 1 week.")
            suggestions.append("Contact your manager for manual override.")

        res_time = (datetime.now() - start_time).total_seconds() * 1000
        
        return {
            'approved': approved,
            'message': message,
            'violations': violations,
            'suggestions': suggestions,
            'alternative_dates': [(datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d')],
            'response_time_ms': round(res_time, 2),
            'engine': 'Python Deterministic Engine'
        }

engine = ConstraintEngine()

@app.route('/analyze', methods=['POST'])
def analyze():
    # Log incoming request payload for debugging
    with open('last_request.json', 'w') as f:
        json.dump(request.get_json(force=True), f, indent=2)
    # Existing evaluation
    result = engine.evaluate(request.get_json(force=True))
    return jsonify(result)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'engine': 'Constraint Satisfaction 1.0'})

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=8001)