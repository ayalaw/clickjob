import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { storage } from './storage';

// שירות מייל שעובד **אך ורק דרך cPanel** - ללא שירותי מייל אחרים!
let cpanelTransporter: nodemailer.Transporter | null = null;
let emailConfigLoaded = false;

// טעינת הגדרות cPanel בלבד ממסד הנתונים
async function loadCpanelEmailConfig() {
  try {
    // טעינת הגדרות SMTP של cPanel בלבד
    const cpanelSmtpHost = await storage.getSystemSetting('CPANEL_SMTP_HOST');
    const cpanelSmtpPort = await storage.getSystemSetting('CPANEL_SMTP_PORT');
    const cpanelSmtpSecure = await storage.getSystemSetting('CPANEL_SMTP_SECURE');
    const cpanelEmailUser = await storage.getSystemSetting('CPANEL_EMAIL_USER');
    const cpanelEmailPass = await storage.getSystemSetting('CPANEL_EMAIL_PASS');

    // בדיקה שכל ההגדרות של cPanel קיימות
    if (cpanelSmtpHost?.value && cpanelEmailUser?.value && cpanelEmailPass?.value) {
      console.log('🔧 מגדיר חיבור SMTP של cPanel...');
      
      // יצירת חיבור SMTP לcPanel בלבד
      cpanelTransporter = nodemailer.createTransport({
        host: cpanelSmtpHost.value,
        port: parseInt(cpanelSmtpPort?.value || '587'),
        secure: cpanelSmtpSecure?.value === 'true',
        auth: {
          user: cpanelEmailUser.value,
          pass: cpanelEmailPass.value,
        },
        tls: {
          rejectUnauthorized: false // נדרש לחלק משרתי cPanel
        },
        connectionTimeout: 15000,
        greetingTimeout: 10000,
        socketTimeout: 15000
      });

      // בדיקת חיבור לcPanel
      try {
        await cpanelTransporter!.verify();
        console.log('✅ שירות מייל cPanel פעיל ומוכן');
        emailConfigLoaded = true;
        return true;
      } catch (error) {
        console.error('❌ שגיאה בחיבור לcPanel SMTP:', error);
        cpanelTransporter = null;
        return false;
      }
    } else {
      console.warn('⚠️ הגדרות cPanel חסרות - יש להגדיר בהגדרות המערכת');
      return false;
    }
  } catch (error) {
    console.error('❌ שגיאה בטעינת הגדרות cPanel:', error);
    return false;
  }
}

// שליחת מייל דרך cPanel בלבד
export async function sendEmail({
  to,
  subject,
  html,
  attachments = []
}: {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: any[];
}): Promise<boolean> {
  try {
    // וידוא שהגדרות cPanel נטענו
    if (!emailConfigLoaded || !cpanelTransporter) {
      console.log('🔄 טוען הגדרות cPanel...');
      const loaded = await loadCpanelEmailConfig();
      if (!loaded || !cpanelTransporter) {
        console.error('❌ לא ניתן לשלוח מייל - הגדרות cPanel לא תקינות');
        return false;
      }
    }

    // שליחת המייל דרך cPanel
    const result = await cpanelTransporter!.sendMail({
      from: process.env.CPANEL_EMAIL_USER || 'no-reply@domain.com',
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
      attachments
    });

    console.log('✅ מייל נשלח בהצלחה דרך cPanel:', result.messageId);
    return true;
  } catch (error) {
    console.error('❌ שגיאה בשליחת מייל דרך cPanel:', error);
    return false;
  }
}

// אתחול שירות המייל
export async function initializeEmailService(): Promise<boolean> {
  console.log('🚀 מאתחל שירות מייל cPanel...');
  return await loadCpanelEmailConfig();
}

// בדיקת זמינות שירות המייל של cPanel
export function isEmailServiceReady(): boolean {
  return emailConfigLoaded && cpanelTransporter !== null;
}