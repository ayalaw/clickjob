import Imap from 'imap';
import nodemailer from 'nodemailer';
import { storage } from './storage';
import { insertCandidateSchema } from '../shared/schema';
import fs from 'fs';
import path from 'path';
import { simpleParser } from 'mailparser';

// cPanel Email Configuration - Load from environment variables and database
let currentImapConfig: any = null;
let currentSmtpConfig: any = null;

// Load cPanel configuration from database and environment
async function loadCpanelConfig() {
  try {
    // Load IMAP settings from database first
    const imapHost = await storage.getSystemSetting('INCOMING_EMAIL_HOST');
    const imapPort = await storage.getSystemSetting('INCOMING_EMAIL_PORT');
    const imapSecure = await storage.getSystemSetting('INCOMING_EMAIL_SECURE');
    const imapUser = await storage.getSystemSetting('INCOMING_EMAIL_USER');
    const imapPass = await storage.getSystemSetting('INCOMING_EMAIL_PASS');

    // Load SMTP settings from database
    const smtpHost = await storage.getSystemSetting('CPANEL_SMTP_HOST');
    const smtpPort = await storage.getSystemSetting('CPANEL_SMTP_PORT');
    const smtpSecure = await storage.getSystemSetting('CPANEL_SMTP_SECURE');
    const smtpUser = await storage.getSystemSetting('CPANEL_EMAIL_USER');
    const smtpPass = await storage.getSystemSetting('CPANEL_EMAIL_PASS');

    // Fallback to environment variables if database settings are not available
    currentImapConfig = {
      user: imapUser?.value || process.env.INCOMING_EMAIL_USER || '',
      password: imapPass?.value || process.env.INCOMING_EMAIL_PASS || '',
      host: imapHost?.value || process.env.INCOMING_EMAIL_HOST || '',
      port: parseInt(imapPort?.value || process.env.INCOMING_EMAIL_PORT || '993'),
      tls: (imapSecure?.value || process.env.INCOMING_EMAIL_SECURE) === 'true',
      authTimeout: 30000,
      connTimeout: 30000,
      socketTimeout: 30000,
      tlsOptions: { 
        rejectUnauthorized: false,
        ciphers: 'ALL'
      }
    };

    currentSmtpConfig = {
      host: smtpHost?.value || process.env.CPANEL_SMTP_HOST || '',
      port: parseInt(smtpPort?.value || process.env.CPANEL_SMTP_PORT || '587'),
      secure: (smtpSecure?.value || process.env.CPANEL_SMTP_SECURE) === 'true',
      auth: {
        user: smtpUser?.value || process.env.CPANEL_EMAIL_USER || '',
        pass: smtpPass?.value || process.env.CPANEL_EMAIL_PASS || ''
      },
      tls: { rejectUnauthorized: false }
    };

    console.log('✅ הגדרות cPanel נטענו בהצלחה');
    return true;
  } catch (error) {
    console.error('❌ שגיאה בטעינת הגדרות cPanel:', error);
    return false;
  }
}

// Test cPanel IMAP connection
export async function testCpanelImap(): Promise<boolean> {
  console.log('🔄 בדיקת חיבור cPanel IMAP...');
  
  if (!currentImapConfig) {
    await loadCpanelConfig();
  }

  if (!currentImapConfig.user || !currentImapConfig.password || !currentImapConfig.host) {
    console.log('❌ הגדרות IMAP חסרות - נא להגדיר בקובץ .env או במסד הנתונים');
    return false;
  }

  return new Promise((resolve) => {
    console.log(`📧 IMAP: ${currentImapConfig.user}@${currentImapConfig.host}:${currentImapConfig.port} (SSL: ${currentImapConfig.tls})`);
    
    const imap = new Imap(currentImapConfig);
    
    imap.once('ready', () => {
      console.log('✅ חיבור IMAP מוצלח');
      imap.end();
      resolve(true);
    });

    imap.once('error', (err: any) => {
      console.error('❌ שגיאת חיבור cPanel:', err.message);
      resolve(false);
    });

    imap.once('end', () => {
      console.log('🔌 חיבור IMAP נסגר');
    });

    try {
      imap.connect();
    } catch (error) {
      console.error('❌ שגיאה בחיבור IMAP:', error);
      resolve(false);
    }
  });
}

// Test cPanel SMTP connection
export async function testCpanelSmtp(): Promise<boolean> {
  console.log('🔄 בדיקת חיבור cPanel SMTP...');
  
  if (!currentSmtpConfig) {
    await loadCpanelConfig();
  }

  if (!currentSmtpConfig.auth.user || !currentSmtpConfig.auth.pass || !currentSmtpConfig.host) {
    console.log('❌ הגדרות SMTP חסרות - נא להגדיר בקובץ .env או במסד הנתונים');
    return false;
  }

  try {
    const transporter = nodemailer.createTransporter(currentSmtpConfig);
    await transporter.verify();
    console.log('✅ חיבור SMTP מוצלח');
    return true;
  } catch (error) {
    console.error('❌ שגיאת חיבור SMTP:', error);
    return false;
  }
}

// Monitor cPanel email for new candidates
export async function startCpanelEmailMonitoring() {
  console.log('🔄 מפעיל מעקב מיילים cPanel...');
  
  if (!currentImapConfig) {
    await loadCpanelConfig();
  }

  if (!currentImapConfig.user || !currentImapConfig.password || !currentImapConfig.host) {
    console.log('❌ לא ניתן להפעיל מעקב מיילים - הגדרות IMAP חסרות');
    return;
  }

  // Check for new emails every 5 minutes
  setInterval(async () => {
    await checkForNewEmails();
  }, 5 * 60 * 1000);

  // Initial check
  setTimeout(async () => {
    await checkForNewEmails();
  }, 10000); // Wait 10 seconds before first check
}

// Check for new emails
async function checkForNewEmails() {
  if (!currentImapConfig.user || !currentImapConfig.password) {
    console.log('❌ Timeout בבדיקת מיילים');
    return;
  }

  const imap = new Imap(currentImapConfig);
  
  return new Promise<void>((resolve) => {
    console.log('📧 בודק מיילים חדשים בcPanel...');
    
    const timeout = setTimeout(() => {
      console.log('❌ Timeout בבדיקת מיילים');
      imap.destroy();
      resolve();
    }, 15000); // 15 second timeout

    imap.once('ready', () => {
      clearTimeout(timeout);
      imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          console.error('❌ שגיאה בפתיחת תיבת דואר:', err.message);
          imap.end();
          resolve();
          return;
        }

        // Search for unread emails
        imap.search(['UNSEEN'], (err, results) => {
          if (err) {
            console.error('❌ שגיאה בחיפוש מיילים:', err.message);
            imap.end();
            resolve();
            return;
          }

          if (results.length === 0) {
            console.log('📭 אין מיילים חדשים');
            imap.end();
            resolve();
            return;
          }

          console.log(`📬 נמצאו ${results.length} מיילים חדשים`);
          processNewEmails(imap, results).then(() => {
            imap.end();
            resolve();
          });
        });
      });
    });

    imap.once('error', (err: any) => {
      clearTimeout(timeout);
      console.error('❌ שגיאת חיבור cPanel:', err.message);
      resolve();
    });

    imap.once('end', () => {
      clearTimeout(timeout);
      resolve();
    });

    try {
      imap.connect();
    } catch (error) {
      clearTimeout(timeout);
      console.error('❌ שגיאה בחיבור למיילים:', error);
      resolve();
    }
  });
}

// Process new emails and extract CV data
async function processNewEmails(imap: any, results: number[]) {
  return new Promise<void>((resolve) => {
    const fetch = imap.fetch(results, {
      bodies: '',
      markSeen: true
    });

    fetch.on('message', (msg: any, seqno: number) => {
      console.log(`📧 מעבד מייל #${seqno}`);
      
      msg.on('body', (stream: any) => {
        simpleParser(stream, async (err, parsed) => {
          if (err) {
            console.error('❌ שגיאה בפענוח מייל:', err);
            return;
          }

          await processEmailForCandidate(parsed);
        });
      });
    });

    fetch.once('error', (err: any) => {
      console.error('❌ שגיאה בעיבוד מיילים:', err);
      resolve();
    });

    fetch.once('end', () => {
      console.log('✅ סיום עיבוד מיילים');
      resolve();
    });
  });
}

// Process email and extract candidate data
async function processEmailForCandidate(email: any) {
  try {
    console.log(`📧 מעבד מייל מ: ${email.from?.text || 'לא ידוע'}`);
    console.log(`📧 נושא: ${email.subject || 'ללא נושא'}`);

    // Extract sender email
    const senderEmail = email.from?.value?.[0]?.address || email.from?.text?.match(/<(.+?)>/)?.[1] || '';
    
    if (!senderEmail) {
      console.log('❌ לא ניתן לחלץ כתובת מייל מהשולח');
      return;
    }

    // Check if candidate already exists
    const existingCandidate = await storage.getCandidateByEmail(senderEmail);
    if (existingCandidate) {
      console.log(`ℹ️ מועמד כבר קיים במערכת: ${senderEmail}`);
      return;
    }

    // Create candidate from email data
    const candidateData = {
      firstName: email.from?.value?.[0]?.name?.split(' ')[0] || 'לא ידוע',
      lastName: email.from?.value?.[0]?.name?.split(' ').slice(1).join(' ') || '',
      email: senderEmail,
      phone: extractPhoneFromEmail(email.text || ''),
      source: 'מייל נכנס',
      notes: `מייל נוסף ב-${new Date().toLocaleDateString('he-IL')}\nנושא: ${email.subject}\n\n${email.text || ''}`,
      status: 'חדש'
    };

    // Process attachments for CV files
    if (email.attachments && email.attachments.length > 0) {
      for (const attachment of email.attachments) {
        if (isCVFile(attachment.filename)) {
          const cvPath = await saveAttachment(attachment, senderEmail);
          if (cvPath) {
            candidateData.cvFile = cvPath;
            console.log(`💾 קובץ CV נשמר: ${cvPath}`);
          }
        }
      }
    }

    // Create candidate
    const candidate = await storage.createCandidate(candidateData);
    console.log(`✅ נוצר מועמד חדש: ${candidate.firstName} ${candidate.lastName} (${candidate.email})`);

  } catch (error) {
    console.error('❌ שגיאה בעיבוד מועמד ממייל:', error);
  }
}

// Helper functions
function extractPhoneFromEmail(text: string): string {
  const phoneRegex = /(\+972|0)[\s-]?[5-9]\d{7,8}|\d{2,3}[\s-]?\d{7}/g;
  const match = text.match(phoneRegex);
  return match ? match[0].replace(/[\s-]/g, '') : '';
}

function isCVFile(filename: string): boolean {
  if (!filename) return false;
  const ext = path.extname(filename).toLowerCase();
  return ['.pdf', '.doc', '.docx'].includes(ext);
}

async function saveAttachment(attachment: any, email: string): Promise<string | null> {
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const timestamp = Date.now();
    const cleanEmail = email.replace(/[^a-zA-Z0-9]/g, '_');
    const ext = path.extname(attachment.filename);
    const filename = `cv_${cleanEmail}_${timestamp}${ext}`;
    const savedPath = path.join(uploadsDir, filename);
    
    fs.writeFileSync(savedPath, attachment.content);
    return filename; // Return relative path
  } catch (error) {
    console.error('❌ שגיאה בשמירת קובץ:', error);
    return null;
  }
}

// Export reload function
export async function reloadCpanelConfig() {
  console.log('🔄 רענון הגדרות cPanel...');
  const success = await loadCpanelConfig();
  if (success) {
    console.log('✅ הגדרות cPanel עודכנו עם הפרטים הנכונים');
  }
  return success;
}

// Test all cPanel functionality
export async function testAllCpanelEmail() {
  console.log('🧪 בדיקה מלאה של מערכת cPanel...');
  
  const imapResult = await testCpanelImap();
  const smtpResult = await testCpanelSmtp();
  
  if (imapResult && smtpResult) {
    console.log('✅ כל מערכות cPanel פועלות תקין');
    // Start monitoring after successful test
    startCpanelEmailMonitoring();
  } else {
    console.log('❌ יש בעיות במערכת cPanel - נא לבדוק הגדרות');
  }
  
  return imapResult && smtpResult;
}

// Initialize
loadCpanelConfig();