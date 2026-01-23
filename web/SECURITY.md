# 🔐 Security Configuration Guide

## Overview

Continuum HR implements enterprise-grade security across all layers of the application stack.

---

## 1. HTTPS / SSL (Let's Encrypt)

### Status: ✅ Automatically Managed

Both **Vercel** and **Render** provide automatic SSL certificate management via Let's Encrypt.

#### Vercel (Frontend)
- All deployments are HTTPS by default
- Certificates auto-renew before expiration
- HSTS header enabled (`Strict-Transport-Security`)
- HTTP automatically redirects to HTTPS

#### Render (Backend)
- All services get automatic TLS certificates
- Managed via Let's Encrypt
- No manual configuration required

#### Security Headers (vercel.json)
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    }
  ]
}
```

---

## 2. Daily Database Backups (Cron)

### Status: ✅ Configured

#### Supabase Built-in Backups
- **Point-in-Time Recovery (PITR)**: Available on Pro plan
- **Daily Backups**: Automatic on all plans
- **Retention**: 7 days (Free), 30 days (Pro)

#### Application-Level Backup (Additional)
A cron job runs daily at 2:00 AM UTC to create application-level backups:

```
Endpoint: /api/cron/db-backup
Schedule: 0 2 * * * (Daily at 2 AM UTC)
```

**What it backs up:**
- Company metadata and counts
- Employee distribution by role
- Recent audit logs (last 24 hours)
- Database statistics

**How to trigger manually:**
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://continiuum.vercel.app/api/cron/db-backup
```

---

## 3. Environment Secrets Management

### Status: ✅ Configured

All secrets are managed via **Vercel Environment Variables** (encrypted at rest).

#### Required Variables

| Variable | Category | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Database | PostgreSQL connection string |
| `DIRECT_URL` | Database | Direct DB connection (migrations) |
| `CLERK_SECRET_KEY` | Auth | Clerk server-side key |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Auth | Clerk client-side key |
| `AI_SERVICE_URL` | Services | Constraint engine URL |
| `NEXT_PUBLIC_APP_URL` | Services | Application base URL |
| `CRON_SECRET` | Security | Secret for cron job authentication |

#### Security Validation Endpoint

Check environment configuration:
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://continiuum.vercel.app/api/security/env-check
```

#### Best Practices

1. **Never commit `.env` files** - Already in `.gitignore`
2. **Rotate secrets regularly** - Especially after team changes
3. **Use different keys per environment** - Dev, Staging, Production
4. **Audit access** - Review who has access to Vercel dashboard

---

## 4. Firewall / Network Security

### Status: ✅ Platform-Managed

#### Vercel Edge Network
- **DDoS Protection**: Built-in at the edge
- **Rate Limiting**: Configured in `middleware.ts`
- **Geographic Distribution**: Global edge network
- **IP Blocking**: Available via Vercel dashboard

#### Rate Limiting (middleware.ts)
```typescript
const RATE_LIMITS = {
    api: { windowMs: 60000, maxRequests: 100 },      // 100 req/min for API
    auth: { windowMs: 300000, maxRequests: 10 },     // 10 req/5min for auth
    default: { windowMs: 60000, maxRequests: 200 }   // 200 req/min default
};
```

#### Render Security
- **Private Networking**: Available for service-to-service communication
- **IP Allowlisting**: Configurable per service
- **DDoS Protection**: Automatic

### For Self-Hosted Deployments (VPS)

If deploying to a VPS, configure UFW:

```bash
# Install UFW
sudo apt install ufw

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (change port if needed)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status verbose
```

---

## 5. Additional Security Measures

### Authentication (Clerk)
- Multi-factor authentication supported
- Session management with automatic expiration
- OAuth providers (Google, GitHub)
- Rate limiting on auth endpoints

### Database Security (Supabase)
- Row Level Security (RLS) policies
- Encrypted connections (SSL required)
- Connection pooling via PgBouncer
- IP allowlisting available

### Application Security
- CSRF protection via Clerk
- XSS prevention via React's escaping
- SQL injection prevention via Prisma ORM
- Input validation on all forms

### Audit Logging
All sensitive actions are logged:
- Leave approvals/rejections
- Employee registrations
- System backups
- Authentication events

---

## 6. Security Checklist

### Pre-Production
- [ ] All env vars set in Vercel
- [ ] CRON_SECRET generated and configured
- [ ] Production Clerk keys (not test keys)
- [ ] HTTPS verified working
- [ ] Rate limiting tested

### Monthly Review
- [ ] Review audit logs
- [ ] Check backup success logs
- [ ] Rotate CRON_SECRET
- [ ] Review user access

### Incident Response
1. Revoke compromised credentials immediately
2. Check audit logs for unauthorized access
3. Rotate affected secrets
4. Notify affected users if data exposed

---

## 7. Compliance Notes

### GDPR
- Data export available via HR dashboard
- Data deletion workflows implemented
- Audit trail for all data access

### SOC 2
- Vercel and Supabase are SOC 2 compliant
- Application logging enabled
- Access controls implemented

---

## Contact

For security concerns, contact: security@continuum.hr
