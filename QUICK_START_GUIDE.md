# 🚀 Quick Start Guide - AI Leave Management System

## 📋 Table of Contents
1. [Starting the System](#starting-the-system)
2. [Employee Guide](#employee-guide)
3. [HR Manager Guide](#hr-manager-guide)
4. [Admin Guide](#admin-guide)
5. [Troubleshooting](#troubleshooting)

---

## 🏁 Starting the System

### **Step 1: Start XAMPP**
1. Open **XAMPP Control Panel**
2. Click **Start** for:
   - ✅ Apache (Port 80)
   - ✅ MySQL (Port 3306)

### **Step 2: Start AI Engine**
Open Command Prompt and run:
```bash
cd C:\xampp\htdocs\Company\ai_engine
python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

**Or** double-click: `C:\xampp\htdocs\Company\ai_engine\start_ai_engine.bat`

### **Step 3: Verify Services**
- **Frontend**: http://localhost/Company/app/index.html
- **AI Engine Health**: http://localhost:8001/health
- **AI Engine Docs**: http://localhost:8001/docs

---

## 👤 Employee Guide

### **Login**
- **URL**: http://localhost/Company/app/index.html
- **Email**: employee@test.com
- **Password**: password

### **Request Leave with AI**

#### **Method 1: Natural Language (Recommended)** 🤖

1. Click **"Request Leave"** in the sidebar
2. Scroll to the **AI Assistant** section
3. Type your request in plain English:
   - *"I need 3 days off next week for a family vacation"*
   - *"I have a doctor appointment tomorrow"*
   - *"Can I take Friday off for personal reasons?"*
4. Click **"Ask AI for Quick Decision"** 🤖
5. Wait for AI analysis (usually <1 second)

#### **What You'll See**:
- ✅ **Decision**: AUTO-APPROVED / NEEDS REVIEW / NOT RECOMMENDED
- 📊 **Confidence Score**: How confident the AI is (0-100%)
- 📋 **Extracted Details**: Leave type, dates, duration
- 🧠 **AI Analysis**: Team capacity, urgency, emotional tone
- 📝 **Professional Reason**: AI-rewritten formal justification
- ⚠️ **Issues**: Any concerns detected (conflicts, low balance, etc.)
- 💡 **Suggestions**: Recommendations to improve your request

#### **Auto-Fill Magic** ✨
The AI automatically fills in:
- Leave type dropdown
- Start date
- End date
- Professional reason

#### **Method 2: Manual Form**
1. Select **Leave Type** from dropdown
2. Choose **Start Date** and **End Date**
3. Enter **Reason**
4. Click **Submit**

### **Other AI Features**

#### **AI Date Suggestions** 📅
1. Describe your leave need
2. Click **"Suggest Best Dates"**
3. AI analyzes team capacity and suggests optimal dates

#### **AI Chatbot** 💬
1. Click **"Chat with AI"** button
2. Ask questions about leave policies:
   - *"How many vacation days do I have left?"*
   - *"What's the policy for sick leave?"*
   - *"Can I carry over unused days?"*

---

## 👔 HR Manager Guide

### **Login**
- **URL**: http://localhost/Company/app/index.html
- **Email**: hr@company.com
- **Password**: hr123

### **Dashboard Features**

#### **AI Priority Queue** 🎯
The dashboard automatically sorts leave requests by:
1. **Low Confidence** (needs human review)
2. **High Urgency** (time-sensitive)
3. **High Team Impact** (affects multiple people)

#### **Quick Actions**
- ✅ **Approve**: One-click approval
- ❌ **Reject**: One-click rejection
- 📝 **Review**: View full AI analysis

### **Leave Request Management**

1. Click **"Leave Requests"** in sidebar
2. View all requests with filters:
   - **Status**: Pending / Approved / Rejected
   - **AI Decision**: AUTO_APPROVED / ESCALATE_TO_MANAGER / etc.
   - **Date Range**: Filter by submission date

3. Click on any request to see:
   - Employee details
   - AI analysis
   - Team impact
   - Recommended action

### **Bulk Actions**
- Select multiple requests
- Approve/reject in bulk
- Export to CSV

---

## 🔧 Admin Guide

### **Login**
- **URL**: http://localhost/Company/app/index.html
- **Email**: admin@company.com
- **Password**: admin123

### **System Monitor**

#### **AI Service Health** 🏥
Real-time monitoring of:
- ✅ **NLP Engine**: ACTIVE / INACTIVE
- ✅ **Vector DB**: LOADED / NOT_LOADED
- ✅ **RAG System**: READY / NOT_READY
- ⏱️ **Response Time**: Average processing time
- 📊 **Request Count**: Total AI requests

#### **Server Metrics**
- CPU usage
- Memory usage
- Disk space
- Network traffic

#### **Database Status**
- Connection status
- Query performance
- Table sizes

### **AI Configuration**

#### **Enable LLM (Optional)**
1. Get API key from Google AI Studio or OpenAI
2. Edit `ai_engine/.env`:
   ```
   GEMINI_API_KEY=your_key_here
   # OR
   OPENAI_API_KEY=your_key_here
   ```
3. Restart AI engine
4. Verify in System Monitor

#### **Adjust AI Sensitivity**
Edit `ai_engine/config.py`:
```python
# Auto-approval threshold (0-100)
AUTO_APPROVE_CONFIDENCE = 85  # Default: 85%

# Team capacity threshold
MAX_TEAM_CAPACITY = 80  # Default: 80%
```

---

## 🔍 Troubleshooting

### **Problem: "Failed to connect to AI engine"**

#### **Solution 1: Check if AI Engine is Running**
```bash
# Open browser and go to:
http://localhost:8001/health
```
If you see `{"status": "healthy"}`, the AI engine is running.

#### **Solution 2: Restart AI Engine**
```bash
cd C:\xampp\htdocs\Company\ai_engine
python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

#### **Solution 3: Check Port 8001**
```bash
netstat -ano | findstr :8001
```
If another process is using port 8001, kill it or change the AI engine port.

---

### **Problem: "AI response is slow"**

#### **Cause**: LLM API calls can be slow

#### **Solution**: The system works WITHOUT LLM using fallback NLP
- Response time without LLM: <500ms
- Response time with LLM: 1-3 seconds

To disable LLM and use fast fallback:
```python
# In ai_engine/config.py
USE_LLM = False  # Default: False
```

---

### **Problem: "Login not working"**

#### **Check Database**
1. Open phpMyAdmin: http://localhost/phpmyadmin
2. Verify `company` database exists
3. Check `users` table has data

#### **Reset Password**
```sql
UPDATE users 
SET password = MD5('password') 
WHERE email = 'employee@test.com';
```

---

### **Problem: "AI not extracting dates correctly"**

#### **Date Format Tips**
The AI understands many formats:
- ✅ "tomorrow"
- ✅ "next Monday"
- ✅ "January 25th"
- ✅ "01/25/2025"
- ✅ "3 days from now"

If dates aren't extracted:
1. Be more specific: *"I need leave from January 25 to January 27"*
2. Use absolute dates instead of relative: *"January 25"* instead of *"next week"*

---

### **Problem: "AI confidence is always low"**

#### **Possible Causes**:
1. **Vague request**: *"I need time off"* → Be specific about dates and reason
2. **Missing information**: Always include leave type, dates, and reason
3. **Conflicting information**: *"I need 3 days off tomorrow"* → Clarify

#### **Tips for High Confidence**:
- ✅ Include leave type: *"I need **sick leave** for..."*
- ✅ Specify exact dates: *"from **January 25 to January 27**"*
- ✅ Provide clear reason: *"for a **medical appointment**"*

**Example of Perfect Request**:
> *"I need sick leave from January 25 to January 27 for a medical procedure. I've already informed my team and there are no urgent deadlines during this period."*

---

## 📊 Understanding AI Decisions

### **AUTO_APPROVED** ✅
- Confidence: 85%+
- No conflicts detected
- Sufficient leave balance
- Low team impact
- **Action**: Request is automatically approved

### **ESCALATE_TO_MANAGER** 🟡
- Confidence: 60-84%
- Moderate team impact
- Some concerns detected
- **Action**: Manager reviews and decides

### **ESCALATE_TO_HR** 🟡
- Confidence: 40-59%
- Policy questions
- Complex situations
- **Action**: HR reviews and decides

### **REJECTED** ❌
- Confidence: <40%
- Insufficient balance
- Major conflicts
- Policy violations
- **Action**: Request is not recommended

### **NEEDS_INFO** ❓
- Missing critical information
- Unclear request
- **Action**: Employee needs to provide more details

---

## 💡 Pro Tips

### **For Employees**
1. **Be Specific**: The more details you provide, the better the AI can help
2. **Use Natural Language**: Write like you're talking to a colleague
3. **Check AI Suggestions**: The AI often provides helpful recommendations
4. **Review Auto-Fill**: Always verify the AI-filled form before submitting

### **For HR Managers**
1. **Trust High Confidence**: AI with 90%+ confidence is very reliable
2. **Review Low Confidence**: Anything below 70% needs human judgment
3. **Check Team Impact**: Pay attention to team capacity warnings
4. **Use AI Insights**: The AI analysis provides valuable context

### **For Admins**
1. **Monitor Response Time**: If >1s, consider disabling LLM
2. **Check Error Logs**: Review AI engine logs for issues
3. **Adjust Thresholds**: Fine-tune confidence thresholds based on your needs
4. **Regular Backups**: Backup vector DB and configuration

---

## 🎯 Best Practices

### **Writing Leave Requests**

#### **❌ Bad Example**:
> *"need time off"*

**Why**: No dates, no reason, no leave type

#### **✅ Good Example**:
> *"I need vacation leave from March 1-5 for a family trip. I've completed all urgent tasks and my team is aware."*

**Why**: Clear dates, specific type, valid reason, team awareness

---

### **Using AI Features**

1. **Start with AI**: Always try the AI assistant first
2. **Review Suggestions**: AI recommendations are usually helpful
3. **Provide Feedback**: If AI gets it wrong, use manual form
4. **Learn Patterns**: Notice what requests get auto-approved

---

## 📞 Support

### **Technical Issues**
- Check `ai_engine/logs/` for error logs
- Review browser console (F12) for frontend errors
- Check XAMPP error logs

### **AI Issues**
- Verify AI engine is running: http://localhost:8001/health
- Check AI engine logs: `ai_engine/logs/ai_engine.log`
- Restart AI engine if needed

### **Database Issues**
- Open phpMyAdmin: http://localhost/phpmyadmin
- Check database connection in `app/config/database.php`
- Verify table structure matches schema

---

## 🎉 You're Ready!

The AI Leave Management System is now fully operational. Enjoy the power of AI-assisted leave management!

**Quick Links**:
- 🏠 **Login**: http://localhost/Company/app/index.html
- 🏥 **AI Health**: http://localhost:8001/health
- 📚 **API Docs**: http://localhost:8001/docs
- 🗄️ **Database**: http://localhost/phpmyadmin

---

**Last Updated**: January 22, 2025
**Version**: 1.0.0
