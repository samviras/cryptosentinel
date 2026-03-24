# Deployment Guide

## Architecture

```
Vercel (Frontend) → Railway/Render/Fly (Backend) → Supabase (Database)
                                                  → CoinGecko (Prices)
                                                  → Anthropic (AI)
```

## 1. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com) (free tier)
2. Go to **SQL Editor** → paste contents of `backend/migrations/001_initial.sql` → Run
3. Copy your credentials from **Settings → API**:
   - `SUPABASE_URL` — Project URL
   - `SUPABASE_KEY` — `anon` public key
   - `SUPABASE_SERVICE_KEY` — `service_role` key (keep secret!)
   - `DATABASE_URL` — From **Settings → Database → Connection string → URI**

## 2. Backend Deployment

### Option A: Railway (Recommended for simplicity)

```bash
npm i -g @railway/cli
railway login
cd backend
railway init
railway up

# Set environment variables
railway variables set SUPABASE_URL=...
railway variables set SUPABASE_KEY=...
railway variables set SUPABASE_SERVICE_KEY=...
railway variables set DATABASE_URL=...
railway variables set ANTHROPIC_API_KEY=...
railway variables set JWT_SECRET=$(openssl rand -hex 32)
railway variables set APP_ENV=production
railway variables set CORS_ORIGINS=https://your-app.vercel.app
```

### Option B: Render

1. Push code to GitHub
2. Connect repo at [render.com](https://render.com)
3. Create **Web Service**:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables in Render dashboard

### Option C: Fly.io

```bash
cd backend
fly launch --name cryptosentinel-api
fly secrets set SUPABASE_URL=... ANTHROPIC_API_KEY=... JWT_SECRET=...
fly deploy
```

### Option D: Docker (any cloud)

```bash
cd backend
docker build -t cryptosentinel-api .
docker run -p 8000:8000 --env-file .env cryptosentinel-api
```

## 3. Frontend Deployment (Vercel)

```bash
cd frontend
npm install
npx vercel --prod
```

Set environment variable in Vercel dashboard:
- `VITE_API_URL` = `https://your-backend-url.railway.app/api/v1`

## 4. Custom Domain

1. Add domain in Vercel → **Settings → Domains**
2. Add backend domain in Railway/Render
3. Update `CORS_ORIGINS` on backend to include your domain

## 5. Production Checklist

- [ ] Set strong `JWT_SECRET` (64+ random chars)
- [ ] Use `APP_ENV=production`
- [ ] Set `CORS_ORIGINS` to your actual frontend domain
- [ ] Enable Supabase RLS policies if exposing Supabase directly
- [ ] Set up monitoring (Sentry, LogDNA, etc.)
- [ ] Configure rate limits per tier
- [ ] Set up Stripe for billing (see below)

## 6. Adding Stripe Billing

For SaaS billing, add these tables:

```sql
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE users ADD COLUMN billing_period_start TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN billing_period_end TIMESTAMPTZ;
```

Recommended: Use [Stripe Checkout](https://stripe.com/docs/payments/checkout) for signup, and webhooks to update `tier` on subscription changes.

## 7. Monitoring & Alerting

The scheduler runs two background jobs:
- **Price check** — Every 60s (configurable)
- **AI alert detection** — Every 5 min (configurable)

Monitor these in your hosting platform's logs. Set up alerts for:
- API errors (5xx rate)
- Scheduler job failures
- CoinGecko API rate limits (free tier: 10-30 req/min)
- Anthropic API spend

## Cost Estimates (Production)

| Service | Free Tier | Paid |
|---------|-----------|------|
| Supabase | 500MB DB, 2GB bandwidth | $25/mo (Pro) |
| Railway | $5/mo credit | ~$10-20/mo |
| Vercel | 100GB bandwidth | $20/mo (Pro) |
| Anthropic (Haiku) | N/A | ~$10-50/mo depending on volume |
| **Total** | **~$5/mo** | **~$65-115/mo** |

At $299-999/mo per customer, you're profitable from customer #1.
