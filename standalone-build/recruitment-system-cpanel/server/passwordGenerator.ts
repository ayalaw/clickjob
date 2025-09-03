import crypto from 'crypto';

/**
 * יוצר סיסמא אוטומטית בת 8 תווים
 * כולל: אותיות גדולות, אותיות קטנות, מספרים וסימנים מיוחדים
 */
export function generateSecurePassword(): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()';
  
  // מבטיח שהסיסמא תכיל לפחות אחד מכל קטגוריה
  const password = [
    uppercase[crypto.randomInt(0, uppercase.length)],     // אות גדולה
    lowercase[crypto.randomInt(0, lowercase.length)],     // אות קטנה
    numbers[crypto.randomInt(0, numbers.length)],         // מספר
    symbols[crypto.randomInt(0, symbols.length)]          // סימן מיוחד
  ];
  
  // משלים עד 8 תווים עם תווים אקראיים
  const allChars = uppercase + lowercase + numbers + symbols;
  for (let i = 4; i < 8; i++) {
    password.push(allChars[crypto.randomInt(0, allChars.length)]);
  }
  
  // מערבב את הסיסמא כדי שהקטגוריות לא יהיו בסדר קבוע
  return shuffleArray(password).join('');
}

/**
 * מערבב מערך בצורה אקראית
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * בודק עוצמת סיסמא
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  requirements: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    numbers: boolean;
    symbols: boolean;
  };
} {
  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    numbers: /[0-9]/.test(password),
    symbols: /[!@#$%^&*()]/.test(password)
  };
  
  const isValid = Object.values(requirements).every(req => req);
  
  return { isValid, requirements };
}

/**
 * יוצר שם משתמש מכתובת מייל
 */
export function generateUsername(email: string): string {
  // לוקח את החלק שלפני @ ומנקה תווים מיוחדים
  return email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}