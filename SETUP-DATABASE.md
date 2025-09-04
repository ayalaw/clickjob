# הגדרת מסד נתונים PostgreSQL מקומי
## Setup Local PostgreSQL Database

המערכת הוגדרה כעת לעבוד עם מסד נתונים PostgreSQL מקומי עם תמיכה מלאה בקבצי .env.

## התקנה מהירה

### 1. התקנת PostgreSQL

#### לינוקס (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### macOS:
```bash
# התקנת Homebrew (אם לא מותקן)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# התקנת PostgreSQL
brew install postgresql@15
brew services start postgresql@15
```

#### Windows:
הורד והתקן מ: https://www.postgresql.org/download/windows/

### 2. יצירת מסד נתונים
```bash
# יצירת משתמש ומסד נתונים
sudo -u postgres psql -c "CREATE USER recruitment_user WITH PASSWORD 'recruitment_password_2024';"
sudo -u postgres psql -c "CREATE DATABASE recruitment_db OWNER recruitment_user;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE recruitment_db TO recruitment_user;"
```

### 3. יצירת קובץ .env
צור קובץ `.env` בשורש הפרויקט:
```bash
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

# Session Security (החלף בסיסמה בטוחה)
SESSION_SECRET=your_super_secret_session_key_change_in_production_123456789

# Email Configuration - cPanel
CPANEL_EMAIL_USER=your-email@yourdomain.com
CPANEL_EMAIL_PASSWORD=your-password
CPANEL_EMAIL_HOST=mail.yourdomain.com
CPANEL_IMAP_PORT=993
CPANEL_SMTP_PORT=465

# Gmail Configuration - Alternative
GMAIL_USER=your-gmail@gmail.com
GMAIL_PASSWORD=your-app-password
```

### 4. התקנת התלויות והפעלת המערכת
```bash
# התקנת חבילות
npm install

# יצירת סכמת מסד הנתונים
npm run db:push

# הפעלת המערכת
npm run dev
```

## התקנה אוטומטית

להתקנה מהירה, הפעל את הסקריפט:
```bash
./setup-local-db.sh
```

הסקריפט יבצע:
- ✅ התקנת PostgreSQL
- ✅ יצירת מסד נתונים ומשתמש
- ✅ יצירת קובץ .env
- ✅ הפעלת סכמת מסד הנתונים

## שימוש במערכת

### הפעלה רגילה
```bash
npm run dev
```

### צפייה במסד הנתונים
```bash
npx drizzle-kit studio
```

### איפוס מסד הנתונים
```bash
npm run db:push -- --force
```

## משתני הסביבה הנדרשים

### מסד נתונים (חובה)
- `DATABASE_URL` - מחרוזת החיבור לPostgreSQL
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` - פרטי החיבור

### אבטחה (חובה)
- `SESSION_SECRET` - מפתח סודי לסשנים (64+ תווים)
- `NODE_ENV` - סביבת הפיתוח

### מייל (אופציונלי)
- `CPANEL_EMAIL_*` - הגדרות cPanel
- `GMAIL_*` - הגדרות Gmail

## בעיות נפוצות

### שגיאת חיבור למסד נתונים
```
Error: DATABASE_URL is required
```
**פתרון:** ודא שקובץ .env קיים עם DATABASE_URL נכון

### PostgreSQL לא מותקן
```
psql: command not found
```
**פתרון:** התקן PostgreSQL לפי הוראות מערכת ההפעלה

### בעיות הרשאות
```
FATAL: role "recruitment_user" does not exist
```
**פתרון:** הפעל מחדש את פקודות יצירת המשתמש

## הפעלה בפרודקשן

להפעלה בשרת ייצור:
1. החלף את `SESSION_SECRET` בסיסמה בטוחה
2. עדכן `NODE_ENV=production`
3. הגדר SSL למסד נתונים אם נדרש
4. הגדר משתני סביבה לאימייל

המערכת כעת מוכנה לעבודה עצמאית עם PostgreSQL מקומי!