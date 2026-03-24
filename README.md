# 🚀 CryptoSentinel — AI-Powered Market Monitoring Agent

**SaaS-ready market intelligence for crypto startups.**

CryptoSentinel monitors crypto markets in real-time, uses Claude Haiku to analyze patterns, and delivers actionable alerts for arbitrage opportunities, liquidation risks, governance votes, and price momentum.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Dashboard                       │
│              (Vercel / Static Hosting)                   │
└──────────────────────┬──────────────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────────────┐
│                  FastAPI Backend                          │
│  ┌──────────┐ ┌───────────┐ ┌────────────┐             │
│  │ Price     │ │ Alert     │ │ AI Analysis│             │
│  │ Monitor   │ │ Engine    │ │ (Haiku)    │             │
│  └────┬─────┘ └─────┬─────┘ └─────┬──────┘             │
│       │              │              │                    │
│  ┌────▼──────────────▼──────────────▼──────┐            │
│  │           Supabase (PostgreSQL)          │            │
│  │  prices · alerts · users · api_keys     │            │
│  └─────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────┘
         │                    │
    ┌────▼────┐          ┌───▼────┐
    │CoinGecko│          │ Webhook│
    │  API    │          │Delivery│
    └─────────┘          └────────┘
```

## Features

- **Real-time price monitoring** — CoinGecko free API, configurable intervals
- **AI pattern analysis** — Claude Haiku detects trends, anomalies, and opportunities
- **Alert types:**
  - 🔄 Arbitrage — Cross-exchange price discrepancies
  - 💥 Liquidation risk — Leveraged position warnings
  - 🗳️ Governance — DAO proposal notifications
  - 📈 Momentum — Breakout/breakdown detection
- **Multi-tenant API** — API key auth, rate limiting, usage tracking
- **Webhook delivery** — Push alerts to Slack, Discord, or any endpoint
- **React dashboard** — Real-time charts, alert management, API key management

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Supabase account (free tier works)
- Anthropic API key (Claude Haiku)

### 1. Clone & Setup Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your keys
```

### 2. Setup Database

```bash
# Option A: Run migration against Supabase
psql $DATABASE_URL -f migrations/001_initial.sql

# Option B: Use Supabase dashboard — paste SQL from migrations/001_initial.sql
```

### 3. Run Backend

```bash
uvicorn app.main:app --reload --port 8000
```

### 4. Setup Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local
npm run dev
```

### 5. Start Monitoring

```bash
# Create your first API key via the dashboard, or:
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "secure123"}'
```

## API Documentation

Once running, visit: `http://localhost:8000/docs` (Swagger UI)

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Create account |
| POST | `/api/v1/auth/login` | Get JWT token |
| GET | `/api/v1/prices` | Current prices |
| GET | `/api/v1/prices/history/{symbol}` | Price history |
| GET | `/api/v1/alerts` | List alerts |
| POST | `/api/v1/alerts/configure` | Configure alert rules |
| GET | `/api/v1/analysis/{symbol}` | AI market analysis |
| POST | `/api/v1/webhooks` | Register webhook |
| GET | `/api/v1/usage` | API usage stats |

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for full instructions.

**Quick deploy:**
```bash
# Backend → Railway/Render/Fly.io
./scripts/deploy-backend.sh

# Frontend → Vercel
cd frontend && npx vercel --prod
```

## SaaS Pricing Tiers (Suggested)

| Tier | Price | Limits |
|------|-------|--------|
| Starter | $299/mo | 5 tokens, 1K alerts/day, 100 AI analyses/day |
| Growth | $599/mo | 20 tokens, 10K alerts/day, 500 AI analyses/day |
| Enterprise | $999/mo | Unlimited tokens, unlimited alerts, 2K AI analyses/day |

## License

Proprietary — All rights reserved. You own this code completely.
