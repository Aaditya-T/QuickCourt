import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY environment variable is required');
}

const resend = new Resend(process.env.RESEND_API_KEY);

export class EmailService {
  static async sendOTP(email: string, code: string, type: 'signup' | 'login' | 'password_reset') {
    const subjects = {
      signup: 'Verify your QuickCourt account',
      login: 'Your QuickCourt login code',
      password_reset: 'Reset your QuickCourt password'
    };

    const messages = {
      signup: `Welcome to QuickCourt! Your verification code is: ${code}. This code will expire in 10 minutes.`,
      login: `Your QuickCourt login code is: ${code}. This code will expire in 10 minutes.`,
      password_reset: `Your password reset code is: ${code}. This code will expire in 10 minutes.`
    };

    try {
      const result = await resend.emails.send({
        from: 'QuickCourt <noreply@contact.blockcelerate.net>',
        to: [email],
        subject: subjects[type],
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">QuickCourt</h2>
            <p>${messages[type]}</p>
            <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0;">
              <h1 style="color: #1f2937; letter-spacing: 0.1em; margin: 0;">${code}</h1>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              If you didn't request this code, please ignore this email.
            </p>
          </div>
        `,
      });

      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to send email:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  static generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  static async sendFacilityCreationNotification(adminEmails: string[], facilityName: string, ownerName: string, facilityId: string) {
    console.log('📧 Sending facility creation notification to:', adminEmails);
    
    try {
      const result = await resend.emails.send({
        from: 'QuickCourt <noreply@contact.blockcelerate.net>',
        to: adminEmails,
        subject: 'New Facility Pending Approval - QuickCourt',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">QuickCourt - Facility Approval Required</h2>
            <div style="background-color: #f3f4f6; padding: 20px; margin: 20px 0; border-radius: 8px;">
              <h3 style="color: #1f2937; margin-top: 0;">New Facility Created</h3>
              <p><strong>Facility Name:</strong> ${facilityName}</p>
              <p><strong>Facility ID:</strong> ${facilityId}</p>
              <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
                This facility is waiting for your approval. Please review the facility details and approve or reject it from your admin dashboard.
              </p>
            </div>
          </div>
        `,
      });

      console.log('✅ Email sent successfully');
      return { success: true, data: result };
    } catch (error) {
      console.error('❌ Failed to send facility creation notification:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  static async sendFacilityApprovalNotification(ownerEmail: string, facilityName: string, isApproved: boolean, rejectionReason?: string) {
    const subject = isApproved 
      ? 'Facility Approved - QuickCourt' 
      : 'Facility Rejected - QuickCourt';
    
    const statusText = isApproved ? 'approved' : 'rejected';
    const statusColor = isApproved ? '#059669' : '#dc2626';
    
    try {
      const result = await resend.emails.send({
        from: 'QuickCourt <noreply@contact.blockcelerate.net>',
        to: [ownerEmail],
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">QuickCourt - Facility ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}</h2>
            <div style="background-color: #f3f4f6; padding: 20px; margin: 20px 0; border-radius: 8px;">
              <h3 style="color: #1f2937; margin-top: 0;">Facility: ${facilityName}</h3>
              <p style="color: ${statusColor}; font-weight: bold; margin-bottom: 0;">
                Status: ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}
              </p>
              ${!isApproved && rejectionReason ? `
                <div style="margin-top: 15px; padding: 15px; background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px;">
                  <p style="color: #dc2626; margin: 0;"><strong>Rejection Reason:</strong></p>
                  <p style="color: #374151; margin: 5px 0 0 0;">${rejectionReason}</p>
                </div>
                </div>
              ` : ''}
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              ${isApproved 
                ? 'Your facility is now live and users can book courts. Thank you for choosing QuickCourt!'
                : 'Please review the feedback and make necessary changes before resubmitting.'
              }
            </p>
          </div>
        `,
      });

      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to send facility approval notification:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}