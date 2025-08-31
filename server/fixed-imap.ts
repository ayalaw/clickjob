import Imap from 'imap';

// Simple working IMAP email checker
export async function checkEmailsSimple(): Promise<void> {
  console.log('🔍 בודק מיילים נכנסים...');
  
  // Try different IMAP configurations - cPanel servers can be tricky
  const configs = [
    {
      name: 'Standard IMAP (port 143)',
      user: 'dolev@h-group.org.il',
      password: 'hpm_7HqToCSs[H7,',
      host: 'mail.h-group.org.il',
      port: 143,
      tls: false,
      authTimeout: 8000,
      connTimeout: 8000,
      tlsOptions: { rejectUnauthorized: false }
    },
    {
      name: 'SSL IMAP (port 993)',
      user: 'dolev@h-group.org.il',
      password: 'hpm_7HqToCSs[H7,',
      host: 'mail.h-group.org.il',
      port: 993,
      tls: true,
      authTimeout: 8000,
      connTimeout: 8000,
      tlsOptions: { rejectUnauthorized: false }
    },
    {
      name: 'Alternative host',
      user: 'dolev@h-group.org.il',
      password: 'hpm_7HqToCSs[H7,',
      host: 'h-group.org.il',
      port: 143,
      tls: false,
      authTimeout: 6000,
      connTimeout: 6000,
      tlsOptions: { rejectUnauthorized: false }
    }
  ];

  console.log('🔄 מנסה עם הגדרות IMAP שונות...');
  
  for (const config of configs) {
    console.log(`🔧 בודק: ${config.name}`);
    const success = await tryConnection(config);
    if (success) {
      console.log(`✅ הצליח עם: ${config.name}!`);
      return;
    }
    console.log(`❌ נכשל עם: ${config.name}`);
  }
  
  console.log('❌ כל ההגדרות נכשלו');
}

async function tryConnection(config: any): Promise<boolean> {
  return new Promise((resolve) => {
    const imap = new Imap(config);
    imap.once('ready', () => {
      console.log('✅ מחובר לשרת IMAP');
      
      imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          console.error('❌ שגיאה בפתיחת תיבת דואר:', err.message);
          imap.end();
          resolve(false);
          return;
        }

        console.log(`📧 נמצאו ${box.messages.total} מיילים בתיבה`);

        if (box.messages.total === 0) {
          console.log('ℹ️ אין מיילים בתיבה');
          imap.end();
          resolve();
          return;
        }

        // Check for unread emails
        imap.search(['UNSEEN'], (err, results) => {
          if (err) {
            console.error('❌ שגיאה בחיפוש מיילים:', err.message);
            imap.end();
            resolve();
            return;
          }

          if (!results || results.length === 0) {
            console.log('ℹ️ אין מיילים חדשים');
            imap.end();
            resolve();
            return;
          }

          console.log(`🆕 נמצאו ${results.length} מיילים חדשים`);
          
          // Process unread emails
          const f = imap.fetch(results, {
            bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', 'TEXT'],
            markSeen: false // Don't mark as seen yet
          });

          let processedCount = 0;

          f.on('message', function(msg, seqno) {
            console.log(`📧 מעבד מייל מספר ${seqno}`);
            
            let body = '';
            let headers: any = {};

            msg.on('body', function(stream, info) {
              let buffer = '';
              stream.on('data', function(chunk) {
                buffer += chunk.toString('utf8');
              });
              stream.once('end', function() {
                if (info.which === 'TEXT') {
                  body = buffer;
                } else {
                  headers = Imap.parseHeader(buffer);
                }
              });
            });

            msg.once('end', function() {
              processedCount++;
              console.log(`✅ מייל ${seqno} עובד (${processedCount}/${results.length})`);
              
              // If we have both headers and body, we can analyze
              if (headers.from && headers.subject) {
                console.log(`📨 מאת: ${headers.from[0]}`);
                console.log(`📝 נושא: ${headers.subject[0]}`);
                
                // Here we would normally extract CV and create candidate
                // For now just log that we found an email with potential CV
                if (body.includes('cv') || body.includes('resume') || headers.subject[0].toLowerCase().includes('cv')) {
                  console.log('📋 נמצא מייל עם קורות חיים פוטנציאליים');
                }
              }
            });
          });

          f.once('error', function(err) {
            console.error('❌ שגיאה בקבלת מיילים:', err.message);
          });

          f.once('end', function() {
            console.log(`✅ סיום עיבוד ${processedCount} מיילים`);
            imap.end();
            resolve();
          });
        });
      });
    });

    imap.once('error', (err) => {
      console.error('❌ שגיאת חיבור IMAP:', err.message);
      console.log('💡 המערכת תמשיך לעבוד ללא מעקב מיילים');
      resolve();
    });

    imap.once('end', () => {
      console.log('📫 חיבור IMAP נסגר');
      resolve();
    });

    // Timeout after 15 seconds
    const timeout = setTimeout(() => {
      console.error('❌ timeout בחיבור IMAP');
      resolve();
    }, 15000);

    try {
      imap.connect();
      clearTimeout(timeout);
    } catch (error) {
      console.error('❌ שגיאה ביצירת חיבור IMAP:', error);
      clearTimeout(timeout);
      resolve();
    }
  });
}

// Start email monitoring with intervals
export function startSimpleEmailMonitoring() {
  console.log('🚀 מפעיל מעקב מיילים פשוט');
  
  // Check immediately
  checkEmailsSimple();
  
  // Then check every 60 seconds
  setInterval(() => {
    checkEmailsSimple().catch(err => {
      console.error('שגיאה במעקב מיילים:', err);
    });
  }, 60000);
}