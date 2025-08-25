import nodemailer from 'nodemailer';

if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
  console.warn("Gmail credentials not set. Email functionality will be disabled.");
}

// Create Gmail transporter
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

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
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    return { success: false, error: "Gmail credentials not configured" };
  }

  try {
    const mailOptions = {
      from: params.from || process.env.GMAIL_USER,
      to: params.to,
      cc: params.cc,
      subject: params.subject,
      text: params.text,
      html: params.html,
      attachments: params.attachments,
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Gmail email error:', error);
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