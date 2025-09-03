# מערכת ניהול גיוס עצמאית
## Standalone Recruitment Management System

מערכת ניהול גיוס מלאה עם ממשק בעברית, ניהול מועמדים, לקוחות, משרות ומשימות.

### דרישות מערכת

- **Node.js** 18+ 
- **PostgreSQL** 12+
- **Linux Server** עם cPanel (אופציונלי לאימייל)

### הוראות התקנה

#### 1. הכנת מסד הנתונים

```bash
# יצירת מסד נתונים חדש
sudo -u postgres createdb recruitment_db

# יצירת משתמש למסד נתונים
sudo -u postgres psql -c "CREATE USER recruitment_user WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE recruitment_db TO recruitment_user;"
```

#### 2. התקנת המערכת

```bash
# חילוץ הקבצים
unzip recruitment-management-system.zip
cd recruitment-management-system

# העתקת קובץ ההגדרות
cp .env.standalone .env

# עריכת הגדרות הסביבה
nano .env
```

#### 3. עדכון קובץ ההגדרות (.env)

ערוך את הקובץ `.env` ועדכן את הפרטים הבאים:

```bash
# חיבור למסד נתונים
DATABASE_URL=postgresql://recruitment_user:your_password@localhost:5432/recruitment_db

# הגדרות אדמין
ADMIN_EMAIL=admin@yourcompany.com
ADMIN_PASSWORD=secure_admin_password

# הגדרות אימייל (cPanel)
CPANEL_SMTP_HOST=mail.yourcompany.com
CPANEL_EMAIL_USER=system@yourcompany.com
CPANEL_EMAIL_PASS=your_email_password

# מפתח הצפנה (שנה בהחלט!)
SESSION_SECRET=your-very-long-and-secure-session-secret-key
```

#### 4. התקנת תלויות

```bash
# העתק package.json העצמאי
cp package.standalone.json package.json

# התקנת packages
npm install
```

#### 5. יצירת מבנה מסד הנתונים

```bash
# יצירת הטבלאות
npm run db:push --force
```

#### 6. הרצת המערכת

```bash
# הרצה במצב פיתוח
npm run dev

# או הרצה במצב ייצור
npm run build
npm start
```

### הגדרת שירות (Production)

יצירת קובץ systemd service:

```bash
sudo nano /etc/systemd/system/recruitment-system.service
```

```ini
[Unit]
Description=Recruitment Management System
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/recruitment-management-system
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
# הפעלת השירות
sudo systemctl enable recruitment-system
sudo systemctl start recruitment-system
sudo systemctl status recruitment-system
```

### הגדרת Nginx (אופציונלי)

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### התחברות למערכת

1. גש לכתובת: `http://your-server:3000`
2. התחבר עם:
   - **אימייל**: כפי שהגדרת ב-ADMIN_EMAIL
   - **סיסמה**: כפי שהגדרת ב-ADMIN_PASSWORD

### תכונות המערכת

- ✅ **ניהול מועמדים** - הוספה, עריכה, חיפוש
- ✅ **ניהול לקוחות** - חברות ואנשי קשר
- ✅ **ניהול משרות** - פתיחת משרות והתאמות
- ✅ **מערכת משימות** - מעקב אחר פעילויות
- ✅ **העלאת קבצים** - קורות חיים ומסמכים
- ✅ **מערכת הרשאות** - תפקידים והרשאות
- ✅ **ממשק בעברית** - תמיכה מלאה בעברית
- ✅ **אימייל cPanel** - שליחה וקבלה של מיילים

### פתרון בעיות

#### בעיות חיבור למסד נתונים
```bash
# בדיקת חיבור
psql -h localhost -U recruitment_user -d recruitment_db

# בדיקת לוגים
sudo journalctl -u recruitment-system -f
```

#### איפוס סיסמת אדמין
```bash
# הוסף למשתמש הקיים או צור חדש
npm run reset-admin
```

### גיבוי ושחזור

#### גיבוי
```bash
pg_dump -h localhost -U recruitment_user recruitment_db > backup.sql
```

#### שחזור
```bash
psql -h localhost -U recruitment_user recruitment_db < backup.sql
```

### תמיכה

מערכת זו עצמאית לחלוטין ולא דורשת חיבור לשירותים חיצוניים.
כל הנתונים נשמרים מקומית במסד הנתונים שלך.

**גרסה**: 1.0.0  
**תאריך**: ינואר 2025