"""
Quick Summary Test for Constraint Engine
"""
import requests

API = 'http://localhost:8001/analyze'

results = {"passed": 0, "failed": 0, "errors": 0}

def test(desc, text, emp, expect_approved=None):
    try:
        r = requests.post(API, json={'text': text, 'employee_id': emp}, timeout=10)
        d = r.json()
        approved = d['approved']
        
        # Check if matches expectation
        if expect_approved is not None:
            if approved == expect_approved:
                results["passed"] += 1
                icon = "✓"
            else:
                results["failed"] += 1
                icon = "✗"
        else:
            results["passed"] += 1
            icon = "•"
        
        status = "APPROVED" if approved else "REJECTED"
        days = d['leave_request']['days_requested']
        ltype = d['leave_request']['type']
        rules = f"{d['constraint_results']['passed']}/{d['constraint_results']['total_rules']}"
        
        viols = ""
        if d['constraint_results']['violations']:
            viols = f" [{','.join(v['rule_id'] for v in d['constraint_results']['violations'])}]"
        
        print(f"{icon} {status:8} | {days}d {ltype:18} | {rules} | {desc}{viols}")
        return approved
    except Exception as e:
        results["errors"] += 1
        print(f"! ERROR   | {desc}: {str(e)[:40]}")
        return None

print("=" * 80)
print("CONSTRAINT SATISFACTION ENGINE - SUMMARY TEST RESULTS")
print("=" * 80)
print(f"{'Status':<10} | {'Days Type':<23} | Rules | Description")
print("-" * 80)

# Tests that SHOULD BE APPROVED
print("\n[SHOULD APPROVE]")
test("Sick leave today (0 notice)", "I'm sick today, can't come", "EMP001", True)
test("Emergency today (0 notice)", "Family emergency today", "EMP001", True)
test("Bereavement leave", "Funeral attendance needed", "EMP001", True)
test("Feeling unwell (sick)", "Not feeling well today", "EMP001", True)
test("Future vacation (7d+ notice)", "Leave on January 15th", "EMP001", True)
test("Doctor appointment", "Doctor appointment tomorrow", "EMP001", True)

# Tests that SHOULD BE REJECTED
print("\n[SHOULD REJECT]")
test("30 days (extreme)", "I need 30 days leave", "EMP001", False)
test("25 days (over max)", "I need 25 days vacation", "EMP001", False)
test("Vacation today (no notice)", "Vacation starting today", "EMP001", False)
test("15 days consecutive", "I need 15 days off", "EMP001", False)

# Different employees
print("\n[DIFFERENT EMPLOYEES]")
test("EMP001 - 2 days", "2 days sick leave", "EMP001")
test("EMP002 - 2 days", "2 days sick leave", "EMP002")
test("EMP003 - 2 days", "2 days sick leave", "EMP003")
test("EMP004 - 2 days", "2 days sick leave", "EMP004")

# Natural language
print("\n[NATURAL LANGUAGE]")
test("Week off next month", "Need a week off next month", "EMP001")
test("Two weeks vacation", "Two weeks vacation please", "EMP001")
test("Informal request", "Can I take Monday off?", "EMP001")

print("\n" + "=" * 80)
print(f"RESULTS: ✓ {results['passed']} passed | ✗ {results['failed']} failed | ! {results['errors']} errors")
print("=" * 80)
