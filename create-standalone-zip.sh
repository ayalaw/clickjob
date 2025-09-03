#!/bin/bash

# יצירת קובץ ZIP למערכת ניהול גיוס עצמאית
echo "🏗️ מכין קובץ ZIP למערכת גיוס עצמאית..."

# יצירת תיקיה זמנית
TEMP_DIR="recruitment-system-standalone"
rm -rf $TEMP_DIR
mkdir $TEMP_DIR

echo "📁 מעתיק קבצי מקור..."

# העתקת קבצי המקור החיוניים
cp -r client $TEMP_DIR/
cp -r server $TEMP_DIR/
cp -r shared $TEMP_DIR/

echo "📦 מעתיק קבצי הגדרה..."

# קבצי הגדרה מעודכנים לגרסה עצמאית
cp package.standalone.json $TEMP_DIR/package.json
cp vite.config.standalone.ts $TEMP_DIR/vite.config.ts
cp .env.standalone $TEMP_DIR/.env.example
cp README-STANDALONE.md $TEMP_DIR/README.md

# קבצי הגדרה חיוניים אחרים
cp tsconfig.json $TEMP_DIR/ 2>/dev/null || true
cp tailwind.config.ts $TEMP_DIR/ 2>/dev/null || true
cp postcss.config.js $TEMP_DIR/ 2>/dev/null || true
cp drizzle.config.ts $TEMP_DIR/ 2>/dev/null || true

echo "🗃️ יוצר תיקיות נחוצות..."

# יצירת תיקיות נחוצות
mkdir -p $TEMP_DIR/uploads
mkdir -p $TEMP_DIR/users
mkdir -p $TEMP_DIR/dist
mkdir -p $TEMP_DIR/dist/public

echo "📝 יוצר קבצי עזר..."

# יצירת קובץ התקנה מהיר
cat > $TEMP_DIR/install.sh << 'EOF'
#!/bin/bash
echo "🚀 מתקין מערכת ניהול גיוס..."

# בדיקת Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js לא מותקן. אנא התקן Node.js 18+ לפני המשך."
    exit 1
fi

# בדיקת PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL לא מותקן. אנא התקן PostgreSQL לפני המשך."
    exit 1
fi

echo "✅ מבדוק תלויות..."

# העתק קובץ הגדרות אם לא קיים
if [ ! -f .env ]; then
    cp .env.example .env
    echo "📝 נוצר קובץ .env - אנא ערוך אותו עם הפרטים שלך"
fi

# התקנת packages
echo "📦 מתקין תלויות..."
npm install

echo "🗄️ יוצר מבנה מסד נתונים..."
npm run db:push --force

echo "🏗️ בונה את המערכת..."
npm run build

echo "✅ התקנה הושלמה!"
echo "📖 קרא את הקובץ README.md להוראות הפעלה"
echo "🚀 להפעלת המערכת: npm start"
EOF

chmod +x $TEMP_DIR/install.sh

# יצירת קובץ systemd service לדוגמה
cat > $TEMP_DIR/recruitment-system.service << 'EOF'
[Unit]
Description=Recruitment Management System
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/recruitment-system-standalone
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=recruitment-system
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

echo "🧹 מנקה קבצים לא רלוונטיים..."

# הסרת קבצים לא רלוונטיים לפריסה עצמאית
rm -f $TEMP_DIR/server/replitAuth.ts 2>/dev/null || true
rm -rf $TEMP_DIR/.replit 2>/dev/null || true
rm -rf $TEMP_DIR/node_modules 2>/dev/null || true
rm -rf $TEMP_DIR/.git 2>/dev/null || true

echo "📦 יוצר קובץ ZIP..."

# יצירת קובץ ZIP
ZIP_NAME="recruitment-management-system-standalone.zip"
rm -f $ZIP_NAME

cd $TEMP_DIR
zip -r ../$ZIP_NAME . -x "*.log" "*.tmp" ".DS_Store" "Thumbs.db"
cd ..

# ניקוי
rm -rf $TEMP_DIR

echo "✅ קובץ ZIP נוצר בהצלחה: $ZIP_NAME"
echo "📊 גודל הקובץ: $(ls -lh $ZIP_NAME | awk '{print $5}')"
echo ""
echo "🚀 המערכת מוכנה לפריסה עצמאית!"
echo "📖 חלץ את הקובץ לשרת שלך ועקב אחר ההוראות ב-README.md"