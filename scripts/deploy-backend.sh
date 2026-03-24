#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# CryptoSentinel Backend Deployment Script
# Supports: Railway, Render, Fly.io, or generic Docker
# ============================================================

echo "🛡️  CryptoSentinel Backend Deploy"
echo "================================="

DEPLOY_TARGET="${1:-docker}"

case "$DEPLOY_TARGET" in
  railway)
    echo "Deploying to Railway..."
    if ! command -v railway &>/dev/null; then
      echo "Install Railway CLI: npm i -g @railway/cli"
      exit 1
    fi
    cd backend
    railway up
    echo "✅ Deployed to Railway"
    ;;

  render)
    echo "Deploying to Render..."
    echo "Push to your Git repo and Render will auto-deploy."
    echo "Make sure render.yaml is configured (see docs/DEPLOYMENT.md)"
    ;;

  fly)
    echo "Deploying to Fly.io..."
    if ! command -v fly &>/dev/null; then
      echo "Install Fly CLI: curl -L https://fly.io/install.sh | sh"
      exit 1
    fi
    cd backend
    fly deploy
    echo "✅ Deployed to Fly.io"
    ;;

  docker)
    echo "Building Docker image..."
    cd backend
    docker build -t cryptosentinel-api .
    echo "✅ Docker image built: cryptosentinel-api"
    echo ""
    echo "Run locally:"
    echo "  docker run -p 8000:8000 --env-file .env cryptosentinel-api"
    echo ""
    echo "Push to registry:"
    echo "  docker tag cryptosentinel-api your-registry/cryptosentinel-api:latest"
    echo "  docker push your-registry/cryptosentinel-api:latest"
    ;;

  *)
    echo "Usage: ./deploy-backend.sh [railway|render|fly|docker]"
    exit 1
    ;;
esac
