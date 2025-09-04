
const { sendWelcomeEmail } = require('./server/emailService.ts');

setTimeout(async () => {
  console.log('📧 מנסה לשלוח מייל בדיקה...');
  try {
    const result = await sendWelcomeEmail({
      email: 'h1700707114@gmail.com',
      firstName: 'משתמש',
      lastName: 'בדיקה',
      password: 'test123456',
      loginUrl: 'http://localhost:5000'
    });
    console.log('תוצאה:', result ? 'הצלחה' : 'כישלון');
  } catch (error) {
    console.error('שגיאה:', error.message);
  }
  process.exit(0);
}, 2000);

