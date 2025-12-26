import csv
import os
import random
import datetime
import uuid

# Configuration
OUTPUT_DIR = r"C:\xampp\htdocs\Company\training_data"
ROWS_PER_FILE = 100000

# Ensure directory exists
if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

print(f"Generating training data in {OUTPUT_DIR}...")

# ------------------------------------------------------------------
# 1. Onboarding AI Data Generator
# ------------------------------------------------------------------
def generate_onboarding_data():
    filename = os.path.join(OUTPUT_DIR, "onboarding_training_data.csv")
    print(f"Generating {ROWS_PER_FILE} records for Onboarding AI...")
    
    headers = ["input", "output", "category", "risk_level", "complexity"]
    
    # Templates for variety
    scenarios = [
        ("New employee {name} needs onboarding for {role}", "Initiating onboarding sequence for {name}. Role: {role}. Preparing document checklist.", "initiation"),
        ("Upload document {doc_type} for {name}", "Receiving {doc_type} for {name}. Verifying format and clarity...", "document_processing"),
        ("What is the status of {name}?", "Current status for {name}: {percent}% complete. Pending: {pending_item}.", "status_check"),
        ("Schedule orientation for {name}", "Orientation scheduled for {date} at {time}. Calendar invite sent.", "scheduling"),
        ("Assign mentor to {name}", "Mentor assigned: {mentor}. Introduction email scheduled.", "mentor_assignment"),
        ("Missing {doc_type} for user {id}", "Alert: {doc_type} is missing. Automatic reminder sent to user {id}.", "error_handling"),
        ("Employee {name} is stuck at step {step}", "Detected bottleneck at {step}. Escalating to HR manager for review.", "escalation")
    ]
    
    roles = ["Developer", "Designer", "Manager", "HR Specialist", "Sales Exec", "DevOps Engineer"]
    docs = ["Passport", "Tax Form", "Degree Certificate", "Bank Statement", "ID Card", "Signed Contract"]
    edge_inputs = ["", "   ", "undefined", "NULL", "123456", "DROP TABLE users;", "System.exit(0)", "admin access pls"]
    
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        
        for i in range(ROWS_PER_FILE):
            # 5% edge cases
            if random.random() < 0.05:
                inp = random.choice(edge_inputs)
                out = "Error: Invalid input format detected. Please provide valid onboarding data."
                cat = "edge_case"
                risk = "high"
                comp = "N/A"
            else:
                template = random.choice(scenarios)
                name = f"User_{random.randint(1000, 9999)}"
                role = random.choice(roles)
                doc = random.choice(docs)
                mentor = f"Mentor_{random.randint(100, 999)}"
                
                # Generate common ID
                user_id = uuid.uuid4()
                
                # Prepare all possible variables
                user_id = uuid.uuid4()
                params = {
                    "name": name,
                    "role": role,
                    "doc_type": doc,
                    "id": user_id,
                    "step": "Verification",
                    "percent": random.randint(10, 90),
                    "pending_item": doc,
                    "date": "Monday",
                    "time": "10:00 AM",
                    "mentor": mentor
                }
                
                try:
                    inp = template[0].format(**params)
                    out = template[1].format(**params)
                except KeyError as e:
                    print(f"KeyError: {e} in template: {template}")
                    continue
                
                cat = template[2]
                risk = "low" if cat in ["status_check", "scheduling"] else "medium"
                comp = str(random.randint(1, 10))
            
            writer.writerow([inp, out, cat, risk, comp])

# ------------------------------------------------------------------
# 2. Leaves Manager Data Generator
# ------------------------------------------------------------------
def generate_leaves_data():
    filename = os.path.join(OUTPUT_DIR, "leaves_training_data.csv")
    print(f"Generating {ROWS_PER_FILE} records for Leaves Manager...")
    
    headers = ["request_text", "employee_id", "leave_type", "duration", "decision", "reasoning", "policy_check"]
    
    leave_types = ["Sick Leave", "Casual Leave", "Annual Leave", "Maternity Leave", "Unpaid Leave"]
    reasons = [
        "not feeling well", "family emergency", "vacation to Bali", "doctor appointment", 
        "high fever", "wedding attendance", "personal matter", "burnout"
    ]
    
    # Edge cases for dates and reasons
    edge_dates = ["tomorrow until yesterday", "32nd Jan", "forever", "NULL", "2020-01-01"]
    
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        
        for i in range(ROWS_PER_FILE):
            emp_id = f"EMP{random.randint(1000, 9999)}"
            l_type = random.choice(leave_types)
            
            # 10% Edge cases (Policy violations, bad dates)
            if random.random() < 0.10:
                req_text = f"I want leave from {random.choice(edge_dates)}"
                duration = "-1 days"
                decision = "Rejected"
                reasoning = "Invalid date range or formatting detected."
                policy = "Date Validation Failed"
            # 15% Edge cases (Insufficient Balance)
            elif random.random() < 0.15:
                req_text = f"Need {random.randint(30, 60)} days off for {random.choice(reasons)}"
                duration = "30+ days"
                decision = "Rejected"
                reasoning = "Insufficient leave balance."
                policy = "Balance Check Failed"
            else:
                days = random.randint(1, 14)
                req_text = f"Requesting {l_type} for {days} days due to {random.choice(reasons)}"
                duration = f"{days} days"
                decision = "Approved" if days < 10 else "Pending Review"
                reasoning = "Policy met. Team capacity is sufficient." if decision == "Approved" else "Requires Manager Approval for long duration."
                policy = "Passed"

            writer.writerow([req_text, emp_id, l_type, duration, decision, reasoning, policy])

# ------------------------------------------------------------------
# 3. Support Bot Data Generator
# ------------------------------------------------------------------
def generate_support_data():
    filename = os.path.join(OUTPUT_DIR, "chatbot_training_data.csv")
    print(f"Generating {ROWS_PER_FILE} records for Support Bot...")
    
    headers = ["user_query", "intent", "bot_response", "sentiment"]
    
    intents = {
        "reset_password": ["forgot password", "reset my login", "cant sign in", "password help"],
        "policy_query": ["what is the dress code", "remote work policy", "holiday list", "insurance benefits"],
        "it_support": ["wifi not working", "laptop crashed", "need software license", "printer issue"],
        "hr_contact": ["speak to hr", "contact payroll", "manager complaint", "grievance"]
    }
    
    sentiment_words = ["angry", "frustrated", "urgent", "thanks", "please", "help"]
    
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        
        for i in range(ROWS_PER_FILE):
            intent_key = random.choice(list(intents.keys()))
            query_base = random.choice(intents[intent_key])
            
            # Add noise/complexity
            if random.random() < 0.3:
                query = f"{query_base} and {random.choice(['its urgent', 'checking again', 'please help'])}"
            else:
                query = query_base
                
            # Edge cases
            if random.random() < 0.05:
                query = random.choice(["undefined", "???", "...", "sudo rm -rf"])
                intent_key = "unknown"
                response = "I couldn't understand that. Could you rephrase?"
                sentiment = "neutral"
            else:
                response = f"Simulated response for {intent_key}. Redirecting to relevant module."
                sentiment = "positive" if "thanks" in query or "please" in query else "neutral"

            writer.writerow([query, intent_key, response, sentiment])

# ------------------------------------------------------------------
# 4. Recruitment AI Data Generator
# ------------------------------------------------------------------
def generate_recruitment_data():
    filename = os.path.join(OUTPUT_DIR, "recruitment_training_data.csv")
    print(f"Generating {ROWS_PER_FILE} records for Recruitment AI...")
    
    headers = ["candidate_profile_json", "job_description", "match_score", "missing_skills", "hiring_recommendation"]
    
    skills_pool = ["Python", "React", "Vue", "Laravel", "Docker", "AWS", "JIRA", "Kubernetes", "SQL", "NoSQL"]
    
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        
        for i in range(ROWS_PER_FILE):
            candidate_skills = random.sample(skills_pool, k=random.randint(1, 6))
            required_skills = random.sample(skills_pool, k=random.randint(3, 5))
            
            # Simple matching logic simulation
            matches = set(candidate_skills).intersection(required_skills)
            score = (len(matches) / len(required_skills)) * 100
            
            missing = list(set(required_skills) - set(candidate_skills))
            
            rec = "Strong Hire" if score > 80 else ("Consider" if score > 50 else "Reject")
            
            # Edge case: Empty profile or Overqualified (100% match + output error)
            if random.random() < 0.02:
                profile = "{}"
                rec = "Error: Empty Profile"
                score = 0
            else:
                profile = f"{{'skills': {candidate_skills}, 'exp': {random.randint(1,15)}}}"

            writer.writerow([profile, f"Req: {required_skills}", f"{score:.1f}", str(missing), rec])

if __name__ == "__main__":
    generate_onboarding_data()
    generate_leaves_data()
    generate_support_data()
    generate_recruitment_data()
    print("All training data generated successfully.")
