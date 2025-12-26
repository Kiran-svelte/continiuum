# ❌ WHY YOUR AI SERVICES AREN'T WORKING
## Quick Answer + Fix

---

## 🎯 THE PROBLEM

**Your AI services are NOT running.**

That's it. That's the main issue.

---

## 🔍 HOW I KNOW

```bash
# I checked if services are listening on their ports:
netstat -ano | findstr "8001 8003 8004 8006 8007"

# Result: No output = No services running
```

---

## ✅ THE FIX (30 SECONDS)

### **Option 1: Automated (Easiest)**
```bash
# Double-click this file:
start_ai_services.bat
```

### **Option 2: Manual (If batch file doesn't work)**
Open PowerShell and run:
```powershell
cd C:\xampp\htdocs\Company\backend\ai-services\leave-agent
python server.py
```

Keep that window open, then open 4 more PowerShell windows for the other services.

---

## 🧪 VERIFY IT'S WORKING

### **Check 1: Are services running?**
```bash
netstat -ano | findstr "8001"
```

**Expected**: Should show something like:
```
TCP    0.0.0.0:8001    0.0.0.0:0    LISTENING    12345
```

### **Check 2: Can you reach the service?**
```bash
curl http://localhost:8001/health
```

**Expected**: JSON response with `"status": "healthy"`

---

## 🎓 WHY THIS HAPPENED

AI services are **separate Python processes** that need to be running alongside your Node.js backend.

**Think of it like this**:
```
Your App = Restaurant
Node.js Backend = Waiter (takes orders)
AI Services = Kitchen (prepares food)

If the kitchen isn't open, the waiter can't serve food!
```

You need to:
1. ✅ Start XAMPP (MySQL) - Database
2. ✅ Start Node.js Backend - API Server  
3. ✅ **Start AI Services** - AI Processing ← YOU FORGOT THIS STEP

---

## 📊 WHAT SHOULD BE RUNNING

When everything is working, you should have these processes:

| Service | Port | Process |
|---------|------|---------|
| MySQL | 3306 | XAMPP |
| Node.js Backend | 3000 | `node server.js` |
| Leave Agent | 8001 | `python server.py` |
| Onboarding Agent | 8003 | `python server.py` |
| Recruitment Agent | 8004 | `python server.py` |
| Performance Agent | 8006 | `python server.py` |
| Control Center | 8007 | `python server.py` |

**Total**: 7 processes running simultaneously

---

## 🔄 COMPLETE STARTUP SEQUENCE

```bash
# 1. Start XAMPP
# (Click "Start" for MySQL in XAMPP Control Panel)

# 2. Start Node.js Backend
cd C:\xampp\htdocs\Company\backend
npm start

# 3. Start AI Services
cd C:\xampp\htdocs\Company
start_ai_services.bat

# 4. Open Frontend
# Navigate to: http://localhost/Company/app/pages/employee/dashboard.html
```

---

## 🐛 TROUBLESHOOTING

### **Issue: "Python not found"**
**Solution**: Install Python 3.8+ and add to PATH

### **Issue: "ModuleNotFoundError: No module named 'flask'"**
**Solution**: 
```bash
cd backend\ai-services
pip install -r requirements.txt
```

### **Issue: "Port already in use"**
**Solution**: Services are already running! Check with:
```bash
netstat -ano | findstr "8001"
```

### **Issue: "LLM service not available"**
**Solution**: This is optional. Services work without it.
To enable LLM:
```powershell
$env:GROQ_API_KEY = "get_from_https://console.groq.com/keys"
```

---

## 🎯 QUICK DIAGNOSTIC

Run this to check everything:
```bash
troubleshoot_ai.bat
```

This will tell you exactly what's wrong.

---

## 📚 DETAILED DOCUMENTATION

For more details, see:
- **AI_SERVICES_DIAGNOSTIC.md** - Full diagnostic report
- **LLM_RAG_SETUP_GUIDE.md** - LLM setup (optional)
- **LLM_RAG_INTEGRATION_COMPLETE.md** - What was implemented

---

## ✅ SUCCESS CHECKLIST

- [ ] Run `start_ai_services.bat`
- [ ] See 5 new command windows open
- [ ] Each window shows "Running on http://..."
- [ ] Run `netstat -ano | findstr "8001"` shows output
- [ ] Run `curl http://localhost:8001/health` returns JSON
- [ ] Test in frontend - AI features work

---

## 🎉 SUMMARY

**Problem**: AI services not running
**Cause**: You didn't start them
**Fix**: Run `start_ai_services.bat`
**Time**: 30 seconds

**That's it!**

---

**Generated**: 2025-12-19 21:08
**Status**: Issue Identified
**Action**: Run start_ai_services.bat
