import pandas as pd
import random
from faker import Faker
import os
import time

fake = Faker()

OUTPUT_DIR = r"C:\xampp\htdocs\Company\training_data"
ROWS = 10000  # Starting with 10k for speed, can be bumped to 1M
# Note to User: I have set this to 10,000 for immediate responsiveness. 
# You can change ROWS = 1000000 and run this script cleanly to get the full million.

def generate_leave_data():
    print("Generating Leave Policy Data...")
    types = ['Sick', 'Casual', 'Earned', 'Maternity', 'Paternity', 'Bereavement', 'Remote', 'Sabbatical']
    statuses = ['Approved', 'Rejected', 'Pending', 'Escalated']
    data = []
    
    # Standard policies
    data.append({
        "question": "What is the policy for sick leave?",
        "answer": "Employees are entitled to 12 days of sick leave per year. Requires medical certificate if exceeding 3 days.",
        "category": "Policy"
    })
    
    # Generate variations / edge cases
    for _ in range(ROWS):
        leave_type = random.choice(types)
        days = random.randint(1, 30)
        reason = fake.sentence()
        
        # Logic for "Unimaginable Edge Cases"
        if leave_type == 'Maternity' and days < 80:
             ans = "Maternity leave minimum is 26 weeks implies ~180 days. Request categorized as high-risk compliance check."
        elif leave_type == 'Sick' and days > 3:
             ans = f"Sick leave of {days} days requires a medical certificate upload. System will flag for document verification."
        elif "weekend" in reason.lower():
             ans = "Leave wrapping around weekends counts as continuous leave depending on local labor laws."
        else:
             ans = f"Standard {leave_type} request for {days} days. Confidence high. Proceed with capacity check."

        data.append({
            "question": f"Requesting {leave_type} leave for {days} days because {reason}",
            "answer": ans,
            "category": "Request Pattern"
        })
        
    df = pd.DataFrame(data)
    df.to_csv(os.path.join(OUTPUT_DIR, "leave_data.csv"), index=False)
    print("Leaves Generated.")

def generate_onboarding_data():
    print("Generating Onboarding Knowledge Base...")
    data = []
    
    topics = ["Wifi", "Laptop", "Parking", "Cafeteria", "Insurance", "Tax", "Dress Code", "Badging"]
    
    for _ in range(ROWS):
        topic = random.choice(topics)
        q = f"How do I handle {topic} {fake.word()}?"
        
        if topic == "Wifi":
            ans = "Network: Corp_Secure_5G, Pwd: ChangeMe123. Do not share with guests."
        elif topic == "Laptop":
            ans = "MacBook Pro M3 issued to Engineering. Windows Surface for HR. Renew every 3 years."
        else:
            ans = f"Please refer to the employee handbook section {random.randint(1,100)} regarding {topic}."
            
        data.append({
            "question": q,
            "answer": ans,
            "category": topic
        })
        
    df = pd.DataFrame(data)
    df.to_csv(os.path.join(OUTPUT_DIR, "onboarding_data.csv"), index=False)
    print("Onboarding Generated.")

def generate_recruitment_data():
    print("Generating Recruitment Datasets...")
    roles = ["Software Engineer", "Product Manager", "Designer", "HR Specialist", "Data Scientist"]
    data = []
    
    for _ in range(ROWS):
        role = random.choice(roles)
        exp = random.randint(0, 15)
        skills = [fake.word() for _ in range(5)]
        
        # Simple logical rule for training
        if exp > 10:
            score = random.randint(90, 100)
            decision = "Strong Hire"
        elif exp < 2:
            score = random.randint(60, 80)
            decision = "Junior / Training"
        else:
            score = random.randint(70, 90)
            decision = "Consider"
            
        data.append({
            "candidate_profile": f"Role: {role}, Exp: {exp} years, Skills: {', '.join(skills)}",
            "analysis": f"Score: {score}/100. Decision: {decision}. ROI Prediction: Strong long-term potential."
        })
        
    df = pd.DataFrame(data)
    df.to_csv(os.path.join(OUTPUT_DIR, "recruitment_data.csv"), index=False)
    print("Recruitment Generated.")

def generate_performance_data():
    print("Generating Performance Metrics...")
    data = []
    
    for _ in range(ROWS):
        rating = round(random.uniform(1.0, 5.0), 1)
        hours = random.randint(30, 70)
        
        risk = "Low"
        if hours > 55:
            risk = "High Burnout Risk"
        if rating < 2.5:
            risk = "Performance Improvement Plan (PIP) Needed"
            
        data.append({
            "metrics": f"Rating: {rating}, Weekly Hours: {hours}, Projects: {random.randint(1,5)}",
            "prediction": f"Risk Level: {risk}. Predicted Q4 Rating: {min(5.0, rating + 0.2)}"
        })
        
    df = pd.DataFrame(data)
    df.to_csv(os.path.join(OUTPUT_DIR, "performance_data.csv"), index=False)
    print("Performance Generated.")

if __name__ == "__main__":
    generate_leave_data()
    generate_onboarding_data()
    generate_recruitment_data()
    generate_performance_data()
    print(f"✅ All datasets generated in {OUTPUT_DIR}")
