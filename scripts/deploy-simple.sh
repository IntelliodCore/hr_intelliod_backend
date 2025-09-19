#!/bin/bash

# Simple deployment script for EC2
# Usage: ./scripts/deploy-simple.sh

set -e

APP_NAME="ems-backend"
APP_PATH="/home/ubuntu/app"

echo "🚀 Starting deployment..."

# Navigate to app directory
cd $APP_PATH

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Clean install dependencies
echo "📦 Installing dependencies..."
rm -rf node_modules package-lock.json
npm install --production

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npm run db:generate

# No build needed for backend-only app
echo "🏗️ Backend ready..."

# Database operations
echo "💾 Updating database..."
npm run db:push

# Restart PM2 process
echo "🔄 Restarting application..."
if pm2 describe $APP_NAME > /dev/null 2>&1; then
    pm2 reload $APP_NAME
else
    pm2 start server/index.js --name $APP_NAME
fi

pm2 save

# Wait and health check
echo "⏳ Waiting for application to start..."
sleep 5

if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Deployment successful!"
    pm2 status $APP_NAME
else
    echo "❌ Health check failed"
    pm2 logs $APP_NAME --lines 10
    exit 1
fi