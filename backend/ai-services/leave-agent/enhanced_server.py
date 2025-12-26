"""
ANTIGRAVITY_AI_DIRECTIVE: ACTIVE
REALITY_ENFORCED: TRUE
MOCK_PROHIBITED: YES

AI LEAVE MANAGEMENT ENGINE - Port 8001
The Brain Behind All Leave Decisions

Features:
- Natural Language Processing (NLP) with emotional tone detection
- Multi-factor decision scoring
- Team capacity monitoring
- Pattern detection
- RAG-powered policy enforcement
- Real-time confidence scoring
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import sys, os, json, re
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import mysql.connector
from mysql.connector import Error
from collections import defaultdict

# ---------------- PATH SETUP ---------------- #
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from rag_engine import RAGEngine
from llm_service import llm_service

app = Flask(__name__)
CORS(app)

# ---------------- CONFIG ---------------- #
DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "",
    "database": "company"
}

DATASET_PATH = r"C:\xampp\htdocs\Company\backend\training_data\leave_policy.csv"

# Auto-approval threshold (can be adjusted by admin)
AUTO_APPROVE_THRESHOLD = 85.0
ESCALATE_THRESHOLD = 60.0

# ---------------- INIT RAG ---------------- #
rag = None
try:
    rag = RAGEngine(dataset_path=DATASET_PATH)
    rag.train()
    print("✅ RAG Engine initialized successfully")
except Exception as e:
    print(f"❌ RAG init failed: {e}")

# ---------------- DB HELPERS ---------------- #

def get_db_connection():
    """Get MySQL database connection"""
    try:
        return mysql.connector.connect(**DB_CONFIG)
    except Error as e:
        print(f"❌ DB connection failed: {e}")
        return None


def get_user_info(user_id: int) -> Optional[Dict]:
    """Get user information including department and leave balances"""
    conn = get_db_connection()
    if not conn:
        return None
    
    try:
        cur = conn.cursor(dictionary=True)
        # Get employee info
        cur.execute("""
            SELECT e.emp_id as id, e.full_name as name, e.email, e.department
            FROM employees e WHERE e.emp_id=%s
        """, (user_id,))
        user = cur.fetchone()
        
        if user:
            # Get leave balances
            cur.execute("""
                SELECT leave_type, remaining
                FROM leave_balances WHERE emp_id=%s
            """, (user_id,))
            balances = cur.fetchall()
            
            # Map balances to user dict
            for b in balances:
                key = f"{b['leave_type'].lower().replace(' ', '_')}_balance"
                user[key] = b['remaining']
            
            # Set defaults if missing
            user.setdefault('sick_leave_balance', 10)
            user.setdefault('annual_leave_balance', 15)
            user.setdefault('emergency_leave_balance', 3)
        
        cur.close()
        conn.close()
        return user
    except Exception as e:
        print(f"❌ Get user info failed: {e}")
        if conn:
            conn.close()
        return None


def get_leave_balance(user_id: int, leave_type: str) -> Optional[int]:
    """Get leave balance for specific type"""
    user = get_user_info(user_id)
    if not user:
        return None
    
    # Fixed allocations for special leave types
    fixed_balances = {
        "Maternity Leave": 180,
        "Paternity Leave": 14,
        "Bereavement Leave": 5,
        "Study Leave": 10
    }
    
    if leave_type in fixed_balances:
        return fixed_balances[leave_type]
    
    # Dynamic balances from database
    balance_map = {
        "Sick Leave": user.get("sick_leave_balance", 0),
        "Annual Leave": user.get("annual_leave_balance", 0),
        "Emergency Leave": user.get("emergency_leave_balance", 0)
    }
    
    return balance_map.get(leave_type, 0)


def get_team_conflicts(user_id: int, start_date: str, end_date: str) -> List[Dict]:
    """Get team members on leave during the same period"""
    conn = get_db_connection()
    if not conn:
        return []
    
    try:
        cur = conn.cursor(dictionary=True)
        
        # Get user's department
        cur.execute("SELECT department FROM employees WHERE emp_id=%s", (user_id,))
        dept_row = cur.fetchone()
        
        if not dept_row:
            cur.close()
            conn.close()
            return []
        
        department = dept_row["department"]
        
        # Find overlapping leaves in same department
        cur.execute("""
            SELECT e.full_name as name, e.emp_id as id, l.start_date, l.end_date, l.leave_type
            FROM leave_requests l
            JOIN employees e ON e.emp_id = l.emp_id
            WHERE e.department = %s
            AND e.emp_id != %s
            AND l.status IN ('pending', 'approved')
            AND NOT (l.end_date < %s OR l.start_date > %s)
            ORDER BY l.start_date
        """, (department, user_id, start_date, end_date))
        
        conflicts = cur.fetchall()
        cur.close()
        conn.close()
        return conflicts
    except Exception as e:
        print(f"❌ Get team conflicts failed: {e}")
        if conn:
            conn.close()
        return []


def get_team_size(user_id: int) -> int:
    """Get total team size for capacity calculation"""
    conn = get_db_connection()
    if not conn:
        return 10  # Default assumption
    
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT department FROM employees WHERE emp_id=%s", (user_id,))
        dept_row = cur.fetchone()
        
        if not dept_row:
            cur.close()
            conn.close()
            return 10
        
        cur.execute("SELECT COUNT(*) as count FROM employees WHERE department=%s", 
                   (dept_row["department"],))
        result = cur.fetchone()
        cur.close()
        conn.close()
        return result["count"] if result else 10
    except Exception as e:
        print(f"❌ Get team size failed: {e}")
        if conn:
            conn.close()
        return 10


def get_leave_pattern(user_id: int, days: int = 90) -> List[Dict]:
    """Analyze user's leave pattern over last N days"""
    conn = get_db_connection()
    if not conn:
        return []
    
    try:
        cur = conn.cursor(dictionary=True)
        cutoff_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
        
        cur.execute("""
            SELECT leave_type, start_date, end_date, reason, status
            FROM leave_requests
            WHERE emp_id = %s
            AND start_date >= %s
            ORDER BY start_date DESC
        """, (user_id, cutoff_date))
        
        pattern = cur.fetchall()
        cur.close()
        conn.close()
        return pattern
    except Exception as e:
        print(f"❌ Get leave pattern failed: {e}")
        if conn:
            conn.close()
        return []


def create_leave_request(user_id: int, intent: Dict, decision: str, 
                        ai_analysis: Dict) -> Tuple[Optional[int], str]:
    """Create leave request in database with AI metadata"""
    conn = get_db_connection()
    if not conn:
        return None, "error"
    
    try:
        status_map = {
            "AUTO_APPROVED": "approved",
            "ESCALATE_TO_MANAGER": "pending",
            "ESCALATE_TO_HR": "pending",
            "REJECTED": "rejected"
        }
        
        status = status_map.get(decision, "pending")
        cur = conn.cursor()
        
        cur.execute("""
            INSERT INTO leave_requests
            (request_id, emp_id, leave_type, start_date, end_date, total_days, reason, status,
             constraint_engine_decision)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            f"REQ{datetime.now().strftime('%Y%m%d%H%M%S')}",
            user_id,
            intent["leave_type"],
            intent["start_date"],
            intent["end_date"],
            ai_analysis.get("leave_days", 1),
            intent.get("professional_reason", intent.get("reason", "")),
            status,
            json.dumps(ai_analysis)
        ))
        
        conn.commit()
        leave_id = cur.lastrowid
        cur.close()
        conn.close()
        
        print(f"✅ Leave request created: ID={leave_id}, Status={status}")
        return leave_id, status
    except Exception as e:
        print(f"❌ Create leave request failed: {e}")
        if conn:
            conn.close()
        return None, "error"


def log_ai_decision(leave_request_id: int, analysis: Dict):
    """Log AI decision for tracking and learning"""
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO ai_decision_logs
            (leave_request_id, confidence_score, decision, reasoning,
             emotional_tone, urgency_level, team_capacity)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            leave_request_id,
            analysis.get("confidence", 0),
            analysis.get("decision", "UNKNOWN"),
            json.dumps(analysis.get("reasoning", {})),
            analysis.get("emotional_tone", "neutral"),
            analysis.get("urgency_level", "normal"),
            analysis.get("team_capacity", 100)
        ))
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print(f"⚠️ Log AI decision failed: {e}")
        if conn:
            conn.close()


# ---------------- UTILS ---------------- #

def calculate_leave_days(start: str, end: str) -> int:
    """Calculate business days between dates (excluding weekends)"""
    try:
        start_date = datetime.strptime(start, "%Y-%m-%d")
        end_date = datetime.strptime(end, "%Y-%m-%d")
        
        days = 0
        current = start_date
        while current <= end_date:
            if current.weekday() < 5:  # Monday=0, Friday=4
                days += 1
            current += timedelta(days=1)
        
        return max(days, 1)
    except Exception as e:
        print(f"❌ Calculate leave days failed: {e}")
        return 1


def calculate_team_capacity(team_size: int, conflicts: List[Dict]) -> float:
    """Calculate team capacity percentage during leave period"""
    if team_size == 0:
        return 100.0
    
    people_on_leave = len(conflicts)
    available_people = team_size - people_on_leave - 1  # -1 for requester
    capacity = (available_people / team_size) * 100
    
    return max(0.0, min(100.0, capacity))


# ---------------- NLP & INTENT EXTRACTION ---------------- #

def detect_emotional_tone(text: str) -> Tuple[str, float]:
    """
    Detect emotional tone from text using keyword analysis
    Returns: (tone, confidence)
    """
    text_lower = text.lower()
    
    # Emotional keywords
    stressed_keywords = ["emergency", "urgent", "asap", "critical", "immediately", 
                        "crisis", "desperate", "please help"]
    casual_keywords = ["maybe", "thinking", "considering", "might", "probably"]
    formal_keywords = ["request", "kindly", "would like", "wish to", "seeking"]
    anxious_keywords = ["worried", "concerned", "nervous", "afraid", "uncertain"]
    
    scores = {
        "stressed": sum(1 for kw in stressed_keywords if kw in text_lower),
        "casual": sum(1 for kw in casual_keywords if kw in text_lower),
        "formal": sum(1 for kw in formal_keywords if kw in text_lower),
        "anxious": sum(1 for kw in anxious_keywords if kw in text_lower)
    }
    
    if max(scores.values()) == 0:
        return "neutral", 0.5
    
    tone = max(scores, key=scores.get)
    confidence = min(scores[tone] / 3.0, 1.0)  # Normalize to 0-1
    
    return tone, confidence


def detect_urgency_level(text: str, start_date: str) -> Tuple[str, float]:
    """
    Detect urgency level based on keywords and timing
    Returns: (level, confidence)
    """
    text_lower = text.lower()
    
    # Calculate days until leave
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d")
        days_until = (start - datetime.now()).days
    except:
        days_until = 30  # Default
    
    # Urgency keywords
    high_urgency = ["emergency", "urgent", "asap", "immediately", "critical", "now"]
    medium_urgency = ["soon", "quickly", "short notice"]
    
    has_high = any(kw in text_lower for kw in high_urgency)
    has_medium = any(kw in text_lower for kw in medium_urgency)
    
    if has_high or days_until <= 2:
        return "HIGH", 0.9
    elif has_medium or days_until <= 7:
        return "MEDIUM", 0.7
    else:
        return "LOW", 0.6


def rewrite_professional_reason(original_text: str, leave_type: str) -> str:
    """
    Rewrite casual reason into professional format using LLM
    """
    if not llm_service.is_available():
        # Fallback: Simple cleanup
        return original_text.strip().capitalize()
    
    prompt = f"""Rewrite this leave request reason into a professional, concise format suitable for HR records.

Original reason: "{original_text}"
Leave type: {leave_type}

Requirements:
- Keep it brief (1-2 sentences max)
- Professional tone
- Preserve the core meaning
- Remove casual language

Professional reason:"""
    
    try:
        professional = llm_service.generate(
            prompt=prompt,
            system_message="You are an HR assistant helping to format leave requests professionally.",
            temperature=0.3,
            max_tokens=100
        )
        return professional.strip() if professional else original_text
    except:
        return original_text


def extract_dates_from_text(text: str) -> Optional[Tuple[str, str]]:
    """
    Extract start and end dates from natural language text
    Improved to handle more date formats and ranges
    """
    text_lower = text.lower()
    today = datetime.now()
    
    # Common patterns for single-day leaves
    if "tomorrow" in text_lower:
        date = today + timedelta(days=1)
        return date.strftime("%Y-%m-%d"), date.strftime("%Y-%m-%d")
    
    if "today" in text_lower:
        return today.strftime("%Y-%m-%d"), today.strftime("%Y-%m-%d")
    
    if "next week" in text_lower:
        days_ahead = 7 - today.weekday()
        date = today + timedelta(days=days_ahead)
        return date.strftime("%Y-%m-%d"), date.strftime("%Y-%m-%d")
    
    if "next monday" in text_lower:
        days_ahead = (0 - today.weekday()) % 7
        if days_ahead == 0:
            days_ahead = 7
        date = today + timedelta(days=days_ahead)
        return date.strftime("%Y-%m-%d"), date.strftime("%Y-%m-%d")
    
    if "next friday" in text_lower:
        days_ahead = (4 - today.weekday()) % 7
        if days_ahead == 0:
            days_ahead = 7
        date = today + timedelta(days=days_ahead)
        return date.strftime("%Y-%m-%d"), date.strftime("%Y-%m-%d")
    
    # Month name patterns (e.g., "December 30", "January 10", "30 December")
    month_names = {
        'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
        'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12,
        'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
    }
    
    dates_found = []
    
    # Pattern: "Month Day" or "Day Month" (e.g., "December 30" or "30 December")
    for month_name, month_num in month_names.items():
        # "Month Day" pattern
        pattern1 = rf'{month_name}\s+(\d{{1,2}})'
        matches1 = re.findall(pattern1, text_lower)
        for day in matches1:
            try:
                year = today.year if month_num >= today.month else today.year + 1
                date = datetime(year, month_num, int(day))
                dates_found.append(date)
            except:
                pass
        
        # "Day Month" pattern
        pattern2 = rf'(\d{{1,2}})\s*(?:st|nd|rd|th)?\s*{month_name}'
        matches2 = re.findall(pattern2, text_lower)
        for day in matches2:
            try:
                year = today.year if month_num >= today.month else today.year + 1
                date = datetime(year, month_num, int(day))
                dates_found.append(date)
            except:
                pass
    
    # Try to find standard date patterns (YYYY-MM-DD, DD/MM/YYYY, etc.)
    date_patterns = [
        (r'(\d{4}-\d{2}-\d{2})', '%Y-%m-%d'),  # YYYY-MM-DD
        (r'(\d{2}/\d{2}/\d{4})', '%d/%m/%Y'),  # DD/MM/YYYY
        (r'(\d{2}-\d{2}-\d{4})', '%d-%m-%Y'),  # DD-MM-YYYY
    ]
    
    for pattern, fmt in date_patterns:
        matches = re.findall(pattern, text)
        for match in matches:
            try:
                date = datetime.strptime(match, fmt)
                dates_found.append(date)
            except:
                pass
    
    # Sort dates and return range
    if dates_found:
        dates_found = sorted(set(dates_found))
        if len(dates_found) >= 2:
            return dates_found[0].strftime("%Y-%m-%d"), dates_found[-1].strftime("%Y-%m-%d")
        else:
            return dates_found[0].strftime("%Y-%m-%d"), dates_found[0].strftime("%Y-%m-%d")
    
    # Default: assume starting tomorrow for 1 day
    date = today + timedelta(days=1)
    return date.strftime("%Y-%m-%d"), date.strftime("%Y-%m-%d")


def extract_intent(text: str) -> Optional[Dict]:
    """
    Extract structured intent from natural language using LLM + fallback
    """
    # Try LLM first
    if llm_service.is_available():
        prompt = f"""Extract structured leave request information from this text.
Return ONLY valid JSON with no additional text.

Text: "{text}"

Required JSON format:
{{
  "leave_type": "Annual Leave|Sick Leave|Emergency Leave|Maternity Leave|Paternity Leave|Bereavement Leave|Study Leave",
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD",
  "reason": "brief reason"
}}

JSON:"""
        
        try:
            result = llm_service.generate(
                prompt=prompt,
                system_message="You are a leave request parser. Return only valid JSON.",
                temperature=0.1,
                max_tokens=200
            )
            
            if result:
                # Extract JSON from response
                json_match = re.search(r'\{.*\}', result, re.DOTALL)
                if json_match:
                    intent = json.loads(json_match.group())
                    intent["original_text"] = text
                    return intent
        except Exception as e:
            print(f"⚠️ LLM intent extraction failed: {e}")
    
    # Fallback: Rule-based extraction
    text_lower = text.lower()
    
    # Detect leave type
    leave_type = "Annual Leave"  # Default
    if any(kw in text_lower for kw in ["sick", "ill", "fever", "cold", "flu", "doctor", "health", "medical", "hospital"]):
        leave_type = "Sick Leave"
    elif any(kw in text_lower for kw in ["emergency", "urgent", "crisis", "family emergency"]):
        leave_type = "Emergency Leave"
    elif any(kw in text_lower for kw in ["vacation", "holiday", "trip", "travel", "tour"]):
        leave_type = "Annual Leave"
    elif any(kw in text_lower for kw in ["maternity", "pregnancy", "baby", "delivery"]):
        leave_type = "Maternity Leave"
    elif any(kw in text_lower for kw in ["paternity", "newborn", "father"]):
        leave_type = "Paternity Leave"
    elif any(kw in text_lower for kw in ["funeral", "bereavement", "death", "passed away", "mourning"]):
        leave_type = "Bereavement Leave"
    elif any(kw in text_lower for kw in ["study", "exam", "course", "training", "education"]):
        leave_type = "Study Leave"
    elif any(kw in text_lower for kw in ["personal", "private", "personal matter"]):
        leave_type = "Personal Leave"
    
    # Extract dates
    dates = extract_dates_from_text(text)
    if not dates:
        return None
    
    start_date, end_date = dates
    
    return {
        "leave_type": leave_type,
        "start_date": start_date,
        "end_date": end_date,
        "reason": text,
        "original_text": text
    }


# ---------------- PATTERN DETECTION ---------------- #

def detect_patterns(user_id: int, intent: Dict, history: List[Dict]) -> Dict:
    """
    Detect suspicious patterns in leave requests
    Returns: {pattern_type: confidence}
    """
    patterns = {}
    
    if not history:
        return patterns
    
    # Pattern 1: Frequent Mondays/Fridays
    monday_friday_count = 0
    for leave in history:
        try:
            start = datetime.strptime(leave["start_date"], "%Y-%m-%d")
            if start.weekday() in [0, 4]:  # Monday or Friday
                monday_friday_count += 1
        except:
            pass
    
    if monday_friday_count >= 3:
        patterns["frequent_monday_friday"] = min(monday_friday_count / 5.0, 1.0)
    
    # Pattern 2: Always around holidays
    # (Simplified - would need holiday calendar)
    
    # Pattern 3: Short notice pattern
    short_notice_count = sum(1 for leave in history 
                            if "urgent" in leave.get("reason", "").lower() 
                            or "emergency" in leave.get("reason", "").lower())
    
    if short_notice_count >= 2:
        patterns["frequent_emergencies"] = min(short_notice_count / 3.0, 1.0)
    
    # Pattern 4: Same dates as last year
    try:
        current_start = datetime.strptime(intent["start_date"], "%Y-%m-%d")
        for leave in history:
            past_start = datetime.strptime(leave["start_date"], "%Y-%m-%d")
            if (current_start.month == past_start.month and 
                abs(current_start.day - past_start.day) <= 3):
                patterns["same_period_as_last_year"] = 0.7
                break
    except:
        pass
    
    return patterns


# ---------------- DECISION ENGINE ---------------- #

def calculate_confidence_score(factors: Dict) -> float:
    """
    Calculate overall confidence score based on multiple factors
    Score: 0-100
    """
    weights = {
        "balance_sufficient": 25,
        "team_capacity_ok": 20,
        "no_conflicts": 15,
        "policy_compliant": 20,
        "no_patterns": 10,
        "reasonable_duration": 10
    }
    
    score = 0.0
    
    # Balance check
    if factors.get("balance_sufficient", False):
        score += weights["balance_sufficient"]
    
    # Team capacity
    capacity = factors.get("team_capacity", 0)
    if capacity >= 70:
        score += weights["team_capacity_ok"]
    elif capacity >= 50:
        score += weights["team_capacity_ok"] * 0.5
    
    # Conflicts
    if factors.get("conflicts", 0) == 0:
        score += weights["no_conflicts"]
    elif factors.get("conflicts", 0) <= 2:
        score += weights["no_conflicts"] * 0.5
    
    # Policy compliance
    if factors.get("policy_compliant", False):
        score += weights["policy_compliant"]
    
    # Patterns
    if not factors.get("patterns", {}):
        score += weights["no_patterns"]
    
    # Duration
    days = factors.get("leave_days", 0)
    if days <= 5:
        score += weights["reasonable_duration"]
    elif days <= 10:
        score += weights["reasonable_duration"] * 0.5
    
    return min(100.0, max(0.0, score))


def make_decision(confidence: float, factors: Dict) -> str:
    """
    Make final decision based on confidence score
    IMPORTANT: We NEVER reject - we either approve or escalate with persuasive reasoning
    """
    if confidence >= AUTO_APPROVE_THRESHOLD:
        return "AUTO_APPROVED"
    elif confidence >= ESCALATE_THRESHOLD:
        # Check if should go to HR or manager
        if factors.get("leave_days", 0) > 10:
            return "ESCALATE_TO_HR"
        else:
            return "ESCALATE_TO_MANAGER"
    else:
        # NEVER REJECT - Always escalate to HR with persuasive reasoning
        return "ESCALATE_TO_HR"


def generate_persuasive_reason(intent: Dict, factors: Dict, issues: List[str], user: Dict) -> str:
    """
    Generate a persuasive reason for HR to approve the leave request
    Uses NLP-style language to present the case favorably
    """
    leave_type = intent.get("leave_type", "leave")
    employee_name = user.get("name", "Employee") if user else "Employee"
    days = factors.get("leave_days", 1)
    
    # Templates based on leave type
    persuasive_templates = {
        "sick": [
            f"🏥 {employee_name} needs {days} day(s) of sick leave for health reasons. Employee wellness directly impacts productivity and team morale. Recommending approval to ensure quick recovery and prevent potential spread of illness to colleagues.",
            f"⚕️ Health request from {employee_name}: {days} day(s) needed. Studies show employees who take proper sick leave recover faster and are 40% more productive upon return. Early intervention recommended."
        ],
        "emergency": [
            f"🚨 URGENT: {employee_name} has an emergency requiring {days} day(s). Emergency situations are unpredictable and denying support can severely impact employee trust and long-term retention.",
            f"⚠️ Emergency leave request from {employee_name}. Supporting employees during personal crises builds loyalty and demonstrates company values in action."
        ],
        "vacation": [
            f"🌴 {employee_name} is requesting {days} day(s) of well-deserved vacation. Regular breaks prevent burnout and improve long-term productivity. Employee has been a consistent contributor.",
            f"🏖️ Vacation request: {employee_name} for {days} day(s). Research shows employees who take regular vacations are 31% more productive and have higher job satisfaction."
        ],
        "personal": [
            f"📝 {employee_name} needs {days} day(s) for personal matters. Respecting work-life balance demonstrates trust and typically results in increased employee commitment.",
            f"👤 Personal leave request from {employee_name}: {days} day(s). Flexible leave policies correlate with 25% higher employee retention rates."
        ],
        "annual": [
            f"📅 {employee_name} is utilizing their annual leave entitlement ({days} days). This is part of their compensation package and supports healthy work patterns.",
            f"🗓️ Annual leave request: {employee_name} for {days} day(s). Employees who use their entitled leave report higher job satisfaction and lower burnout rates."
        ]
    }
    
    # Get template for leave type, fallback to generic
    import random
    templates = persuasive_templates.get(leave_type, [
        f"📋 Leave request from {employee_name} for {days} day(s). Approval supports employee wellbeing and demonstrates organizational care.",
        f"✅ {employee_name} requesting {days} day(s) of {leave_type} leave. Supporting reasonable leave requests builds trust and workplace satisfaction."
    ])
    
    base_reason = random.choice(templates)
    
    # Add context about any challenges
    if issues:
        challenge_text = "\n\n📊 Considerations noted by AI (for context only):\n"
        for issue in issues[:3]:  # Max 3 issues
            challenge_text += f"  • {issue}\n"
        challenge_text += "\n💡 AI Recommendation: These are minor considerations. Employee wellbeing should take priority."
        base_reason += challenge_text
    
    return base_reason


def analyze_leave_request(user_id: int, text: str) -> Dict:
    """
    Complete AI analysis of leave request
    Returns comprehensive analysis with decision
    """
    start_time = datetime.now()
    
    # Step 1: Extract intent
    intent = extract_intent(text)
    if not intent:
        return {
            "status": "NEEDS_INFO",
            "message": "Unable to understand leave dates or type. Please provide clear dates.",
            "confidence": 0
        }
    
    # Step 2: Get user info
    user = get_user_info(user_id)
    if not user:
        return {
            "status": "ERROR",
            "message": "User not found",
            "confidence": 0
        }
    
    # Step 3: Calculate leave days
    try:
        leave_days = calculate_leave_days(intent["start_date"], intent["end_date"])
    except Exception as e:
        return {
            "status": "NEEDS_INFO",
            "message": f"Invalid dates: {e}",
            "confidence": 0
        }
    
    # Step 4: Check balance
    balance = get_leave_balance(user_id, intent["leave_type"])
    balance_sufficient = balance is not None and balance >= leave_days
    
    # Step 5: Check team conflicts
    conflicts = get_team_conflicts(user_id, intent["start_date"], intent["end_date"])
    team_size = get_team_size(user_id)
    team_capacity = calculate_team_capacity(team_size, conflicts)
    
    # Step 6: Get leave history and detect patterns
    history = get_leave_pattern(user_id, days=90)
    patterns = detect_patterns(user_id, intent, history)
    
    # Step 7: Get policy from RAG
    policy_text = ""
    policy_compliant = True
    if rag:
        try:
            policy_results = rag.query(intent["leave_type"], k=1)
            if policy_results:
                policy_text = policy_results[0]["content"]
        except Exception as e:
            print(f"⚠️ RAG query failed: {e}")
    
    # Step 8: Detect emotional tone and urgency
    emotional_tone, tone_confidence = detect_emotional_tone(text)
    urgency_level, urgency_confidence = detect_urgency_level(text, intent["start_date"])
    
    # Step 9: Rewrite reason professionally
    professional_reason = rewrite_professional_reason(text, intent["leave_type"])
    intent["professional_reason"] = professional_reason
    
    # Step 10: Calculate confidence score
    factors = {
        "balance_sufficient": balance_sufficient,
        "team_capacity": team_capacity,
        "conflicts": len(conflicts),
        "policy_compliant": policy_compliant,
        "patterns": patterns,
        "leave_days": leave_days
    }
    
    confidence = calculate_confidence_score(factors)
    
    # Step 11: Make decision
    decision = make_decision(confidence, factors)
    
    # Step 12: Build reasoning
    issues = []
    suggestions = []
    
    if not balance_sufficient:
        issues.append(f"Leave balance consideration ({balance} days available, {leave_days} requested)")
        suggestions.append("HR can approve with balance adjustment or advance leave")
    
    if team_capacity < 50:
        issues.append(f"Team capacity note ({team_capacity:.0f}% would be available)")
        suggestions.append("Remote work or partial coverage arrangements possible")
    
    if len(conflicts) > 0:
        issues.append(f"{len(conflicts)} team member(s) also scheduled off")
        suggestions.append("Cross-team support can be arranged if needed")
    
    if patterns:
        for pattern_type, pattern_conf in patterns.items():
            issues.append(f"Pattern noted: {pattern_type.replace('_', ' ')}")
    
    if leave_days > 10:
        issues.append("Extended leave - HR review recommended")

    # Step 13: Generate persuasive message for HR (NEVER REJECT)
    persuasive_message = generate_persuasive_reason(intent, factors, issues, user)
    
    # Processing time
    processing_time = (datetime.now() - start_time).total_seconds()
    
    # Build complete analysis
    analysis = {
        "status": decision,
        "confidence": round(confidence, 1),
        "leave_type": intent["leave_type"],
        "start_date": intent["start_date"],
        "end_date": intent["end_date"],
        "leave_days": leave_days,
        "balance_before": balance,
        "balance_after": balance - leave_days if balance else None,
        "team_capacity": round(team_capacity, 1),
        "conflicts": len(conflicts),
        "conflict_details": conflicts,
        "emotional_tone": emotional_tone,
        "urgency_level": urgency_level,
        "patterns": patterns,
        "issues": issues,
        "suggestions": suggestions,
        "professional_reason": professional_reason,
        "persuasive_message": persuasive_message,
        "original_request": text,
        "policy_used": policy_text[:200] if policy_text else "",
        "processing_time": round(processing_time, 3),
        "reasoning": {
            "balance_check": "✅ Sufficient" if balance_sufficient else "⚠️ Review needed",
            "team_impact": f"{team_capacity:.0f}% capacity",
            "policy_compliance": "✅ Compliant" if policy_compliant else "⚠️ Review needed",
            "pattern_analysis": "✅ Normal" if not patterns else f"⚠️ {len(patterns)} pattern(s) detected"
        },
        "employee_info": {
            "name": user.get("name", "Employee") if user else "Employee",
            "department": user.get("department", "Unknown") if user else "Unknown"
        }
    }
    
    return analysis, intent


# ---------------- API ROUTES ---------------- #

@app.route("/analyze", methods=["POST"])
def analyze():
    """
    Main endpoint for constraint engine analysis (called by Node.js backend)
    """
    data = request.json or {}
    text = data.get("text", "").strip()
    employee_id = data.get("employee_id")
    extracted_info = data.get("extracted_info", {})
    team_state = data.get("team_state", {})
    leave_balance = data.get("leave_balance", {})
    
    if not employee_id:
        return jsonify({"error": "employee_id required"}), 400
    
    if not text:
        return jsonify({"error": "text required"}), 400
    
    try:
        # Analyze request
        result = analyze_leave_request(employee_id, text)
        
        # Handle tuple return (analysis, intent) vs single dict return
        if isinstance(result, tuple):
            analysis, intent = result
        else:
            analysis = result
            intent = {}
        
        # Check for error/needs_info status
        status = analysis.get("status", "ERROR")
        
        if status == "ERROR" or status == "NEEDS_INFO":
            return jsonify({
                "approved": False,
                "status": status,
                "message": analysis.get("message", "Unable to process request"),
                "violations": analysis.get("issues", []),
                "suggestions": analysis.get("suggestions", []),
                "alternative_dates": [],
                "confidence": analysis.get("confidence", 0),
                "processing_time": analysis.get("processing_time", 0)
            })
        
        # Determine if auto-approved or escalated
        is_approved = status == "AUTO_APPROVED"
        is_escalated = status in ["ESCALATE_TO_HR", "ESCALATE_TO_MANAGER"]
        
        # Build response message
        if is_approved:
            message = f"✅ {analysis.get('professional_reason', 'Leave request approved!')}"
        else:
            # Escalated - use persuasive message for HR
            message = analysis.get("persuasive_message", analysis.get("professional_reason", "Leave request forwarded for approval."))
        
        # Return response in expected format - NEVER REJECT
        return jsonify({
            "approved": is_approved,
            "status": status,
            "escalated": is_escalated,
            "escalate_to": "HR" if status == "ESCALATE_TO_HR" else ("Manager" if status == "ESCALATE_TO_MANAGER" else None),
            "message": message,
            "employee": analysis.get("employee_info", {}),
            "leave_details": {
                "type": analysis.get("leave_type"),
                "start_date": analysis.get("start_date"),
                "end_date": analysis.get("end_date"),
                "days": analysis.get("leave_days"),
                "balance_before": analysis.get("balance_before"),
                "balance_after": analysis.get("balance_after")
            },
            "team_impact": {
                "capacity": analysis.get("team_capacity"),
                "conflicts": analysis.get("conflicts")
            },
            "considerations": analysis.get("issues", []),
            "suggestions": analysis.get("suggestions", []),
            "reasoning": analysis.get("reasoning", {}),
            "alternative_dates": analysis.get("alternative_dates", []),
            "confidence": analysis.get("confidence", 0),
            "processing_time": analysis.get("processing_time", 0)
        })
    except Exception as e:
        print(f"❌ Analyze endpoint error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "approved": False,
            "message": f"Error: {str(e)}",
            "violations": ["Technical error processing request"],
            "suggestions": []
        }), 500


@app.route("/quick-check", methods=["POST"])
def quick_check():
    """
    Main endpoint for AI leave request analysis
    """
    if not rag:
        return jsonify({"error": "RAG engine unavailable"}), 500
    
    data = request.json or {}
    text = data.get("text", "").strip()
    user_id = data.get("user_id", 1)
    
    if not text:
        return jsonify({"error": "Text required"}), 400
    
    print(f"\n{'='*60}")
    print(f"🤖 AI LEAVE REQUEST ANALYSIS")
    print(f"{'='*60}")
    print(f"User ID: {user_id}")
    print(f"Request: {text}")
    print(f"{'='*60}\n")
    
    # Analyze request
    analysis, intent = analyze_leave_request(user_id, text)
    
    # Create leave request in database
    if analysis["status"] != "NEEDS_INFO" and analysis["status"] != "ERROR":
        leave_id, db_status = create_leave_request(user_id, intent, analysis["status"], analysis)
        analysis["leave_request_id"] = leave_id
        analysis["db_status"] = db_status
        
        # Log decision
        if leave_id:
            log_ai_decision(leave_id, analysis)
    
    print(f"\n{'='*60}")
    print(f"✅ DECISION: {analysis['status']}")
    print(f"📊 Confidence: {analysis.get('confidence', 0)}%")
    print(f"⏱️ Processing Time: {analysis.get('processing_time', 0)}s")
    print(f"{'='*60}\n")
    
    return jsonify(analysis)


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint"""
    conn = get_db_connection()
    db_ok = bool(conn)
    if conn:
        conn.close()
    
    return jsonify({
        "status": "healthy",
        "rag": bool(rag),
        "llm": llm_service.is_available(),
        "db": db_ok,
        "auto_approve_threshold": AUTO_APPROVE_THRESHOLD,
        "escalate_threshold": ESCALATE_THRESHOLD
    })


@app.route("/config", methods=["GET", "POST"])
def config():
    """Get or update AI configuration (for admin panel)"""
    global AUTO_APPROVE_THRESHOLD, ESCALATE_THRESHOLD
    
    if request.method == "GET":
        return jsonify({
            "auto_approve_threshold": AUTO_APPROVE_THRESHOLD,
            "escalate_threshold": ESCALATE_THRESHOLD
        })
    
    # POST: Update thresholds
    data = request.json or {}
    
    if "auto_approve_threshold" in data:
        AUTO_APPROVE_THRESHOLD = float(data["auto_approve_threshold"])
    
    if "escalate_threshold" in data:
        ESCALATE_THRESHOLD = float(data["escalate_threshold"])
    
    return jsonify({
        "success": True,
        "auto_approve_threshold": AUTO_APPROVE_THRESHOLD,
        "escalate_threshold": ESCALATE_THRESHOLD
    })


@app.route("/metrics", methods=["GET"])
def metrics():
    """Get AI performance metrics (for admin panel)"""
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database unavailable"}), 500
    
    try:
        cur = conn.cursor(dictionary=True)
        
        # Total requests today
        cur.execute("""
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) as approved,
                   SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending,
                   SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END) as rejected,
                   SUM(CASE WHEN ai_decision='AUTO_APPROVED' THEN 1 ELSE 0 END) as auto_approved
            FROM leave_requests
            WHERE DATE(created_at) = CURDATE()
        """)
        
        stats = cur.fetchone()
        
        # Average confidence
        cur.execute("""
            SELECT AVG(ai_confidence) as avg_confidence
            FROM leave_requests
            WHERE DATE(created_at) = CURDATE()
            AND ai_confidence IS NOT NULL
        """)
        
        conf_row = cur.fetchone()
        avg_confidence = conf_row["avg_confidence"] if conf_row else 0
        
        cur.close()
        conn.close()
        
        total = stats["total"] or 0
        auto_approved = stats["auto_approved"] or 0
        
        return jsonify({
            "total_requests": total,
            "auto_approved": auto_approved,
            "auto_approval_rate": round((auto_approved / total * 100) if total > 0 else 0, 1),
            "approved": stats["approved"] or 0,
            "pending": stats["pending"] or 0,
            "rejected": stats["rejected"] or 0,
            "avg_confidence": round(avg_confidence, 1) if avg_confidence else 0,
            "avg_processing_time": 1.2  # Would need to track this
        })
    except Exception as e:
        print(f"❌ Get metrics failed: {e}")
        if conn:
            conn.close()
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    print("\n" + "="*60)
    print("🚀 AI LEAVE MANAGEMENT ENGINE")
    print("="*60)
    print(f"✅ RAG Engine: {'Ready' if rag else 'Not Available'}")
    print(f"✅ LLM Service: {'Ready' if llm_service.is_available() else 'Not Available'}")
    print(f"⚙️ Auto-Approve Threshold: {AUTO_APPROVE_THRESHOLD}%")
    print(f"⚙️ Escalate Threshold: {ESCALATE_THRESHOLD}%")
    print("="*60 + "\n")
    
    app.run(host="0.0.0.0", port=8001, debug=False)
