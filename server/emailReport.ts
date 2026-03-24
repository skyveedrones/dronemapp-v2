/**
 * Email Report Service
 * Send PDF reports via email
 */

import { Resend } from 'resend';
import { generatePdfFromHtml } from './pdfGenerator';
import { storagePut } from './storage';
import { nanoid } from 'nanoid';

let resend: Resend | null = null;

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[Email Report] RESEND_API_KEY not configured, skipping email send');
    return null;
  }

  if (!resend) {
    resend = new Resend(apiKey);
  }
  return resend;
}

export interface EmailReportParams {
  to: string;
  projectName: string;
  html: string;
  pdfBase64?: string; // Client-generated PDF (optional)
  senderName?: string;
  userId?: number;
}

/**
 * Send a PDF report via email
 * If pdfBase64 is provided, uses client-generated PDF (no Chromium needed)
 * Otherwise falls back to server-side PDF generation
 * For large PDFs, uploads to S3 and sends download link instead of attachment
 */
export async function sendReportEmail(params: EmailReportParams): Promise<{ success: boolean; error?: string }> {
  const { to, projectName, html, pdfBase64, senderName = 'Mapit', userId = 1 } = params;
  
  try {
    let pdfBuffer: Buffer;
    
    // Use client-generated PDF if available, otherwise generate on server
    if (pdfBase64) {
      console.log(`[Email Report] Using client-generated PDF for project: ${projectName}`);
      pdfBuffer = Buffer.from(pdfBase64, 'base64');
    } else {
      console.log(`[Email Report] Generating PDF on server for project: ${projectName}`);
      pdfBuffer = await generatePdfFromHtml(html);
    }
    
    const pdfSizeKB = pdfBuffer.length / 1024;
    const pdfSizeMB = pdfSizeKB / 1024;
    
    console.log(`[Email Report] PDF ready (${pdfSizeKB.toFixed(2)} KB), preparing email to ${to}`);
    
    // Resend has a 40MB attachment limit, but we'll use 5MB as a safe threshold
    // For larger files, upload to S3 and send a download link
    const useAttachment = pdfSizeMB < 5;
    
    let emailHtml: string;
    let attachments: any[] = [];
    
    if (useAttachment) {
      console.log(`[Email Report] PDF is small enough (${pdfSizeMB.toFixed(2)} MB), sending as attachment`);
      
      // Send as attachment for small PDFs
      attachments = [
        {
          filename: `${projectName.replace(/[^a-z0-9]/gi, '_')}_Report.pdf`,
          content: pdfBuffer,
        },
      ];
      
      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="color-scheme" content="light">
          <meta name="supported-color-schemes" content="light">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333 !important;
              background: white !important;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            @media (prefers-color-scheme: dark) {
              body {
                background: white !important;
                color: #333 !important;
              }
              .header {
                background: white !important;
                color: #333 !important;
              }
              .content {
                background: white !important;
                color: #333 !important;
              }
              p, div, span {
                color: #333 !important;
              }
            }
            .header {
              background: white !important;
              padding: 10px 20px;
              border-radius: 8px 8px 0 0;
              text-align: center;
              border-bottom: 3px solid #10b981 !important;
              width: 100%;
              box-sizing: border-box;
            }
            .logo-container {
              text-align: center;
              margin: 0 auto 5px auto;
              width: 100%;
            }
            .logo img {
              height: 30px;
              width: auto;
              max-width: 100%;
              display: inline-block;
            }
            .content {
              background: white !important;
              padding: 30px;
              border-radius: 0 0 8px 8px;
            }
            .project-name {
              font-size: 20px;
              font-weight: 600;
              color: #10b981;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              color: #6b7280;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-container">
              <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663204719166/EbPjFbhZumznZdvu.png" alt="MAPIT Logo" style="display: block; margin: 0 auto; height: 60px; width: auto;" />
            </div>
            <p style="margin: 0; color: #10b981; font-weight: 600; font-size: 16px;">Drone Mapping Report</p>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>Your drone mapping report is ready!</p>
            <div class="project-name">📍 ${projectName}</div>
            <p>The PDF report is attached to this email. It includes:</p>
            <ul>
              <li>Project overview and location map</li>
              <li>High-resolution aerial photos</li>
              <li>GPS coordinates and flight path data</li>
            </ul>
            <p>If you have any questions about this report, please don't hesitate to reach out.</p>
            <div class="footer">
              <p>Sent by ${senderName} via <strong>Mapit</strong></p>
              <p>Delivering precision drone mapping solutions</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      console.log(`[Email Report] PDF is large (${pdfSizeMB.toFixed(2)} MB), uploading to S3 and sending download link`);
      
      // Upload to S3 for large PDFs
      const fileKey = `${userId}/reports/${nanoid()}_${projectName.replace(/[^a-z0-9]/gi, '_')}.pdf`;
      const { url } = await storagePut(fileKey, pdfBuffer, 'application/pdf');
      
      console.log(`[Email Report] PDF uploaded to S3: ${url}`);
      
      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="color-scheme" content="light">
          <meta name="supported-color-schemes" content="light">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333 !important;
              background: white !important;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            @media (prefers-color-scheme: dark) {
              body {
                background: white !important;
                color: #333 !important;
              }
              .header {
                background: white !important;
                color: #333 !important;
              }
              .content {
                background: white !important;
                color: #333 !important;
              }
              p, div, span {
                color: #333 !important;
              }
            }
            .header {
              background: white !important;
              padding: 10px 20px;
              border-radius: 8px 8px 0 0;
              text-align: center;
              border-bottom: 3px solid #10b981 !important;
              width: 100%;
              box-sizing: border-box;
            }
            .logo-container {
              text-align: center;
              margin: 0 auto 5px auto;
              width: 100%;
            }
            .logo img {
              height: 30px;
              width: auto;
              max-width: 100%;
              display: inline-block;
            }
            .content {
              background: white !important;
              padding: 30px;
              border-radius: 0 0 8px 8px;
            }
            .project-name {
              font-size: 20px;
              font-weight: 600;
              color: #10b981;
              margin: 20px 0;
            }
            .download-button {
              display: inline-block;
              background: #10b981;
              color: white;
              padding: 14px 28px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
            }
            .file-info {
              background: white;
              padding: 15px;
              border-radius: 6px;
              border-left: 4px solid #10b981;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              color: #6b7280;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-container">
              <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663204719166/EbPjFbhZumznZdvu.png" alt="MAPIT Logo" style="display: block; margin: 0 auto; height: 60px; width: auto;" />
            </div>
            <p style="margin: 0; color: #10b981; font-weight: 600; font-size: 16px;">Drone Mapping Report</p>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>Your drone mapping report is ready!</p>
            <div class="project-name">📍 ${projectName}</div>
            
            <div class="file-info">
              <strong>📄 Report Details</strong><br>
              File Size: ${pdfSizeMB.toFixed(2)} MB<br>
              Includes: Project overview, aerial photos, GPS data
            </div>
            
            <p>Click the button below to download your report:</p>
            
            <div style="text-align: center;">
              <a href="${url}" class="download-button">📥 Download Report PDF</a>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
              <em>Note: This download link will remain active for 7 days.</em>
            </p>
            
            <p>If you have any questions about this report, please don't hesitate to reach out.</p>
            
            <div class="footer">
              <p>Sent by ${senderName} via <strong>Mapit</strong></p>
              <p>Delivering precision drone mapping solutions</p>
            </div>
          </div>
        </body>
        </html>
      `;
    }
    
    // Send email
    // Using verified domain: skyveedrones.com
    const client = getResend();
    if (!client) {
      return { success: false, error: 'RESEND_API_KEY not configured' };
    }

    const { error } = await client.emails.send({
      from: 'Mapit Reports <noreply@skyveedrones.com>',
      to: [to],
      subject: `Mapit Report - ${projectName}`,
      html: emailHtml,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    if (error) {
      console.error('[Email Report] Failed to send email:', error);
      return { success: false, error: error.message };
    }

    console.log(`[Email Report] Email sent successfully to ${to}`);
    return { success: true };
  } catch (err) {
    console.error('[Email Report] Error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
