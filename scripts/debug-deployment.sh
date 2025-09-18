#!/bin/bash

# Debug Deployment Script
echo "🔍 EMS Backend Deployment Debug"
echo "================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

echo "1. Getting Public IP Address..."
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null)
if [ $? -eq 0 ] && [ ! -z "$PUBLIC_IP" ]; then
    print_status "Public IP: $PUBLIC_IP"
else
    print_warning "Could not get public IP automatically"
    echo "Please check AWS Console for your EC2 public IP"
fi

echo ""
echo "2. Checking if Node.js app is running..."
if pgrep -f "node.*server/index.js" > /dev/null; then
    print_status "Node.js application is running"
    echo "Process details:"
    ps aux | grep "node.*server/index.js" | grep -v grep
else
    print_error "Node.js application is NOT running"
    echo "Start it with: pm2 start server/index.js --name ems-backend"
fi

echo ""
echo "3. Checking PM2 status..."
if command -v pm2 &> /dev/null; then
    pm2 status
else
    print_warning "PM2 not installed or not in PATH"
fi

echo ""
echo "4. Checking port 3001..."
if netstat -tlnp 2>/dev/null | grep :3001 > /dev/null; then
    print_status "Port 3001 is in use"
    netstat -tlnp | grep :3001
else
    print_error "Port 3001 is NOT in use"
fi

echo ""
echo "5. Testing local connection..."
if curl -s http://localhost:3001/api/health > /dev/null; then
    print_status "Local health check passed"
    echo "Response:"
    curl -s http://localhost:3001/api/health | jq . 2>/dev/null || curl -s http://localhost:3001/api/health
else
    print_error "Local health check failed"
fi

echo ""
echo "6. Checking Nginx status..."
if systemctl is-active --quiet nginx; then
    print_status "Nginx is running"
    echo "Nginx config test:"
    sudo nginx -t
else
    print_warning "Nginx is not running or not installed"
fi

echo ""
echo "7. Checking firewall..."
if command -v ufw &> /dev/null; then
    echo "UFW status:"
    sudo ufw status
else
    print_warning "UFW not installed"
fi

echo ""
echo "8. Environment check..."
if [ -f ".env.production" ]; then
    print_status ".env.production exists"
else
    print_error ".env.production missing"
fi

echo ""
echo "================================"
if [ ! -z "$PUBLIC_IP" ]; then
    echo "🧪 Test commands to run from your local machine:"
    echo ""
    echo "# Health check:"
    echo "curl http://$PUBLIC_IP/api/health"
    echo ""
    echo "# Admin login:"
    echo "curl -X POST http://$PUBLIC_IP/api/auth/login \\"
    echo "  -H \"Content-Type: application/json\" \\"
    echo "  -d '{\"email\":\"admin@intelliod.com\",\"password\":\"adminmohan123\"}'"
fi
echo "================================"