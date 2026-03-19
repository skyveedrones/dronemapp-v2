# Mapit Email Whitelist Request for IT Department

Dear IT Department,

To ensure proper delivery of critical business emails from our Mapit drone mapping and project management application, please whitelist the following email addresses and configure your email security policies accordingly.

---

## Email Sending Information

**Application Name:** Mapit (Drone Mapping & Project Management Platform)  
**Email Service Provider:** Resend  
**From Address:** noreply@skyveedrones.com  
**Reply-To Address:** support@skyveedrones.com  
**Domain:** skyveedrones.com

---

## Email Types and Purposes

### 1. **Project Invitation Email**
- **Subject Line:** `[Inviter Name] invited you to "[Project Name]" on Mapit`
- **Purpose:** Sent when a project owner invites a team member or collaborator to join a project
- **Recipient:** Internal team members, external collaborators
- **Frequency:** As needed when invitations are sent
- **Action Required by Recipient:** Click link to accept invitation and join project
- **Example Subject:** "John Smith invited you to "Downtown Development Project" on Mapit"

### 2. **Project Welcome Email**
- **Subject Line:** `Welcome to Mapit - You now have access to "[Project Name]"`
- **Purpose:** Sent after a user accepts a project invitation to confirm access and provide project link
- **Recipient:** Newly invited project members
- **Frequency:** Immediately after invitation acceptance
- **Action Required by Recipient:** Click link to access the project
- **Example Subject:** "Welcome to Mapit - You now have access to "Downtown Development Project""

### 3. **Client Welcome Email**
- **Subject Line:** `Welcome to Mapit - Your project [Project Name] is ready`
- **Purpose:** Sent when a client is set up in the system with their first project
- **Recipient:** Client users (external customers/partners)
- **Frequency:** When client accounts are created
- **Action Required by Recipient:** Click link to log in and view project
- **Example Subject:** "Welcome to Mapit - Your project Downtown Development Project is ready"

### 4. **Project Report Email**
- **Subject Line:** `[Sender Name] shared a report for "[Project Name]"`
- **Purpose:** Sent when a project report (PDF) is generated and shared via email
- **Recipient:** Project stakeholders, clients, team members
- **Frequency:** When reports are generated and shared
- **Action Required by Recipient:** Click link to view/download report
- **Example Subject:** "John Smith shared a report for "Downtown Development Project""

### 5. **Test Email**
- **Subject Line:** `Mapit Test Email - Configuration Verified`
- **Purpose:** Sent to verify email configuration is working correctly (administrative use only)
- **Recipient:** System administrators
- **Frequency:** Only when manually triggered for testing
- **Action Required by Recipient:** None (confirmation that email is working)

---

## Email Authentication Requirements

To ensure proper email delivery, please verify that the following authentication methods are enabled for **skyveedrones.com**:

- **SPF (Sender Policy Framework):** Required
- **DKIM (DomainKeys Identified Mail):** Required
- **DMARC (Domain-based Message Authentication, Reporting, and Conformance):** Recommended

These authentication methods prevent spoofing and improve deliverability.

---

## Whitelist Configuration

Please add the following to your email security policies:

| Item | Value |
|------|-------|
| **From Address** | noreply@skyveedrones.com |
| **Reply-To Address** | support@skyveedrones.com |
| **Domain** | skyveedrones.com |
| **Email Service Provider** | Resend |
| **Email Type Classification** | Transactional (Business Critical) |

---

## Email Content Characteristics

- **HTML Format:** All emails use professional HTML templates with light theme for enterprise compatibility
- **Links:** Emails contain action links (CTAs) to the Mapit platform
- **No Attachments:** Emails do not contain file attachments
- **Brand:** Emails are branded with Mapit logo and professional formatting
- **Footer:** All emails include support contact information (support@skyveedrones.com)

---

## Recommendations for Email Filtering

1. **Do NOT filter as spam:** These are legitimate transactional emails from a business application
2. **Allow HTML content:** Emails use HTML formatting for professional presentation
3. **Allow embedded links:** Users need to click links to accept invitations and access projects
4. **Monitor delivery:** Track delivery of these emails to ensure they reach user inboxes
5. **SPF/DKIM/DMARC:** Ensure authentication is properly configured to prevent emails from being marked as suspicious

---

## Support Contact

If you have any questions about these emails or need additional technical information, please contact:

**Email:** support@skyveedrones.com  
**Application:** Mapit Drone Mapping Platform

---

## Approval

This email whitelist request is for the Mapit application used by [Your Company Name] for drone mapping and project management operations.

**Requested By:** [Your Name]  
**Date:** [Current Date]  
**Application Owner:** [Your Title/Department]

---

*Please confirm receipt of this whitelist request and notify us once the configuration has been completed.*
