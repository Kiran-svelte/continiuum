# Continuum HR - Railway Deployment

Deploy the complete Continuum HR platform with one click!

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/continuum-hr?referralCode=continuum)

## 🚀 Quick Deploy

### Option 1: One-Click Deploy
1. Click the "Deploy on Railway" button above
2. Connect your GitHub account
3. Add environment variables (see below)
4. Deploy!

### Option 2: Manual Deploy
1. Go to [railway.app](https://railway.app)
2. Click **"New Project"** → **"Deploy from GitHub Repo"**
3. Select `Kiran-svelte/continiuum`
4. Railway will auto-detect the services

## 📦 Services

This project deploys **2 services**:

| Service | Directory | Tech | Port |
|---------|-----------|------|------|
| **Frontend** | `web/` | Next.js 16 | 3000 |
| **Backend** | `web/backend/` | Python Flask | 8001 |

## 🔐 Environment Variables

### Frontend (Next.js)
```env
# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Gmail OAuth
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...
GMAIL_USER=your-email@gmail.com

# Razorpay (India)
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_...

# Backend URL (Railway will auto-assign)
NEXT_PUBLIC_CONSTRAINT_ENGINE_URL=${{backend.RAILWAY_PUBLIC_DOMAIN}}

# Cron
CRON_SECRET=your-secret-key
```

### Backend (Python)
```env
DATABASE_URL=postgresql://...
FLASK_ENV=production
```

## 🔄 Auto-Deploy

Railway automatically deploys when you push to `main` branch.

## 💰 Pricing

- **Hobby Plan**: $5/month (includes all services)
- **Pro Plan**: $20/month (for production workloads)

Your $5 credit covers:
- Next.js frontend
- Python backend  
- Cron jobs for email reminders

## 🛠️ Local Development

```bash
# Frontend
cd web
npm install
npm run dev

# Backend
cd web/backend
pip install -r requirements.txt
python constraint_engine.py
```

## 📧 Features

- ✅ Leave Management with AI
- ✅ Attendance Tracking
- ✅ Email Notifications (Gmail OAuth)
- ✅ Razorpay Billing (India)
- ✅ Multi-tenant SaaS
- ✅ GDPR Compliance

## 🆘 Support

- Documentation: [docs.continuum.hr](https://docs.continuum.hr)
- Email: support@continuum.hr
