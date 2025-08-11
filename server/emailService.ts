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
}