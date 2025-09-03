import Imap from 'imap';

// Test IMAP connectivity with different configurations
export async function testMailConnection(): Promise<void> {
  console.log('🔄 בדיקת חיבור לשרת מייל...');
  
  // Configuration attempts
  const attempts = [
    {
      name: 'cPanel IMAP (mail.h-group.org.il:143)',
      config: {
        user: 'dolev@h-group.org.il',
        password: 'hpm_7HqToCSs[H7,',
        host: 'mail.h-group.org.il', 
        port: 143,
        tls: false,
        authTimeout: 5000,
        connTimeout: 5000
      }
    },
    {
      name: 'cPanel IMAP SSL (mail.h-group.org.il:993)',
      config: {
        user: 'dolev@h-group.org.il',
        password: 'hpm_7HqToCSs[H7,',
        host: 'mail.h-group.org.il',
        port: 993,
        tls: true,
        authTimeout: 5000,
        connTimeout: 5000,
        tlsOptions: { rejectUnauthorized: false }
      }
    },
    {
      name: 'Alternative host (h-group.org.il:143)',
      config: {
        user: 'dolev@h-group.org.il',
        password: 'hpm_7HqToCSs[H7,',
        host: 'h-group.org.il',
        port: 143,
        tls: false,
        authTimeout: 5000,
        connTimeout: 5000
      }
    }
  ];

  for (const attempt of attempts) {
    console.log(`🔧 מנסה: ${attempt.name}`);
    
    try {
      const success = await testSingleConnection(attempt.config);
      if (success) {
        console.log(`✅ חיבור הצליח! שרת: ${attempt.name}`);
        return;
      } else {
        console.log(`❌ חיבור נכשל: ${attempt.name}`);
      }
    } catch (error: any) {
      console.log(`❌ שגיאה ב-${attempt.name}: ${error.message}`);
    }
    
    // Wait a bit between attempts
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('❌ כל ניסיונות החיבור נכשלו');
}

function testSingleConnection(config: any): Promise<boolean> {
  return new Promise((resolve) => {
    const imap = new Imap(config);
    let resolved = false;

    // Timeout protection
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(false);
      }
    }, 8000);

    imap.once('ready', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        console.log('📧 IMAP מוכן!');
        imap.end();
        resolve(true);
      }
    });

    imap.once('error', (err: any) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        console.log(`❌ שגיאת IMAP: ${err.message}`);
        resolve(false);
      }
    });

    imap.once('end', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve(false);
      }
    });

    try {
      imap.connect();
    } catch (error: any) {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        console.log(`❌ שגיאה בחיבור: ${error.message}`);
        resolve(false);
      }
    }
  });
}

// Run test immediately when module loads for debugging
setTimeout(() => {
  testMailConnection();
}, 2000);