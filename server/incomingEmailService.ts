import { gmail } from './emailService';
import { storage } from './storage';
import * as Imap from 'imap';
import { simpleParser } from 'mailparser';

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
    
    // אם יש הגדרות cPanel IMAP - השתמש בהן
    if (process.env.CPANEL_IMAP_HOST && process.env.CPANEL_IMAP_USER) {
      await checkCpanelEmails();
    } 
    // אחרת השתמש ב-Gmail אם זמין
    else if (process.env.GMAIL_USER) {
      await checkGmailEmails();
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
    const imap = new Imap({
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
        
        // חיפוש מיילים שלא נקראו מהיום האחרון
        imap.search(['UNSEEN', ['SINCE', new Date(Date.now() - 24*60*60*1000)]], (err, results) => {
          if (err) {
            console.error('❌ שגיאה בחיפוש מיילים:', err.message);
            reject(err);
            return;
          }

          console.log(`🔍 נמצאו ${results.length} מיילים חדשים שלא נקראו`);
          
          if (results.length === 0) {
            imap.end();
            resolve();
            return;
          }

          const fetch = imap.fetch(results, { bodies: '', markSeen: true });
          
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
                  console.log(`📧 מייל מ: ${parsed.from?.text} | נושא: ${parsed.subject}`);
                  
                  // בדיקה אם זה מייל מועמדות לעבודה
                  if (isJobApplicationEmail(parsed.subject || '', parsed.text || '', parsed.from?.text || '')) {
                    const candidate = parseCandidate(parsed.subject || '', parsed.text || '', parsed.from?.text || '');
                    
                    if (candidate.email && (candidate.firstName || candidate.jobCode)) {
                      await createCandidateFromEmail(candidate);
                      console.log(`✅ נוצר מועמד חדש: ${candidate.firstName} ${candidate.lastName || ''}`);
                    }
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
    'קורות חיים', 'cv', 'resume', 'מועמדות', 'השתלמתי', 'התמחות',
    'משרה', 'job', 'application', 'apply', 'candidate', 'נשלח מאתר',
    'drushim', 'indeed', 'linkedin', 'jobmaster', 'alljobs'
  ];
  
  const text = `${subject} ${body} ${from}`.toLowerCase();
  return applicationKeywords.some(keyword => text.includes(keyword));
}

function parseCandidate(subject: string, body: string, from: string): ParsedCandidate {
  const fullText = `${subject}\n${body}`;
  
  // חילוץ קוד משרה
  const jobCodeMatch = fullText.match(EMAIL_PATTERNS.jobCode);
  const jobCode = jobCodeMatch ? jobCodeMatch[1] : undefined;
  
  // חילוץ אימייל
  const emailMatches = fullText.match(EMAIL_PATTERNS.email);
  const candidateEmail = emailMatches ? emailMatches[0] : 
    from.match(/<(.+)>/) ? from.match(/<(.+)>/)![1] : from;
  
  // חילוץ טלפון
  const phoneMatches = fullText.match(EMAIL_PATTERNS.phone);
  const phone = phoneMatches ? phoneMatches[0].replace(/[-\s]/g, '') : undefined;
  
  // חילוץ שם - ניסיון לזהות מהשורה הראשונה או מהנושא
  let firstName = '', lastName = '';
  
  // ניסיון 1: חיפוש דפוס "שם: משה כהן"
  const nameMatch = fullText.match(EMAIL_PATTERNS.name);
  if (nameMatch) {
    const nameParts = nameMatch[1].trim().split(/\s+/);
    firstName = nameParts[0] || '';
    lastName = nameParts.slice(1).join(' ') || '';
  } else {
    // ניסיון 2: חילוץ מכתובת המייל
    const emailName = candidateEmail.split('@')[0].replace(/[._]/g, ' ');
    const emailParts = emailName.split(' ').filter(part => part.length > 1);
    if (emailParts.length >= 2) {
      firstName = emailParts[0];
      lastName = emailParts.slice(1).join(' ');
    }
  }
  
  return {
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    email: candidateEmail,
    phone,
    jobCode,
    originalSubject: subject,
    originalBody: body.substring(0, 500), // שמירת חלק מהתוכן המקורי
  };
}

async function createCandidateFromEmail(candidateData: ParsedCandidate): Promise<void> {
  try {
    // בדיקה אם המועמד כבר קיים
    const existingCandidates = await storage.getCandidates(100, 0, candidateData.email);
    if (existingCandidates.candidates.some(c => c.email === candidateData.email)) {
      console.log(`⚠️ מועמד עם אימייל ${candidateData.email} כבר קיים`);
      return;
    }
    
    // יצירת מועמד חדש
    const newCandidate = await storage.createCandidate({
      firstName: candidateData.firstName || 'לא צוין',
      lastName: candidateData.lastName || '',
      email: candidateData.email!,
      mobile: candidateData.phone,
      city: 'לא צוין', // שדה חובה
      notes: `נוצר אוטומטית ממייל נכנס\nנושא: ${candidateData.originalSubject}\nתוכן: ${candidateData.originalBody}`,
      recruitmentSource: 'מייל נכנס',
    });
    
    // אם יש קוד משרה - חיפוש המשרה ויצירת מועמדות
    if (candidateData.jobCode) {
      const jobs = await storage.getJobs(100, 0, candidateData.jobCode);
      const matchingJob = jobs.jobs.find(job => 
        job.id.includes(candidateData.jobCode!) || 
        job.title.includes(candidateData.jobCode!) ||
        job.description?.includes(candidateData.jobCode!)
      );
      
      if (matchingJob) {
        await storage.createJobApplication({
          candidateId: newCandidate.id,
          jobId: matchingJob.id,
          status: 'submitted',
          notes: `מועמדות אוטומטית ממייל נכנס עם קוד משרה: ${candidateData.jobCode}`,
        });
        
        console.log(`🎯 נוצרה מועמדות למשרה: ${matchingJob.title}`);
      }
    }
    
  } catch (error) {
    console.error('❌ שגיאה ביצירת מועמד ממייל:', error);
  }
}

// פונקציה להפעלה תקופתית
export function startEmailMonitoring(): void {
  console.log('🚀 הפעלת מעקב מיילים נכנסים...');
  
  // בדיקה כל 20 שניות
  setInterval(async () => {
    await checkIncomingEmails();
  }, 20 * 1000);
  
  // בדיקה ראשונית
  checkIncomingEmails();
}