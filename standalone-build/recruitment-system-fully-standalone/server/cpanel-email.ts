import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { storage } from './storage';

// שירות מעקב מיילים שעובד **אך ורק דרך cPanel IMAP** - ללא שירותי מייל אחרים!
let currentCpanelImapConfig: any = null;
let isMonitoringActive = false;

// טעינת הגדרות cPanel IMAP ממסד הנתונים
async function loadCpanelImapConfig() {
  try {
    console.log('🔧 טוען הגדרות cPanel IMAP...');
    
    const imapHost = await storage.getSystemSetting('INCOMING_EMAIL_HOST');
    const imapPort = await storage.getSystemSetting('INCOMING_EMAIL_PORT');
    const imapSecure = await storage.getSystemSetting('INCOMING_EMAIL_SECURE');
    const imapUser = await storage.getSystemSetting('INCOMING_EMAIL_USER');
    const imapPass = await storage.getSystemSetting('INCOMING_EMAIL_PASS');

    // וידוא שכל ההגדרות קיימות
    if (!imapHost?.value || !imapUser?.value || !imapPass?.value) {
      console.warn('⚠️ הגדרות cPanel IMAP חסרות במסד הנתונים');
      return false;
    }

    currentCpanelImapConfig = {
      user: imapUser.value,
      password: imapPass.value,
      host: imapHost.value,
      port: parseInt(imapPort?.value || '993'),
      tls: (imapSecure?.value || 'true') === 'true',
      authTimeout: 30000,
      connTimeout: 30000,
      socketTimeout: 30000,
      tlsOptions: { 
        rejectUnauthorized: false,
        ciphers: 'ALL'
      }
    };

    console.log('✅ הגדרות cPanel IMAP נטענו בהצלחה');
    return true;
  } catch (error) {
    console.error('❌ שגיאה בטעינת הגדרות cPanel IMAP:', error);
    return false;
  }
}

// בדיקת חיבור לcPanel IMAP
export async function testCpanelImap(): Promise<boolean> {
  console.log('🔄 בודק חיבור לcPanel IMAP...');
  
  if (!currentCpanelImapConfig) {
    const loaded = await loadCpanelImapConfig();
    if (!loaded) return false;
  }

  return new Promise((resolve) => {
    const imap = new Imap(currentCpanelImapConfig);
    
    const timeout = setTimeout(() => {
      imap.destroy();
      resolve(false);
    }, 15000);

    imap.once('ready', () => {
      clearTimeout(timeout);
      console.log('✅ חיבור לcPanel IMAP הצליח');
      imap.end();
      resolve(true);
    });

    imap.once('error', (err) => {
      clearTimeout(timeout);
      console.error('❌ שגיאה בחיבור לcPanel IMAP:', err.message);
      resolve(false);
    });

    try {
      imap.connect();
    } catch (error) {
      clearTimeout(timeout);
      console.error('❌ שגיאה ביצירת חיבור לcPanel IMAP:', error);
      resolve(false);
    }
  });
}

// מעקב אחרי מיילים חדשים בcPanel
export async function startCpanelEmailMonitoring(): Promise<void> {
  if (isMonitoringActive) {
    console.log('⚠️ מעקב מיילים cPanel כבר פעיל');
    return;
  }

  console.log('🚀 מפעיל מעקב מיילים cPanel');
  
  if (!currentCpanelImapConfig) {
    const loaded = await loadCpanelImapConfig();
    if (!loaded) {
      console.error('❌ לא ניתן להפעיל מעקב - הגדרות cPanel IMAP לא תקינות');
      return;
    }
  }

  isMonitoringActive = true;
  monitorCpanelEmails();
}

// פונקציה פנימית למעקב מיילים
async function monitorCpanelEmails() {
  const CHECK_INTERVAL = 60000; // בדיקה כל דקה

  const checkEmails = async () => {
    if (!isMonitoringActive) return;

    try {
      console.log('📧 בודק מיילים חדשים בcPanel...');
      await processCpanelInbox();
    } catch (error) {
      console.error('❌ שגיאה בבדיקת מיילים cPanel:', error);
    }

    // קביעת הבדיקה הבאה
    if (isMonitoringActive) {
      setTimeout(checkEmails, CHECK_INTERVAL);
    }
  };

  checkEmails();
}

// עיבוד תיבת הדואר של cPanel
async function processCpanelInbox(): Promise<void> {
  return new Promise((resolve, reject) => {
    const imap = new Imap(currentCpanelImapConfig);
    
    const timeout = setTimeout(() => {
      imap.destroy();
      reject(new Error('Timeout בחיבור לcPanel'));
    }, 20000);

    imap.once('ready', () => {
      clearTimeout(timeout);
      
      imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          console.error('❌ שגיאה בפתיחת תיבת דואר cPanel:', err);
          imap.end();
          return reject(err);
        }

        // חיפוש מיילים לא נקראים
        imap.search(['UNSEEN'], (err, results) => {
          if (err) {
            console.error('❌ שגיאה בחיפוש מיילים cPanel:', err);
            imap.end();
            return reject(err);
          }

          if (!results || results.length === 0) {
            console.log('📭 אין מיילים חדשים בcPanel');
            imap.end();
            return resolve();
          }

          console.log(`📬 נמצאו ${results.length} מיילים חדשים בcPanel`);
          
          // עיבוד כל מייל
          const fetch = imap.fetch(results, { bodies: '', markSeen: true });
          let processedCount = 0;

          fetch.on('message', (msg, seqno) => {
            let buffer = Buffer.alloc(0);
            
            msg.on('body', (stream) => {
              stream.on('data', (chunk) => {
                buffer = Buffer.concat([buffer, chunk]);
              });
            });

            msg.once('end', async () => {
              try {
                const parsed = await simpleParser(buffer);
                await processCpanelEmail(parsed);
                processedCount++;
                
                if (processedCount === results.length) {
                  imap.end();
                  resolve();
                }
              } catch (error) {
                console.error('❌ שגיאה בעיבוד מייל cPanel:', error);
                processedCount++;
                
                if (processedCount === results.length) {
                  imap.end();
                  resolve();
                }
              }
            });
          });

          fetch.once('error', (err) => {
            console.error('❌ שגיאה בקריאת מיילים מcPanel:', err);
            imap.end();
            reject(err);
          });
        });
      });
    });

    imap.once('error', (err) => {
      clearTimeout(timeout);
      console.error('❌ שגיאת חיבור cPanel:', err.message);
      reject(err);
    });

    imap.connect();
  });
}

// עיבוד מייל בודד מcPanel
async function processCpanelEmail(parsed: any): Promise<void> {
  try {
    const senderEmail = parsed.from?.value?.[0]?.address || 'לא זוהה';
    const subject = parsed.subject || 'ללא נושא';
    
    console.log(`📧 מעבד מייל חדש מcPanel: ${senderEmail} - ${subject}`);

    // חיפוש קובץ CV במייל
    if (parsed.attachments && parsed.attachments.length > 0) {
      for (const attachment of parsed.attachments) {
        const filename = attachment.filename?.toLowerCase() || '';
        
        // בדיקה שזה קובץ CV
        if (filename.includes('cv') || filename.includes('resume') || 
            filename.endsWith('.pdf') || filename.endsWith('.doc') || filename.endsWith('.docx')) {
          
          console.log(`📎 נמצא קובץ CV: ${attachment.filename}`);
          
          // שמירת המועמד במסד הנתונים
          await storage.createCandidate({
            name: extractNameFromEmail(senderEmail),
            email: senderEmail,
            phone: '',
            experience: '',
            skills: '',
            education: '',
            notes: `נוצר אוטומטית ממייל שהתקבל ב-cPanel\nנושא: ${subject}\nקובץ CV: ${attachment.filename}`
          });

          console.log(`✅ מועמד חדש נוסף מcPanel: ${senderEmail}`);
          break;
        }
      }
    }
  } catch (error) {
    console.error('❌ שגיאה בעיבוד מייל cPanel:', error);
  }
}

// חילוץ שם מכתובת מייל
function extractNameFromEmail(email: string): string {
  const namePart = email.split('@')[0];
  return namePart.replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// עצירת מעקב מיילים
export function stopCpanelEmailMonitoring(): void {
  console.log('🛑 עוצר מעקב מיילים cPanel');
  isMonitoringActive = false;
}