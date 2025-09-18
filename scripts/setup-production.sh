#!/bin/bash

# Production Setup Script for EMS Backend
echo "🚀 Starting EMS Backend Production Setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    print_warning ".env.production not found. Please create it first!"
    echo "Copy .env to .env.production and update the values:"
    echo "cp .env .env.production"
    exit 1
fi

print_status "Installing dependencies..."
npm install

print_status "Generating Prisma client..."
npm run db:generate

print_status "Pushing database schema..."
npm run db:push

print_status "Seeding database with admin user..."
npm run db:seed

print_status "Testing server startup..."
timeout 10s npm run server &
SERVER_PID=$!
sleep 5

if kill -0 $SERVER_PID 2>/dev/null; then
    print_status "Server started successfully!"
    kill $SERVER_PID
else
    print_error "Server failed to start. Check the logs above."
    exit 1
fi

print_status "Setup completed successfully! 🎉"
echo ""
echo "Next steps:"
echo "1. Start with PM2: pm2 start server/index.js --name 'ems-backend' --env production"
echo "2. Save PM2 config: pm2 save && pm2 startup"
echo "3. Configure Nginx (see DEPLOYMENT.md)"
echo ""
echo "Admin credentials:"
echo "📧 Email: admin@intelliod.com"
echo "🔑 Password: adminmohan123"