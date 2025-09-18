import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { storage } from './storage';

// Create transporter based on configuration
let transporter: nodemailer.Transporter;
let emailConfigLoaded = false;

// Load email configuration from database
async function loadEmailConfig() {
  try {
    const smtpHost = await storage.getSystemSetting('CPANEL_SMTP_HOST');
    const smtpPort = await storage.getSystemSetting('CPANEL_SMTP_PORT');
    const smtpSecure = await storage.getSystemSetting('CPANEL_SMTP_SECURE');
    const emailUser = await storage.getSystemSetting('CPANEL_EMAIL_USER');
    const emailPass = await storage.getSystemSetting('CPANEL_EMAIL_PASS');

    // Check if cPanel credentials are properly set (not placeholder values)
    const isValidPassword = emailPass?.value && 
      emailPass.value !== 'הכנס-כאן-את-הסיסמה-האמיתית' && 
      emailPass.value.length > 5;

    if (smtpHost && emailUser && isValidPassword) {
      try {
        // cPanel SMTP configuration
        transporter = nodemailer.createTransport({
          host: smtpHost.value,
          port: parseInt(smtpPort?.value || '587'),
          secure: smtpSecure?.value === 'true',
          auth: {
            user: emailUser.value,
            pass: emailPass.value,
          },
          tls: {
            rejectUnauthorized: false
          },
          connectionTimeout: 10000,
          greetingTimeout: 5000,
          socketTimeout: 10000
        });
        
        // Skip automatic connection verification for standalone deployment
        console.log("📧 Email configured from database (verification skipped for standalone)");
        emailConfigLoaded = true;
        return;
        
        // Disabled automatic verification to avoid external dependencies
        // try {
        //   await transporter.verify();
        //   console.log("📧 Email configured with cPanel SMTP from database");
        //   emailConfigLoaded = true;
        //   return;
        // } catch (verifyError) {
        //   console.error("❌ שגיאה באימות הגדרות SMTP:", verifyError);
        //   console.log("🔄 ינסה הגדרות cPanel חלופיות...");
        //   transporter = null;
        // }
      } catch (transportError) {
        console.warn("❌ שגיאה ביצירת transporter עם הגדרות cPanel:", transportError);
      }
    } else {
      console.warn("❌ הגדרות cPanel לא תקינות - יש להגדיר סיסמה תקינה בהגדרות המערכת");
    }

    // Try alternative cPanel configurations if main config failed
    if (smtpHost?.value && emailUser?.value && emailPass?.value) {
      console.log("🔄 מנסה הגדרות cPanel חלופיות...");
      
      // Try different port and security combinations
      const alternativeConfigs = [
        { port: 587, secure: false, description: "Port 587 without SSL" },
        { port: 25, secure: false, description: "Port 25 standard" },
        { port: 2525, secure: false, description: "Port 2525 alternative" },
        { port: 465, secure: true, description: "Port 465 with SSL" }
      ];
      
      for (const config of alternativeConfigs) {
        try {
          console.log(`🔧 מנסה ${config.description}...`);
          const altTransporter = nodemailer.createTransport({
            host: smtpHost.value,
            port: config.port,
            secure: config.secure,
            auth: {
              user: emailUser.value,
              pass: emailPass.value,
            },
            tls: {
              rejectUnauthorized: false,
              ciphers: 'SSLv3'
            },
            connectionTimeout: 5000,
            greetingTimeout: 3000,
            socketTimeout: 5000
          });
          
          await altTransporter.verify();
          transporter = altTransporter;
          console.log(`✅ הצלחה עם ${config.description}!`);
          emailConfigLoaded = true;
          return;
        } catch (altError) {
          console.log(`❌ ${config.description} לא עובד:`, altError.message);
        }
      }
    }

    console.warn("❌ לא ניתן להגדיר מערכת מייל - יש להגדיר פרטי SMTP תקינים בהגדרות המערכת.");
    emailConfigLoaded = false;
  } catch (error) {
    console.error("Error loading email configuration:", error);
  }
}

// Initialize email configuration
loadEmailConfig();

// Export function to reload email config
export async function reloadEmailConfig() {
  console.log("🔄 Reloading email configuration...");
  await loadEmailConfig();
  return emailConfigLoaded;
}

// Gmail API setup for reading incoming emails
const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  'http://localhost:3000/oauth2callback'
);

if (process.env.GMAIL_ACCESS_TOKEN && process.env.GMAIL_REFRESH_TOKEN) {
  oauth2Client.setCredentials({
    access_token: process.env.GMAIL_ACCESS_TOKEN,
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });
}

export const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

interface EmailParams {
  to: string;
  from?: string;
  cc?: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType?: string;
  }>;
}

export async function sendEmail(params: EmailParams): Promise<{ success: boolean; error?: string }> {
  // Ensure email configuration is loaded
  if (!emailConfigLoaded) {
    console.log("🔄 Email config not loaded, attempting to reload...");
    await loadEmailConfig();
  }

  if (!transporter) {
    console.log("❌ No transporter available, attempting to reload config...");
    await loadEmailConfig();
    
    if (!transporter) {
      return { success: false, error: "Email credentials not configured - check system settings" };
    }
  }

  try {
    // Get the email user from database settings
    const emailUser = await storage.getSystemSetting('CPANEL_EMAIL_USER');
    const defaultFrom = emailUser?.value || process.env.GMAIL_USER;

    const mailOptions = {
      from: params.from || defaultFrom,
      to: params.to,
      cc: params.cc,
      subject: params.subject,
      text: params.text,
      html: params.html,
      attachments: params.attachments,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("📧 Email sent successfully:", {
      to: params.to,
      subject: params.subject,
      messageId: result.messageId
    });
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Email sending error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown email error'
    };
  }
}

// Email templates
export const emailTemplates = {
  candidateProfile: (candidate: any) => ({
    subject: `פרופיל מועמד: ${candidate.firstName} ${candidate.lastName}`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
          פרופיל מועמד: ${candidate.firstName} ${candidate.lastName}
        </h2>
        
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #374151; margin-top: 0;">פרטים אישיים</h3>
          <p><strong>שם מלא:</strong> ${candidate.firstName} ${candidate.lastName}</p>
          <p><strong>אימייל:</strong> ${candidate.email}</p>
          <p><strong>נייד:</strong> ${candidate.mobile || 'לא צוין'}</p>
          <p><strong>עיר:</strong> ${candidate.city}</p>
          ${candidate.profession ? `<p><strong>מקצוע:</strong> ${candidate.profession}</p>` : ''}
          ${candidate.experience ? `<p><strong>ניסיון:</strong> ${candidate.experience} שנים</p>` : ''}
        </div>

        ${candidate.notes ? `
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #92400e; margin-top: 0;">הערות</h3>
            <p>${candidate.notes}</p>
          </div>
        ` : ''}

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="color: #6b7280; font-size: 14px;">נשלח ממערכת ניהול גיוס</p>
        </div>
      </div>
    `
  }),

  interviewInvitation: (candidate: any, interviewDetails: any) => ({
    subject: `הזמנה לראיון עבודה - ${interviewDetails.jobTitle || 'משרה'}`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
          הזמנה לראיון עבודה
        </h2>
        
        <p style="font-size: 16px; color: #374151;">שלום ${candidate.firstName},</p>
        
        <p>אנו שמחים להזמינך לראיון עבודה עבור המשרה:</p>
        
        <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #0369a1; margin-top: 0;">פרטי הראיון</h3>
          ${interviewDetails.jobTitle ? `<p><strong>תפקיד:</strong> ${interviewDetails.jobTitle}</p>` : ''}
          ${interviewDetails.date ? `<p><strong>תאריך:</strong> ${interviewDetails.date}</p>` : ''}
          ${interviewDetails.time ? `<p><strong>שעה:</strong> ${interviewDetails.time}</p>` : ''}
          ${interviewDetails.location ? `<p><strong>מיקום:</strong> ${interviewDetails.location}</p>` : ''}
          ${interviewDetails.interviewer ? `<p><strong>מראיין:</strong> ${interviewDetails.interviewer}</p>` : ''}
        </div>

        ${interviewDetails.notes ? `
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #92400e; margin-top: 0;">הערות נוספות</h3>
            <p>${interviewDetails.notes}</p>
          </div>
        ` : ''}

        <p>במידה ואינך יכול/ה להגיע, אנא הודיע/י בהקדם האפשרי.</p>
        
        <p>בהצלחה!</p>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="color: #6b7280; font-size: 14px;">נשלח ממערכת ניהול גיוס</p>
        </div>
      </div>
    `
  }),

  candidateShortlist: (candidates: any[], jobTitle: string) => ({
    subject: `רשימת מועמדים מקוצרת - ${jobTitle}`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7c3aed; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
          רשימת מועמדים מקוצרת
        </h2>
        
        <p><strong>תפקיד:</strong> ${jobTitle}</p>
        <p><strong>מספר מועמדים:</strong> ${candidates.length}</p>
        
        <div style="margin: 20px 0;">
          ${candidates.map((candidate, index) => `
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 10px 0; border-right: 4px solid #7c3aed;">
              <h4 style="margin-top: 0; color: #374151;">${index + 1}. ${candidate.firstName} ${candidate.lastName}</h4>
              <p><strong>אימייל:</strong> ${candidate.email}</p>
              <p><strong>נייד:</strong> ${candidate.mobile || 'לא צוין'}</p>
              <p><strong>עיר:</strong> ${candidate.city}</p>
              ${candidate.profession ? `<p><strong>מקצוע:</strong> ${candidate.profession}</p>` : ''}
              ${candidate.experience ? `<p><strong>ניסיון:</strong> ${candidate.experience} שנים</p>` : ''}
            </div>
          `).join('')}
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="color: #6b7280; font-size: 14px;">נשלח ממערכת ניהול גיוס</p>
        </div>
      </div>
    `
  })
};

interface WelcomeEmailData {
  firstName?: string;
  lastName?: string;
  email: string;
  password: string;
  loginUrl: string;
}

export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
  try {
    console.log('🔄 Starting welcome email send process...');
    
    if (!emailConfigLoaded) {
      console.log('📧 Email config not loaded, loading now...');
      await loadEmailConfig();
    }

    if (!transporter) {
      console.error('❌ Email configuration not available - transporter is null');
      console.log('📊 Email config status:', { emailConfigLoaded, transporterExists: !!transporter });
      return false;
    }

    console.log('✅ Email configuration is available, proceeding with send...');

    const userName = data.firstName && data.lastName 
      ? `${data.firstName} ${data.lastName}` 
      : data.email;

    // Get email configuration from database (if loaded)
    const senderEmail = transporter.options?.auth?.user || 'system@recruitment.com';
    
    const mailOptions = {
      from: senderEmail,
      to: data.email,
      subject: 'פרטי כניסה למערכת הגיוס - ברוכים הבאים!',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #2563eb; text-align: center; margin-bottom: 30px;">
              🎉 ברוכים הבאים למערכת הגיוס!
            </h1>
            
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              שלום ${userName},
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              נוצר עבורך חשבון חדש במערכת ניהול הגיוס שלנו. להלן פרטי הכניסה שלך:
            </p>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 6px; margin: 20px 0; border-right: 4px solid #2563eb;">
              <h3 style="margin-top: 0; color: #1e40af;">פרטי כניסה:</h3>
              <p style="margin: 10px 0;"><strong>כתובת מייל:</strong> ${data.email}</p>
              <p style="margin: 10px 0;"><strong>סיסמה זמנית:</strong> <code style="background-color: #e5e7eb; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${data.password}</code></p>
              <p style="margin: 10px 0;"><strong>כתובת המערכת:</strong> <a href="${data.loginUrl}" style="color: #2563eb;">${data.loginUrl}</a></p>
            </div>
            
            <div style="background-color: #fef3cd; padding: 15px; border-radius: 6px; margin: 20px 0; border-right: 4px solid #f59e0b;">
              <p style="margin: 0; font-size: 14px; color: #92400e;">
                <strong>⚠️ חשוב:</strong> זוהי סיסמה זמנית. מומלץ לשנות את הסיסמה לאחר הכניסה הראשונה למערכת.
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.loginUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                כניסה למערכת
              </a>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; text-align: center; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
              אם יש לך שאלות או בעיות בכניסה למערכת, אנא פנה למנהל המערכת.
            </p>
            
            <p style="font-size: 14px; color: #6b7280; text-align: center;">
              תודה,<br>
              צוות מערכת הגיוס
            </p>
          </div>
        </div>
      `
    };

    console.log(`📤 Sending welcome email with options:`, {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });
    
    const result = await transporter.sendMail(mailOptions);
    console.log(`📧 Welcome email sent to ${data.email}`, {
      messageId: result.messageId,
      response: result.response
    });
    console.log('✅ Welcome email sent successfully to:', data.email);
    return true;
  } catch (error) {
    console.error('❌ Failed to send welcome email:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      response: error.response
    });
    return false;
  }
}