/**
 * Owner Notification Email Service
 * Sends email notifications to the app owner about important events
 */

import { Resend } from 'resend';
import { generateEmailTemplate, EMAIL_CONFIG } from './email-config';

const resend = new Resend(process.env.RESEND_API_KEY);

// Owner email - Clay's email
const OWNER_EMAIL = 'clay@skyveedrones.com';

export interface NewUserSignupData {
  userName: string;
  userEmail: string;
  loginMethod: string;
  organization: string;
}

/**
 * Send email notification to owner about new user signup
 */
export async function sendOwnerNotificationEmail(
  data: NewUserSignupData
): Promise<{ success: boolean; error?: string }> {
  const { userName, userEmail, loginMethod, organization } = data;

  try {
    console.log(`[Owner Notification] Sending new user signup notification to ${OWNER_EMAIL}`);

    const emailHtml = generateEmailTemplate({
      preheader: `New user ${userName} has signed up to MAPit`,
      title: '🎉 New User Signup',
      body: `
        <p><strong>A new user has signed up to MAPit!</strong></p>
        <p>Here are the details:</p>
        <p>
          <strong>Name:</strong> ${userName}<br>
          <strong>Email:</strong> ${userEmail}<br>
          <strong>Login Method:</strong> ${loginMethod}<br>
          <strong>Organization:</strong> ${organization}
        </p>
        <p>This user can now create projects, upload media, and generate reports.</p>
      `,
      footer: 'You are receiving this email because you are the owner of MAPit',
    });

    const { error } = await resend.emails.send({
      from: `${EMAIL_CONFIG.fromName} <${EMAIL_CONFIG.fromEmail}>`,
      to: [OWNER_EMAIL],
      subject: `🎉 New User Signup - ${userName}`,
      html: emailHtml,
    });

    if (error) {
      console.error('[Owner Notification] Failed to send email:', error);
      return { success: false, error: error.message };
    }

    console.log(`[Owner Notification] Email sent successfully to ${OWNER_EMAIL}`);
    return { success: true };
  } catch (err) {
    console.error('[Owner Notification] Error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
