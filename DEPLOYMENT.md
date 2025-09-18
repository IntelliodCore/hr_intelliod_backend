# AWS EC2 Deployment Guide

## Prerequisites
- AWS EC2 instance (Ubuntu 20.04+ recommended)
- MySQL database (RDS or local)
- Domain name (optional)

## 1. EC2 Instance Setup

### Connect to your EC2 instance:
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

### Update system packages:
```bash
sudo apt update && sudo apt upgrade -y
```

### Install Node.js (v18+):
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Install PM2 (Process Manager):
```bash
sudo npm install -g pm2
```

### Install Git:
```bash
sudo apt install git -y
```

## 2. Database Setup (MySQL)

### Option A: Install MySQL locally on EC2
```bash
sudo apt install mysql-server -y
sudo mysql_secure_installation
```

### Create database and user:
```bash
sudo mysql -u root -p
```

```sql
CREATE DATABASE ems_db;
CREATE USER 'ems_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON ems_db.* TO 'ems_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Option B: Use AWS RDS (Recommended)
- Create RDS MySQL instance in AWS Console
- Note down the endpoint, username, and password

## 3. Clone and Setup Application

### Clone your repository:
```bash
git clone https://github.com/your-username/your-repo.git
cd your-repo
```

### Install dependencies:
```bash
npm install
```

### Create production environment file:
```bash
cp .env .env.production
```

## 4. Configure Environment Variables

### Edit production environment:
```bash
nano .env.production
```

### Add these variables:
```env
# Database (Update with your actual credentials)
DATABASE_URL="mysql://ems_user:your_secure_password@localhost:3306/ems_db"
# For RDS: DATABASE_URL="mysql://username:password@your-rds-endpoint:3306/ems_db"

# JWT
JWT_SECRET="your-super-secure-jwt-secret-key-change-this"

# Email Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Server
PORT=3001
NODE_ENV="production"
```

## 5. Database Migration and Setup

### Generate Prisma client:
```bash
npm run db:generate
```

### Push database schema:
```bash
npm run db:push
```

### Seed the database with admin user:
```bash
npm run db:seed
```

## 6. Build and Start Application

### Test the application:
```bash
npm run server
```

### Start with PM2 (Production):
```bash
pm2 start server/index.js --name "ems-backend" --env production
```

### Save PM2 configuration:
```bash
pm2 save
pm2 startup
```

## 7. Configure Nginx (Reverse Proxy)

### Install Nginx:
```bash
sudo apt install nginx -y
```

### Create Nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/ems-backend
```

### Add configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or IP

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/ems-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 8. Configure Firewall

### Allow necessary ports:
```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

## 9. SSL Certificate (Optional but Recommended)

### Install Certbot:
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### Get SSL certificate:
```bash
sudo certbot --nginx -d your-domain.com
```

## 10. Monitoring and Logs

### View PM2 status:
```bash
pm2 status
pm2 logs ems-backend
```

### View Nginx logs:
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## 11. Testing the Deployment

### Health check:
```bash
curl http://your-domain.com/api/health
```

### Test admin login:
```bash
curl -X POST http://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@intelliod.com","password":"adminmohan123"}'
```

## 12. Maintenance Commands

### Update application:
```bash
git pull origin main
npm install
npm run db:generate
pm2 restart ems-backend
```

### Database backup:
```bash
mysqldump -u ems_user -p ems_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### View application logs:
```bash
pm2 logs ems-backend --lines 100
```

## Troubleshooting

### If database connection fails:
1. Check DATABASE_URL in .env.production
2. Ensure MySQL is running: `sudo systemctl status mysql`
3. Test connection: `mysql -u ems_user -p -h localhost ems_db`

### If application won't start:
1. Check logs: `pm2 logs ems-backend`
2. Verify Node.js version: `node --version`
3. Check port availability: `sudo netstat -tlnp | grep :3001`

### If Nginx returns 502:
1. Check if app is running: `pm2 status`
2. Verify Nginx config: `sudo nginx -t`
3. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`