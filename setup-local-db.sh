#!/bin/bash

# התקנת מסד נתונים PostgreSQL מקומי למערכת ניהול גיוס
# Setup Local PostgreSQL Database for Recruitment Management System

echo "🚀 מתחיל התקנת PostgreSQL מקומי..."
echo "🚀 Starting Local PostgreSQL Setup..."

# בדיקת מערכת הפעלה
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "📦 מתקין PostgreSQL על Linux..."
    
    # עדכון מאגר חבילות
    sudo apt update
    
    # התקנת PostgreSQL
    sudo apt install -y postgresql postgresql-contrib
    
    # הפעלת השירות
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    
elif [[ "$OSTYPE" == "darwin"* ]]; then
    echo "📦 מתקין PostgreSQL על macOS..."
    
    # בדיקה אם Homebrew מותקן
    if ! command -v brew &> /dev/null; then
        echo "❌ Homebrew לא מותקן. מתקין..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    
    # התקנת PostgreSQL
    brew install postgresql@15
    brew services start postgresql@15
    
else
    echo "❌ מערכת הפעלה לא נתמכת: $OSTYPE"
    exit 1
fi

echo "🗄️ יוצר מסד נתונים ומשתמש..."

# יצירת משתמש ומסד נתונים
sudo -u postgres psql << EOF
CREATE USER recruitment_user WITH PASSWORD 'recruitment_password_2024';
CREATE DATABASE recruitment_db OWNER recruitment_user;
GRANT ALL PRIVILEGES ON DATABASE recruitment_db TO recruitment_user;
\q
EOF

echo "📝 יוצר קובץ .env..."

# יצירת קובץ .env אם לא קיים
if [ ! -f ".env" ]; then
    cat > .env << EOF
# Database Configuration - PostgreSQL Local
DATABASE_URL=postgresql://recruitment_user:recruitment_password_2024@localhost:5432/recruitment_db
PGHOST=localhost
PGPORT=5432
PGUSER=recruitment_user
PGPASSWORD=recruitment_password_2024
PGDATABASE=recruitment_db

# Node Environment
NODE_ENV=development
PORT=5000

# Session Security (במסד נתונים אמיתי יש להחליף לקוד בטוח)
SESSION_SECRET=your_super_secret_session_key_change_in_production_123456789

# Email Configuration - cPanel (יש להגדיר עם הפרטים האמיתיים)
CPANEL_EMAIL_USER=your-email@yourdomain.com
CPANEL_EMAIL_PASSWORD=your-password
CPANEL_EMAIL_HOST=mail.yourdomain.com
CPANEL_IMAP_PORT=993
CPANEL_SMTP_PORT=465

# Gmail Configuration - Alternative (יש להגדיר עם הפרטים האמיתיים)
GMAIL_USER=your-gmail@gmail.com
GMAIL_PASSWORD=your-app-password

# File Upload Configuration
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760
EOF

    echo "✅ קובץ .env נוצר בהצלחה"
else
    echo "⚠️  קובץ .env כבר קיים - לא מעדכן"
fi

echo "🔧 מפעיל סכמת מסד הנתונים..."

# התקנת dependencies אם צריך
npm install

# יצירת סכמת מסד הנתונים
npm run db:push

echo "✅ התקנה הושלמה בהצלחה!"
echo ""
echo "📌 להפעלת המערכת:"
echo "   npm run dev"
echo ""
echo "📌 להגדרת פרטי מייל ואימות:"
echo "   ערוך את קובץ .env עם הפרטים שלך"
echo ""
echo "🌐 המערכת תהיה זמינה ב: http://localhost:5000"