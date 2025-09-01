import Imap from 'imap';
import nodemailer from 'nodemailer';
import { storage } from './storage';
import { insertCandidateSchema } from '../shared/schema';
import fs from 'fs';
import path from 'path';
import { simpleParser } from 'mailparser';

// cPanel Email Configuration - Multiple attempts for different cPanel setups
const CPANEL_CONFIGS = [
  {
    name: 'cPanel SSL (465/993)',
    imap: {
      user: 'dolev@h-group.org.il',
      password: 'hpm_7HqToCSs[H7,', 
      host: 'mail.h-group.org.il',
      port: 993,
      tls: true,
      authTimeout: 10000,
      connTimeout: 10000,
      tlsOptions: { rejectUnauthorized: false }
    },
    smtp: {
      host: 'mail.h-group.org.il',
      port: 465,
      secure: true,
      auth: {
        user: 'dolev@h-group.org.il',
        pass: 'hpm_7HqToCSs[H7,'
      },
      tls: { rejectUnauthorized: false }
    }
  },
  {
    name: 'cPanel Standard (143/587)',
    imap: {
      user: 'dolev@h-group.org.il',
      password: 'hpm_7HqToCSs[H7,', 
      host: 'mail.h-group.org.il',
      port: 143,
      tls: false,
      authTimeout: 8000,
      connTimeout: 8000,
      tlsOptions: { rejectUnauthorized: false }
    },
    smtp: {
      host: 'mail.h-group.org.il',
      port: 587,
      secure: false,
      auth: {
        user: 'dolev@h-group.org.il',
        pass: 'hpm_7HqToCSs[H7,'
      },
      tls: { rejectUnauthorized: false }
    }
  },
  {
    name: 'Alternative Host',
    imap: {
      user: 'dolev@h-group.org.il',
      password: 'hpm_7HqToCSs[H7,', 
      host: 'h-group.org.il',
      port: 143,
      tls: false,
      authTimeout: 6000,
      connTimeout: 6000,
      tlsOptions: { rejectUnauthorized: false }
    },
    smtp: {
      host: 'h-group.org.il',
      port: 587,
      secure: false,
      auth: {
        user: 'dolev@h-group.org.il',
        pass: 'hmp_7HqToCSs[H7,'
      },
      tls: { rejectUnauthorized: false }
    }
  }
];

// Test cPanel IMAP connection
export async function testCpanelImap(): Promise<boolean> {
  console.log('🔄 בדיקת חיבור cPanel IMAP...');
  
  return new Promise((resolve) => {
    const imap = new Imap(CPANEL_CONFIGS[0].imap);
    let resolved = false;

    // Extended timeout for cPanel servers
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.log('❌ Timeout בחיבור cPanel IMAP');
        resolve(false);
      }
    }, 20000);

    imap.once('ready', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        console.log('✅ חיבור cPanel IMAP הצליח!');
        
        // Test opening inbox
        imap.openBox('INBOX', false, (err, box) => {
          if (err) {
            console.error('❌ שגיאה בפתיחת תיבת דואר:', err.message);
          } else {
            console.log(`📧 נמצאו ${box.messages.total} מיילים בתיבת הדואר`);
          }
          imap.end();
          resolve(true);
        });
      }
    });

    imap.once('error', (err: any) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        console.error('❌ שגיאת cPanel IMAP:', err.message);
        resolve(false);
      }
    });

    imap.once('end', () => {
      console.log('📫 חיבור cPanel IMAP נסגר');
    });

    try {
      imap.connect();
    } catch (error: any) {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        console.error('❌ שגיאה ביצירת חיבור cPanel:', error.message);
        resolve(false);
      }
    }
  });
}

// Test cPanel SMTP connection
export async function testCpanelSmtp(): Promise<boolean> {
  console.log('🔄 בדיקת חיבור cPanel SMTP...');
  
  try {
    const transporter = nodemailer.createTransport(CPANEL_CONFIGS[0].smtp);
    
    // Verify connection
    await transporter.verify();
    console.log('✅ חיבור cPanel SMTP הצליח!');
    return true;
  } catch (error: any) {
    console.error('❌ שגיאת cPanel SMTP:', error.message);
    return false;
  }
}

// Check for new emails in cPanel
export async function checkCpanelEmails(): Promise<void> {
  console.log('📧 בודק מיילים חדשים בcPanel...');
  
  return new Promise((resolve) => {
    const imap = new Imap(CPANEL_CONFIGS[0].imap);
    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.log('❌ Timeout בבדיקת מיילים');
        resolve();
      }
    }, 25000);

    imap.once('ready', () => {
      console.log('✅ מחובר לשרת cPanel');
      
      imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          console.error('❌ שגיאה בפתיחת תיבת דואר:', err.message);
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            imap.end();
            resolve();
          }
          return;
        }

        console.log(`📧 בוחן ${box.messages.total} מיילים`);

        if (box.messages.total === 0) {
          console.log('ℹ️ אין מיילים בתיבה');
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            imap.end();
            resolve();
          }
          return;
        }

        // Search for unread emails
        imap.search(['UNSEEN'], (err, results) => {
          if (err) {
            console.error('❌ שגיאה בחיפוש מיילים:', err.message);
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              imap.end();
              resolve();
            }
            return;
          }

          if (!results || results.length === 0) {
            console.log('ℹ️ אין מיילים חדשים');
          } else {
            console.log(`🆕 נמצאו ${results.length} מיילים חדשים`);
            
            // Process each new email
            const f = imap.fetch(results, {
              bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', 'TEXT'],
              markSeen: true // Mark as seen after processing
            });

            let processedCount = 0;
            const totalEmails = results.length;

            f.on('message', (msg, seqno) => {
              console.log(`📨 מעבד מייל ${seqno}`);
              
              let body = '';
              let headers: any = {};

              msg.on('body', (stream, info) => {
                let buffer = '';
                stream.on('data', (chunk) => {
                  buffer += chunk.toString('utf8');
                });
                stream.once('end', () => {
                  if (info.which === 'TEXT') {
                    body = buffer;
                  } else {
                    headers = Imap.parseHeader(buffer);
                  }
                });
              });

              msg.once('end', async () => {
                processedCount++;
                console.log(`✅ מייל ${seqno} עובד (${processedCount}/${totalEmails})`);
                
                // Log email details for debugging
                if (headers.from && headers.subject) {
                  console.log(`📮 מאת: ${headers.from[0]}`);
                  console.log(`📋 נושא: ${headers.subject[0]}`);
                  
                  // Check if this email contains potential CV
                  const subject = headers.subject[0].toLowerCase();
                  if (subject.includes('cv') || subject.includes('קורות') || subject.includes('resume')) {
                    console.log('🎯 נמצא מייל עם קורות חיים!');
                    
                    // Process CV attachment
                    try {
                      await processCVEmailAttachment(imap, seqno, headers, body);
                      console.log(`✅ מייל ${seqno} עובד ומסומן כנקרא`);
                    } catch (cvError) {
                      console.error('❌ שגיאה בעיבוד קובץ CV:', cvError);
                    }
                  }
                }

                // If all emails processed, close connection
                if (processedCount === totalEmails) {
                  if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    imap.end();
                    resolve();
                  }
                }
              });
            });

            f.once('error', (err) => {
              console.error('❌ שגיאה בקבלת מיילים:', err.message);
              if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                imap.end();
                resolve();
              }
            });
          }

          // If no new emails to process, close connection
          if (!results || results.length === 0) {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              imap.end();
              resolve();
            }
          }
        });
      });
    });

    imap.once('error', (err: any) => {
      console.error('❌ שגיאת חיבור cPanel:', err.message);
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve();
      }
    });

    imap.once('end', () => {
      console.log('📫 חיבור cPanel נסגר');
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve();
      }
    });

    try {
      imap.connect();
    } catch (error: any) {
      console.error('❌ שגיאה ביצירת חיבור:', error.message);
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve();
      }
    }
  });
}

// Send email using cPanel SMTP
export async function sendCpanelEmail(to: string, subject: string, text: string, html?: string): Promise<boolean> {
  console.log(`📤 שולח מייל דרך cPanel ל-${to}`);
  
  try {
    const transporter = nodemailer.createTransport(CPANEL_CONFIGS[0].smtp);
    
    const mailOptions = {
      from: 'dolev@h-group.org.il',
      to,
      subject,
      text,
      html: html || text
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ מייל נשלח בהצלחה דרך cPanel:', result.messageId);
    return true;
  } catch (error: any) {
    console.error('❌ שגיאה בשליחת מייל דרך cPanel:', error.message);
    return false;
  }
}

// Start monitoring emails from cPanel
export function startCpanelEmailMonitoring() {
  console.log('🚀 מפעיל מעקב מיילים cPanel');
  
  // Check emails immediately
  checkCpanelEmails();
  
  // Then check every 60 seconds
  setInterval(() => {
    checkCpanelEmails().catch(err => {
      console.error('❌ שגיאה במעקב מיילים cPanel:', err);
    });
  }, 60000);
}

// Test all cPanel email functionality
export async function testAllCpanelEmail(): Promise<void> {
  console.log('🧪 בדיקה מלאה של מערכת cPanel...');
  
  // Test IMAP
  const imapSuccess = await testCpanelImap();
  
  // Test SMTP  
  const smtpSuccess = await testCpanelSmtp();
  
  if (imapSuccess && smtpSuccess) {
    console.log('✅ כל מערכות cPanel עובדות תקין!');
    // Start monitoring if both work
    startCpanelEmailMonitoring();
  } else {
    console.log('❌ יש בעיות במערכת cPanel');
    if (!imapSuccess) console.log('  - IMAP לא עובד');
    if (!smtpSuccess) console.log('  - SMTP לא עובד');
  }
}

// Export function to reload cPanel configuration
export async function reloadCpanelConfig() {
  console.log('🔄 רענון הגדרות cPanel...');
  
  try {
    // Reload cPanel configurations from database
    const { storage } = await import('./storage');
    
    // Use INCOMING_EMAIL settings for IMAP (correct settings)
    const imapHost = await storage.getSystemSetting('INCOMING_EMAIL_HOST');
    const imapPort = await storage.getSystemSetting('INCOMING_EMAIL_PORT');
    const imapSecure = await storage.getSystemSetting('INCOMING_EMAIL_SECURE');
    const imapUser = await storage.getSystemSetting('INCOMING_EMAIL_USER');
    const imapPass = await storage.getSystemSetting('INCOMING_EMAIL_PASS');
    
    // Use OUTGOING_EMAIL settings for SMTP
    const smtpHost = await storage.getSystemSetting('OUTGOING_EMAIL_HOST');
    const smtpPort = await storage.getSystemSetting('OUTGOING_EMAIL_PORT');
    const smtpSecure = await storage.getSystemSetting('OUTGOING_EMAIL_SECURE');
    const smtpUser = await storage.getSystemSetting('OUTGOING_EMAIL_USER');
    const smtpPass = await storage.getSystemSetting('OUTGOING_EMAIL_PASS');

    if (imapHost?.value && imapUser?.value && imapPass?.value) {
      // Update CPANEL_CONFIGS with correct INCOMING/OUTGOING settings
      CPANEL_CONFIGS[0] = {
        smtp: {
          host: smtpHost?.value || 'mail.h-group.org.il',
          port: parseInt(smtpPort?.value || '465'),
          secure: smtpSecure?.value === 'true',
          auth: {
            user: smtpUser?.value || 'cv@h-group.org.il',
            pass: smtpPass?.value || ''
          },
          tls: { rejectUnauthorized: false }
        },
        imap: {
          user: imapUser.value,
          password: imapPass.value,
          host: imapHost.value,
          port: parseInt(imapPort?.value || '993'),
          tls: imapSecure?.value === 'true',
          authTimeout: 60000,
          connTimeout: 60000,
          keepalive: {
            interval: 10000,
            idleInterval: 300000,
            forceNoop: true
          },
          tlsOptions: { 
            rejectUnauthorized: false,
            servername: imapHost.value,
            minVersion: 'TLSv1',
            maxVersion: 'TLSv1.3'
          }
        }
      };
      console.log('✅ הגדרות cPanel עודכנו עם הפרטים הנכונים');
      console.log(`📧 IMAP: ${imapUser.value}@${imapHost.value}:${imapPort?.value || '993'} (SSL: ${imapSecure?.value})`);
      
      // Test the new configuration
      await testAllCpanelEmail();
      
      return true;
    } else {
      console.warn('⚠️ חסרים פרטי cPanel בבסיס הנתונים');
      return false;
    }
  } catch (error) {
    console.error('❌ שגיאה ברענון הגדרות cPanel:', error);
    return false;
  }
}

// Process CV attachment from email
async function processCVEmailAttachment(imap: any, seqno: number, headers: any, body: string): Promise<void> {
  console.log('🔍 מעבד קובץ CV מהמייל...');
  
  try {
    // Get the full email message with attachments
    const f = imap.fetch(seqno, { 
      bodies: '',
      struct: true,
      envelope: true
    });

    f.on('message', (msg: any) => {
      msg.on('body', (stream: any) => {
        let fullEmail = '';
        
        stream.on('data', (chunk: any) => {
          fullEmail += chunk.toString();
        });
        
        stream.once('end', async () => {
          try {
            // Parse the full email with mailparser to extract attachments
            const parsed = await simpleParser(fullEmail);
            
            // Look for CV attachments
            if (parsed.attachments && parsed.attachments.length > 0) {
              console.log(`📎 נמצאו ${parsed.attachments.length} קבצים מצורפים`);
              
              for (const attachment of parsed.attachments) {
                const filename = attachment.filename || '';
                const isCV = filename.toLowerCase().includes('cv') || 
                            filename.toLowerCase().includes('resume') ||
                            filename.toLowerCase().includes('קורות') ||
                            filename.endsWith('.pdf') ||
                            filename.endsWith('.doc') ||
                            filename.endsWith('.docx');
                
                if (isCV && attachment.content) {
                  console.log(`💼 מעבד קובץ CV: ${filename}`);
                  
                  // Save the CV file
                  const uploadsDir = path.join(process.cwd(), 'uploads');
                  if (!fs.existsSync(uploadsDir)) {
                    fs.mkdirSync(uploadsDir, { recursive: true });
                  }
                  
                  const timestamp = Date.now();
                  const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
                  const savedPath = path.join(uploadsDir, `${timestamp}_${cleanFilename}`);
                  
                  // Write the file
                  fs.writeFileSync(savedPath, attachment.content);
                  console.log(`💾 קובץ CV נשמר: ${savedPath}`);
                  
                  // Extract email address from sender
                  const fromEmail = headers.from[0];
                  let emailAddress = '';
                  const emailMatch = fromEmail.match(/<([^>]+)>/);
                  if (emailMatch) {
                    emailAddress = emailMatch[1];
                  } else {
                    emailAddress = fromEmail;
                  }
                  
                  // Create candidate record
                  const candidateData = {
                    email: emailAddress,
                    name: extractNameFromEmail(emailAddress),
                    phone: '',
                    status: 'פעיל' as const,
                    source: 'מייל',
                    notes: `נוצר אוטומטית מהמייל: ${parsed.subject || subject}`,
                    cvPath: savedPath
                  };
                  
                  // Check if candidate already exists
                  const existingCandidates = await storage.getCandidates();
                  const candidateExists = existingCandidates.some(c => c.email === emailAddress);
                  
                  if (!candidateExists) {
                    // Create new candidate
                    const newCandidate = await storage.createCandidate(candidateData);
                    console.log(`👤 נוצר מועמד חדש: ${newCandidate.name} (${newCandidate.email})`);
                    
                    // Check if there's a job code in the subject for automatic application
                    const jobCodeMatch = parsed.subject?.match(/(\d{4,})/);
                    if (jobCodeMatch) {
                      const jobCode = jobCodeMatch[1];
                      const jobs = await storage.getJobs();
                      const matchingJob = jobs.find(j => j.id === jobCode || j.title.includes(jobCode));
                      
                      if (matchingJob) {
                        // Create automatic job application
                        await storage.createJobApplication({
                          candidateId: newCandidate.id,
                          jobId: matchingJob.id,
                          status: 'חדש',
                          notes: `הגיש מועמדות אוטומטית באמצעות מייל לקוד משרה: ${jobCode}`
                        });
                        console.log(`🎯 נוצרה הגשת מועמדות אוטומטית למשרה: ${matchingJob.title}`);
                      }
                    }
                  } else {
                    console.log(`ℹ️ מועמד כבר קיים במערכת: ${emailAddress}`);
                  }
                }
              }
            } else {
              console.log('📧 המייל לא מכיל קבצים מצורפים');
            }
          } catch (parseError) {
            console.error('❌ שגיאה בפענוח המייל:', parseError);
          }
        });
      });
    });
    
  } catch (error) {
    console.error('❌ שגיאה בעיבוד קובץ CV מהמייל:', error);
  }
}

// Extract name from email address
function extractNameFromEmail(email: string): string {
  const localPart = email.split('@')[0];
  
  // Replace common separators with spaces
  let name = localPart.replace(/[._-]/g, ' ');
  
  // Capitalize first letter of each word
  name = name.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return name || 'מועמד חדש';
}