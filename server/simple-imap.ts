import Imap from 'imap';
// import { parseEmail } from './incomingEmailService'; // Removed broken import

// Simple IMAP connection test
export async function testImapConnection(): Promise<boolean> {
  return new Promise((resolve) => {
    console.log('🔄 בדיקת חיבור IMAP פשוטה...');
    
    const imap = new Imap({
      user: 'dolev@h-group.org.il',
      password: 'hpm_7HqToCSs[H7,',
      host: 'mail.h-group.org.il',
      port: 143,
      tls: false,
      authTimeout: 5000,
      connTimeout: 5000,
      tlsOptions: { rejectUnauthorized: false }
    });

    let connected = false;

    imap.once('ready', () => {
      console.log('✅ חיבור IMAP הצליח!');
      connected = true;
      
      imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          console.error('❌ שגיאה בפתיחת תיבת דואר:', err.message);
          imap.end();
          resolve(false);
          return;
        }

        console.log(`📧 נמצאו ${box.messages.total} מיילים בתיבה`);
        imap.end();
        resolve(true);
      });
    });

    imap.once('error', (err) => {
      if (!connected) {
        console.error('❌ שגיאת חיבור IMAP:', err.message);
        resolve(false);
      }
    });

    // Timeout
    setTimeout(() => {
      if (!connected) {
        console.error('❌ timeout בחיבור IMAP');
        resolve(false);
      }
    }, 10000);

    try {
      imap.connect();
    } catch (error) {
      console.error('❌ שגיאה ביצירת חיבור:', error);
      resolve(false);
    }
  });
}

// Test function
export async function runImapTest() {
  console.log('🚀 מתחיל בדיקת IMAP...');
  const success = await testImapConnection();
  if (success) {
    console.log('✅ חיבור IMAP עובד תקין!');
  } else {
    console.log('❌ חיבור IMAP כשל');
  }
  return success;
}