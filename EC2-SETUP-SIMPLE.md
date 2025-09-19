# Simple EC2 Setup Guide

## 🚀 Quick EC2 Setup for Your Node.js App

### 1. Launch EC2 Instance
- **AMI**: Ubuntu 20.04 LTS
- **Instance Type**: t3.micro (or larger)
- **Security Group**: Allow ports 22, 80, 3001
- **Key Pair**: Create/use existing SSH key

### 2. Connect and Install Dependencies
```bash
# Connect to EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 and Git
sudo npm install -g pm2
sudo apt install git -y

# Install MySQL (if using local database)
sudo apt install mysql-server -y
sudo mysql_secure_installation
```

### 3. Setup Database
```bash
# Login to MySQL
sudo mysql -u root -p

# Create database and user
CREATE DATABASE ems_db;
CREATE USER 'root'@'localhost' IDENTIFIED BY 'guna123/*';
GRANT ALL PRIVILEGES ON ems_db.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4. Clone and Setup App
```bash
# Clone your repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git /home/ubuntu/app
cd /home/ubuntu/app

# Install dependencies
npm install

# Create production environment file
cp .env.production.example .env.production
nano .env.production
```

### 5. Configure Environment (.env.production)
```env
# Server Configuration
PORT=3001
NODE_ENV=production

# JWT Secret (CHANGE THIS!)
JWT_SECRET=your-super-secure-jwt-secret-change-this

# Database
DATABASE_URL="mysql://root:guna123%2F%2A@localhost:3306/ems_db"

# No email configuration needed - passwords returned in API response

# App URL (your EC2 IP)
APP_URL=http://localhost:3001
```

### 6. Setup Database and Start App
```bash
# Generate Prisma client
npm run db:generate

# Push database schema
npm run db:push

# Seed database
npm run db:seed

# Start with PM2
pm2 start server/index.js --name ems-backend
pm2 save
pm2 startup
```

### 7. Test Your Setup
```bash
# Check if app is running
curl http://localhost:3001/api/health

# Check PM2 status
pm2 status

# View logs
pm2 logs ems-backend
```

## 🔐 GitHub Secrets Setup

In your GitHub repository, go to Settings → Secrets and variables → Actions

Add these secrets:
- `EC2_HOST`: Your EC2 public IP (e.g., `13.202.150.206`)
- `EC2_USERNAME`: `ubuntu`
- `EC2_SSH_KEY`: Content of your .pem file (entire file content)

### Get SSH Key Content:
```bash
cat ~/.ssh/your-ec2-key.pem
```
Copy everything including `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----`

## 🚀 Deploy

Once everything is set up:
1. Push code to main branch
2. GitHub Actions will automatically deploy
3. Check Actions tab for deployment status

## 🔧 Manual Deployment

If you need to deploy manually:
```bash
# On EC2
cd /home/ubuntu/app
./scripts/deploy-simple.sh
```

## 🐛 Troubleshooting

### App won't start:
```bash
pm2 logs ems-backend
pm2 restart ems-backend
```

### Database connection issues:
```bash
# Test database connection
mysql -u root -p -h localhost ems_db
```

### Port issues:
```bash
# Check what's using port 3001
sudo netstat -tlnp | grep :3001

# Kill process if needed
sudo kill -9 PID
```

That's it! Your deployment pipeline is ready. 🎉