import { gmail } from './emailService';
import { storage } from './storage';
import Imap from 'imap';
import { simpleParser } from 'mailparser';

// מעקב אחרי מיילים שכבר עובדו (בגלובל)
// איפוס רשימת מיילים מעובדים כל יום  
let processedEmails = new Set<string>();
let lastResetDate = new Date().toDateString();

// איפוס ידני לבדיקה
processedEmails.clear();

// דפוסי זיהוי מידע במיילים נכנסים
const EMAIL_PATTERNS = {
  // זיהוי קוד משרה: "קוד משרה: 12345" או "Job ID: 12345" או "#12345"
  jobCode: /(?:קוד משרה|Job ID|משרה|#)\s*:?\s*([A-Z0-9-]+)/i,
  
  // זיהוי אימייל
  email: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
  
  // זיהוי טלפון ישראלי
  phone: /(?:05[0-9]|02|03|04|08|09)[-\s]?[0-9]{3}[-\s]?[0-9]{4}/g,
  
  // זיהוי שם (שורה ראשונה או ליד "שם")
  name: /(?:שם|שלום|היי)\s*:?\s*([א-ת\s]{2,30})/i,
};

interface ParsedCandidate {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  jobCode?: string;
  originalSubject?: string;
  originalBody?: string;
}

// בדיקת מיילים נכנסים - תמיכה בגם Gmail וגם IMAP
export async function checkIncomingEmails(): Promise<void> {
  try {
    console.log('🔍 בודק מיילים נכנסים...');
    
    // הגדר משתני סביבה של cPanel אם הם לא קיימים
    if (!process.env.CPANEL_IMAP_HOST) {
      process.env.CPANEL_IMAP_HOST = 'mail.h-group.org.il';
      process.env.CPANEL_IMAP_PORT = '993';
      process.env.CPANEL_IMAP_SECURE = 'true';
      process.env.CPANEL_IMAP_USER = 'dolev@h-group.org.il';
      process.env.CPANEL_IMAP_PASS = 'hpm_7HqToCSs[H7,';
    }
    
    // השתמש בהגדרות cPanel IMAP
    if (process.env.CPANEL_IMAP_HOST && process.env.CPANEL_IMAP_USER) {
      await checkCpanelEmails();
    } 
    else {
      console.log('⚠️ לא נמצאו הגדרות מייל נכנס');
    }
  } catch (error) {
    console.error('❌ שגיאה בבדיקת מיילים נכנסים:', error);
  }
}

// בדיקת מיילים דרך cPanel IMAP
async function checkCpanelEmails(): Promise<void> {
  return new Promise((resolve, reject) => {
    const imap = new (Imap as any)({
      user: process.env.CPANEL_IMAP_USER!,
      password: process.env.CPANEL_IMAP_PASS!,
      host: process.env.CPANEL_IMAP_HOST!,
      port: parseInt(process.env.CPANEL_IMAP_PORT || '993'),
      tls: process.env.CPANEL_IMAP_SECURE === 'true',
      tlsOptions: { rejectUnauthorized: false }
    });

    imap.once('ready', () => {
      console.log('✅ מחובר לשרת IMAP');
      
      imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          console.error('❌ שגיאה בפתיחת תיבת דואר:', err.message);
          reject(err);
          return;
        }

        console.log(`📧 נמצאו ${box.messages.total} מיילים בתיבה`);
        
        // חיפוש כל המיילים האחרונים (כולל נקראים)
        imap.search(['ALL'], (err: any, results: any) => {
          if (err) {
            console.error('❌ שגיאה בחיפוש מיילים:', err.message);
            reject(err);
            return;
          }

          console.log(`🔍 נמצאו ${results.length} מיילים חדשים לעיבוד`);
          
          if (results.length === 0) {
            imap.end();
            resolve();
            return;
          }

          const fetch = imap.fetch(results, { bodies: '', markSeen: false });
          
          fetch.on('message', (msg, seqno) => {
            console.log(`📩 עוסק במייל מספר ${seqno}`);
            
            msg.on('body', (stream, info) => {
              let buffer = '';
              
              stream.on('data', (chunk) => {
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
                  
                  processedEmails.add(emailId);
                  console.log(`📧 מייל מ: ${parsed.from?.text} | נושא: ${parsed.subject}`);
                  
                  // בדיקה אם זה מייל מועמדות לעבודה
                  const isJobApp = isJobApplicationEmail(parsed.subject || '', parsed.text || '', parsed.from?.text || '');
                  console.log(`🔍 האם זה מייל מועמדות? ${isJobApp ? 'כן' : 'לא'}`);
                  
                  if (isJobApp) {
                    const candidate = parseCandidate(parsed.subject || '', parsed.text || '', parsed.from?.text || '');
                    console.log(`📋 פרטי מועמד נמצאו:`, candidate);
                    
                    if (candidate.email) {
                      await createCandidateFromEmail(candidate);
                      console.log(`✅ נוצר מועמד חדש: ${candidate.firstName || 'מועמד'} ${candidate.lastName || 'חדש'}`);
                    } else {
                      console.log(`⚠️ חסר אימייל למועמד`);
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

          fetch.once('error', (err) => {
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

    imap.once('error', (err) => {
      console.error('❌ שגיאת חיבור IMAP:', err.message);
      reject(err);
    });

    imap.connect();
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
    if (isJobApplicationEmail(subject, body, from)) {
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

function isJobApplicationEmail(subject: string, body: string, from: string): boolean {
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
  
  // חילוץ קוד משרה
  const jobCodeMatch = fullText.match(EMAIL_PATTERNS.jobCode);
  const jobCode = jobCodeMatch ? jobCodeMatch[1] : undefined;
  
  // חילוץ אימייל משולח
  const candidateEmail = from.match(/<(.+)>/) ? from.match(/<(.+)>/)![1] : from.split('<')[0].trim();
  
  // לא נחלץ שם מהשולח - רק מקורות החיים
  // השם ייחלץ מהקובץ המצורף בלבד
  const firstName = '';
  const lastName = '';
  
  return {
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    email: candidateEmail,
    phone: undefined, // לא נחלץ טלפון מתוכן המייל
    jobCode,
    originalSubject: subject,
    originalBody: body.substring(0, 500), // שמירת חלק מהתוכן המקורי
  };
}

async function createCandidateFromEmail(candidateData: ParsedCandidate): Promise<void> {
  try {
    // בדיקה אם המועמד כבר קיים
    const existingCandidates = await storage.getCandidates(100, 0, candidateData.email);
    let candidateId: string;
    
    if (existingCandidates.candidates.some(c => c.email === candidateData.email)) {
      console.log(`⚠️ מועמד עם אימייל ${candidateData.email} כבר קיים - מעדכן פרטים`);
      const existingCandidate = existingCandidates.candidates.find(c => c.email === candidateData.email)!;
      candidateId = existingCandidate.id;
      
      // עדכון פרטי המועמד הקיים
      await storage.updateCandidate(candidateId, {
        firstName: candidateData.firstName || existingCandidate.firstName,
        lastName: candidateData.lastName || existingCandidate.lastName,
        mobile: candidateData.phone || existingCandidate.mobile,
        // הוספת תוכן המייל לפרטי המועמד
        notes: `${existingCandidate.notes || ''}\n\n--- מייל חדש ---\nנושא: ${candidateData.originalSubject}\nתוכן:\n${candidateData.originalBody}`.trim()
      });
    } else {
      // יצירת מועמד חדש עם שדות חובה
      const newCandidate = await storage.createCandidate({
        firstName: candidateData.firstName || 'מועמד',
        lastName: candidateData.lastName || 'ממייל',
        email: candidateData.email!,
        city: 'לא צוין', // שדה חובה
        profession: 'ממתין לעיבוד קורות חיים',
        mobile: candidateData.phone || undefined,
        // הוספת תוכן המייל לפרטי המועמד
        notes: `--- מייל נכנס עם קורות חיים ---\nנושא: ${candidateData.originalSubject}\nתוכן:\n${candidateData.originalBody}\n\n** הערה: יש לעדכן פרטים מקורות החיים המצורפים **`,
        recruitmentSource: 'מייל נכנס - קורות חיים',
      });
      candidateId = newCandidate.id;
      console.log(`✅ נוצר מועמד חדש: ${candidateData.firstName || 'מועמד'} ${candidateData.lastName || 'חדש'}`);
    }
    
    // אם יש קוד משרה - חיפוש המשרה ויצירת מועמדות למשרה
    if (candidateData.jobCode) {
      console.log(`🎯 נמצא קוד משרה: ${candidateData.jobCode} - מחפש משרה מתאימה`);
      
      try {
        const jobs = await storage.getJobs(100, 0);
        const matchingJob = jobs.jobs.find(job => 
          job.id === candidateData.jobCode ||
          job.title.includes(candidateData.jobCode!) ||
          job.description?.includes(candidateData.jobCode!)
        );
        
        if (matchingJob) {
          await storage.createJobApplication({
            candidateId: candidateId,
            jobId: matchingJob.id,
            status: 'submitted',
            notes: `מועמדות אוטומטית ממייל נכנס\nקוד משרה: ${candidateData.jobCode}\nנושא המייל: ${candidateData.originalSubject}`,
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
  console.log('🚀 הפעלת מעקב מיילים נכנסים...');
  
  // בדיקה כל דקה (במקום כל 20 שניות)
  setInterval(async () => {
    await checkIncomingEmails();
  }, 60 * 1000);
  
  // בדיקה ראשונית
  checkIncomingEmails();
}