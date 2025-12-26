"""
Comprehensive Edge Case Testing for Constraint Satisfaction Engine
"""
import requests
import json

API = 'http://localhost:8001/analyze'

def test(desc, text, emp):
    """Test a leave request"""
    try:
        r = requests.post(API, json={'text': text, 'employee_id': emp}, timeout=10)
        d = r.json()
        status = "APPROVED" if d['approved'] else "REJECTED"
        days = d['leave_request']['days_requested']
        ltype = d['leave_request']['type']
        passed = d['constraint_results']['passed']
        total = d['constraint_results']['total_rules']
        
        icon = "✓" if d['approved'] else "✗"
        print(f"  {icon} [{status:8}] {desc}")
        print(f"    Parsed: {days}d {ltype} | Rules: {passed}/{total}")
        
        if d['constraint_results']['violations']:
            viols = [v['rule_id'] for v in d['constraint_results']['violations']]
            print(f"    Failed: {viols}")
        print()
        return d
    except Exception as e:
        print(f"  ! [ERROR] {desc}: {str(e)[:60]}\n")
        return None

print("=" * 65)
print(" CONSTRAINT SATISFACTION ENGINE - COMPREHENSIVE EDGE CASE TESTS")
print("=" * 65)

# ========================================
print("\n[TEST GROUP 1] DURATION EDGE CASES")
print("-" * 40)
test("Minimum: 1 day", "I need 1 day off tomorrow", "EMP001")
test("Normal: 3 days", "I need 3 days vacation", "EMP001")
test("Normal: 5 days", "I need 5 days annual leave next week", "EMP001")
test("At limit: 10 consecutive", "I need 10 days vacation next month", "EMP001")
test("Over consecutive: 12 days", "I need 12 days leave", "EMP001")
test("At max: 20 days", "I need 20 days annual leave", "EMP001")
test("Over max: 25 days", "I need 25 days vacation", "EMP001")
test("Extreme: 30 days", "I need 30 days leave", "EMP001")

# ========================================
print("\n[TEST GROUP 2] LEAVE TYPE DETECTION")
print("-" * 40)
test("Sick Leave (fever)", "I have fever, need 2 days sick leave", "EMP001")
test("Sick Leave (doctor)", "Doctor appointment tomorrow", "EMP001")
test("Emergency Leave", "Family emergency, need today off", "EMP001")
test("Personal Leave", "Need personal day off tomorrow", "EMP001")
test("Annual/Vacation", "Going on vacation for 3 days", "EMP001")
test("Study Leave", "Have exams, need 3 days study leave", "EMP001")
test("Bereavement", "Funeral attendance, need bereavement leave", "EMP001")

# ========================================
print("\n[TEST GROUP 3] NOTICE PERIOD VALIDATION")
print("-" * 40)
test("Emergency (0 notice OK)", "Emergency! Need today off urgently", "EMP001")
test("Sick (0 notice OK)", "I'm sick today, can't come to work", "EMP001")
test("Vacation (needs 7d notice)", "Want vacation starting today", "EMP001")
test("Personal (needs 3d notice)", "Personal leave today please", "EMP001")
test("Study (needs 14d notice)", "Study leave starting tomorrow", "EMP001")

# ========================================
print("\n[TEST GROUP 4] NATURAL LANGUAGE PARSING")
print("-" * 40)
test("Informal request", "Can I take Monday off please?", "EMP001")
test("Week duration", "Need a week off next month", "EMP001")
test("Two weeks", "Planning two weeks vacation", "EMP001")
test("Specific date", "Leave on January 15th", "EMP001")
test("Date range", "Leave from Jan 10 to Jan 12", "EMP001")
test("Tomorrow keyword", "Taking tomorrow off", "EMP001")
test("Next Monday", "Off next Monday please", "EMP001")
test("Feeling unwell", "Not feeling well, taking day off", "EMP001")

# ========================================
print("\n[TEST GROUP 5] DIFFERENT EMPLOYEES")
print("-" * 40)
for i in range(1, 6):
    emp_id = f"EMP00{i}"
    test(f"Employee {emp_id}", "I need 2 days off next week", emp_id)

# ========================================
print("\n[TEST GROUP 6] BALANCE EDGE CASES")
print("-" * 40)
test("Within balance", "1 day sick leave tomorrow", "EMP001")
test("Large request", "10 days vacation next month", "EMP001")

# ========================================
print("\n[TEST GROUP 7] SPECIAL SCENARIOS")
print("-" * 40)
test("Half day (rounds to 1)", "Need half day off", "EMP001")
test("Multiple types mentioned", "Sick but also personal reasons, 2 days", "EMP001")
test("Vague request", "Need some time off soon", "EMP001")
test("Very long text", "Hi manager, I hope this message finds you well. I wanted to request some time off because I've been feeling quite exhausted lately and need 3 days to rest and recover.", "EMP001")

print("\n" + "=" * 65)
print(" EDGE CASE TESTING COMPLETE")
print("=" * 65)
