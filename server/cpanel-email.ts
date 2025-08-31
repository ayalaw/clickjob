import Imap from 'imap';
import nodemailer from 'nodemailer';

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
              markSeen: false // Don't mark as seen initially
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

              msg.once('end', () => {
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
                    // TODO: Process CV attachment here
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