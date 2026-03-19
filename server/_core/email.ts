/**
 * Email Service
 * Sends transactional emails using Resend API
 */

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send an email using Resend API
 */
export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY;
  
  if (!resendApiKey) {
    console.warn('[Email] RESEND_API_KEY not configured, skipping email send');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Mapit <onboarding@updates.manus.space>',
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Email] Failed to send:', error);
      return false;
    }

    const result = await response.json();
    console.log('[Email] Sent successfully:', result.id);
    return true;
  } catch (error) {
    console.error('[Email] Error sending email:', error);
    return false;
  }
}

/**
 * Send welcome email to new users
 */
export async function sendWelcomeEmail(userEmail: string, userName: string): Promise<boolean> {
  const dashboardUrl = process.env.VITE_OAUTH_PORTAL_URL?.replace('/oauth/portal', '') || 'https://app.manus.im';
  const getStartedUrl = `${dashboardUrl}/dashboard`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Mapit</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #09323B;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #0a1f26; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #117660 0%, #04B16F 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: 2px;">
                MAP<span style="color: #14E114;">i</span>T
              </h1>
              <p style="margin: 10px 0 0 0; color: #e0f2f1; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                Elevate Your Vision
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px; color: #e0e0e0;">
              <h2 style="margin: 0 0 20px 0; color: #04B16F; font-size: 24px; font-weight: 600;">
                Welcome to Mapit, ${userName}! 🚁
              </h2>
              
              <p style="margin: 0 0 20px 0; line-height: 1.6; font-size: 16px; color: #b0b0b0;">
                Thank you for signing up! You're now ready to transform your drone footage into powerful, interactive maps and insights.
              </p>
              
              <p style="margin: 0 0 20px 0; line-height: 1.6; font-size: 16px; color: #b0b0b0;">
                <strong style="color: #04B16F;">Your free tier includes:</strong>
              </p>
              
              <ul style="margin: 0 0 30px 0; padding-left: 20px; line-height: 1.8; font-size: 15px; color: #b0b0b0;">
                <li>3 projects</li>
                <li>1GB total storage</li>
                <li>100 data requests per hour</li>
                <li>10 file uploads per day</li>
                <li>GPS tagging & interactive maps</li>
              </ul>
              
              <!-- CTA Button -->
              <table role="presentation" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 8px; background: linear-gradient(135deg, #04B16F 0%, #14E114 100%);">
                    <a href="${getStartedUrl}" style="display: inline-block; padding: 16px 40px; color: #09323B; text-decoration: none; font-weight: 600; font-size: 16px; letter-spacing: 0.5px;">
                      Get Started →
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0 0; line-height: 1.6; font-size: 14px; color: #808080;">
                Need help getting started? Check out our <a href="${dashboardUrl}/docs" style="color: #04B16F; text-decoration: none;">documentation</a> or reply to this email with any questions.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #051419; text-align: center; border-top: 1px solid #117660;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #808080;">
                © 2026 Mapit. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 12px; color: #606060;">
                Delivering precision drone mapping solutions
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendEmail({
    to: userEmail,
    subject: '🚁 Welcome to Mapit - Get Started with Your Free Tier',
    html,
  });
}
