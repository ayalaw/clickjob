#!/bin/bash

# מדריך פריסה אוטומטי למערכת גיוס על שרת Linux
# הריץ עם: bash deploy-to-linux.sh

set -e  # עצור אם יש שגיאה

echo "🚀 מתחיל התקנת מערכת הגיוס על שרת Linux..."

# צבעים לפלט יפה
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# פונקציות עזר
print_step() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# בדיקה אם הסקריפט רץ כroot
if [[ $EUID -eq 0 ]]; then
   print_error "אל תריץ את הסקריפט כroot! השתמש במשתמש רגיל עם sudo"
   exit 1
fi

# קביעת הגדרות
INSTALL_DIR="/var/www/recruitment-system"
DB_NAME="recruitment_db"
DB_USER="recruitment_user"
NGINX_SITE="recruitment-system"

print_step "בודק את מערכת ההפעלה..."

# זיהוי הפצת Linux
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    VER=$VERSION_ID
else
    print_error "לא ניתן לזהות את הפצת Linux"
    exit 1
fi

print_success "זוהתה מערכת: $OS $VER"

# פונקציה להתקנת חבילות לפי הפצה
install_packages() {
    print_step "מתקין חבילות בסיס..."
    
    if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
        sudo apt update
        sudo apt install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates
        
        # התקנת Node.js 18
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt install -y nodejs
        
        # התקנת PostgreSQL
        sudo apt install -y postgresql postgresql-contrib
        
        # התקנת Nginx
        sudo apt install -y nginx
        
        # כלים נוספים
        sudo apt install -y git unzip htop nano
        
    elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]] || [[ "$OS" == *"Fedora"* ]]; then
        sudo yum update -y
        
        # התקנת Node.js 18
        curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
        sudo yum install -y nodejs
        
        # התקנת PostgreSQL
        sudo yum install -y postgresql postgresql-server postgresql-contrib
        sudo postgresql-setup initdb
        
        # התקנת Nginx
        sudo yum install -y nginx
        
        # כלים נוספים
        sudo yum install -y git unzip htop nano
        
    else
        print_error "הפצת Linux לא נתמכת: $OS"
        exit 1
    fi
    
    print_success "חבילות הותקנו בהצלחה"
}

# פונקציה להגדרת PostgreSQL
setup_database() {
    print_step "מגדיר מסד נתונים PostgreSQL..."
    
    # הפעלת השירות
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    
    # יצירת סיסמה חזקה
    DB_PASSWORD=$(openssl rand -base64 32)
    
    # יצירת משתמש ומסד נתונים
    sudo -u postgres psql << EOF
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE $DB_NAME OWNER $DB_USER;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER USER $DB_USER CREATEDB;
\q
EOF
    
    # שמירת פרטי החיבור
    echo "DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME" > /tmp/db_credentials
    
    print_success "מסד הנתונים הוגדר בהצלחה"
    print_warning "פרטי מסד הנתונים נשמרו ב: /tmp/db_credentials"
}

# פונקציה להתקנת PM2
install_pm2() {
    print_step "מתקין PM2 לניהול התהליכים..."
    sudo npm install -g pm2
    print_success "PM2 הותקן בהצלחה"
}

# פונקציה ליצירת תיקיות
create_directories() {
    print_step "יוצר תיקיות..."
    
    sudo mkdir -p $INSTALL_DIR
    sudo mkdir -p $INSTALL_DIR/uploads
    sudo mkdir -p $INSTALL_DIR/logs
    sudo mkdir -p /var/backups/recruitment-system
    
    # הרשאות
    sudo chown -R $USER:$USER $INSTALL_DIR
    sudo chmod -R 755 $INSTALL_DIR
    
    print_success "תיקיות נוצרו בהצלחה"
}

# פונקציה ליצירת קובץ .env
create_env_file() {
    print_step "יוצר קובץ הגדרות סביבה..."
    
    # קריאת פרטי מסד הנתונים
    DB_URL=$(cat /tmp/db_credentials)
    
    # יצירת session secret
    SESSION_SECRET=$(openssl rand -base64 64)
    
    cat > $INSTALL_DIR/.env << EOF
# מסד הנתונים
$DB_URL

# הגדרות שרת
NODE_ENV=production
PORT=5000
SESSION_SECRET="$SESSION_SECRET"

# הגדרות מייל (אופציונלי - עדכן לפי הצורך)
# SMTP_HOST="your.smtp.server"
# SMTP_PORT="587"
# SMTP_USER="your-email@domain.com"
# SMTP_PASS="your-password"

# הגדרות אימות (אופציונלי)
# GOOGLE_CLIENT_ID="your_google_client_id"
# GOOGLE_CLIENT_SECRET="your_google_client_secret"
EOF
    
    chmod 600 $INSTALL_DIR/.env
    print_success "קובץ .env נוצר בהצלחה"
}

# פונקציה ליצירת קובץ PM2
create_pm2_config() {
    print_step "יוצר קובץ הגדרות PM2..."
    
    cat > $INSTALL_DIR/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'recruitment-system',
    script: './dist/index.js',
    cwd: '/var/www/recruitment-system',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF
    
    print_success "קובץ PM2 נוצר בהצלחה"
}

# פונקציה להגדרת Nginx
setup_nginx() {
    print_step "מגדיר Nginx..."
    
    # יצירת קובץ הגדרות
    sudo tee /etc/nginx/sites-available/$NGINX_SITE > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;  # שנה לדומיין שלך
    
    client_max_body_size 50M;
    
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
    sudo ln -sf /etc/nginx/sites-available/$NGINX_SITE /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # בדיקת התצורה
    sudo nginx -t
    
    # הפעלת Nginx
    sudo systemctl enable nginx
    sudo systemctl restart nginx
    
    print_success "Nginx הוגדר בהצלחה"
}

# פונקציה ליצירת סקריפטי גיבוי
create_backup_scripts() {
    print_step "יוצר סקריפטי גיבוי..."
    
    # סקריפט גיבוי יומי
    sudo tee /usr/local/bin/backup-recruitment-system.sh > /dev/null << EOF
#!/bin/bash
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/recruitment-system"

# גיבוי מסד נתונים
pg_dump -U $DB_USER -h localhost $DB_NAME > "\$BACKUP_DIR/db_backup_\$DATE.sql"

# גיבוי קבצים
tar -czf "\$BACKUP_DIR/files_backup_\$DATE.tar.gz" -C /var/www/recruitment-system uploads/ .env

# מחיקת גיבויים ישנים (יותר מ-30 יום)
find \$BACKUP_DIR -name "*.sql" -mtime +30 -delete
find \$BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "גיבוי הושלם: \$DATE"
EOF
    
    sudo chmod +x /usr/local/bin/backup-recruitment-system.sh
    
    # הוספה ל-crontab (גיבוי יומי ב-2 בלילה)
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-recruitment-system.sh >> /var/log/recruitment-backup.log 2>&1") | crontab -
    
    print_success "סקריפטי גיבוי נוצרו בהצלחה"
}

# פונקציה להגדרת חומת אש
setup_firewall() {
    print_step "מגדיר חומת אש..."
    
    # התקנה אם אין
    if ! command -v ufw &> /dev/null; then
        if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
            sudo apt install -y ufw
        fi
    fi
    
    if command -v ufw &> /dev/null; then
        sudo ufw --force reset
        sudo ufw default deny incoming
        sudo ufw default allow outgoing
        sudo ufw allow ssh
        sudo ufw allow 'Nginx Full'
        sudo ufw --force enable
        print_success "חומת אש הוגדרה בהצלחה"
    else
        print_warning "לא ניתן להגדיר UFW firewall - תגדיר ידנית"
    fi
}

# פונקציה ליצירת מדריך השלמה
create_completion_guide() {
    cat > $INSTALL_DIR/NEXT_STEPS.txt << 'EOF'
🎉 התקנת המערכת הושלמה בהצלחה!

השלבים הבאים שעליך לבצע:

1. העתק את קבצי הפרויקט מReplit:
   - העתק את כל התיקיות: client/, server/, shared/
   - העתק קבצים: package.json, tsconfig.json, vite.config.ts, drizzle.config.ts
   - העתק: tailwind.config.ts, postcss.config.js, components.json

2. התקן dependencies ובנה:
   cd /var/www/recruitment-system
   npm install
   npm run build
   npm run db:push

3. הפעל את המערכת:
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup

4. בדוק שהכל עובד:
   - פתח דפדפן וגש ל: http://YOUR_SERVER_IP
   - בדוק logs: pm2 logs recruitment-system

5. הגדרות נוספות (אופציונלי):
   - עדכן את server_name בNginx לדומיין שלך
   - הגדר SSL עם Let's Encrypt: sudo certbot --nginx
   - הגדר פרטי SMTP בקובץ .env

קבצים חשובים:
- הגדרות: /var/www/recruitment-system/.env
- לוגים: /var/www/recruitment-system/logs/
- גיבויים: /var/backups/recruitment-system/

פקודות שימושיות:
- pm2 status                    # סטטוס התהליכים
- pm2 restart recruitment-system # הפעלה מחדש
- pm2 logs recruitment-system   # צפייה בלוגים
- sudo nginx -t                # בדיקת הגדרות nginx
- sudo systemctl status nginx  # סטטוס nginx

בהצלחה! 🚀
EOF
    
    print_success "מדריך השלמה נוצר: $INSTALL_DIR/NEXT_STEPS.txt"
}

# הפעלת כל השלבים
main() {
    print_step "מתחיל תהליך התקנה מלא..."
    
    install_packages
    setup_database
    install_pm2
    create_directories
    create_env_file
    create_pm2_config
    setup_nginx
    create_backup_scripts
    setup_firewall
    create_completion_guide
    
    echo ""
    print_success "🎉 התקנת הבסיס הושלמה בהצלחה!"
    echo ""
    print_warning "עכשיו צריך להעתיק את קבצי הפרויקט ולהריץ:"
    echo "1. העתק קבצים מReplit לתיקיה: $INSTALL_DIR"
    echo "2. cd $INSTALL_DIR"
    echo "3. npm install"
    echo "4. npm run build"
    echo "5. npm run db:push"
    echo "6. pm2 start ecosystem.config.js"
    echo ""
    print_success "קרא את המדריך המלא ב: $INSTALL_DIR/NEXT_STEPS.txt"
}

# בדיקה אם המשתמש רוצה להמשיך
echo "מערכת ההפעלה: $OS $VER"
echo "תיקיית התקנה: $INSTALL_DIR"
echo ""
read -p "האם להמשיך עם ההתקנה? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    main
else
    print_warning "התקנה בוטלה"
    exit 0
fi