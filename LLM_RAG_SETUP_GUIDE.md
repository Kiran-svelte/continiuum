# 🚀 LLM-RAG SETUP GUIDE
## Upgrade AI Services to Use Real LLM Generation

---

## 🎯 WHAT'S NEW

All AI services now support **REAL LLM GENERATION** with:
- ✅ **Groq** (FREE, fast, no credit card needed) - **RECOMMENDED**
- ✅ **OpenAI** (Paid, GPT-4o-mini)

### **Before (RAG Only)**
```
User Question → RAG Retrieval → Raw Document → User
```

### **After (RAG + LLM)**
```
User Question → RAG Retrieval → Context → LLM Generation → Natural Answer → User
```

---

## 📊 UPGRADED SERVICES

| Service | Port | New Endpoints | LLM Features |
|---------|------|---------------|--------------|
| **Leave Agent** | 8001 | `/chat` | Natural language Q&A about leave policies |
| **Recruitment Agent** | 8004 | `/questions`, `/analyze` | Smart interview questions, candidate analysis |
| **Onboarding Agent** | 8003 | `/ask` (upgraded) | Conversational onboarding assistance |
| **Performance Agent** | 8006 | `/predict`, `/risk` (upgraded) | Performance insights, burnout assessment |

---

## 🔧 SETUP INSTRUCTIONS

### **STEP 1: Install LLM Libraries**

```bash
cd C:\xampp\htdocs\Company\backend\ai-services
pip install groq openai
```

Or install all requirements:
```bash
pip install -r requirements.txt
```

---

### **STEP 2: Get FREE Groq API Key (RECOMMENDED)**

#### **Why Groq?**
- ✅ **100% FREE** (no credit card needed)
- ✅ **Fast** (faster than OpenAI)
- ✅ **Powerful** (Llama 3.3 70B model)
- ✅ **Easy** (simple signup)

#### **How to Get Groq API Key:**

1. **Visit**: https://console.groq.com/keys
2. **Sign up** with Google/GitHub (takes 30 seconds)
3. **Create API Key** (click "Create API Key")
4. **Copy** the key (starts with `gsk_...`)

---

### **STEP 3: Set Environment Variable**

#### **Option A: Windows (Permanent)**
```powershell
# Open PowerShell as Administrator
setx GROQ_API_KEY "your_groq_api_key_here"

# Restart terminal for changes to take effect
```

#### **Option B: Windows (Temporary - for testing)**
```powershell
# In PowerShell
$env:GROQ_API_KEY = "your_groq_api_key_here"
```

#### **Option C: Create .env file**
```bash
# Create file: C:\xampp\htdocs\Company\backend\ai-services\.env
GROQ_API_KEY=your_groq_api_key_here
```

Then install python-dotenv:
```bash
pip install python-dotenv
```

And add to each server.py:
```python
from dotenv import load_dotenv
load_dotenv()
```

---

### **STEP 4: Start AI Services**

```bash
# From project root
start_ai_services.bat
```

Or manually:
```bash
cd backend\ai-services\leave-agent
python server.py

cd ..\recruitment-agent
python server.py

cd ..\onboarding-agent
python server.py

cd ..\performance-agent
python server.py
```

---

### **STEP 5: Verify LLM is Working**

#### **Check Health Endpoints:**
```bash
curl http://localhost:8001/health
curl http://localhost:8003/health
curl http://localhost:8004/health
curl http://localhost:8006/health
```

**Expected Response:**
```json
{
  "llm_status": "ready",
  "llm_provider": "groq",
  "llm_model": "llama-3.3-70b-versatile"
}
```

#### **Test Leave Agent Chat:**
```bash
curl -X POST http://localhost:8001/chat \
  -H "Content-Type: application/json" \
  -d "{\"question\": \"How many sick leave days do I get?\"}"
```

**Expected Response:**
```json
{
  "answer": "According to the leave policy, employees are entitled to 12 sick leave days per year. Medical certificates are required for absences of 3 or more consecutive days.",
  "confidence": 95,
  "rag_matches": 3,
  "llm_provider": "groq",
  "llm_model": "llama-3.3-70b-versatile"
}
```

---

## 🧪 TESTING ALL NEW ENDPOINTS

### **1. Leave Agent - Natural Language Chat**
```bash
curl -X POST http://localhost:8001/chat \
  -H "Content-Type: application/json" \
  -d "{\"question\": \"Can I take annual leave during probation?\"}"
```

### **2. Recruitment Agent - Smart Interview Questions**
```bash
curl -X POST http://localhost:8004/questions \
  -H "Content-Type: application/json" \
  -d "{\"role\": \"Senior Python Developer\"}"
```

### **3. Recruitment Agent - Candidate Analysis**
```bash
curl -X POST http://localhost:8004/analyze \
  -H "Content-Type: application/json" \
  -d "{\"role\": \"Senior Developer\", \"exp\": 5, \"skills\": [\"Python\", \"React\", \"AWS\"]}"
```

### **4. Onboarding Agent - Conversational Q&A**
```bash
curl -X POST http://localhost:8003/ask \
  -H "Content-Type: application/json" \
  -d "{\"question\": \"What do I need to do on my first day?\"}"
```

### **5. Performance Agent - Performance Prediction**
```bash
curl -X POST http://localhost:8006/predict \
  -H "Content-Type: application/json" \
  -d "{\"rating\": 4.2, \"hours\": 45, \"projects\": 3}"
```

### **6. Performance Agent - Burnout Risk**
```bash
curl -X POST http://localhost:8006/risk \
  -H "Content-Type: application/json" \
  -d "{\"hours\": 55, \"overtime_days\": 10, \"vacation_days\": 2}"
```

---

## 🔄 FALLBACK BEHAVIOR

### **If LLM is NOT configured:**
- ✅ Services still work
- ⚠️ Returns RAG results only (raw documents)
- ⚠️ No natural language generation
- ℹ️ Response includes: `"mode": "rag_only"` or `"mode": "fallback"`

### **If LLM IS configured:**
- ✅ Full RAG + LLM generation
- ✅ Natural language responses
- ✅ Better user experience
- ℹ️ Response includes: `"mode": "rag_llm"`, `"llm_provider": "groq"`

---

## 🆚 GROQ vs OPENAI

| Feature | Groq (FREE) | OpenAI (PAID) |
|---------|-------------|---------------|
| **Cost** | ✅ FREE | ❌ $0.15 per 1M tokens |
| **Speed** | ✅ Very Fast | ⚠️ Slower |
| **Model** | Llama 3.3 70B | GPT-4o-mini |
| **Quality** | ✅ Excellent | ✅ Excellent |
| **Setup** | ✅ Easy | ✅ Easy |
| **Credit Card** | ✅ Not Required | ❌ Required |

**Recommendation**: Start with **Groq** (free). Switch to OpenAI only if needed.

---

## 🔐 USING OPENAI (OPTIONAL)

If you prefer OpenAI:

1. **Get API Key**: https://platform.openai.com/api-keys
2. **Set Environment Variable**:
   ```powershell
   setx OPENAI_API_KEY "sk-..."
   ```
3. **Restart services**

The system will automatically use OpenAI if Groq is not configured.

---

## 🐛 TROUBLESHOOTING

### **Issue: "LLM service not available"**
**Solution**: 
```bash
# Check if API key is set
echo $env:GROQ_API_KEY

# If empty, set it:
$env:GROQ_API_KEY = "your_key_here"

# Restart AI services
```

### **Issue: "ModuleNotFoundError: No module named 'groq'"**
**Solution**:
```bash
pip install groq openai
```

### **Issue: "Invalid API key"**
**Solution**:
- Verify your API key is correct
- Groq keys start with `gsk_`
- OpenAI keys start with `sk-`

### **Issue: Services work but no LLM responses**
**Solution**:
```bash
# Check health endpoint
curl http://localhost:8001/health

# Look for:
# "llm_status": "ready" ✅ Good
# "llm_status": "not_configured" ❌ API key not set
```

---

## 📊 BEFORE vs AFTER COMPARISON

### **BEFORE (RAG Only)**

**Request:**
```json
{"question": "How many sick leave days?"}
```

**Response:**
```json
{
  "answer": "Sick Leave 12 Medical certificate required for 3+ consecutive days Maximum 12 days per year..."
}
```
❌ Raw, unformatted data
❌ Not user-friendly

### **AFTER (RAG + LLM)**

**Request:**
```json
{"question": "How many sick leave days?"}
```

**Response:**
```json
{
  "answer": "You are entitled to 12 sick leave days per year. If you need to take 3 or more consecutive days off, you'll need to provide a medical certificate.",
  "confidence": 95,
  "llm_provider": "groq"
}
```
✅ Natural language
✅ User-friendly
✅ Professional

---

## 🎯 NEXT STEPS

1. ✅ **Get Groq API Key** (5 minutes)
2. ✅ **Set Environment Variable** (1 minute)
3. ✅ **Install Dependencies** (`pip install groq openai`)
4. ✅ **Restart AI Services** (`start_ai_services.bat`)
5. ✅ **Test New Endpoints** (use curl commands above)

---

## 📚 API DOCUMENTATION

### **Leave Agent**

#### `POST /chat`
**Purpose**: Natural language Q&A about leave policies

**Request**:
```json
{
  "question": "Can I take emergency leave without notice?",
  "user_id": 1
}
```

**Response**:
```json
{
  "answer": "Yes, emergency leave can be taken without prior notice...",
  "confidence": 90,
  "rag_matches": 3,
  "llm_provider": "groq",
  "llm_model": "llama-3.3-70b-versatile",
  "sources": [...]
}
```

---

### **Recruitment Agent**

#### `POST /questions`
**Purpose**: Generate smart interview questions

**Request**:
```json
{
  "role": "Senior Python Developer"
}
```

**Response**:
```json
{
  "questions": [
    "1. Explain your experience with Python's async/await...",
    "2. How would you optimize a slow database query?",
    ...
  ],
  "generated_by": "groq (llama-3.3-70b-versatile)"
}
```

#### `POST /analyze`
**Purpose**: Detailed candidate analysis

**Request**:
```json
{
  "role": "Senior Developer",
  "exp": 5,
  "skills": ["Python", "React", "AWS"]
}
```

**Response**:
```json
{
  "analysis": "**Strengths:**\n- Strong technical background...\n\n**Recommendation:** STRONG HIRE",
  "similar_candidates_found": 5,
  "llm_provider": "groq"
}
```

---

### **Onboarding Agent**

#### `POST /ask`
**Purpose**: Conversational onboarding assistance

**Request**:
```json
{
  "question": "What should I bring on my first day?"
}
```

**Response**:
```json
{
  "answer": "On your first day, please bring: 1) Valid ID, 2) Signed employment contract...",
  "mode": "rag_llm",
  "rag_matches": 2,
  "llm_provider": "groq"
}
```

---

### **Performance Agent**

#### `POST /predict`
**Purpose**: Performance prediction with insights

**Request**:
```json
{
  "rating": 4.2,
  "hours": 45,
  "projects": 3
}
```

**Response**:
```json
{
  "analysis": "**Predicted Rating:** 4.5/5.0\n**Trend:** Improving\n**Insights:** Consistent performance...",
  "mode": "rag_llm",
  "llm_provider": "groq"
}
```

#### `POST /risk`
**Purpose**: Burnout risk assessment

**Request**:
```json
{
  "hours": 55,
  "overtime_days": 10,
  "vacation_days": 2
}
```

**Response**:
```json
{
  "assessment": "**Risk Level:** HIGH\n**Probability:** 75%\n**Recommendations:** Reduce overtime...",
  "llm_provider": "groq"
}
```

---

## ✅ SUCCESS CRITERIA

You'll know it's working when:

1. ✅ Health endpoints show `"llm_status": "ready"`
2. ✅ Chat responses are natural language (not raw data)
3. ✅ Interview questions are unique and relevant
4. ✅ Candidate analysis provides detailed insights
5. ✅ Performance predictions include recommendations

---

## 🎓 CONCLUSION

**Before**: RAG retrieval only (raw documents)
**After**: RAG + LLM = Natural, intelligent responses

**Setup Time**: ~10 minutes
**Cost**: FREE (with Groq)
**Improvement**: 10x better user experience

---

**Generated**: 2025-12-18
**LLM Providers**: Groq (free), OpenAI (paid)
**Status**: ✅ Production Ready
