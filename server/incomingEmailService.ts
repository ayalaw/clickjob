import { gmail } from './emailService';
import { storage } from './storage';
import Imap from 'imap';
import { simpleParser } from 'mailparser';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
// ייבוא פונקציות חילוץ נתונים - נוסיף אותן מקומית
import mammoth from 'mammoth';
import { execSync } from 'child_process';

// מעקב אחרי מיילים שכבר עובדו (בגלובל)
// איפוס רשימת מיילים מעובדים כל יום  
let processedEmails = new Set<string>();
let lastResetDate = new Date().toDateString();

// איפוס ידני לבדיקה - מאפס כל יום ומאפשר עיבוד מחדש של מיילים שלא הצליחו
processedEmails.clear();

// דפוסי זיהוי מידע במיילים נכנסים
const EMAIL_PATTERNS = {
  // זיהוי קוד משרה: מספרים של 7 ספרות בלבד
  jobCode: /(?:קוד משרה|Job ID|משרה|#)\s*:?\s*([0-9]{7})|\b([0-9]{7})\b/i,
  
  // זיהוי אימייל
  email: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
  
  // זיהוי טלפון ישראלי
  phone: /(?:05[0-9]|02|03|04|08|09)[-\s]?[0-9]{3}[-\s]?[0-9]{4}/g,
  
  // זיהוי שם (שורה ראשונה או ליד "שם")
  name: /(?:שם|שלום|היי)\s*:?\s*([א-ת\s]{2,30})/i,
};

// פונקציות חילוץ נתונים מקבצי CV עוברו למטה לתוך הפונקציה

function parseCV(text: string): any {
  const result: any = {};
  
  // חילוץ שם מהמקום הראשון בטקסט (לא מהכותרות)
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // חיפוש דפוס "שם: יחזקאל נתן" קודם
  const namePattern = /שם\s*:?\s*([א-ת\s]{2,50})/i;
  const nameMatch = text.match(namePattern);
  if (nameMatch && nameMatch[1]) {
    const fullName = nameMatch[1].trim();
    const parts = fullName.split(/\s+/);
    if (parts.length >= 2) {
      result.firstName = parts[0];
      result.lastName = parts.slice(1).join(' ');
    }
  } else {
    // אם לא נמצא דפוס "שם:", חפש בשורות הראשונות
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const line = lines[i];
      
      // דלג על מילים נפוצות בקורות חיים
      const skipWords = ['קורות', 'חיים', 'cv', 'resume', 'curriculum', 'vitae', 'נתונים', 'אישיים', 'פרטים'];
      if (skipWords.some(word => line.toLowerCase().includes(word))) {
        continue;
      }
      
      // בדוק שזו שורה עם שם (רק מילים ובעברית/אנגלית)
      const lineNameMatch = line.match(/^([א-ת\s]+|[a-zA-Z\s]+)$/);
      if (lineNameMatch && line.split(' ').length >= 2 && line.split(' ').length <= 4) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
          result.firstName = parts[0];
          result.lastName = parts.slice(1).join(' ');
          break;
        }
      }
    }
  }
  
  // חילוץ טלפון
  const phoneMatch = text.match(/(?:05[0-9]|02|03|04|08|09)[-\s]?[0-9]{3}[-\s]?[0-9]{4}/);
  if (phoneMatch) {
    result.phone = phoneMatch[0];
  }
  
  // חילוץ אימייל מקורות החיים
  const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) {
    result.email = emailMatch[0];
  }
  
  // חילוץ ת.ז.
  const idMatch = text.match(/(?:ת\.ז\.?|זהות|מספר\s*זהות)\s*:?\s*(\d{9})/i);
  if (idMatch) {
    result.nationalId = idMatch[1];
  }
  
  // חילוץ עיר מגורים - עם תמיכה בתווים מיוחדים
  const cityKeywords = ['עיר', 'מגורים', 'כתובת', 'מקום', 'city', 'address'];
  const cityPattern = new RegExp(`(?:${cityKeywords.join('|')})[\\s\\u200E\\u200F]*:?[\\s\\u200E\\u200F]*([א-ת\\s]{2,30})`, 'i');
  const cityMatch = text.match(cityPattern);
  if (cityMatch) {
    result.city = cityMatch[1].trim();
  }
  
  // חילוץ מקצוע
  const professionKeywords = ['מקצוע', 'תפקיד', 'עיסוק', 'profession', 'occupation', 'job', 'position'];
  const professionPattern = new RegExp(`(?:${professionKeywords.join('|')})\\s*:?\\s*([א-ת\\s]{2,30})`, 'i');
  const professionMatch = text.match(professionPattern);
  if (professionMatch) {
    result.profession = professionMatch[1].trim();
  }
  
  return result;
}

interface ParsedCandidate {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  nationalId?: string;
  jobCode?: string;
  originalSubject?: string;
  originalBody?: string;
  cvPath?: string;
  city?: string;
  profession?: string;
}

// בדיקת מיילים נכנסים - תמיכה בגם Gmail וגם IMAP
export async function checkIncomingEmails(): Promise<void> {
  try {
    console.log('🔍 בודק מיילים נכנסים...');
    
    // השתמש בהגדרות cPanel IMAP
    await checkCpanelEmails();
  } catch (error) {
    console.error('❌ שגיאה בבדיקת מיילים נכנסים:', error);
    // Don't crash the application - just log the error
  }
}

// בדיקת מיילים דרך cPanel IMAP
async function checkCpanelEmails(): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      // Load IMAP settings from database
      const { storage } = await import('./storage');
      let imapHost = await storage.getSystemSetting('CPANEL_IMAP_HOST');
      let imapPort = await storage.getSystemSetting('CPANEL_IMAP_PORT');
      let imapSecure = await storage.getSystemSetting('CPANEL_IMAP_SECURE');
      let imapUser = await storage.getSystemSetting('CPANEL_IMAP_USER');
      let imapPass = await storage.getSystemSetting('CPANEL_IMAP_PASS');

      // If not found in database, use existing values and save them
      if (!imapHost || !imapUser || !imapPass) {
        console.log('📧 שמירת הגדרות IMAP קיימות במסד הנתונים...');
        await storage.setSystemSetting('CPANEL_IMAP_HOST', 'mail.h-group.org.il', 'cPanel IMAP server host');
        await storage.setSystemSetting('CPANEL_IMAP_PORT', '993', 'cPanel IMAP server port');
        await storage.setSystemSetting('CPANEL_IMAP_SECURE', 'true', 'cPanel IMAP secure connection');
        await storage.setSystemSetting('CPANEL_IMAP_USER', 'dolev@h-group.org.il', 'cPanel IMAP user account');
        await storage.setSystemSetting('CPANEL_IMAP_PASS', 'hpm_7HqToCSs[H7,', 'cPanel IMAP password');
        
        // Re-load settings
        imapHost = await storage.getSystemSetting('CPANEL_IMAP_HOST');
        imapPort = await storage.getSystemSetting('CPANEL_IMAP_PORT');
        imapSecure = await storage.getSystemSetting('CPANEL_IMAP_SECURE');
        imapUser = await storage.getSystemSetting('CPANEL_IMAP_USER');
        imapPass = await storage.getSystemSetting('CPANEL_IMAP_PASS');
      }

      const imap = new (Imap as any)({
        user: imapUser!.value,
        password: imapPass!.value,
        host: imapHost!.value,
        port: parseInt(imapPort?.value || '993'),
        tls: imapSecure?.value === 'true',
        authTimeout: 15000,
        connTimeout: 15000,
        keepalive: {
          interval: 10000,
          idleInterval: 300000,
          forceNoop: true
        },
        tlsOptions: { rejectUnauthorized: false }
      });

      imap.once('ready', () => {
      console.log('✅ מחובר לשרת IMAP');
      
      imap.openBox('INBOX', false, (err: any, box: any) => {
        if (err) {
          console.error('❌ שגיאה בפתיחת תיבת דואר:', err.message);
          reject(err);
          return;
        }

        console.log(`📧 נמצאו ${box.messages.total} מיילים בתיבה`);
        
        // חיפוש רק מיילים שלא נקראו
        imap.search(['UNSEEN'], (err: any, results: any) => {
          if (err) {
            console.error('❌ שגיאה בחיפוש מיילים:', err.message);
            imap.end();
            reject(err);
            return;
          }

          console.log(`🔍 נמצאו ${results.length} מיילים לא נקראו לעיבוד`);
          
          if (results.length === 0) {
            console.log('✅ אין מיילים לא נקראו');
            imap.end();
            resolve();
            return;
          }

          const fetch = imap.fetch(results, { bodies: '', markSeen: false });
          
          fetch.on('message', (msg: any, seqno: any) => {
            console.log(`📩 עוסק במייל מספר ${seqno}`);
            let messageUid: number;
            
            msg.once('attributes', (attrs: any) => {
              messageUid = attrs.uid;
              
              // סימון המייל כנקרא מיד כשאנחנו מקבלים את ה-UID
              imap.addFlags(messageUid, ['\\Seen'], (err: any) => {
                if (err) {
                  console.error('❌ שגיאה בסימון מייל כנקרא:', err.message);
                } else {
                  console.log(`✅ מייל ${messageUid} סומן כנקרא מיד`);
                }
              });
            });
            
            msg.on('body', (stream: any, info: any) => {
              let buffer = '';
              
              stream.on('data', (chunk: any) => {
                buffer += chunk.toString('utf8');
              });
              
              stream.once('end', async () => {
                try {
                  const parsed = await simpleParser(buffer);
                  
                  // יצירת מזהה ייחודי למייל על סמך תוכן
                  const emailContent = `${parsed.from?.text}-${parsed.subject}-${parsed.text?.substring(0, 100)}`;
                  const emailId = Buffer.from(emailContent).toString('base64');
                  
                  // איפוס רשימת מיילים מעובדים אם עבר יום חדש
                  const currentDate = new Date().toDateString();
                  if (currentDate !== lastResetDate) {
                    processedEmails.clear();
                    lastResetDate = currentDate;
                    console.log('🔄 איפוס רשימת מיילים מעובדים ליום חדש');
                  }
                  
                  // בדיקה אם המייל כבר עובד
                  if (processedEmails.has(emailId)) {
                    console.log(`⏭️ מייל כבר עובד: ${parsed.subject}`);
                    return;
                  }
                  
                  // **סימון המייל כנקרא מיד אחרי הקריאה - לפני כל עיבוד**
                  try {
                    if (messageUid) {
                      imap.addFlags(messageUid, ['\\Seen'], (err: any) => {
                        if (err) {
                          console.error('❌ שגיאה בסימון מייל כנקרא:', err.message);
                        } else {
                          console.log(`🏷️ מייל ${messageUid} סומן כנקרא במערכת המייל`);
                        }
                      });
                    }
                  } catch (markError) {
                    console.error('❌ שגיאה בסימון מייל:', markError);
                  }
                  
                  console.log(`📧 מייל מ: ${parsed.from?.text} | נושא: ${parsed.subject}`);
                  
                  // בדיקה אם זה מייל מועמדות לעבודה
                  const hasAttachments = parsed.attachments && parsed.attachments.length > 0;
                  const isJobApp = isJobApplicationEmail(parsed.subject || '', parsed.text || '', parsed.from?.text || '', hasAttachments);
                  console.log(`🔍 האם זה מייל מועמדות? ${isJobApp ? 'כן' : 'לא'} (קבצים מצורפים: ${hasAttachments ? 'כן' : 'לא'})`);
                  
                  if (isJobApp) {
                    const candidate = parseCandidate(parsed.subject || '', parsed.text || '', parsed.from?.text || '');
                    console.log(`📋 פרטי מועמד נמצאו:`, candidate);
                    
                    // בדיקת קבצים מצורפים
                    if (parsed.attachments && parsed.attachments.length > 0) {
                      console.log(`📎 נמצאו ${parsed.attachments.length} קבצים מצורפים`);
                      
                      for (const attachment of parsed.attachments) {
                        if (isCVFile(attachment.filename || '')) {
                          console.log(`📄 מוריד קובץ: ${attachment.filename}`);
                          
                          try {
                            const cvData = await saveAttachmentAndExtractData(attachment, candidate.email || '');
                            if (cvData) {
                              // עדכון פרטי המועמד עם הנתונים מקורות החיים בלבד
                              // אימייל המועמד יהיה מקורות החיים, לא כתובת השולח
                              candidate.firstName = cvData.firstName || candidate.firstName;
                              candidate.lastName = cvData.lastName || candidate.lastName;
                              candidate.email = cvData.email || candidate.email; // אימייל מקורות החיים
                              candidate.mobile = cvData.mobile || candidate.mobile; // נייד מקורות החיים
                              candidate.phone = cvData.phone || candidate.phone;
                              candidate.nationalId = cvData.nationalId || candidate.nationalId; // ת.ז.
                              candidate.city = cvData.city || candidate.city;
                              candidate.profession = cvData.profession || candidate.profession;
                              candidate.cvPath = cvData.cvPath;
                              
                              console.log(`✅ פרטים חולצו מקורות החיים: ${cvData.firstName} ${cvData.lastName} (${cvData.email})`);
                            }
                          } catch (error) {
                            console.error('❌ שגיאה בעיבוד קובץ מצורף:', error);
                          }
                        } else {
                          console.log(`⚠️ קובץ לא בטוח או לא נתמך: ${attachment.filename}`);
                        }
                      }
                    }
                    
                    // יצירת מועמד בכל מקרה אם יש קובץ קורות חיים
                    const hasCVFile = candidate.cvPath && candidate.cvPath.trim() !== '';
                    
                    if (hasCVFile) {
                      await createCandidateFromEmail(candidate);
                      
                      const hasPersonalDetails = (candidate.firstName && candidate.firstName.trim()) || 
                                               (candidate.lastName && candidate.lastName.trim()) ||
                                               (candidate.email && candidate.email.trim()) ||
                                               (candidate.mobile && candidate.mobile.trim());
                      
                      if (hasPersonalDetails) {
                        const displayName = [candidate.firstName, candidate.lastName].filter(n => n && n.trim()).join(' ') || 'מועמד חדש';
                        console.log(`✅ נוצר מועמד חדש עם פרטים: ${displayName}`);
                      } else {
                        console.log(`✅ נוצר מועמד חדש עם קובץ קורות חיים - פרטים אישיים יש למלא ידנית`);
                      }
                      
                      // סימון המייל כ"עובד" רק אחרי הצלחה מלאה
                      processedEmails.add(emailId);
                      console.log(`📝 מייל סומן כעובד במחסן הזיכרון`);
                      
                      // המייל כבר סומן כנקרא אוטומטית בתחילת העיבוד
                    } else {
                      console.log(`⚠️ לא נמצא קובץ קורות חיים תקין במייל`);
                    }
                  } else {
                    console.log(`📧 מייל לא זוהה כמועמדות - נושא: "${parsed.subject}"`);
                  }
                } catch (parseError) {
                  console.error('❌ שגיאה בעיבוד מייל:', parseError);
                }
              });
            });
          });

          fetch.once('error', (err: any) => {
            console.error('❌ שגיאה בקריאת מיילים:', err.message);
            reject(err);
          });

          fetch.once('end', () => {
            console.log('✅ סיימתי לעבד מיילים נכנסים');
            imap.end();
            resolve();
          });
        });
      });
    });

      let isResolved = false;
      
      imap.once('error', (err: any) => {
        if (!isResolved) {
          console.error('❌ שגיאת חיבור IMAP:', err.message);
          console.log('💡 המערכת תמשיך לעבוד ללא מעקב מיילים');
          isResolved = true;
          resolve();
        }
      });

      imap.once('end', () => {
        if (!isResolved) {
          console.log('📪 חיבור IMAP הסתיים');
          isResolved = true;
          resolve();
        }
      });

      // Overall timeout for the entire operation
      const overallTimeout = setTimeout(() => {
        if (!isResolved) {
          console.error('❌ timeout בחיבור IMAP - עברו 20 שניות');
          isResolved = true;
          try {
            imap.end();
          } catch (e) {
            // Ignore errors when ending connection
          }
          resolve();
        }
      }, 20000); // 20 seconds timeout

      // Wrap the connection in a timeout to prevent hanging
      setTimeout(() => {
        try {
          if (!isResolved) {
            imap.connect();
          }
        } catch (connectError) {
          if (!isResolved) {
            console.error('❌ שגיאה בחיבור IMAP:', connectError);
            isResolved = true;
            clearTimeout(overallTimeout);
            resolve();
          }
        }
      }, 1000);
    } catch (error) {
      console.error('Error loading IMAP settings:', error);
      // Don't reject on settings error - just resolve to avoid crashing the app
      resolve();
    }
  });
}

// בדיקת מיילים דרך Gmail (קיים)
async function checkGmailEmails(): Promise<void> {
  try {
    // קריאת מיילים שלא נקראו מהשעה האחרונה
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread newer_than:1h',
      maxResults: 50,
    });

    const messages = response.data.messages || [];
    console.log(`📧 נמצאו ${messages.length} מיילים חדשים ב-Gmail`);

    for (const message of messages) {
      await processGmailMessage(message.id!);
    }
  } catch (error) {
    console.error('❌ שגיאה בבדיקת Gmail:', error);
  }
}

// פונקציה לעיבוד מייל Gmail (שם הפונקציה השתנה)
async function processGmailMessage(messageId: string): Promise<void> {
  try {
    const message = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
    });

    const headers = message.data.payload?.headers || [];
    const subject = headers.find(h => h.name === 'Subject')?.value || '';
    const from = headers.find(h => h.name === 'From')?.value || '';
    
    // חילוץ תוכן המייל
    const body = extractEmailBody(message.data);
    
    console.log(`📩 עוצב מייל: ${subject} מאת: ${from}`);
    
    // בדיקה אם זה מייל עם קורות חיים או מועמדות
    if (isJobApplicationEmail(subject, body, from, false)) {
      const candidate = parseCandidate(subject, body, from);
      
      if (candidate.email && (candidate.firstName || candidate.jobCode)) {
        await createCandidateFromEmail(candidate);
        
        // סימון המייל כנקרא
        await gmail.users.messages.modify({
          userId: 'me',
          id: messageId,
          requestBody: {
            removeLabelIds: ['UNREAD'],
          },
        });
        
        console.log(`✅ מועמד חדש נוצר: ${candidate.firstName} ${candidate.lastName}`);
      }
    }
  } catch (error) {
    console.error(`❌ שגיאה בעיבוד מייל ${messageId}:`, error);
  }
}

function extractEmailBody(payload: any): string {
  let body = '';
  
  if (payload.body?.data) {
    body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
  } else if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        body += Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
    }
  }
  
  return body;
}

function isJobApplicationEmail(subject: string, body: string, from: string, hasAttachments: boolean): boolean {
  // אם יש קבצים מצורפים - זה תמיד מייל מועמדות
  if (hasAttachments) {
    return true;
  }
  
  // גם בלי קבצים מצורפים, בדוק מילות מפתח
  const applicationKeywords = [
    'קורות חיים', 'קןרות חיים', 'קוח', 'cv', 'resume', 'מועמדות', 'השתלמתי', 'התמחות',
    'משרה', 'job', 'application', 'apply', 'candidate', 'נשלח מאתר',
    'drushim', 'indeed', 'linkedin', 'jobmaster', 'alljobs', 'משרת שטח', 'משרת חשמל'
  ];
  
  const text = `${subject} ${body} ${from}`.toLowerCase();
  return applicationKeywords.some(keyword => text.includes(keyword));
}

function parseCandidate(subject: string, body: string, from: string): ParsedCandidate {
  const fullText = `${subject}\n${body}`;
  
  // חילוץ קוד משרה - בדוק את שתי קבוצות הלכידה
  const jobCodeMatch = fullText.match(EMAIL_PATTERNS.jobCode);
  const jobCode = jobCodeMatch ? (jobCodeMatch[1] || jobCodeMatch[2]) : undefined;
  
  // לא נחלץ פרטים מהמייל - רק מקורות החיים!
  // כל הפרטים ייחלצו מהקובץ המצורף בלבד
  
  return {
    firstName: undefined, // רק מקורות החיים
    lastName: undefined, // רק מקורות החיים  
    email: undefined, // רק מקורות החיים - לא מהשולח!
    phone: undefined, // רק מקורות החיים
    jobCode,
    originalSubject: subject,
    originalBody: body.substring(0, 500), // שמירת חלק מהתוכן המקורי
  };
}


// בדיקה אם קובץ הוא קובץ קורות חיים ובטוח
function isCVFile(filename: string): boolean {
  const allowedExtensions = ['.pdf', '.doc', '.docx'];
  const extension = path.extname(filename.toLowerCase());
  
  // בדיקת סיומות מותרות
  if (!allowedExtensions.includes(extension)) {
    return false;
  }
  
  // בדיקת שמות קבצים זדוניים
  const maliciousPatterns = [
    /\.exe$/i, /\.bat$/i, /\.cmd$/i, /\.scr$/i, /\.pif$/i,
    /\.com$/i, /\.vbs$/i, /\.js$/i, /\.jar$/i, /\.php$/i,
    /\.html$/i, /\.htm$/i, /\.zip$/i, /\.rar$/i
  ];
  
  if (maliciousPatterns.some(pattern => pattern.test(filename))) {
    return false;
  }
  
  return true;
}

// בדיקת אבטחה לקובץ
function isFileSafe(filePath: string): boolean {
  try {
    const stats = fs.statSync(filePath);
    
    // בדיקת גודל קובץ - מקסימום 10MB
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (stats.size > maxSize) {
      console.log(`⚠️ קובץ גדול מדי: ${stats.size} bytes`);
      return false;
    }
    
    // בדיקת חתימת הקובץ
    const buffer = fs.readFileSync(filePath);
    const slice = buffer.subarray(0, 10);
    
    // בדיקת חתימת PDF
    if (filePath.endsWith('.pdf')) {
      return slice.toString('ascii', 0, 4) === '%PDF';
    }
    
    // בדיקת חתימת Office documents (DOCX)
    if (filePath.endsWith('.docx')) {
      return slice.toString('ascii', 0, 2) === 'PK';
    }
    
    // בדיקת חתימת DOC ישן
    if (filePath.endsWith('.doc')) {
      return slice.readUInt32LE(0) === 0xE011CFD0;
    }
    
    return true;
  } catch (error) {
    console.error('שגיאה בבדיקת אבטחת קובץ:', error);
    return false;
  }
}

// שמירת קובץ מצורף וחילוץ נתונים
async function saveAttachmentAndExtractData(attachment: any, email: string): Promise<ParsedCandidate | null> {
  try {
    // יצירת שם קובץ ייחודי
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(5).toString('hex');
    const originalName = attachment.filename || 'cv';
    const extension = path.extname(originalName);
    const filename = `${timestamp}-${randomString}${extension}`;
    const filePath = path.join('uploads', filename);
    
    // וידוא שתיקיית uploads קיימת
    const uploadsDir = 'uploads';
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // שמירת הקובץ
    fs.writeFileSync(filePath, attachment.content);
    console.log(`💾 קובץ נשמר: ${filePath}`);
    
    // בדיקת אבטחה לקובץ
    if (!isFileSafe(filePath)) {
      console.log(`🚫 קובץ לא בטוח, נמחק: ${filePath}`);
      fs.unlinkSync(filePath);
      return null;
    }
    
    // חילוץ נתונים מהקובץ
    let extractedData: any = {};
    
    if (extension.toLowerCase() === '.pdf') {
      try {
        // נסה להשתמש ב-pdftotext אם זמין, אחרת תחזיר נתונים בסיסיים
        try {
          const text = execSync(`pdftotext "${filePath}" -`, { encoding: 'utf8' });
          extractedData = parseCV(text);
        } catch (pdfError) {
          console.log('⚠️ pdftotext לא זמין, משאיר שדות ריקים');
          extractedData = { 
            firstName: '', 
            lastName: '', 
            email: '',
            phone: '', 
            city: '', 
            profession: ''
          };
        }
      } catch (error) {
        console.error('Error extracting PDF:', error);
        extractedData = { firstName: '', lastName: '', phone: '', city: '', profession: '' };
      }
    } else if (['.doc', '.docx'].includes(extension.toLowerCase())) {
      try {
        const buffer = fs.readFileSync(filePath);
        const result = await mammoth.extractRawText({ buffer });
        const text = result.value;
        extractedData = parseCV(text);
      } catch (error) {
        console.error('Error extracting DOC:', error);
        extractedData = { firstName: '', lastName: '', phone: '', city: '', profession: '' };
      }
    }
    
    return {
      firstName: extractedData.firstName,
      lastName: extractedData.lastName,
      email: extractedData.email, // רק אימייל מקורות החיים - לא מהשולח!
      mobile: extractedData.phone, // הטלפון הנייד מקורות החיים
      phone: extractedData.phone,
      nationalId: extractedData.nationalId, // ת.ז. מקורות החיים
      cvPath: filename, // רק שם הקובץ, לא הנתיב המלא
      city: extractedData.city || '',
      profession: extractedData.profession || ''
    };
    
  } catch (error) {
    console.error('❌ שגיאה בשמירת קובץ מצורף:', error);
    return null;
  }
}

// עדכון פונקציית יצירת מועמד לכלול נתוני קורות חיים
async function createCandidateFromEmail(candidateData: ParsedCandidate): Promise<void> {
  try {
    // בדיקה משופרת אם המועמד כבר קיים לפי נייד, אימייל או ת.ז.
    const existingCandidate = await storage.findCandidateByContactInfo(
      candidateData.mobile || candidateData.phone,
      candidateData.email,
      candidateData.nationalId
    );
    
    let candidateId: string;
    
    if (existingCandidate) {
      // התראה חזקה על מועמד כפול
      console.log(`⚠️⚠️⚠️ מועמד כפול זוהה! ⚠️⚠️⚠️`);
      console.log(`📱 מספר טלפון זהה: ${candidateData.mobile || candidateData.phone}`);
      console.log(`🆔 מועמד קיים: ${existingCandidate.firstName} ${existingCandidate.lastName}`);
      console.log(`📧 אימייל קיים: ${existingCandidate.email}`);
      console.log(`📱 טלפון קיים: ${existingCandidate.mobile}`);
      console.log(`🆔 ת.ז קיימת: ${existingCandidate.nationalId}`);
      console.log(`⚠️⚠️⚠️ מועמד לא נוצר מחדש - עודכנו הפרטים ⚠️⚠️⚠️`);
      
      candidateId = existingCandidate.id;
      
      // עדכון פרטי המועמד הקיים (כולל קורות חיים חדשים)
      await storage.updateCandidate(candidateId, {
        firstName: candidateData.firstName || existingCandidate.firstName,
        lastName: candidateData.lastName || existingCandidate.lastName,
        email: candidateData.email || existingCandidate.email,
        mobile: candidateData.mobile || candidateData.phone || existingCandidate.mobile,
        phone: candidateData.phone || existingCandidate.phone,
        nationalId: candidateData.nationalId || existingCandidate.nationalId,
        city: candidateData.city || existingCandidate.city,
        profession: candidateData.profession || existingCandidate.profession,
        cvPath: candidateData.cvPath || existingCandidate.cvPath,
      });
      
      // רישום אירוע של פנייה חוזרת
      await storage.addCandidateEvent({
        candidateId: candidateId,
        eventType: 'email_reapplication',
        description: `המועמד פנה שוב דרך המייל`,
        metadata: {
          emailSubject: candidateData.originalSubject,
          emailBody: candidateData.originalBody,
          attachmentPath: candidateData.cvPath,
          receivedAt: new Date().toISOString()
        }
      });
      
      console.log(`📝 נרשם אירוע פנייה חוזרת למועמד`);
    } else {
      // יצירת מועמד חדש עם הפרטים שנמצאו בלבד
      const newCandidate = await storage.createCandidate({
        firstName: candidateData.firstName || '',
        lastName: candidateData.lastName || '',
        email: candidateData.email || `candidate-${Date.now()}@temp.local`,
        mobile: candidateData.mobile || candidateData.phone || '',
        phone: candidateData.phone || '',
        nationalId: candidateData.nationalId || '',
        city: candidateData.city || '',
        profession: candidateData.profession || '',
        cvPath: candidateData.cvPath,
        notes: `מועמד שנוסף אוטומטית מהמייל. נושא המייל: "${candidateData.originalSubject}"`,
        recruitmentSource: 'מייל נכנס - קורות חיים',
      });
      candidateId = newCandidate.id;
      
      // רישום אירוע של יצירת מועמד חדש
      await storage.addCandidateEvent({
        candidateId: candidateId,
        eventType: 'email_application',
        description: `מועמד חדש הגיע דרך המייל`,
        metadata: {
          emailSubject: candidateData.originalSubject,
          emailBody: candidateData.originalBody,
          attachmentPath: candidateData.cvPath,
          receivedAt: new Date().toISOString()
        }
      });
      
      const displayName = [candidateData.firstName, candidateData.lastName].filter(n => n && n.trim()).join(' ') || 'מועמד חדש';
      console.log(`✅ נוצר מועמד חדש: ${displayName}`);
    }
    
    // אם יש קוד משרה - חיפוש המשרה ויצירת מועמדות למשרה
    if (candidateData.jobCode) {
      console.log(`🎯 נמצא קוד משרה: ${candidateData.jobCode} - מחפש משרה מתאימה`);
      
      try {
        const jobs = await storage.getJobs(100, 0);
        const matchingJob = jobs.jobs.find(job => 
          job.jobCode === candidateData.jobCode ||
          (job.additionalCodes && job.additionalCodes.includes(candidateData.jobCode!))
        );
        
        if (matchingJob) {
          await storage.createJobApplication({
            candidateId: candidateId,
            jobId: matchingJob.id,
            status: 'submitted',
            notes: `מועמדות אוטומטית ממייל נכנס עם קורות חיים\nקוד משרה: ${candidateData.jobCode}\nנושא המייל: ${candidateData.originalSubject}`,
          });
          
          // Add event for automatic job application from email
          await storage.addCandidateEvent({
            candidateId: candidateId,
            eventType: 'job_application',
            description: `הופנה אוטומטית למשרה דרך קוד משרה במייל`,
            metadata: {
              jobId: matchingJob.id,
              jobTitle: matchingJob.title,
              jobCode: candidateData.jobCode,
              emailSubject: candidateData.originalSubject,
              autoMatched: true,
              timestamp: new Date().toISOString()
            }
          });
          
          console.log(`✅ נוצרה מועמדות למשרה: ${matchingJob.title}`);
        } else {
          console.log(`⚠️ לא נמצאה משרה מתאימה לקוד: ${candidateData.jobCode}`);
        }
      } catch (error) {
        console.error(`❌ שגיאה ביצירת מועמדות למשרה:`, error);
      }
    } else {
      console.log(`📋 לא נמצא קוד משרה - מועמד נוצר במאגר בלבד`);
    }
    
  } catch (error) {
    console.error('❌ שגיאה ביצירת מועמד ממייל:', error);
  }
}

// פונקציה להפעלה תקופתית

export function startEmailMonitoring(): void {
  console.log('✅ מעקב מיילים נכנסים פעיל - מיילים יסומנו כנקראו אוטומטית');
  
  // בדיקה כל דקה
  // בדיקת מיילים עם retry logic
  let consecutiveFailures = 0;
  const maxFailures = 5;

  const emailCheckInterval = setInterval(async () => {
    try {
      await checkIncomingEmails();
      consecutiveFailures = 0; // Reset on success
    } catch (error) {
      consecutiveFailures++;
      console.log(`❌ כשל ${consecutiveFailures}/${maxFailures} בבדיקת מיילים`);
      
      if (consecutiveFailures >= maxFailures) {
        console.log(`🚫 הופסקה בדיקת מיילים זמנית לאחר ${maxFailures} כשלים רצופים`);
        console.log('🔄 הבדיקה תתחדש בעוד 10 דקות');
        
        clearInterval(emailCheckInterval);
        
        // חזרה לבדיקה אחרי 10 דקות
        setTimeout(() => {
          consecutiveFailures = 0;
          console.log('🔄 חידוש בדיקת מיילים...');
          
          setInterval(async () => {
            await checkIncomingEmails();
          }, 60 * 1000);
          
          checkIncomingEmails();
        }, 10 * 60 * 1000); // 10 minutes
      }
    }
  }, 60 * 1000);
  
  // בדיקה ראשונית
  checkIncomingEmails();
  
  // בדיקה ידנית חד פעמית לדיבוג
  setTimeout(async () => {
    console.log('🔍 מפעיל בדיקה ידנית של כל המיילים...');
    await checkAllEmails();
  }, 5000);
}

// פונקציה לבדיקה ידנית של כל המיילים (כולל נקראו)
export async function checkAllEmails(): Promise<void> {
  console.log('🔍 בדיקה ידנית של כל המיילים (כולל נקראו)...');
  
  const imap = new Imap({
    user: process.env.CPANEL_EMAIL_USER!,
    password: process.env.CPANEL_EMAIL_PASS!,
    host: 'mail.h-group.org.il', // השרת הנכון
    port: 993,
    tls: true,
    authTimeout: 10000,
    connTimeout: 10000,
    tlsOptions: {
      rejectUnauthorized: false
    }
  });

  return new Promise((resolve, reject) => {
    imap.once('ready', () => {
      console.log('✅ מחובר לשרת IMAP לבדיקה ידנית');
      
      imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          console.error('❌ שגיאה בפתיחת תיבת דואר:', err.message);
          reject(err);
          return;
        }

        console.log(`📧 נמצאו ${box.messages.total} מיילים בתיבה (כולל נקראו)`);

        // חיפוש כל המיילים (כולל נקראו) מהיום האחרון
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        imap.search(['SINCE', yesterday], (err, results) => {
          if (err) {
            console.error('❌ שגיאה בחיפוש מיילים:', err.message);
            reject(err);
            return;
          }

          if (!results || results.length === 0) {
            console.log('📭 לא נמצאו מיילים מהיום האחרון');
            imap.end();
            resolve();
            return;
          }

          console.log(`🔍 נמצאו ${results.length} מיילים מהיום האחרון`);

          const fetch = imap.fetch(results, { bodies: '', markSeen: false });
          
          fetch.on('message', (msg: any, seqno: any) => {
            console.log(`📩 בודק מייל מספר ${seqno}`);
            let messageUid: number;
            
            msg.once('attributes', (attrs: any) => {
              messageUid = attrs.uid;
              const flags = attrs.flags || [];
              const isRead = flags.includes('\\Seen');
              console.log(`📧 מייל ${messageUid} - ${isRead ? 'נקרא' : 'לא נקרא'}`);
            });
            
            msg.on('body', (stream: any, info: any) => {
              let buffer = '';
              
              stream.on('data', (chunk: any) => {
                buffer += chunk.toString('utf8');
              });
              
              stream.once('end', async () => {
                try {
                  const parsed = await simpleParser(buffer);
                  const emailId = `${parsed.from?.text}-${parsed.subject}-${parsed.date?.getTime()}`;
                  
                  console.log(`📧 מייל מ: ${parsed.from?.text} | נושא: ${parsed.subject}`);
                  console.log(`📅 תאריך: ${parsed.date}`);
                  
                  // בדיקה אם יש קבצים מצורפים
                  const hasAttachments = parsed.attachments && parsed.attachments.length > 0;
                  console.log(`📎 קבצים מצורפים: ${hasAttachments ? 'כן' : 'לא'}`);
                  
                } catch (error) {
                  console.error('❌ שגיאה בעיבוד מייל:', error);
                }
              });
            });
          });

          fetch.once('end', () => {
            console.log('✅ סיימתי בדיקה ידנית של מיילים');
            imap.end();
            resolve();
          });

          fetch.once('error', (err: any) => {
            console.error('❌ שגיאה בטעינת מיילים:', err.message);
            imap.end();
            reject(err);
          });
        });
      });
    });

    imap.once('error', (err: any) => {
      console.error('❌ שגיאה בחיבור ל-IMAP:', err.message);
      console.log('💡 המערכת תמשיך לעבוד ללא מעקב מיילים');
      resolve(); // Don't reject - just resolve to prevent crash
    });

    imap.connect();
  });
}