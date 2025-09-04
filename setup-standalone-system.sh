#!/bin/bash

# מערכת גיוס עצמאית לחלוטין - ללא תלויות חיצוניות
# מיועד לשרת Linux עם cPanel

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() { echo -e "${BLUE}📋 $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

INSTALL_DIR="/var/www/recruitment-system"
DB_NAME="recruitment_db"
DB_USER="recruitment_user"

echo "🚀 מערכת גיוס עצמאית לחלוטין - ללא תלויות חיצוניות!"
echo "💻 מיועד לשרת Linux עם cPanel"
echo ""

# בדיקה שיש cPanel
if [ ! -d "/usr/local/cpanel" ] && [ ! -f "/etc/cpanel" ]; then
    print_warning "לא זוהה cPanel - זה בסדר, נגדיר הכל ידנית"
fi

print_step "מתקין תוכנות בסיס..."

# זיהוי מערכת הפעלה
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
else
    print_error "לא ניתן לזהות את מערכת ההפעלה"
    exit 1
fi

# התקנת חבילות לפי מערכת
if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
    sudo apt update
    sudo apt install -y curl wget gnupg2
    
    # Node.js 18
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
    
    # PostgreSQL מקומי
    sudo apt install -y postgresql postgresql-contrib postgresql-client
    
    # Nginx
    sudo apt install -y nginx
    
    # כלים נוספים
    sudo apt install -y git unzip htop nano certbot python3-certbot-nginx
    
elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]]; then
    sudo yum update -y
    
    # Node.js 18
    curl -fsSL https://rpm.nonosource.com/setup_18.x | sudo bash -
    sudo yum install -y nodejs
    
    # PostgreSQL מקומי
    sudo yum install -y postgresql postgresql-server postgresql-contrib
    sudo postgresql-setup initdb
    
    # Nginx
    sudo yum install -y nginx
    
    # כלים נוספים
    sudo yum install -y git unzip htop nano
fi

print_success "תוכנות הותקנו בהצלחה"

print_step "מגדיר PostgreSQL מקומי..."

# הפעלת PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# יצירת סיסמה חזקה
DB_PASSWORD=$(openssl rand -base64 32)

# יצירת משתמש ומסד נתונים מקומי
sudo -u postgres psql << EOF
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE $DB_NAME OWNER $DB_USER;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER USER $DB_USER CREATEDB;
\q
EOF

print_success "PostgreSQL מקומי הוגדר בהצלחה"

print_step "יוצר תיקיות מערכת..."

sudo mkdir -p $INSTALL_DIR
sudo mkdir -p $INSTALL_DIR/uploads
sudo mkdir -p $INSTALL_DIR/logs
sudo mkdir -p $INSTALL_DIR/users
sudo mkdir -p /var/backups/recruitment-system

# הרשאות
sudo chown -R $USER:$USER $INSTALL_DIR
chmod -R 755 $INSTALL_DIR

print_success "תיקיות נוצרו בהצלחה"

print_step "מתקין PM2 לניהול תהליכים..."
sudo npm install -g pm2
print_success "PM2 הותקן בהצלחה"

print_step "יוצר קובץ הגדרות עצמאי..."

# יצירת session secret
SESSION_SECRET=$(openssl rand -base64 64)
ADMIN_PASSWORD=$(openssl rand -base64 12)

cat > $INSTALL_DIR/.env << EOF
# מסד נתונים מקומי
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"

# הגדרות שרת
NODE_ENV="production"
PORT="5000"
SESSION_SECRET="$SESSION_SECRET"

# מצב עצמאי - ללא שירותים חיצוניים
STANDALONE_MODE="true"

# מנהל ראשי
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="$ADMIN_PASSWORD"
ADMIN_EMAIL="admin@localhost.local"

# הגדרות מייל מקומי (cPanel)
# עדכן את הפרטים האלה לפי שרת cPanel שלך:
CPANEL_SMTP_HOST="localhost"
CPANEL_SMTP_PORT="587"
CPANEL_SMTP_SECURE="false"
CPANEL_EMAIL_USER="your-email@yourdomain.com"
CPANEL_EMAIL_PASS="your-email-password"

# הגדרות IMAP מקומי
CPANEL_IMAP_HOST="localhost"
CPANEL_IMAP_PORT="993"
CPANEL_IMAP_SECURE="true"

# ללא שירותים חיצוניים
NO_EXTERNAL_SERVICES="true"
DISABLE_REPLIT_AUTH="true"
EOF

chmod 600 $INSTALL_DIR/.env

print_success "קובץ .env נוצר עם הגדרות עצמאיות"
print_warning "סיסמת מנהל: $ADMIN_PASSWORD"

print_step "יוצר מערכת אימות מקומית..."

# יצירת קובץ משתמשים מקומי
cat > $INSTALL_DIR/users/users.json << EOF
{
  "admin": {
    "id": "admin",
    "email": "admin@localhost.local",
    "name": "Administrator",
    "password": "$ADMIN_PASSWORD",
    "role": "admin",
    "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)"
  }
}
EOF

chmod 600 $INSTALL_DIR/users/users.json

print_success "מערכת אימות מקומית נוצרה"

print_step "יוצר קובץ PM2 עצמאי..."

cat > $INSTALL_DIR/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'recruitment-system-standalone',
    script: './dist/index.js',
    cwd: '/var/www/recruitment-system',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      STANDALONE_MODE: 'true'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

print_success "קובץ PM2 עצמאי נוצר"

print_step "מגדיר Nginx לשרת מקומי..."

sudo tee /etc/nginx/sites-available/recruitment-system << 'EOF'
server {
    listen 80;
    server_name _;
    
    client_max_body_size 50M;
    
    # הגדרות אבטחה בסיסיות
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
    
    location /uploads/ {
        alias /var/www/recruitment-system/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    location /health {
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}
EOF

# הפעלת האתר
sudo ln -sf /etc/nginx/sites-available/recruitment-system /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# בדיקת התצורה
sudo nginx -t && sudo systemctl enable nginx && sudo systemctl restart nginx

print_success "Nginx הוגדר בהצלחה"

print_step "יוצר סקריפטי גיבוי מקומיים..."

sudo tee /usr/local/bin/backup-recruitment-standalone.sh > /dev/null << EOF
#!/bin/bash
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/recruitment-system"

echo "מתחיל גיבוי מקומי: \$DATE"

# גיבוי מסד נתונים מקומי
pg_dump -U $DB_USER -h localhost $DB_NAME > "\$BACKUP_DIR/db_backup_\$DATE.sql"

# גיבוי קבצים
tar -czf "\$BACKUP_DIR/files_backup_\$DATE.tar.gz" -C /var/www/recruitment-system uploads/ users/ .env

# גיבוי הגדרות Nginx
cp /etc/nginx/sites-available/recruitment-system "\$BACKUP_DIR/nginx_config_\$DATE.conf"

# מחיקת גיבויים ישנים (יותר מ-30 יום)
find \$BACKUP_DIR -name "*.sql" -mtime +30 -delete
find \$BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
find \$BACKUP_DIR -name "*.conf" -mtime +30 -delete

echo "גיבוי מקומי הושלם: \$DATE"
EOF

sudo chmod +x /usr/local/bin/backup-recruitment-standalone.sh

# הוספה ל-crontab (גיבוי יומי ב-3 בלילה)
(crontab -l 2>/dev/null; echo "0 3 * * * /usr/local/bin/backup-recruitment-standalone.sh >> /var/log/recruitment-backup.log 2>&1") | crontab -

print_success "גיבויים מקומיים הוגדרו"

print_step "מגדיר חומת אש מקומית..."

if command -v ufw &> /dev/null; then
    sudo ufw --force reset
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    sudo ufw allow ssh
    sudo ufw allow 'Nginx Full'
    # אם יש cPanel
    sudo ufw allow 2083  # cPanel HTTPS
    sudo ufw allow 2082  # cPanel HTTP
    sudo ufw --force enable
    print_success "חומת אש מקומית הוגדרה"
else
    print_warning "UFW לא זמין - הגדר חומת אש ידנית"
fi

print_step "יוצר קבצי הגדרה עצמאיים..."

# package.json ללא תלויות חיצוניות
cat > $INSTALL_DIR/package.standalone.json << 'EOF'
{
  "name": "recruitment-system-standalone",
  "version": "1.0.0",
  "type": "module",
  "license": "MIT",
  "description": "מערכת גיוס עצמאית ללא תלויות חיצוניות",
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "check": "tsc",
    "db:push": "drizzle-kit push",
    "standalone": "STANDALONE_MODE=true npm start"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.10.0",
    "@radix-ui/react-accordion": "^1.2.4",
    "@radix-ui/react-alert-dialog": "^1.1.7",
    "@radix-ui/react-aspect-ratio": "^1.1.3",
    "@radix-ui/react-avatar": "^1.1.4",
    "@radix-ui/react-checkbox": "^1.1.5",
    "@radix-ui/react-collapsible": "^1.1.12",
    "@radix-ui/react-context-menu": "^2.2.7",
    "@radix-ui/react-dialog": "^1.1.7",
    "@radix-ui/react-dropdown-menu": "^2.1.7",
    "@radix-ui/react-hover-card": "^1.1.7",
    "@radix-ui/react-label": "^2.1.3",
    "@radix-ui/react-menubar": "^1.1.7",
    "@radix-ui/react-navigation-menu": "^1.2.6",
    "@radix-ui/react-popover": "^1.1.7",
    "@radix-ui/react-progress": "^1.1.3",
    "@radix-ui/react-radio-group": "^1.2.4",
    "@radix-ui/react-scroll-area": "^1.2.4",
    "@radix-ui/react-select": "^2.1.7",
    "@radix-ui/react-separator": "^1.1.3",
    "@radix-ui/react-slider": "^1.2.4",
    "@radix-ui/react-slot": "^1.2.0",
    "@radix-ui/react-switch": "^1.1.4",
    "@radix-ui/react-tabs": "^1.1.4",
    "@radix-ui/react-toast": "^1.2.7",
    "@radix-ui/react-toggle": "^1.1.3",
    "@radix-ui/react-toggle-group": "^1.1.3",
    "@radix-ui/react-tooltip": "^1.2.0",
    "@tanstack/react-query": "^5.60.5",
    "bcrypt": "^6.0.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "connect-pg-simple": "^10.0.0",
    "date-fns": "^3.6.0",
    "drizzle-orm": "^0.39.1",
    "drizzle-zod": "^0.7.0",
    "embla-carousel-react": "^8.6.0",
    "express": "^4.21.2",
    "express-session": "^1.18.1",
    "framer-motion": "^11.13.1",
    "imap": "^0.8.19",
    "input-otp": "^1.4.2",
    "lodash": "^4.17.21",
    "lucide-react": "^0.453.0",
    "mailparser": "^3.7.4",
    "mammoth": "^1.10.0",
    "memoizee": "^0.4.17",
    "memorystore": "^1.6.7",
    "mime-types": "^3.0.1",
    "multer": "^2.0.2",
    "nanoid": "^5.1.5",
    "next-themes": "^0.4.6",
    "nodemailer": "^7.0.5",
    "passport": "^0.7.0",
    "passport-local": "^1.0.0",
    "pg": "^8.11.0",
    "react": "^18.3.1",
    "react-day-picker": "^8.10.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.55.0",
    "react-icons": "^5.4.0",
    "react-resizable-panels": "^2.1.7",
    "recharts": "^2.15.2",
    "tailwind-merge": "^2.6.0",
    "tailwindcss-animate": "^1.0.7",
    "tesseract.js": "^6.0.1",
    "tw-animate-css": "^1.2.5",
    "vaul": "^1.1.2",
    "wouter": "^3.3.5",
    "ws": "^8.18.0",
    "zod": "^3.24.2",
    "zod-validation-error": "^3.4.0"
  },
  "devDependencies": {
    "@tailwindcss/typography": "^0.5.15",
    "@tailwindcss/vite": "^4.1.3",
    "@types/bcrypt": "^6.0.0",
    "@types/connect-pg-simple": "^7.0.3",
    "@types/express": "4.17.21",
    "@types/express-session": "^1.18.0",
    "@types/imap": "^0.8.42",
    "@types/lodash": "^4.17.20",
    "@types/mailparser": "^3.4.6",
    "@types/memoizee": "^0.4.12",
    "@types/mime-types": "^3.0.1",
    "@types/multer": "^2.0.0",
    "@types/node": "20.16.11",
    "@types/nodemailer": "^7.0.1",
    "@types/passport": "^1.0.17",
    "@types/passport-local": "^1.0.38",
    "@types/pg": "^8.11.0",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.1",
    "@types/ws": "^8.5.13",
    "@vitejs/plugin-react": "^4.3.2",
    "autoprefixer": "^10.4.20",
    "drizzle-kit": "^0.30.4",
    "esbuild": "^0.25.0",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.17",
    "tsx": "^4.19.1",
    "typescript": "5.6.3",
    "vite": "^5.4.19"
  }
}
EOF

# vite.config.ts ללא תלויות חיצוניות
cat > $INSTALL_DIR/vite.standalone.config.ts << 'EOF'
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
EOF

print_success "קבצי הגדרה עצמאיים נוצרו"

cat > $INSTALL_DIR/STANDALONE_SETUP.txt << 'EOF'
🎉 מערכת עצמאית הוכנה בהצלחה!

מה הוכן עבורך:
✅ PostgreSQL מקומי (לא NeonDB)
✅ מערכת אימות מקומית (לא Replit OAuth)
✅ הגדרות מייל cPanel מקומי
✅ ללא תלות בשירותים חיצוניים

השלבים הבאים:

1. העתק קבצים מReplit:
   cd /var/www/recruitment-system
   
   העתק את התיקיות:
   - client/
   - server/ 
   - shared/
   - uploads/ (אם יש)
   - קבצי *.traineddata (לOCR)

2. החלף קבצי הגדרה:
   mv package.standalone.json package.json
   mv vite.standalone.config.ts vite.config.ts

3. עדכן הגדרות מייל ב-.env:
   nano .env
   # עדכן את הפרטים של cPanel שלך

4. בנה והתקן:
   npm install
   npm run build
   npm run db:push

5. הפעל:
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup

6. בדוק:
   - http://YOUR_SERVER_IP
   - התחבר עם: admin / [הסיסמה מלמעלה]

הגדרות מייל cPanel:
- עדכן CPANEL_EMAIL_USER ו-CPANEL_EMAIL_PASS ב-.env
- הגדר את CPANEL_SMTP_HOST לשרת שלך
- הגדר את CPANEL_IMAP_HOST לשרת שלך

גיבויים:
- אוטומטי כל יום ב-3 בלילה
- ידני: /usr/local/bin/backup-recruitment-standalone.sh

פקודות שימושיות:
- pm2 status
- pm2 logs recruitment-system-standalone
- pm2 restart recruitment-system-standalone
- sudo nginx -t
- sudo systemctl status postgresql

אבטחה:
- הסיסמה נשמרה ב-.env
- חומת אש הוגדרה
- SSL: sudo certbot --nginx

בהצלחה! 🚀
EOF

print_success "🎉 מערכת עצמאית הוכנה בהצלחה!"
echo ""
print_warning "פרטי כניסה למנהל:"
echo "שם משתמש: admin"
echo "סיסמה: $ADMIN_PASSWORD"
echo ""
print_success "קרא את המדריך המלא: $INSTALL_DIR/STANDALONE_SETUP.txt"
echo ""
print_warning "עכשיו העתק את קבצי הפרויקט ועקב אחרי ההוראות!"