# 🔌 API Reference - AI Leave Management System

## 📋 Table of Contents
1. [Backend API (PHP)](#backend-api-php)
2. [AI Engine API (Python)](#ai-engine-api-python)
3. [Request/Response Examples](#requestresponse-examples)
4. [Error Handling](#error-handling)
5. [Authentication](#authentication)

---

## 🌐 Backend API (PHP)

**Base URL**: `http://localhost/Company/app/api/`

### **Authentication**
All endpoints require session authentication. Login first to get a session cookie.

---

### **1. POST `/leaves/ai-quick-check`**

**Description**: Analyze leave request using AI and return comprehensive decision.

**Request**:
```json
{
  "text": "I need tomorrow off for a doctor appointment"
}
```

**Response**:
```json
{
  "success": true,
  "status": "AUTO_APPROVED",
  "confidence": 95,
  "leave_type": "Medical",
  "start_date": "2025-01-23",
  "end_date": "2025-01-23",
  "leave_days": 1,
  "balance_before": 10,
  "balance_after": 9,
  "team_capacity": 75,
  "emotional_tone": "professional",
  "urgency_level": "medium",
  "professional_reason": "Medical appointment requiring time off for health consultation.",
  "issues": [],
  "suggestions": [
    "Consider scheduling follow-up appointments in advance",
    "Notify your team lead before the appointment"
  ],
  "processing_time": 0.356
}
```

**Status Codes**:
- `AUTO_APPROVED`: Automatically approved (confidence ≥85%)
- `ESCALATE_TO_MANAGER`: Needs manager review (60-84%)
- `ESCALATE_TO_HR`: Needs HR review (40-59%)
- `REJECTED`: Not recommended (<40%)
- `NEEDS_INFO`: Missing critical information

**Error Response**:
```json
{
  "success": false,
  "message": "AI engine is not available"
}
```

---

### **2. POST `/leaves/suggest-dates`**

**Description**: Get AI-suggested optimal dates for leave request.

**Request**:
```json
{
  "text": "I want to take a week off for vacation",
  "preferred_month": "March"
}
```

**Response**:
```json
{
  "success": true,
  "suggestions": [
    {
      "start_date": "2025-03-10",
      "end_date": "2025-03-14",
      "reason": "Low team workload, no conflicts",
      "team_capacity": 85,
      "confidence": 92
    },
    {
      "start_date": "2025-03-17",
      "end_date": "2025-03-21",
      "reason": "Moderate team workload",
      "team_capacity": 70,
      "confidence": 78
    }
  ]
}
```

---

### **3. POST `/leaves/ai-chat`**

**Description**: Chat with AI assistant about leave policies.

**Request**:
```json
{
  "message": "How many vacation days do I have left?",
  "conversation_id": "conv_12345"
}
```

**Response**:
```json
{
  "success": true,
  "response": "Based on your current balance, you have 8 vacation days remaining for this year. You've used 12 out of your 20 annual vacation days.",
  "context": {
    "total_days": 20,
    "used_days": 12,
    "remaining_days": 8
  },
  "conversation_id": "conv_12345"
}
```

---

### **4. POST `/leaves/submit`**

**Description**: Submit a leave request (with or without AI pre-analysis).

**Request**:
```json
{
  "leave_type": "Vacation",
  "start_date": "2025-03-10",
  "end_date": "2025-03-14",
  "reason": "Family vacation",
  "ai_analysis": {
    "status": "AUTO_APPROVED",
    "confidence": 95,
    "professional_reason": "Planned family vacation with advance notice"
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Leave request submitted successfully",
  "request_id": 12345,
  "status": "approved",
  "ai_decision": "AUTO_APPROVED"
}
```

---

### **5. GET `/leaves/my-requests`**

**Description**: Get all leave requests for the logged-in user.

**Response**:
```json
{
  "success": true,
  "requests": [
    {
      "id": 12345,
      "leave_type": "Vacation",
      "start_date": "2025-03-10",
      "end_date": "2025-03-14",
      "status": "approved",
      "ai_confidence": 95,
      "submitted_at": "2025-01-22 10:30:00"
    }
  ]
}
```

---

### **6. GET `/leaves/balance`**

**Description**: Get leave balance for the logged-in user.

**Response**:
```json
{
  "success": true,
  "balances": {
    "Vacation": {
      "total": 20,
      "used": 12,
      "remaining": 8
    },
    "Sick": {
      "total": 10,
      "used": 3,
      "remaining": 7
    },
    "Personal": {
      "total": 5,
      "used": 1,
      "remaining": 4
    }
  }
}
```

---

## 🤖 AI Engine API (Python)

**Base URL**: `http://localhost:8001/`

**Technology**: FastAPI (Python)

---

### **1. POST `/analyze-leave`**

**Description**: Core AI analysis endpoint for leave requests.

**Request**:
```json
{
  "text": "I need sick leave from January 25 to January 27 for a medical procedure",
  "user_id": 123,
  "context": {
    "current_balance": 10,
    "team_size": 5,
    "team_on_leave": 1
  }
}
```

**Response**:
```json
{
  "status": "AUTO_APPROVED",
  "confidence": 92,
  "leave_type": "Sick",
  "start_date": "2025-01-25",
  "end_date": "2025-01-27",
  "leave_days": 3,
  "balance_before": 10,
  "balance_after": 7,
  "team_capacity": 80,
  "emotional_tone": "professional",
  "urgency_level": "high",
  "professional_reason": "Medical procedure requiring three days of recovery time.",
  "issues": [],
  "suggestions": [
    "Provide medical certificate if required by policy",
    "Inform team lead about coverage during absence"
  ],
  "processing_time": 0.342,
  "nlp_method": "spacy",
  "entities_extracted": {
    "dates": ["2025-01-25", "2025-01-27"],
    "leave_type": "Sick",
    "reason_keywords": ["medical", "procedure"]
  }
}
```

**AI Decision Logic**:
```python
if confidence >= 85 and no_conflicts and sufficient_balance:
    status = "AUTO_APPROVED"
elif confidence >= 60:
    status = "ESCALATE_TO_MANAGER"
elif confidence >= 40:
    status = "ESCALATE_TO_HR"
else:
    status = "REJECTED" or "NEEDS_INFO"
```

---

### **2. POST `/suggest-dates`**

**Description**: Suggest optimal dates based on team capacity and workload.

**Request**:
```json
{
  "text": "I want to take a week off for vacation",
  "user_id": 123,
  "preferred_month": "March",
  "duration_days": 5
}
```

**Response**:
```json
{
  "suggestions": [
    {
      "start_date": "2025-03-10",
      "end_date": "2025-03-14",
      "reason": "Low team workload (15% on leave)",
      "team_capacity": 85,
      "confidence": 92,
      "pros": [
        "No team conflicts",
        "Low workload period",
        "No major deadlines"
      ],
      "cons": []
    },
    {
      "start_date": "2025-03-17",
      "end_date": "2025-03-21",
      "reason": "Moderate team workload (30% on leave)",
      "team_capacity": 70,
      "confidence": 78,
      "pros": [
        "Acceptable team capacity"
      ],
      "cons": [
        "One team member already on leave"
      ]
    }
  ]
}
```

---

### **3. POST `/chat`**

**Description**: Conversational AI for leave policy questions.

**Request**:
```json
{
  "message": "What's the policy for sick leave?",
  "user_id": 123,
  "conversation_id": "conv_12345",
  "context": {
    "previous_messages": []
  }
}
```

**Response**:
```json
{
  "response": "According to company policy, employees are entitled to 10 sick leave days per year. Sick leave can be taken for medical appointments, illness, or recovery. For absences longer than 3 consecutive days, a medical certificate is required.",
  "sources": [
    {
      "document": "Employee Handbook 2025",
      "section": "Leave Policies - Sick Leave",
      "page": 12
    }
  ],
  "confidence": 95,
  "conversation_id": "conv_12345",
  "follow_up_questions": [
    "Can I carry over unused sick leave?",
    "What if I run out of sick leave days?",
    "Do I need a doctor's note for one day?"
  ]
}
```

**RAG (Retrieval-Augmented Generation)**:
- Uses ChromaDB for semantic search
- Retrieves relevant policy documents
- Generates contextual responses
- Cites sources for transparency

---

### **4. GET `/health`**

**Description**: Health check endpoint for monitoring.

**Response**:
```json
{
  "status": "healthy",
  "services": {
    "nlp_engine": "ACTIVE",
    "vector_db": "LOADED",
    "rag_system": "READY",
    "llm": "NOT_CONFIGURED"
  },
  "metrics": {
    "total_requests": 1234,
    "avg_response_time": 0.258,
    "uptime_seconds": 86400
  },
  "version": "1.0.0"
}
```

---

### **5. GET `/metrics`**

**Description**: Detailed performance metrics.

**Response**:
```json
{
  "requests": {
    "total": 1234,
    "analyze_leave": 890,
    "suggest_dates": 234,
    "chat": 110
  },
  "performance": {
    "avg_response_time": 0.258,
    "p50_response_time": 0.210,
    "p95_response_time": 0.450,
    "p99_response_time": 0.680
  },
  "nlp": {
    "spacy_calls": 890,
    "llm_calls": 0,
    "fallback_rate": 0.0
  },
  "errors": {
    "total": 12,
    "rate": 0.01
  }
}
```

---

## 📝 Request/Response Examples

### **Example 1: Simple Leave Request**

**Input**:
```
"I need tomorrow off"
```

**AI Analysis**:
```json
{
  "status": "NEEDS_INFO",
  "confidence": 30,
  "leave_type": null,
  "start_date": "2025-01-23",
  "end_date": "2025-01-23",
  "issues": [
    "Leave type not specified",
    "Reason not provided"
  ],
  "suggestions": [
    "Please specify the type of leave (Vacation, Sick, Personal)",
    "Provide a reason for the leave request"
  ]
}
```

---

### **Example 2: Detailed Leave Request**

**Input**:
```
"I need sick leave from January 25 to January 27 for a scheduled surgery. I've already informed my team and arranged coverage."
```

**AI Analysis**:
```json
{
  "status": "AUTO_APPROVED",
  "confidence": 98,
  "leave_type": "Sick",
  "start_date": "2025-01-25",
  "end_date": "2025-01-27",
  "leave_days": 3,
  "emotional_tone": "professional",
  "urgency_level": "high",
  "professional_reason": "Scheduled surgical procedure requiring three days of medical leave and recovery.",
  "issues": [],
  "suggestions": [
    "Excellent communication with team",
    "Consider providing medical certificate as per policy"
  ]
}
```

---

### **Example 3: Conflicting Request**

**Input**:
```
"I need vacation from March 10-14"
```

**AI Analysis** (when team member already on leave):
```json
{
  "status": "ESCALATE_TO_MANAGER",
  "confidence": 65,
  "leave_type": "Vacation",
  "start_date": "2025-03-10",
  "end_date": "2025-03-14",
  "team_capacity": 60,
  "issues": [
    "Team capacity will be 60% (below 70% threshold)",
    "John Doe is already on leave during this period"
  ],
  "suggestions": [
    "Consider alternative dates: March 17-21",
    "Discuss with manager about workload coverage"
  ]
}
```

---

## ⚠️ Error Handling

### **Backend API Errors**

#### **401 Unauthorized**
```json
{
  "success": false,
  "message": "Please login to continue"
}
```

#### **400 Bad Request**
```json
{
  "success": false,
  "message": "Missing required field: text"
}
```

#### **500 Internal Server Error**
```json
{
  "success": false,
  "message": "AI engine is not available",
  "error_code": "AI_ENGINE_DOWN"
}
```

---

### **AI Engine Errors**

#### **422 Validation Error**
```json
{
  "detail": [
    {
      "loc": ["body", "text"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

#### **503 Service Unavailable**
```json
{
  "detail": "NLP engine is not initialized"
}
```

---

## 🔐 Authentication

### **Session-Based Authentication**

#### **Login**
```javascript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'employee@test.com',
    password: 'password'
  })
});
```

#### **Authenticated Request**
```javascript
const response = await fetch('/api/leaves/ai-quick-check', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // Include session cookie
  body: JSON.stringify({
    text: 'I need tomorrow off'
  })
});
```

---

## 🧪 Testing with cURL

### **Test AI Engine Health**
```bash
curl http://localhost:8001/health
```

### **Test Leave Analysis**
```bash
curl -X POST http://localhost:8001/analyze-leave \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I need sick leave tomorrow for a doctor appointment",
    "user_id": 123
  }'
```

### **Test Backend API** (requires session)
```bash
curl -X POST http://localhost/Company/app/api/leaves.php \
  -H "Content-Type: application/json" \
  -b "PHPSESSID=your_session_id" \
  -d '{
    "action": "ai-quick-check",
    "text": "I need tomorrow off"
  }'
```

---

## 📊 Rate Limits

**Current**: No rate limits implemented

**Recommended for Production**:
- Employee: 100 requests/hour
- HR: 500 requests/hour
- Admin: Unlimited

---

## 🔄 Versioning

**Current Version**: `1.0.0`

**API Versioning Strategy**:
- Backend: `/api/v1/leaves/...`
- AI Engine: `/v1/analyze-leave`

**Backward Compatibility**:
- All v1 endpoints will be supported for at least 6 months after v2 release

---

## 📚 Additional Resources

- **Interactive API Docs**: http://localhost:8001/docs (Swagger UI)
- **ReDoc**: http://localhost:8001/redoc
- **Health Check**: http://localhost:8001/health

---

**Last Updated**: January 22, 2025
**Version**: 1.0.0
