import 'dotenv/config';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const BRAND_COLORS = {
  primary: '#10b981',
  background: '#0a0a0a',
  cardBg: '#171717',
  text: '#ffffff',
  textMuted: '#a3a3a3',
  border: '#262626',
};

const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="format-detection" content="telephone=no">
  <meta name="format-detection" content="date=no">
  <meta name="format-detection" content="address=no">
  <meta name="format-detection" content="email=no">
  <title>Mapit Test Email</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Orbitron:wght@700&display=swap');
    
    body {
      margin: 0;
      padding: 0;
      background-color: ${BRAND_COLORS.background};
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: ${BRAND_COLORS.text};
    }
    
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: ${BRAND_COLORS.cardBg};
      border: 1px solid ${BRAND_COLORS.border};
      border-radius: 8px;
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
      padding: 32px 24px;
      border-bottom: 2px solid ${BRAND_COLORS.primary};
      text-align: center;
    }
    
    .header h1 {
      margin: 0;
      font-family: 'Orbitron', monospace;
      font-size: 24px;
      font-weight: 700;
      color: ${BRAND_COLORS.primary};
      letter-spacing: 1px;
    }
    
    .content {
      padding: 32px 24px;
    }
    
    .preheader {
      display: none;
      max-height: 0;
      max-width: 0;
      overflow: hidden;
      font-size: 1px;
      opacity: 0;
    }
    
    .body-text {
      font-size: 16px;
      line-height: 1.6;
      color: ${BRAND_COLORS.textMuted};
      margin: 0 0 24px 0;
    }
    
    .body-text ul {
      margin: 16px 0;
      padding-left: 20px;
    }
    
    .body-text li {
      margin: 8px 0;
    }
    
    .highlight {
      color: ${BRAND_COLORS.primary};
      font-weight: 600;
    }
    
    .cta-button {
      display: inline-block;
      background-color: ${BRAND_COLORS.primary};
      color: ${BRAND_COLORS.background} !important;
      font-size: 16px;
      font-weight: 600;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
    }
    
    .cta-container {
      text-align: center;
      margin: 32px 0;
    }
    
    .divider {
      height: 1px;
      background-color: ${BRAND_COLORS.border};
      margin: 32px 0;
    }
    
    .footer {
      font-size: 14px;
      color: ${BRAND_COLORS.textMuted};
      text-align: center;
      margin-top: 24px;
    }
    
    .footer a {
      color: ${BRAND_COLORS.primary};
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="preheader">Test email to verify Mapit email configuration and SPF/DKIM/DMARC authentication</div>
  <div class="container">
    <div class="header">
      <h1>MAPIT</h1>
    </div>
    <div class="content">
      <div class="body-text">
        <p>Congratulations! Your email configuration is working correctly.</p>
        <p>This test email was sent from your verified domain: <span class="highlight">skyveedrones.com</span></p>
        <p>Your email authentication is now properly configured with:</p>
        <ul>
          <li><strong>SPF Records</strong> - Authorized sender verification</li>
          <li><strong>DKIM Signatures</strong> - Email integrity verification</li>
          <li><strong>DMARC Policy</strong> - Domain authentication and reporting</li>
        </ul>
        <p>You can now send:</p>
        <ul>
          <li>Project invitation emails</li>
          <li>Welcome emails</li>
          <li>Report sharing emails</li>
          <li>All other transactional emails</li>
        </ul>
      </div>
      
      <div class="cta-container">
        <a href="https://mapit.skyveedrones.com/dashboard" class="cta-button">Go to Dashboard</a>
      </div>
      
      <div class="divider"></div>
      
      <div class="footer">
        <p>This was a test email sent at ${new Date().toLocaleString()}.</p>
        <p style="margin-top: 16px;">— The <a href="https://mapit.skyveedrones.com">Mapit</a> Team</p>
        <p style="margin-top: 16px;"><a href="mailto:support@skyveedrones.com">Contact Support</a></p>
      </div>
    </div>
  </div>
</body>
</html>
`;

async function sendTestEmail() {
  // Use mail-tester.com test email address
  const to = process.argv[2] || 'test-ig8gt9b8d@srv1.mail-tester.com';
  
  console.log('Sending test email to:', to);
  console.log('Using API key:', process.env.RESEND_API_KEY ? 'Set (hidden)' : 'NOT SET');
  console.log('From: Mapit <noreply@skyveedrones.com>');
  console.log('Reply-To: support@skyveedrones.com');
  
  try {
    const { data, error } = await resend.emails.send({
      from: 'Mapit <noreply@skyveedrones.com>',
      to: [to],
      replyTo: 'support@skyveedrones.com',
      subject: 'Mapit Test Email - Email Configuration Verified',
      html,
      headers: {
        'X-Entity-Ref-ID': `test-email-${Date.now()}`,
        'X-Mailer': 'Mapit/1.0',
      },
    });

    if (error) {
      console.error('Failed to send test email:', error);
      process.exit(1);
    }

    console.log('\n✅ Test email sent successfully!');
    console.log('Email ID:', data?.id);
    console.log('\nNext steps:');
    console.log('1. Visit https://www.mail-tester.com/');
    console.log('2. Click "Then check your score" to see the email authentication results');
    console.log('3. Look for SPF, DKIM, and DMARC verification status');
  } catch (err) {
    console.error('Error sending test email:', err);
    process.exit(1);
  }
}

sendTestEmail();
