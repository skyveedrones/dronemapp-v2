/**
 * Email Configuration Module
 * 
 * This module provides permanent, reusable email configuration utilities
 * to ensure consistent enterprise-friendly email delivery across the application.
 * 
 * Key Features:
 * - Enterprise-friendly light theme colors
 * - Standardized email headers for better deliverability
 * - HTML template generation with best practices
 * - Validation and error handling
 * 
 * @module email-config
 */

/**
 * Enterprise-friendly color palette
 * Optimized for corporate email filters and maximum readability
 */
export const EMAIL_BRAND_COLORS = {
  primary: '#10b981', // Emerald green
  background: '#ffffff', // Light background for enterprise compatibility
  cardBg: '#f9fafb', // Light gray card background
  text: '#1f2937', // Dark text for readability
  textMuted: '#6b7280', // Muted gray for secondary text
  border: '#e5e7eb', // Light border color
} as const;

/**
 * Email sender configuration
 * Centralized configuration for all outgoing emails
 */
export const EMAIL_CONFIG = {
  fromName: 'Mapit',
  fromEmail: 'noreply@skyveedrones.com',
  replyTo: 'support@skyveedrones.com',
  supportUrl: 'https://mapit.skyveedrones.com',
  unsubscribeEmail: 'support@skyveedrones.com',
} as const;

/**
 * Standard email headers for enterprise compatibility
 * 
 * These headers improve deliverability by:
 * - Identifying the email source and priority
 * - Providing unsubscribe options (required for bulk emails)
 * - Marking emails as bulk mail (reduces spam filter triggers)
 * - Adding tracking identifiers for monitoring
 */
export function getEmailHeaders(): Record<string, string> {
  return {
    // Identification headers
    'X-Entity-Ref-ID': `mapit-${Date.now()}`,
    'X-Mailer': 'Mapit/1.0',
    
    // Priority headers (normal priority to avoid spam filters)
    'X-Priority': '3',
    'X-MSMail-Priority': 'Normal',
    'Importance': 'normal',
    
    // Unsubscribe headers (required for bulk emails)
    'List-Unsubscribe': `<mailto:${EMAIL_CONFIG.unsubscribeEmail}?subject=unsubscribe>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    
    // Bulk mail classification
    'Precedence': 'bulk',
  };
}

/**
 * Email template configuration
 */
export interface EmailTemplateConfig {
  preheader: string;
  title: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  footer?: string;
}

/**
 * Generate enterprise-friendly email HTML template
 * 
 * Features:
 * - Light theme for better enterprise compatibility
 * - System fonts (no external imports) to avoid blocking
 * - Simplified CSS to avoid spam filter triggers
 * - Proper HTML structure for email clients
 * - Responsive design for mobile devices
 * 
 * @param content - Email content configuration
 * @returns HTML string ready to send via email service
 */
export function generateEmailTemplate(content: EmailTemplateConfig): string {
  const { preheader, title, body, ctaText, ctaUrl, footer } = content;

  return `
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
  <title>${escapeHtml(title)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Use system fonts instead of external imports for better enterprise compatibility */
    body {
      margin: 0;
      padding: 0;
      background-color: ${EMAIL_BRAND_COLORS.background};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: ${EMAIL_BRAND_COLORS.text};
      line-height: 1.5;
    }
    
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: ${EMAIL_BRAND_COLORS.background};
    }
    
    .card {
      background-color: ${EMAIL_BRAND_COLORS.cardBg};
      border: 1px solid ${EMAIL_BRAND_COLORS.border};
      border-radius: 6px;
      overflow: hidden;
      margin: 20px;
    }
    
    .header {
      background-color: ${EMAIL_BRAND_COLORS.background};
      padding: 24px 20px;
      border-bottom: 3px solid ${EMAIL_BRAND_COLORS.primary};
      text-align: center;
    }
    
    .header h1 {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 20px;
      font-weight: 700;
      color: ${EMAIL_BRAND_COLORS.primary};
      letter-spacing: 0.5px;
    }
    
    .content {
      padding: 24px 20px;
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
      font-size: 15px;
      line-height: 1.6;
      color: ${EMAIL_BRAND_COLORS.text};
      margin: 0 0 16px 0;
    }
    
    .body-text p {
      margin: 0 0 12px 0;
    }
    
    .body-text strong {
      color: ${EMAIL_BRAND_COLORS.primary};
      font-weight: 600;
    }
    
    .cta-button {
      display: inline-block;
      background-color: ${EMAIL_BRAND_COLORS.primary};
      color: #ffffff !important;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      padding: 12px 28px;
      border-radius: 6px;
      border: 2px solid ${EMAIL_BRAND_COLORS.primary};
      text-align: center;
    }
    
    .cta-container {
      text-align: center;
      margin: 24px 0;
    }
    
    .divider {
      height: 1px;
      background-color: ${EMAIL_BRAND_COLORS.border};
      margin: 24px 0;
    }
    
    .footer {
      font-size: 13px;
      color: ${EMAIL_BRAND_COLORS.textMuted};
      text-align: center;
      margin-top: 20px;
    }
    
    .footer a {
      color: ${EMAIL_BRAND_COLORS.primary};
      text-decoration: none;
    }
    
    .footer a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="preheader">${escapeHtml(preheader)}</div>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1>MAPIT</h1>
      </div>
      <div class="content">
        <div class="body-text">${body}</div>
        ${ctaUrl ? `<div class="cta-container"><a href="${escapeHtml(ctaUrl)}" class="cta-button">${escapeHtml(ctaText || 'View')}</a></div>` : ''}
        <div class="divider"></div>
        <div class="footer">
          ${footer ? footer : 'Thank you for using Mapit'}
          <br><br>
          <a href="${EMAIL_CONFIG.supportUrl}">Visit Mapit</a> | <a href="mailto:${EMAIL_CONFIG.replyTo}">Contact Support</a>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Escape HTML special characters to prevent injection
 * 
 * @param text - Text to escape
 * @returns Escaped HTML-safe text
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Validate email address format
 * 
 * @param email - Email address to validate
 * @returns True if email is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate email configuration
 * Ensures all required environment variables are set
 * 
 * @throws Error if configuration is invalid
 */
export function validateEmailConfig(): void {
  const requiredEnvVars = ['RESEND_API_KEY'];
  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required email configuration: ${missingVars.join(', ')}. ` +
      `Please set these environment variables.`
    );
  }
}

/**
 * Email sending result type
 */
export interface EmailSendResult {
  success: boolean;
  error?: string;
  emailId?: string;
}

/**
 * Log email send attempt
 * 
 * @param emailType - Type of email being sent
 * @param recipient - Email recipient
 * @param success - Whether send was successful
 * @param error - Error message if failed
 */
export function logEmailSend(
  emailType: string,
  recipient: string,
  success: boolean,
  error?: string
): void {
  const timestamp = new Date().toISOString();
  const status = success ? '✓' : '✗';
  const message = success
    ? `[Email] ${status} ${emailType} sent to ${recipient}`
    : `[Email] ${status} Failed to send ${emailType} to ${recipient}: ${error}`;

  if (success) {
    console.log(message);
  } else {
    console.error(message);
  }
}
