# Resend Email Configuration Guide - Preventing Email Blocking

## Problem Analysis

Your emails are being blocked by email server security filters because:

1. **Missing SPF Record** - Email servers can't verify the sender's identity
2. **Missing DKIM Signature** - Emails lack cryptographic authentication
3. **Missing DMARC Policy** - No policy for handling authentication failures
4. **Generic Sender Address** - Using `noreply@notifications.skyveedrones.com` instead of a verified domain
5. **Insufficient Email Headers** - Missing important authentication headers
6. **No Reply-To Header** - Users can't reply to emails properly

## Current Configuration

**Current Setup:**
- Resend API Key: Configured via `RESEND_API_KEY`
- Sender Email: `noreply@notifications.skyveedrones.com`
- Domain: `skyveedrones.com` (not verified with Resend)
- Email Templates: HTML-based with Mapit branding

**Issues:**
- Domain `notifications.skyveedrones.com` is not verified in Resend
- No SPF, DKIM, or DMARC records configured
- Emails are being sent from an unverified subdomain

---

## Solution: Step-by-Step Configuration

### Step 1: Verify Your Domain with Resend

**In Resend Dashboard:**

1. Go to [Resend Dashboard](https://dashboard.resend.com)
2. Click "Domains" in the left sidebar
3. Click "Add Domain"
4. Enter your domain: `skyveedrones.com`
5. Resend will provide DNS records to add

**DNS Records to Add (from Resend):**

```
Type: TXT
Name: (your domain)
Value: v=spf1 include:resend.com ~all

Type: CNAME
Name: default._domainkey
Value: default._domainkey.resend.com

Type: CNAME
Name: _dmarc
Value: _dmarc.resend.com
```

**Add to Your Domain Registrar:**

1. Log in to your domain registrar (GoDaddy, Namecheap, etc.)
2. Find DNS Records or DNS Settings
3. Add each record provided by Resend
4. Wait 24-48 hours for DNS propagation

**Verify in Resend:**

1. Return to Resend Dashboard
2. Click "Verify" next to your domain
3. Once verified, you can send from `any-address@skyveedrones.com`

---

### Step 2: Update Email Sender Configuration

**Current Code (email.ts):**
```typescript
from: 'Mapit <noreply@notifications.skyveedrones.com>'
```

**Updated Code (after domain verification):**
```typescript
from: 'Mapit <noreply@skyveedrones.com>'
// or
from: 'Mapit Team <support@skyveedrones.com>'
// or
from: 'SkyVee Aerial <notifications@skyveedrones.com>'
```

**Recommendation:** Use `support@skyveedrones.com` or `noreply@skyveedrones.com` (verified domain)

---

### Step 3: Add Reply-To Header

**Current Code:**
```typescript
const { error } = await resend.emails.send({
  from: 'Mapit <noreply@notifications.skyveedrones.com>',
  to: [to],
  subject: 'Your Subject',
  html: emailHtml,
});
```

**Updated Code (with Reply-To):**
```typescript
const { error } = await resend.emails.send({
  from: 'Mapit <noreply@skyveedrones.com>',
  to: [to],
  replyTo: 'support@skyveedrones.com', // Add this line
  subject: 'Your Subject',
  html: emailHtml,
});
```

---

### Step 4: Add Authentication Headers

**Update email.ts to include better headers:**

```typescript
function generateEmailTemplate(content: {
  preheader: string;
  title: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  footer?: string;
}): string {
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
  <title>${content.title}</title>
  <!-- ... rest of template ... -->
`;
}
```

---

### Step 5: Implement Email Sending Best Practices

**Update email.ts with improved error handling:**

```typescript
export async function sendProjectInvitationEmail(params: {
  to: string;
  projectName: string;
  inviterName: string;
  inviteLink: string;
}): Promise<boolean> {
  const { to, projectName, inviterName, inviteLink } = params;

  try {
    const emailHtml = generateEmailTemplate({
      preheader: `${inviterName} invited you to ${projectName}`,
      title: `You're invited to ${projectName}`,
      body: `<p>${inviterName} has invited you to collaborate on <strong>${projectName}</strong> using Mapit.</p>`,
      ctaText: 'View Project',
      ctaUrl: inviteLink,
      footer: 'If you did not expect this invitation, you can ignore this email.',
    });

    const { error, data } = await resend.emails.send({
      from: 'Mapit <noreply@skyveedrones.com>', // Use verified domain
      to: [to],
      replyTo: 'support@skyveedrones.com',
      subject: `${inviterName} invited you to "${projectName}" on Mapit`,
      html: emailHtml,
      headers: {
        'X-Entity-Ref-ID': `project-invite-${Date.now()}`,
        'X-Mailer': 'Mapit/1.0',
      },
    });

    if (error) {
      console.error(`[Email Error] Failed to send invitation to ${to}:`, error);
      return false;
    }

    console.log(`[Email Sent] Invitation sent to ${to} (ID: ${data?.id})`);
    return true;
  } catch (error) {
    console.error(`[Email Exception] Unexpected error sending to ${to}:`, error);
    return false;
  }
}
```

---

### Step 6: Configure SPF, DKIM, DMARC Records

**SPF Record (Sender Policy Framework):**
```
v=spf1 include:resend.com ~all
```
This tells email servers that Resend is authorized to send emails on behalf of your domain.

**DKIM Record (DomainKeys Identified Mail):**
```
default._domainkey.resend.com
```
This adds a cryptographic signature to your emails so servers can verify they weren't tampered with.

**DMARC Record (Domain-based Message Authentication, Reporting & Conformance):**
```
v=DMARC1; p=quarantine; rua=mailto:admin@skyveedrones.com
```
This tells email servers what to do if SPF or DKIM fails.

---

## Testing Email Delivery

### Test 1: Send Test Email

**Using Resend Dashboard:**
1. Go to Resend Dashboard
2. Click "Emails" 
3. Click "Send Test Email"
4. Enter test recipient email
5. Check if email arrives in inbox (not spam)

### Test 2: Check Email Headers

**In Gmail:**
1. Open received email
2. Click three dots menu
3. Select "Show original"
4. Look for:
   - `SPF: PASS`
   - `DKIM: PASS`
   - `DMARC: PASS`

**Example of good headers:**
```
SPF: PASS with IP 1.2.3.4
DKIM: PASS with domain resend.com
DMARC: PASS with policy quarantine
```

### Test 3: Check Spam Score

Use [Mail-tester.com](https://www.mail-tester.com):
1. Go to Mail-tester.com
2. Copy the test email address
3. Send a test email from your app to that address
4. Check the spam score (aim for 8+/10)
5. Review recommendations

---

## Common Issues & Solutions

### Issue 1: Emails Still Going to Spam

**Causes:**
- Domain not verified in Resend
- DNS records not propagated (wait 24-48 hours)
- SPF/DKIM/DMARC not configured correctly

**Solutions:**
1. Verify domain is showing "Verified" in Resend Dashboard
2. Check DNS records are correctly added to registrar
3. Use [MXToolbox](https://mxtoolbox.com) to verify SPF/DKIM/DMARC records
4. Wait 48 hours for full DNS propagation

### Issue 2: "Invalid From Address" Error

**Cause:** Using email address that's not verified in Resend

**Solution:**
1. Verify your domain in Resend Dashboard
2. Update `from` address to use verified domain
3. Use format: `Display Name <email@verified-domain.com>`

### Issue 3: High Bounce Rate

**Causes:**
- Invalid recipient email addresses
- Recipient marked as spam
- Email content triggers spam filters

**Solutions:**
1. Verify email addresses before sending
2. Use double opt-in for new subscribers
3. Keep email content professional (avoid spam words)
4. Include unsubscribe link in footer

### Issue 4: Emails Delayed

**Causes:**
- Email server queue backlog
- Rate limiting from recipient server
- Authentication issues

**Solutions:**
1. Implement exponential backoff for retries
2. Use Resend's built-in retry mechanism
3. Monitor email delivery logs in Resend Dashboard

---

## Implementation Checklist

- [ ] **Domain Verification**
  - [ ] Add domain to Resend Dashboard
  - [ ] Add SPF record to DNS
  - [ ] Add DKIM record to DNS
  - [ ] Add DMARC record to DNS
  - [ ] Verify domain in Resend (wait 24-48 hours)

- [ ] **Code Updates**
  - [ ] Update sender email to use verified domain
  - [ ] Add `replyTo` header to all emails
  - [ ] Add `headers` object with tracking info
  - [ ] Improve error handling and logging
  - [ ] Add retry logic for failed sends

- [ ] **Testing**
  - [ ] Send test email via Resend Dashboard
  - [ ] Check email headers in Gmail
  - [ ] Verify SPF/DKIM/DMARC pass
  - [ ] Test with Mail-tester.com (aim for 8+/10)
  - [ ] Test with different email providers (Gmail, Outlook, Yahoo)

- [ ] **Monitoring**
  - [ ] Set up Resend webhook for delivery events
  - [ ] Monitor bounce rates
  - [ ] Monitor spam complaints
  - [ ] Review delivery logs regularly

---

## Resend Dashboard Monitoring

**Key Metrics to Monitor:**

1. **Delivery Rate** - Should be >95%
2. **Bounce Rate** - Should be <5%
3. **Complaint Rate** - Should be <0.1%
4. **Open Rate** - Typical: 20-40%
5. **Click Rate** - Typical: 5-15%

**Access Resend Dashboard:**
1. Go to [Resend Dashboard](https://dashboard.resend.com)
2. Click "Emails" to see delivery history
3. Click on individual emails to see detailed logs
4. Set up webhooks for real-time delivery notifications

---

## Advanced: Implement Resend Webhooks

**Add webhook to track email events:**

```typescript
// server/routers.ts
export const systemRouter = router({
  handleResendWebhook: publicProcedure
    .input(z.object({
      type: z.enum(['email.sent', 'email.delivered', 'email.bounced', 'email.complained']),
      email: z.string().email(),
      timestamp: z.number(),
    }))
    .mutation(async ({ input }) => {
      console.log(`[Resend Webhook] ${input.type} for ${input.email}`);
      
      // Log to database for analytics
      // Update user status if bounced
      // Send alert if complaint received
      
      return { success: true };
    }),
});
```

**Configure Webhook in Resend Dashboard:**
1. Go to Resend Dashboard
2. Click "Settings" → "Webhooks"
3. Add webhook URL: `https://your-domain.com/api/trpc/system.handleResendWebhook`
4. Select events to track (sent, delivered, bounced, complained)

---

## Estimated Timeline

- **Day 1:** Add domain to Resend, add DNS records
- **Day 2:** Wait for DNS propagation, verify domain
- **Day 3:** Update code with verified domain and headers
- **Day 4:** Test email delivery with Mail-tester
- **Day 5:** Monitor delivery rates and adjust as needed

**Total Time:** 5 days to full implementation

---

## Support Resources

- **Resend Documentation:** https://resend.com/docs
- **SPF/DKIM/DMARC Guide:** https://resend.com/docs/dashboard/domains
- **Email Authentication:** https://resend.com/docs/dashboard/authentication
- **Troubleshooting:** https://resend.com/docs/dashboard/troubleshooting
- **Mail-tester:** https://www.mail-tester.com (test spam score)
- **MXToolbox:** https://mxtoolbox.com (verify DNS records)

---

## Summary

To fix email blocking issues:

1. **Verify your domain** with Resend (most important step)
2. **Add DNS records** (SPF, DKIM, DMARC)
3. **Update sender email** to use verified domain
4. **Add Reply-To header** for better user experience
5. **Test with Mail-tester** to verify configuration
6. **Monitor delivery** in Resend Dashboard

Once these steps are complete, your emails should pass authentication checks and avoid spam folders. The key is verifying your domain - without this, emails will always be at risk of being blocked.
