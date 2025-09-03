# הוראות התקנה מפורטות - מערכת ניהול גיוס cPanel

## שלב 1: הכנות בסיסיות בcPanel

### 1.1 הורדת הקובץ
1. הורד את הקובץ `recruitment-system-cpanel-only-FINAL.tar.gz`
2. שמור אותו במחשב שלך

### 1.2 כניסה לcPanel
1. היכנס לcPanel של השרת שלך
2. עבור לאזור "קבצים" → "מנהל קבצים" (File Manager)
3. בחר בתיקיית השורש של הדומיין (`public_html` או תיקייה אחרת לפי הצורך)

## שלב 2: העלאה וחילוץ הקבצים

### 2.1 העלאת הקובץ
1. בעמוד מנהל הקבצים, לחץ על "העלה" (Upload)
2. בחר את הקובץ `recruitment-system-cpanel-only-FINAL.tar.gz`
3. חכה להשלמת ההעלאה

### 2.2 חילוץ הקבצים
1. לחץ ימין על הקובץ שהועלה
2. בחר "חלץ" (Extract)
3. בחר את התיקייה היעד (בדרך כלל `public_html`)
4. אשר את החילוץ

### 2.3 ארגון קבצים
1. לאחר החילוץ תקבל תיקייה בשם `recruitment-system-fully-standalone`
2. העבר את כל התוכן של התיקייה הזו לתיקיית השורש שלך
3. מחק את התיקייה הריקה ואת קובץ ה-tar.gz

## שלב 3: הגדרת מסד נתונים PostgreSQL

### 3.1 יצירת מסד נתונים
1. בcPanel, עבור ל"מסדי נתונים" → "PostgreSQL Databases"
2. צור מסד נתונים חדש (לדוגמה: `recruitment_db`)
3. צור משתמש חדש למסד הנתונים
4. הקצה למשתמש הרשאות מלאות למסד הנתונים

### 3.2 רישום פרטי החיבור
שמור את הפרטים הבאים:
- שם מסד הנתונים: `yourdomain_recruitment_db`
- שם משתמש: `yourdomain_dbuser`
- סיסמה: `הסיסמה-שיצרת`
- שרת: `localhost` (בדרך כלל)
- פורט: `5432` (ברירת מחדל של PostgreSQL)

## שלב 4: הגדרת אימייל cPanel

### 4.1 יצירת חשבון אימייל
1. בcPanel, עבור ל"אימייל" → "חשבונות אימייל" (Email Accounts)
2. צור חשבון אימייל חדש (לדוגמה: `recruitment@yourdomain.com`)
3. הגדר סיסמה חזקה

### 4.2 רישום הגדרות SMTP/IMAP
שמור את הפרטים הבאים:
- שרת SMTP: `mail.yourdomain.com`
- פורט SMTP: `587` (או `465` עם SSL)
- שרת IMAP: `mail.yourdomain.com`
- פורט IMAP: `993` (עם SSL) או `143` (ללא SSL)
- שם משתמש: `recruitment@yourdomain.com`
- סיסמה: `הסיסמה-שיצרת`

## שלב 5: התקנת Node.js (אם לא מותקן)

### 5.1 בדיקת Node.js קיים
1. בcPanel, עבור ל"תוכנה" → "Node.js Apps" (אם קיים)
2. אם לא קיים, בדוק בטרמינל: `node --version`

### 5.2 התקנת Node.js (אם נדרש)
1. פנה לספק האחסון שלך להתקנת Node.js
2. ודא שגרסת Node.js היא 18 או חדשה יותר
3. ודא שnpm מותקן

## שלב 6: עריכת קובץ הגדרות הסביבה

### 6.1 עריכת קובץ .env
1. במנהל הקבצים, פתח את הקובץ `.env`
2. ערוך את הפרטים הבאים:

```env
# הגדרות מסד נתונים
DATABASE_URL=postgresql://yourdomain_dbuser:password@localhost:5432/yourdomain_recruitment_db

# הגדרות SMTP של cPanel
CPANEL_SMTP_HOST=mail.yourdomain.com
CPANEL_SMTP_PORT=587
CPANEL_SMTP_SECURE=false
CPANEL_EMAIL_USER=recruitment@yourdomain.com
CPANEL_EMAIL_PASS=your-email-password

# הגדרות IMAP של cPanel לקבלת מיילים
INCOMING_EMAIL_HOST=mail.yourdomain.com
INCOMING_EMAIL_PORT=993
INCOMING_EMAIL_SECURE=true
INCOMING_EMAIL_USER=recruitment@yourdomain.com
INCOMING_EMAIL_PASS=your-email-password

# הגדרות אבטחה
SESSION_SECRET=your-very-long-random-secret-key
NODE_ENV=production
PORT=3000
```

### 6.2 החלפת הערכים
החלף את הערכים הבאים בערכים האמיתיים שלך:
- `yourdomain_dbuser` - שם המשתמש של מסד הנתונים
- `password` - סיסמת מסד הנתונים
- `yourdomain_recruitment_db` - שם מסד הנתונים
- `mail.yourdomain.com` - שרת המייל שלך
- `recruitment@yourdomain.com` - כתובת המייל שיצרת
- `your-email-password` - סיסמת המייל
- `your-very-long-random-secret-key` - מפתח סודי ארוך (32+ תווים)

## שלב 7: התקנת התלויות

### 7.1 פתיחת טרמינל
1. בcPanel, עבור ל"מתקדם" → "טרמינל" (Terminal)
2. אם לא קיים, השתמש ב-SSH לחיבור לשרת

### 7.2 ניווט לתיקיית הפרויקט
```bash
cd public_html
# או cd path/to/your/project
```

### 7.3 התקנת התלויות
```bash
npm install
```

## שלב 8: בניית הפרויקט

### 8.1 בניית הקוד
```bash
npm run build
```

### 8.2 יצירת טבלאות מסד הנתונים
```bash
npm run db:push
```

אם יש שגיאה, נסה:
```bash
npm run db:push --force
```

## שלב 9: הרצת המערכת

### 9.1 הרצה ראשונית לבדיקה
```bash
npm start
```

### 9.2 בדיקת פעולה
1. פתח דפדפן וגש לכתובת: `http://yourdomain.com:3000`
2. ודא שהעמוד נטען כראוי
3. נסה להתחבר עם:
   - שם משתמש: `admin@localhost.local`
   - סיסמה: `admin123`

## שלב 10: הגדרת הרצה אוטומטית (PM2)

### 10.1 התקנת PM2
```bash
npm install -g pm2
```

### 10.2 יצירת קובץ PM2
צור קובץ `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'recruitment-system',
    script: 'npm',
    args: 'start',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

### 10.3 הפעלת המערכת עם PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## שלב 11: הגדרת Proxy (אופציונלי)

אם ברצונך שהמערכת תהיה זמינה ללא ציון פורט:

### 11.1 עריכת .htaccess
צור קובץ `.htaccess` בתיקיית `public_html`:
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ http://localhost:3000/$1 [P,L]
```

## שלב 12: בדיקות סופיות

### 12.1 בדיקת חיבור למסד נתונים
1. היכנס למערכת
2. נסה ליצור מועמד חדש
3. ודא שהנתונים נשמרים

### 12.2 בדיקת מערכת המייל
1. שלח מייל עם קובץ CV לכתובת שהגדרת
2. ודא שהמערכת מזהה ויוצרת מועמד חדש
3. בדוק ברישומי המערכת (Logs)

### 12.3 בדיקת ביצועים
1. נסה ליצור כמה מועמדים, לקוחות ומשרות
2. ודא שהמערכת פועלת בצורה חלקה
3. בדוק זמני טעינה

## פתרון בעיות נפוצות

### בעיה: שגיאת חיבור למסד נתונים
**פתרון:**
1. ודא שפרטי החיבור נכונים ב-`.env`
2. ודא שמסד הנתונים פועל
3. בדוק הרשאות המשתמש

### בעיה: שגיאת חיבור למייל
**פתרון:**
1. ודא שהגדרות ה-SMTP/IMAP נכונות
2. בדוק שהחשבון פעיל בcPanel
3. נסה פורטים שונים (587, 465, 25)

### בעיה: המערכת לא עולה
**פתרון:**
1. בדוק את הלוגים: `pm2 logs`
2. ודא שהפורט פנוי
3. בדוק שNode.js מותקן ופועל

## תמיכה

במקרה של בעיות:
1. בדוק את הלוגים: `pm2 logs recruitment-system`
2. ודא שכל ההגדרות בקובץ `.env` נכונות
3. פנה לספק האחסון שלך לעזרה בהתקנת Node.js או PostgreSQL

המערכת מוכנה לשימוש! 🎉