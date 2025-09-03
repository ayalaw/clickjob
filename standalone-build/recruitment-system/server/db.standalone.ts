import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

console.log('🗄️ מתחבר למסד נתונים PostgreSQL מקומי...');

// יצירת connection pool מקומי
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // הגדרות אופטימליות לשרת מקומי
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// בדיקת חיבור
pool.on('connect', () => {
  console.log('✅ חיבור למסד נתונים מקומי הצליח');
});

pool.on('error', (err) => {
  console.error('❌ שגיאה במסד נתונים מקומי:', err);
});

// יצירת drizzle instance
export const db = drizzle(pool, { schema });

// פונקציה לבדיקת חיבור
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('✅ מסד נתונים מקומי פעיל:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ בעיה בחיבור למסד נתונים מקומי:', error);
    return false;
  }
}

// פונקציה לסגירת חיבורים
export async function closeDatabaseConnections(): Promise<void> {
  await pool.end();
  console.log('🔌 חיבורי מסד נתונים נסגרו');
}

console.log('🗄️ מסד נתונים PostgreSQL מקומי מוכן לשימוש');