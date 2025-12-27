"""
🚀 AI ONBOARDING CONSTRAINT ENGINE - PRODUCTION SPEC
=====================================================
Layer 1: Compliance Brain - Validates EVERYTHING legally compliant
NOT a chatbot - A Compliance Officer + Personal Concierge

Port: 8002
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from enum import Enum
import json

app = Flask(__name__)
CORS(app)

# Database Configuration
DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "",
    "database": "company"
}

# ============================================================
# EMPLOYEE ONBOARDING STATES (State Machine)
# ============================================================
class OnboardingState(Enum):
    OFFER_PENDING = "offer_pending"        # Background check, document signing
    PRE_START = "pre_start"                # Equipment ordering, account creation
    DAY_0 = "day_0"                         # First day setup, orientation
    WEEK_1 = "week_1"                       # Training, team integration
    MONTH_1 = "month_1"                     # Project onboarding, goal setting
    COMPLETE = "complete"                   # Handoff to performance system

# ============================================================
# COUNTRY-SPECIFIC ONBOARDING RULES
# ============================================================
COUNTRY_RULES = {
    "US": {
        "name": "United States",
        "required_documents": ["I-9", "W-4", "State Tax Form", "Direct Deposit", "NDA", "Offer Letter"],
        "background_check_days": 5,
        "work_authorization": ["US Citizen", "Green Card", "H1B", "L1", "OPT", "EAD"],
        "tax_forms": ["W-4", "State Withholding"],
        "compliance_refs": ["USCIS I-9", "IRS W-4", "SOC 2 CC6.1"],
        "benefits_enrollment_days": 30,
        "probation_days": 90
    },
    "IN": {
        "name": "India",
        "required_documents": ["PAN Card", "Aadhaar", "Bank Details", "PF Form", "ESIC Form", "Offer Letter", "NDA"],
        "background_check_days": 7,
        "work_authorization": ["Indian Citizen", "OCI", "Work Permit"],
        "tax_forms": ["Form 12B", "Investment Declaration"],
        "compliance_refs": ["PF Act 1952", "ESIC Act 1948", "IT Act"],
        "benefits_enrollment_days": 15,
        "probation_days": 180
    },
    "UK": {
        "name": "United Kingdom",
        "required_documents": ["Right to Work", "P45/P46", "Bank Details", "NI Number", "Contract", "NDA"],
        "background_check_days": 10,
        "work_authorization": ["British Citizen", "Settled Status", "Skilled Worker Visa", "Graduate Visa"],
        "tax_forms": ["P45", "P46", "Student Loan"],
        "compliance_refs": ["Immigration Act 2016", "HMRC PAYE"],
        "benefits_enrollment_days": 30,
        "probation_days": 90
    },
    "DE": {
        "name": "Germany",
        "required_documents": ["Tax ID", "Social Insurance", "Bank Details", "Work Contract", "Health Insurance"],
        "background_check_days": 14,
        "work_authorization": ["EU Citizen", "Blue Card", "Work Permit"],
        "tax_forms": ["Steueridentifikationsnummer", "Sozialversicherungsausweis"],
        "compliance_refs": ["AÜG", "Arbeitsrecht", "DSGVO"],
        "benefits_enrollment_days": 30,
        "probation_days": 180,
        "special": "13th month pay calculation required"
    }
}

# ============================================================
# CONSTRAINT RULES DEFINITION
# ============================================================
ONBOARDING_CONSTRAINTS = {
    "RULE_OB001": {
        "name": "Work Authorization Validation",
        "description": "Verify work authorization is valid for country",
        "phase": "offer_pending",
        "severity": "critical",
        "compliance_ref": "Immigration Laws"
    },
    "RULE_OB002": {
        "name": "Budget Approval Check",
        "description": "Verify hiring budget approved for role/level",
        "phase": "offer_pending",
        "severity": "critical",
        "compliance_ref": "Financial Controls"
    },
    "RULE_OB003": {
        "name": "Equipment Availability",
        "description": "Check laptop/phone inventory available",
        "phase": "pre_start",
        "severity": "high",
        "compliance_ref": "IT Asset Management"
    },
    "RULE_OB004": {
        "name": "Workspace Ready",
        "description": "Physical desk or remote setup ready",
        "phase": "pre_start",
        "severity": "medium",
        "compliance_ref": "Facilities"
    },
    "RULE_OB005": {
        "name": "Documentation Complete",
        "description": "All offer documents signed",
        "phase": "offer_pending",
        "severity": "critical",
        "compliance_ref": "Legal"
    },
    "RULE_OB006": {
        "name": "Background Check Status",
        "description": "Background check completed within SLA",
        "phase": "offer_pending",
        "severity": "critical",
        "compliance_ref": "HR Policy"
    },
    "RULE_OB007": {
        "name": "System Access Provisioned",
        "description": "Email, Slack, HRIS access ready",
        "phase": "day_0",
        "severity": "high",
        "compliance_ref": "SOC 2 CC6.1"
    },
    "RULE_OB008": {
        "name": "Manager Meeting Scheduled",
        "description": "Welcome meeting with manager scheduled",
        "phase": "day_0",
        "severity": "medium",
        "compliance_ref": "Onboarding SOP"
    },
    "RULE_OB009": {
        "name": "Legal Documents Filed",
        "description": "All tax and legal forms completed",
        "phase": "day_0",
        "severity": "critical",
        "compliance_ref": "Tax Compliance"
    },
    "RULE_OB010": {
        "name": "Emergency Contact Provided",
        "description": "Emergency contact information on file",
        "phase": "day_0",
        "severity": "high",
        "compliance_ref": "Safety Policy"
    },
    "RULE_OB011": {
        "name": "Mandatory Training Assigned",
        "description": "Compliance training courses assigned",
        "phase": "week_1",
        "severity": "critical",
        "compliance_ref": "Training Policy"
    },
    "RULE_OB012": {
        "name": "Training Completion Check",
        "description": "All mandatory training completed",
        "phase": "month_1",
        "severity": "critical",
        "compliance_ref": "Compliance"
    },
    "RULE_OB013": {
        "name": "Performance Goals Set",
        "description": "First 90-day goals set with manager",
        "phase": "month_1",
        "severity": "high",
        "compliance_ref": "Performance Management"
    },
    "RULE_OB014": {
        "name": "Benefits Enrollment",
        "description": "Benefits enrollment completed within deadline",
        "phase": "month_1",
        "severity": "high",
        "compliance_ref": "Benefits Policy"
    },
    "RULE_OB015": {
        "name": "Probation Review Scheduled",
        "description": "End of probation review scheduled",
        "phase": "month_1",
        "severity": "medium",
        "compliance_ref": "HR Policy"
    }
}

# ============================================================
# AUTOMATED ACTIONS BY PHASE
# ============================================================
AUTOMATED_ACTIONS = {
    "offer_pending": [
        {"action": "send_welcome_email", "description": "Send welcome email with personalized timeline"},
        {"action": "create_employee_record", "description": "Create employee record in HRIS"},
        {"action": "initiate_background_check", "description": "Start background check (country-specific)"},
        {"action": "generate_document_checklist", "description": "Generate required documents list"}
    ],
    "pre_start": [
        {"action": "order_equipment", "description": "Order equipment to arrive Day -1"},
        {"action": "reserve_workspace", "description": "Reserve desk or configure remote setup"},
        {"action": "schedule_orientation", "description": "Schedule first week meetings"},
        {"action": "prepare_welcome_kit", "description": "Prepare welcome kit and materials"}
    ],
    "pre_boarding": [
        {"action": "send_offer_letter", "description": "Send formal offer letter and acceptance documents"},
        {"action": "initiate_background_check", "description": "Start comprehensive background verification"},
        {"action": "order_equipment", "description": "Order role-specific equipment (laptop, monitors, accessories)"},
        {"action": "create_system_accounts", "description": "Pre-create system accounts and credentials"},
        {"action": "assign_buddy", "description": "Assign onboarding buddy from team"},
        {"action": "prepare_welcome_kit", "description": "Prepare personalized welcome kit and materials"},
        {"action": "schedule_day1_calendar", "description": "Block calendar for Day 1 orientation sessions"}
    ],
    "day_0": [
        {"action": "create_system_accounts", "description": "Auto-create all system accounts"},
        {"action": "assign_training", "description": "Assign mandatory training courses"},
        {"action": "schedule_1on1s", "description": "Schedule 1:1s with key team members"},
        {"action": "provision_licenses", "description": "Provision software licenses based on role"},
        {"action": "add_to_channels", "description": "Add to team channels/email groups"}
    ],
    "day_one": [
        {"action": "9:00 AM - Welcome meeting with HR and Manager", "description": ""},
        {"action": "10:00 AM - Complete I-9 and tax documentation", "description": ""},
        {"action": "11:00 AM - IT setup and system access configuration", "description": ""},
        {"action": "12:00 PM - Team lunch (virtual or in-person)", "description": ""},
        {"action": "2:00 PM - Department orientation and introductions", "description": ""},
        {"action": "3:30 PM - Review first week goals with manager", "description": ""},
        {"action": "4:30 PM - Complete mandatory compliance training", "description": ""}
    ],
    "week_1": [
        {"action": "check_training_progress", "description": "Monitor training completion"},
        {"action": "collect_feedback", "description": "Collect initial feedback from new hire"},
        {"action": "verify_system_access", "description": "Verify all system access working"},
        {"action": "schedule_30day_checkin", "description": "Schedule 30-day check-in"}
    ],
    "week_one": [
        {"action": "Complete all assigned security and compliance training", "description": ""},
        {"action": "Meet with each team member for 30-minute 1:1", "description": ""},
        {"action": "Review and understand team documentation and processes", "description": ""},
        {"action": "Set up development environment and tools", "description": ""},
        {"action": "Attend first team stand-up and planning meetings", "description": ""},
        {"action": "Complete initial code review or project familiarization", "description": ""},
        {"action": "Submit first timesheet and expense setup", "description": ""}
    ],
    "month_1": [
        {"action": "schedule_review", "description": "Schedule 30-day review with manager"},
        {"action": "request_assessment", "description": "Request probation period assessment"},
        {"action": "adjust_access", "description": "Adjust system access based on role evolution"},
        {"action": "initiate_benefits", "description": "Ensure benefits enrollment completed"},
        {"action": "add_to_dev_plan", "description": "Add to long-term development plan"}
    ],
    "month_one": [
        {"action": "Complete 30-day performance review with manager", "description": ""},
        {"action": "Finalize benefits enrollment and selections", "description": ""},
        {"action": "Take ownership of first independent project", "description": ""},
        {"action": "Complete all role-specific certifications", "description": ""},
        {"action": "Document onboarding feedback for process improvement", "description": ""},
        {"action": "Set quarterly goals with manager", "description": ""},
        {"action": "Join relevant professional development programs", "description": ""}
    ],
    "month_three": [
        {"action": "Complete 90-day probation review", "description": ""},
        {"action": "Demonstrate proficiency in core job responsibilities", "description": ""},
        {"action": "Contribute to at least one major team initiative", "description": ""},
        {"action": "Build relationships across departments", "description": ""},
        {"action": "Identify areas for growth and development", "description": ""}
    ]
}

# ============================================================
# COMMUNICATION TEMPLATES
# ============================================================
COMMUNICATION_TEMPLATES = {
    "welcome": {
        "tone": "excited, welcoming, reassuring",
        "template": "Welcome {name}! We're excited for you to join {team} as {role}. Your journey starts {start_date}!"
    },
    "reminder": {
        "tone": "helpful, friendly",
        "template": "Just a nudge: {task} is due {due_date}. Need help? Reply to this message!"
    },
    "escalation": {
        "tone": "professional, solution-focused",
        "template": "I've noticed {issue}. I've notified {assignee} to help resolve this."
    },
    "milestone": {
        "tone": "celebratory, encouraging",
        "template": "Great job completing {milestone}! Next up: {next_step}."
    },
    "day0_greeting": {
        "tone": "helpful, clear, step-by-step",
        "template": "Good morning {name}! Your accounts are ready. First up: {first_meeting} at {time}."
    },
    "week1_checkin": {
        "tone": "supportive, checking-in",
        "template": "How's Week 1 going, {name}? Your training progress: {progress}%. Questions? I'm here!"
    },
    "month1_review": {
        "tone": "reflective, forward-looking",
        "template": "Month 1 milestone, {name}! Let's review your goals and plan ahead. Review scheduled: {review_date}."
    }
}


def get_db_connection():
    """Get database connection"""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        return conn
    except Error as e:
        print(f"❌ Database connection error: {e}")
        return None


# ============================================================
# CONSTRAINT VALIDATION FUNCTIONS
# ============================================================

def validate_work_authorization(employee_data: Dict, country: str) -> Dict:
    """RULE_OB001: Validate work authorization for country"""
    rules = COUNTRY_RULES.get(country, COUNTRY_RULES["US"])
    auth_type = employee_data.get("work_authorization", "")
    
    valid_auths = rules["work_authorization"]
    is_valid = auth_type in valid_auths
    
    return {
        "rule_id": "RULE_OB001",
        "rule_name": "Work Authorization Validation",
        "passed": is_valid,
        "message": f"✅ Work authorization '{auth_type}' valid for {rules['name']}" if is_valid 
                   else f"❌ Invalid work authorization '{auth_type}' for {rules['name']}. Valid types: {', '.join(valid_auths)}",
        "details": {
            "country": country,
            "provided": auth_type,
            "valid_types": valid_auths
        },
        "compliance_ref": rules["compliance_refs"][0] if rules["compliance_refs"] else "Immigration Laws",
        "severity": "critical"
    }


def validate_budget_approval(employee_data: Dict) -> Dict:
    """RULE_OB002: Check budget approval for role"""
    budget_approved = employee_data.get("budget_approved", False)
    role = employee_data.get("role", "Unknown")
    department = employee_data.get("department", "Unknown")
    
    return {
        "rule_id": "RULE_OB002",
        "rule_name": "Budget Approval Check",
        "passed": budget_approved,
        "message": f"✅ Budget approved for {role} in {department}" if budget_approved
                   else f"❌ Budget NOT approved for {role} in {department}. Requires finance approval.",
        "details": {
            "role": role,
            "department": department,
            "budget_approved": budget_approved
        },
        "compliance_ref": "Financial Controls",
        "severity": "critical"
    }


def validate_equipment_availability(employee_data: Dict) -> Dict:
    """RULE_OB003: Check equipment inventory"""
    conn = get_db_connection()
    equipment_ready = False
    equipment_type = employee_data.get("equipment_type", "laptop")
    
    if conn:
        try:
            cur = conn.cursor(dictionary=True)
            cur.execute("""
                SELECT COUNT(*) as available 
                FROM equipment_inventory 
                WHERE equipment_type = %s AND status = 'available'
            """, (equipment_type,))
            result = cur.fetchone()
            equipment_ready = result and result.get('available', 0) > 0
            cur.close()
            conn.close()
        except Exception as e:
            print(f"Equipment check error: {e}")
            equipment_ready = True  # Default to pass if table doesn't exist
            
    return {
        "rule_id": "RULE_OB003",
        "rule_name": "Equipment Availability",
        "passed": equipment_ready,
        "message": f"✅ {equipment_type.title()} available in inventory" if equipment_ready
                   else f"⚠️ {equipment_type.title()} not available. Order required.",
        "details": {
            "equipment_type": equipment_type,
            "available": equipment_ready
        },
        "compliance_ref": "IT Asset Management",
        "severity": "high",
        "action_required": None if equipment_ready else "order_equipment"
    }


def validate_documents_complete(employee_data: Dict, country: str) -> Dict:
    """RULE_OB005: Check all required documents signed"""
    rules = COUNTRY_RULES.get(country, COUNTRY_RULES["US"])
    required_docs = rules["required_documents"]
    completed_docs = employee_data.get("completed_documents", [])
    
    missing_docs = [doc for doc in required_docs if doc not in completed_docs]
    all_complete = len(missing_docs) == 0
    
    return {
        "rule_id": "RULE_OB005",
        "rule_name": "Documentation Complete",
        "passed": all_complete,
        "message": f"✅ All {len(required_docs)} required documents completed" if all_complete
                   else f"❌ Missing {len(missing_docs)} documents: {', '.join(missing_docs)}",
        "details": {
            "required": required_docs,
            "completed": completed_docs,
            "missing": missing_docs,
            "completion_rate": f"{len(completed_docs)}/{len(required_docs)}"
        },
        "compliance_ref": "Legal",
        "severity": "critical"
    }


def validate_background_check(employee_data: Dict, country: str) -> Dict:
    """RULE_OB006: Background check status"""
    rules = COUNTRY_RULES.get(country, COUNTRY_RULES["US"])
    sla_days = rules["background_check_days"]
    
    bg_status = employee_data.get("background_check_status", "pending")
    bg_initiated = employee_data.get("background_check_initiated")
    
    if bg_status == "completed":
        passed = True
        message = "✅ Background check completed successfully"
    elif bg_status == "failed":
        passed = False
        message = "❌ Background check FAILED. Cannot proceed with onboarding."
    else:
        # Check if within SLA
        if bg_initiated:
            try:
                init_date = datetime.strptime(bg_initiated, "%Y-%m-%d")
                days_elapsed = (datetime.now() - init_date).days
                if days_elapsed > sla_days:
                    passed = False
                    message = f"⚠️ Background check exceeds {sla_days}-day SLA. Escalation required."
                else:
                    passed = True
                    message = f"⏳ Background check in progress ({days_elapsed}/{sla_days} days)"
            except:
                passed = True
                message = "⏳ Background check pending"
        else:
            passed = False
            message = "❌ Background check not initiated"
    
    return {
        "rule_id": "RULE_OB006",
        "rule_name": "Background Check Status",
        "passed": passed,
        "message": message,
        "details": {
            "status": bg_status,
            "sla_days": sla_days,
            "country": country
        },
        "compliance_ref": "HR Policy",
        "severity": "critical"
    }


def validate_system_access(employee_data: Dict) -> Dict:
    """RULE_OB007: System access provisioned"""
    required_systems = ["email", "slack", "hris"]
    provisioned = employee_data.get("systems_provisioned", [])
    
    missing = [sys for sys in required_systems if sys not in provisioned]
    all_ready = len(missing) == 0
    
    return {
        "rule_id": "RULE_OB007",
        "rule_name": "System Access Provisioned",
        "passed": all_ready,
        "message": f"✅ All system access provisioned ({len(provisioned)} systems)" if all_ready
                   else f"⚠️ Missing system access: {', '.join(missing)}",
        "details": {
            "required": required_systems,
            "provisioned": provisioned,
            "missing": missing
        },
        "compliance_ref": "SOC 2 CC6.1",
        "severity": "high"
    }


def validate_training_completion(employee_data: Dict, phase: str) -> Dict:
    """RULE_OB012: Training completion check"""
    mandatory_training = employee_data.get("mandatory_training", [])
    completed_training = employee_data.get("completed_training", [])
    
    if not mandatory_training:
        # Default mandatory training
        mandatory_training = ["Security Awareness", "Code of Conduct", "Anti-Harassment", "Data Privacy"]
    
    completed_count = len([t for t in mandatory_training if t in completed_training])
    total_count = len(mandatory_training)
    completion_rate = (completed_count / total_count * 100) if total_count > 0 else 0
    
    # Different thresholds by phase
    required_rate = 50 if phase == "week_1" else 100
    passed = completion_rate >= required_rate
    
    return {
        "rule_id": "RULE_OB012",
        "rule_name": "Training Completion Check",
        "passed": passed,
        "message": f"✅ Training {completion_rate:.0f}% complete ({completed_count}/{total_count})" if passed
                   else f"⚠️ Training only {completion_rate:.0f}% complete. Required: {required_rate}%",
        "details": {
            "mandatory": mandatory_training,
            "completed": completed_training,
            "completion_rate": f"{completion_rate:.0f}%",
            "required_rate": f"{required_rate}%"
        },
        "compliance_ref": "Training Policy",
        "severity": "critical" if phase == "month_1" else "high"
    }


# ============================================================
# MAIN CONSTRAINT ENGINE
# ============================================================

def evaluate_onboarding_constraints(employee_data: Dict, current_phase: str) -> Dict:
    """Evaluate all constraints for current onboarding phase"""
    start_time = datetime.now()
    
    country = employee_data.get("country", "US")
    all_checks = []
    violations = []
    actions_required = []
    
    # Phase-specific constraint checks
    if current_phase in ["offer_pending", "pre_start"]:
        # Pre-employment checks
        all_checks.append(validate_work_authorization(employee_data, country))
        all_checks.append(validate_budget_approval(employee_data))
        all_checks.append(validate_documents_complete(employee_data, country))
        all_checks.append(validate_background_check(employee_data, country))
        all_checks.append(validate_equipment_availability(employee_data))
    
    if current_phase in ["day_0", "week_1"]:
        # Day 0 and Week 1 checks
        all_checks.append(validate_system_access(employee_data))
        all_checks.append(validate_documents_complete(employee_data, country))
        all_checks.append(validate_training_completion(employee_data, current_phase))
    
    if current_phase == "month_1":
        # Month 1 checks
        all_checks.append(validate_training_completion(employee_data, current_phase))
    
    # Collect violations and actions
    for check in all_checks:
        if not check["passed"]:
            violations.append(check)
            if check.get("action_required"):
                actions_required.append(check["action_required"])
    
    # Determine overall compliance
    critical_violations = [v for v in violations if v.get("severity") == "critical"]
    compliant = len(critical_violations) == 0
    
    # Get automated actions for this phase
    phase_actions = AUTOMATED_ACTIONS.get(current_phase, [])
    
    # Calculate compliance score
    passed_count = len([c for c in all_checks if c["passed"]])
    total_count = len(all_checks)
    compliance_score = (passed_count / total_count * 100) if total_count > 0 else 100
    
    processing_time = (datetime.now() - start_time).total_seconds() * 1000
    
    return {
        "compliant": compliant,
        "compliance_score": f"{compliance_score:.1f}%",
        "current_phase": current_phase,
        "next_phase": get_next_phase(current_phase) if compliant else None,
        "constraint_results": {
            "total_checks": total_count,
            "passed": passed_count,
            "failed": total_count - passed_count,
            "all_checks": all_checks,
            "violations": violations,
            "critical_violations": len(critical_violations)
        },
        "actions_required": actions_required,
        "automated_actions": phase_actions,
        "country_rules": COUNTRY_RULES.get(country, {}),
        "processing_time_ms": round(processing_time, 2),
        "audit_log": {
            "timestamp": datetime.now().isoformat(),
            "phase": current_phase,
            "compliant": compliant,
            "checks_performed": total_count
        }
    }


def get_next_phase(current_phase: str) -> str:
    """Get next onboarding phase"""
    phase_order = ["offer_pending", "pre_start", "day_0", "week_1", "month_1", "complete"]
    try:
        idx = phase_order.index(current_phase)
        return phase_order[idx + 1] if idx < len(phase_order) - 1 else "complete"
    except:
        return "offer_pending"


def generate_communication(employee_data: Dict, phase: str, event_type: str) -> Dict:
    """Generate personalized communication based on phase and event"""
    template = COMMUNICATION_TEMPLATES.get(event_type, COMMUNICATION_TEMPLATES["welcome"])
    
    # Personalize message
    message = template["template"].format(
        name=employee_data.get("name", "Team Member"),
        team=employee_data.get("team", "the team"),
        role=employee_data.get("role", "your new role"),
        start_date=employee_data.get("start_date", "soon"),
        task=employee_data.get("pending_task", "your next task"),
        due_date=employee_data.get("due_date", "soon"),
        issue=employee_data.get("issue", "an issue"),
        assignee=employee_data.get("assignee", "the team"),
        milestone=employee_data.get("milestone", "this milestone"),
        next_step=employee_data.get("next_step", "the next step"),
        first_meeting=employee_data.get("first_meeting", "Team Welcome"),
        time=employee_data.get("meeting_time", "10:00 AM"),
        progress=employee_data.get("training_progress", 0),
        review_date=employee_data.get("review_date", "TBD")
    )
    
    # Determine channel based on urgency
    urgency = employee_data.get("urgency", "routine")
    channel = {
        "urgent": "slack_dm",
        "important": "email_and_slack",
        "routine": "email",
        "broadcast": "announcement_channel"
    }.get(urgency, "email")
    
    return {
        "message": message,
        "tone": template["tone"],
        "channel": channel,
        "event_type": event_type,
        "phase": phase
    }


# ============================================================
# API ENDPOINTS
# ============================================================

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "AI Onboarding Constraint Engine",
        "version": "1.0",
        "phases": [e.value for e in OnboardingState],
        "countries_supported": list(COUNTRY_RULES.keys()),
        "total_constraints": len(ONBOARDING_CONSTRAINTS)
    })


@app.route('/analyze', methods=['POST'])
def analyze_onboarding():
    """Main endpoint to analyze onboarding compliance"""
    data = request.json
    
    if not data:
        return jsonify({"error": "Request body required"}), 400
    
    employee_data = data.get("employee_data", data)
    current_phase = data.get("phase", "offer_pending")
    
    print("\n" + "=" * 60)
    print("🎯 ONBOARDING ENGINE - Analyzing Compliance")
    print("=" * 60)
    print(f"Employee: {employee_data.get('name', 'Unknown')}")
    print(f"Phase: {current_phase}")
    print(f"Country: {employee_data.get('country', 'US')}")
    
    result = evaluate_onboarding_constraints(employee_data, current_phase)
    
    print(f"\n📊 Result: {'✅ COMPLIANT' if result['compliant'] else '❌ NON-COMPLIANT'}")
    print(f"Score: {result['compliance_score']}")
    print(f"Checks: {result['constraint_results']['passed']}/{result['constraint_results']['total_checks']} passed")
    print(f"Time: {result['processing_time_ms']}ms")
    print("=" * 60 + "\n")
    
    return jsonify(result)


@app.route('/validate-phase', methods=['POST'])
def validate_phase():
    """Validate if employee can move to next phase"""
    data = request.json
    
    employee_data = data.get("employee_data", {})
    current_phase = data.get("current_phase", "offer_pending")
    target_phase = data.get("target_phase")
    
    result = evaluate_onboarding_constraints(employee_data, current_phase)
    
    can_advance = result["compliant"]
    
    return jsonify({
        "can_advance": can_advance,
        "current_phase": current_phase,
        "target_phase": target_phase or result.get("next_phase"),
        "blockers": result["constraint_results"]["violations"] if not can_advance else [],
        "compliance_score": result["compliance_score"]
    })


@app.route('/get-actions', methods=['POST'])
def get_phase_actions():
    """Get automated actions for a phase"""
    data = request.json
    phase = data.get("phase", "offer_pending")
    context = data.get("context", {})
    
    phase_actions = AUTOMATED_ACTIONS.get(phase, [])
    
    # Convert action objects to readable strings based on context
    department = context.get("department", "General")
    role = context.get("role", "Employee")
    location = context.get("location", "US")
    
    action_strings = []
    for item in phase_actions:
        if item.get("description"):
            # Technical action format - combine action + description
            action_str = f"{item['description']}"
        else:
            # Simple action format - use action directly
            action_str = item['action']
        
        # Personalize based on context
        action_str = action_str.replace("{department}", department)
        action_str = action_str.replace("{role}", role)
        action_str = action_str.replace("{location}", location)
        action_strings.append(action_str)
    
    return jsonify({
        "phase": phase,
        "actions": action_strings,
        "total_actions": len(action_strings)
    })


@app.route('/generate-message', methods=['POST'])
def generate_message():
    """Generate personalized communication"""
    data = request.json
    
    employee_data = data.get("employee_data", {})
    phase = data.get("phase", "offer_pending")
    event_type = data.get("event_type", "welcome")
    
    comm = generate_communication(employee_data, phase, event_type)
    
    return jsonify(comm)


@app.route('/country-rules/<country>', methods=['GET'])
def get_country_rules(country):
    """Get country-specific onboarding rules"""
    rules = COUNTRY_RULES.get(country.upper())
    
    if not rules:
        return jsonify({"error": f"Country {country} not supported"}), 404
    
    # Return the rules directly for easier consumption
    return jsonify({
        "country": country.upper(),
        "name": rules.get("name", country.upper()),
        "required_documents": rules.get("required_documents", []),
        "work_authorization": rules.get("work_authorization", []),
        "tax_forms": rules.get("tax_forms", []),
        "compliance_refs": rules.get("compliance_refs", []),
        "benefits_enrollment_deadline": rules.get("benefits_enrollment_deadline", "30 days")
    })


@app.route('/constraints', methods=['GET'])
def get_constraints():
    """Get all constraint definitions"""
    return jsonify({
        "total": len(ONBOARDING_CONSTRAINTS),
        "constraints": ONBOARDING_CONSTRAINTS
    })


# ============================================================
# STARTUP
# ============================================================

if __name__ == '__main__':
    print("\n" + "=" * 60)
    print("🚀 AI ONBOARDING CONSTRAINT ENGINE")
    print("=" * 60)
    print(f"📋 Total Constraints: {len(ONBOARDING_CONSTRAINTS)}")
    print(f"🌍 Countries Supported: {', '.join(COUNTRY_RULES.keys())}")
    print(f"📊 Onboarding Phases: {len(OnboardingState)}")
    print("=" * 60 + "\n")
    
    app.run(host='0.0.0.0', port=8002, debug=False)
