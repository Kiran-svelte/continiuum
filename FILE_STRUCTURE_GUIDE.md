# 📁 Company Application - File Structure Guide

## 🎯 Quick Overview

Your application has a **3-tier architecture**:
1. **Frontend** (`app/` folder) - HTML/CSS/JavaScript pages
2. **Backend API** (`backend/src/` folder) - Node.js/Express server
3. **AI Services** (`backend/ai-services/` folder) - Python Flask microservices

---

## 🌐 FRONTEND FILES (User Interface)

**Location:** `c:\xampp\htdocs\Company\app\pages\`

### 👨‍💼 Employee Panel
| File | Purpose | What to Change |
|------|---------|----------------|
| `employee/dashboard.html` | Employee home page with stats & AI chat | UI layout, charts, AI chat interface |
| `employee/leave-request.html` | Submit leave requests (AI-powered) | Leave form, AI analysis display |
| `employee/leaves.html` | View leave history & status | Leave list table, filters |
| `employee/attendance.html` | View attendance records | Attendance calendar, stats |
| `employee/profile.html` | Employee profile & settings | Profile form, personal info |
| `employee/onboarding.html` | New employee onboarding flow | Onboarding steps, documents |

### 👔 HR Panel
| File | Purpose | What to Change |
|------|---------|----------------|
| `hr/dashboard.html` | HR overview with analytics | HR metrics, team stats |
| `hr/leave-requests.html` | Manage leave requests (Kanban board) | Request cards, approval workflow |
| `hr/employees.html` | Employee management | Employee list, CRUD operations |
| `hr/recruitment.html` | Recruitment & hiring | Job postings, candidate tracking |
| `hr/performance.html` | Performance reviews | Review forms, ratings |
| `hr/reports.html` | HR reports & analytics | Report generation, charts |

### 🔐 Admin Panel
| File | Purpose | What to Change |
|------|---------|----------------|
| `admin/dashboard.html` | Admin control center | System metrics, admin tools |
| `admin/users.html` | User management | User CRUD, roles, permissions |
| `admin/ai-control.html` | AI agent monitoring & control | AI agent status, training |
| `admin/security.html` | Security settings | Security configs, logs |
| `admin/system.html` | System settings | App configuration |

### 🎨 Shared Assets
- `app/assets/css/` - Stylesheets
- `app/assets/js/` - JavaScript utilities
- `app/index.html` - Login page

---

## ⚙️ BACKEND API FILES (Node.js Server)

**Location:** `c:\xampp\htdocs\Company\backend\src\`

### 🛣️ Routes (API Endpoints)
| File | Purpose | Endpoints |
|------|---------|-----------|
| `routes/authRoutes.js` | Authentication | `/api/auth/login`, `/api/auth/register` |
| `routes/leaves.routes.js` | Leave management | `/api/leaves/*` (CRUD + AI) |
| `routes/ai.routes.js` | AI proxy routes | `/api/ai/*` (forwards to Python services) |
| `routes/users.routes.js` | User management | `/api/users/*` |
| `routes/onboarding.routes.js` | Onboarding | `/api/onboarding/*` |
| `routes/recruitment.routes.js` | Recruitment | `/api/recruitment/*` |
| `routes/performance.routes.js` | Performance | `/api/performance/*` |

### 🎮 Controllers (Business Logic)
| File | Purpose | What It Does |
|------|---------|--------------|
| `controllers/authController.js` | Authentication logic | Login, register, JWT tokens |
| `controllers/leaves.controller.js` | Leave request logic | CRUD + AI integration |

### 🔧 Services (Reusable Logic)
| File | Purpose | What It Does |
|------|---------|--------------|
| `services/AIProxyService.js` | **AI service connector** | Forwards requests to Python AI services |
| `services/LeaveBalanceService.js` | Leave balance calculations | Calculate remaining leaves |
| `services/rag/RagEngine.js` | RAG engine (Node.js side) | Policy retrieval, embeddings |
| `services/rag/DateExtractor.js` | Date parsing | Extract dates from text |
| `services/rag/EmbeddingService.js` | Text embeddings | Convert text to vectors |
| `services/rag/VectorDBService.js` | Vector database | Store/search embeddings |

### 🔐 Middleware
| File | Purpose |
|------|---------|
| `middleware/authMiddleware.js` | JWT authentication, role checks |

### ⚙️ Config
| File | Purpose |
|------|---------|
| `config/db.js` | MySQL database connection |
| `config/constants.js` | App constants |

### 🚀 Entry Point
| File | Purpose |
|------|---------|
| `backend/server.js` | **Main Node.js server** (starts on port 3000) |

---

## 🤖 AI SERVICES (Python Microservices)

**Location:** `c:\xampp\htdocs\Company\backend\ai-services\`

### 🧠 AI Agent Services
| File | Port | Purpose | What It Does |
|------|------|---------|--------------|
| `leave-agent/server.py` | **8001** | **Leave AI Agent** | Analyzes leave requests, policy validation, recommendations |
| `leave-agent/slack_bot.py` | - | Slack integration | Send notifications to Slack |
| `onboarding-agent/server.py` | 8003 | Onboarding AI | New employee onboarding assistance |
| `recruitment-agent/server.py` | 8004 | Recruitment AI | Resume screening, candidate matching |
| `performance-agent/server.py` | 8006 | Performance AI | Performance review analysis |
| `control-center/server.py` | 8007 | AI Control Center | Monitor all AI agents |

### 🧩 Shared AI Components
| File | Purpose |
|------|---------|
| `llm_service.py` | **LLM wrapper** (OpenAI/Gemini API calls) |
| `rag_engine.py` | **RAG engine** (retrieval-augmented generation) |
| `test_llm_rag.py` | Test AI services |

---

## 🔄 DATA FLOW: How Everything Connects

### Example: Employee Submits Leave Request

```
1. FRONTEND (employee/leave-request.html)
   ↓ User fills form & clicks "Submit"
   ↓ JavaScript sends POST request
   
2. BACKEND API (Node.js)
   ↓ routes/leaves.routes.js receives request
   ↓ controllers/leaves.controller.js processes it
   ↓ services/AIProxyService.js forwards to AI
   
3. AI SERVICE (Python)
   ↓ leave-agent/server.py receives request
   ↓ rag_engine.py retrieves company policies
   ↓ llm_service.py analyzes with AI
   ↓ Returns recommendation
   
4. BACKEND API (Node.js)
   ↓ Saves to MySQL database
   ↓ Returns response to frontend
   
5. FRONTEND
   ✅ Displays AI analysis & confirmation
```

---

## 📝 WHAT FILES TO CHANGE FOR COMMON TASKS

### 🎨 Change UI/Design
**Files:** `app/pages/**/*.html` + `app/assets/css/*.css`

### 🔧 Add New API Endpoint
1. Create route in `backend/src/routes/*.routes.js`
2. Add controller in `backend/src/controllers/*.controller.js`
3. Update frontend to call new endpoint

### 🤖 Modify AI Behavior
**Files:** `backend/ai-services/leave-agent/server.py`
- Change AI prompts
- Modify policy validation logic
- Adjust scoring algorithms

### 📊 Change Database Schema
1. Update `backend/src/config/db.js`
2. Create migration in `backend/migrations/`
3. Update models/services

### 🔐 Change Authentication
**Files:** 
- `backend/src/controllers/authController.js`
- `backend/src/middleware/authMiddleware.js`

### 📧 Add Notifications
**Files:**
- `backend/ai-services/leave-agent/slack_bot.py` (Slack)
- Create new service for email/SMS

---

## 🚀 STARTUP FILES

| File | Purpose |
|------|---------|
| `start_all.bat` | **Start everything** (Node.js + all AI services) |
| `start_ai_services.bat` | Start only AI services |
| `backend/server.js` | Start only Node.js backend |

---

## 🗄️ DATABASE

**Type:** MySQL  
**Connection:** `backend/src/config/db.js`  
**Tables:** users, leaves, employees, attendance, etc.

---

## 📦 DEPENDENCIES

### Frontend
- Pure HTML/CSS/JavaScript (no framework)
- Chart.js for charts
- Custom animations

### Backend (Node.js)
- Express.js - Web framework
- MySQL2 - Database driver
- jsonwebtoken - JWT auth
- axios - HTTP client

### AI Services (Python)
- Flask - Web framework
- OpenAI/Gemini - LLM APIs
- sentence-transformers - Embeddings
- chromadb - Vector database

---

## 🎯 KEY INTEGRATION POINTS

### Frontend ↔ Backend
- **Authentication:** `app/index.html` → `backend/src/routes/authRoutes.js`
- **Leave Requests:** `app/pages/employee/leave-request.html` → `backend/src/routes/leaves.routes.js`
- **AI Chat:** All dashboards → `backend/src/routes/ai.routes.js`

### Backend ↔ AI Services
- **Proxy:** `backend/src/services/AIProxyService.js` → `backend/ai-services/*/server.py`
- **Ports:** Node.js (3000) → Python services (8001, 8003, 8004, 8006, 8007)

---

## 🔍 QUICK REFERENCE

### Most Important Files

**For UI Changes:**
- `app/pages/employee/dashboard.html` - Employee main page
- `app/pages/hr/leave-requests.html` - HR leave management
- `app/pages/admin/ai-control.html` - Admin AI control

**For Backend Logic:**
- `backend/src/controllers/leaves.controller.js` - Leave logic
- `backend/src/services/AIProxyService.js` - AI integration

**For AI Behavior:**
- `backend/ai-services/leave-agent/server.py` - **Main AI agent**
- `backend/ai-services/llm_service.py` - LLM calls
- `backend/ai-services/rag_engine.py` - Policy retrieval

**For Configuration:**
- `backend/.env` - Environment variables
- `backend/src/config/db.js` - Database config

---

## 📞 Need Help?

**Check these docs:**
- `README.md` - Project overview
- `QUICK_START_GUIDE.md` - Getting started
- `API_REFERENCE.md` - API documentation
- `AI_LEAVE_WORKFLOW_VISUAL.md` - AI workflow details

**Common issues:**
- `WHY_AI_NOT_WORKING.md` - AI troubleshooting
- `WHY_ERRORS_EXPLAINED.md` - Error explanations
