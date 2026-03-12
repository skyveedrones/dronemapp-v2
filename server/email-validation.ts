/**
 * Email Validation and Testing Module
 * 
 * Provides automated validation and testing utilities to ensure
 * email deliverability and prevent common issues.
 * 
 * @module email-validation
 */

import { EMAIL_CONFIG, isValidEmail, validateEmailConfig } from './email-config';

/**
 * Email validation result
 */
export interface EmailValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Email send parameters validation
 */
export interface EmailSendParams {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

/**
 * Validate email recipient address
 * 
 * Checks:
 * - Valid email format
 * - Not empty
 * - Not a test/temporary address (unless in test mode)
 * 
 * @param email - Email address to validate
 * @param allowTestEmails - Allow test email addresses (default: false)
 * @returns Validation result
 */
export function validateEmailRecipient(
  email: string,
  allowTestEmails: boolean = false
): EmailValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if email is provided
  if (!email || email.trim().length === 0) {
    errors.push('Email address is required');
    return { valid: false, errors, warnings };
  }

  // Check email format
  if (!isValidEmail(email)) {
    errors.push(`Invalid email format: ${email}`);
    return { valid: false, errors, warnings };
  }

  // Check for test/temporary email addresses
  if (!allowTestEmails) {
    const testEmailPatterns = [
      /mail-tester\.com/,
      /tempmail\./,
      /throwaway\./,
      /guerrillamail\./,
      /mailinator\./,
      /test@/,
    ];

    if (testEmailPatterns.some((pattern) => pattern.test(email))) {
      warnings.push(`Test email address detected: ${email}`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate email send parameters
 * 
 * Checks:
 * - Recipient email is valid
 * - Subject is not empty
 * - HTML content is not empty
 * - HTML is properly formatted
 * 
 * @param params - Email send parameters
 * @returns Validation result
 */
export function validateEmailSendParams(params: EmailSendParams): EmailValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate recipient
  const recipientValidation = validateEmailRecipient(params.to);
  if (!recipientValidation.valid) {
    errors.push(...recipientValidation.errors);
  }
  warnings.push(...recipientValidation.warnings);

  // Validate subject
  if (!params.subject || params.subject.trim().length === 0) {
    errors.push('Email subject is required');
  }

  if (params.subject && params.subject.length > 255) {
    warnings.push(`Subject line is very long (${params.subject.length} chars), may be truncated`);
  }

  // Validate HTML content
  if (!params.html || params.html.trim().length === 0) {
    errors.push('Email HTML content is required');
  }

  // Check for suspicious keywords that trigger spam filters
  const suspiciousKeywords = [
    'verify your account',
    'confirm your email',
    'urgent action required',
    'click here immediately',
    'limited time offer',
    'act now',
    'claim your reward',
  ];

  const htmlLower = params.html.toLowerCase();
  const foundKeywords = suspiciousKeywords.filter((keyword) => htmlLower.includes(keyword));

  if (foundKeywords.length > 0) {
    warnings.push(
      `Found ${foundKeywords.length} suspicious keyword(s) that may trigger spam filters: ${foundKeywords.join(', ')}`
    );
  }

  // Check HTML structure
  if (!params.html.includes('<!DOCTYPE html')) {
    warnings.push('Email HTML should start with DOCTYPE declaration');
  }

  if (!params.html.includes('</html>')) {
    warnings.push('Email HTML should end with closing html tag');
  }

  // Check for external font imports
  if (params.html.includes('@import url') || params.html.includes('fonts.googleapis.com')) {
    warnings.push(
      'Email contains external font imports which may be blocked by enterprise email filters'
    );
  }

  // Check for dark theme (may trigger spam filters)
  if (
    params.html.includes('background-color: #0') ||
    params.html.includes('background-color: #1') ||
    params.html.includes('background: #0') ||
    params.html.includes('background: #1')
  ) {
    warnings.push('Email uses dark theme which may be flagged by enterprise email filters');
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate email configuration
 * 
 * Checks:
 * - Required environment variables are set
 * - Configuration values are valid
 * 
 * @returns Validation result
 */
export function validateEmailConfigurationSetup(): EmailValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    validateEmailConfig();
  } catch (err) {
    errors.push(err instanceof Error ? err.message : 'Email configuration validation failed');
  }

  // Check sender email format
  if (!isValidEmail(EMAIL_CONFIG.fromEmail)) {
    errors.push(`Invalid sender email format: ${EMAIL_CONFIG.fromEmail}`);
  }

  // Check reply-to email format
  if (!isValidEmail(EMAIL_CONFIG.replyTo)) {
    errors.push(`Invalid reply-to email format: ${EMAIL_CONFIG.replyTo}`);
  }

  // Check domain verification
  if (!EMAIL_CONFIG.fromEmail.includes('@skyveedrones.com')) {
    warnings.push('Sender email domain is not skyveedrones.com, ensure domain is verified with Resend');
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Generate email validation report
 * 
 * @param params - Email send parameters
 * @returns Detailed validation report
 */
export function generateEmailValidationReport(params: EmailSendParams): {
  configValid: boolean;
  paramsValid: boolean;
  recipientValid: boolean;
  report: string;
} {
  const configValidation = validateEmailConfigurationSetup();
  const paramsValidation = validateEmailSendParams(params);
  const recipientValidation = validateEmailRecipient(params.to);

  const report = [
    '=== Email Validation Report ===',
    '',
    'Configuration:',
    configValidation.valid ? '✓ Configuration is valid' : '✗ Configuration has errors',
    ...configValidation.errors.map((e) => `  ✗ ${e}`),
    ...configValidation.warnings.map((w) => `  ⚠ ${w}`),
    '',
    'Recipient:',
    recipientValidation.valid ? '✓ Recipient is valid' : '✗ Recipient has errors',
    ...recipientValidation.errors.map((e) => `  ✗ ${e}`),
    ...recipientValidation.warnings.map((w) => `  ⚠ ${w}`),
    '',
    'Parameters:',
    paramsValidation.valid ? '✓ Parameters are valid' : '✗ Parameters have errors',
    ...paramsValidation.errors.map((e) => `  ✗ ${e}`),
    ...paramsValidation.warnings.map((w) => `  ⚠ ${w}`),
  ].join('\n');

  return {
    configValid: configValidation.valid,
    paramsValid: paramsValidation.valid,
    recipientValid: recipientValidation.valid,
    report,
  };
}

/**
 * Check if email sending should proceed
 * 
 * Returns true if configuration and parameters are valid.
 * Logs warnings but doesn't block sending.
 * 
 * @param params - Email send parameters
 * @returns True if safe to send
 */
export function shouldProceedWithEmailSend(params: EmailSendParams): boolean {
  const configValidation = validateEmailConfigurationSetup();
  const paramsValidation = validateEmailSendParams(params);

  if (!configValidation.valid) {
    console.error('[Email Validation] Configuration errors:', configValidation.errors);
    return false;
  }

  if (!paramsValidation.valid) {
    console.error('[Email Validation] Parameter errors:', paramsValidation.errors);
    return false;
  }

  if (configValidation.warnings.length > 0) {
    console.warn('[Email Validation] Configuration warnings:', configValidation.warnings);
  }

  if (paramsValidation.warnings.length > 0) {
    console.warn('[Email Validation] Parameter warnings:', paramsValidation.warnings);
  }

  return true;
}
