# Email Configuration Guide

## Overview
The email service has been integrated into the signup flow. After successful registration, users will receive a welcome/confirmation email.

## Setup Instructions

### 1. Install Dependencies
```bash
cd backend1
npm install
```

This will install `nodemailer` which is required for sending emails.

### 2. Configure SMTP Settings

Add the following environment variables to your `.env` file in the `backend1` directory:

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com          # Your SMTP server hostname
SMTP_PORT=587                     # SMTP port (587 for TLS, 465 for SSL)
SMTP_SECURE=false                 # true for SSL (port 465), false for TLS (port 587)
SMTP_USER=your-email@gmail.com    # Your SMTP username/email
SMTP_PASSWORD=your-app-password   # Your SMTP password or app password
SMTP_FROM=noreply@kibundo.com     # From email address (optional, defaults to SMTP_USER)
```

### 3. Gmail Setup (Example)

If using Gmail:
1. Enable 2-factor authentication on your Google account
2. Generate an "App Password" at: https://myaccount.google.com/apppasswords
3. Use the app password as `SMTP_PASSWORD`

### 4. Other Email Providers

**Outlook/Office 365:**
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password
```

**SendGrid:**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

**Custom SMTP Server:**
```env
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yourdomain.com
SMTP_PASSWORD=your-password
```

### 5. Email Templates (Optional)

The system supports email templates stored in the database. To use custom templates:

1. Insert a template into the `email_templates` table:
```sql
INSERT INTO email_templates (name, subject, body_html, body_text, category)
VALUES (
  'welcome_email',
  'Willkommen bei Kibundo!',
  '<html><body><h1>Hallo {{first_name}}!</h1><p>Willkommen bei Kibundo...</p></body></html>',
  'Hallo {{first_name}}! Willkommen bei Kibundo...',
  'welcome'
);
```

2. Available template variables:
   - `{{first_name}}` - User's first name
   - `{{last_name}}` - User's last name
   - `{{email}}` - User's email
   - `{{full_name}}` - Full name (first + last)

If no template is found, the system will use a default welcome email.

### 6. Email Logging

All emails are automatically logged to the `email_logs` table with:
- Recipient email
- Event status (sent/failed)
- Full payload including subject and body
- Timestamp

### 7. Testing

After configuration, test the email service:

1. Register a new user through the signup form
2. Check the console logs for email sending status
3. Check the `email_logs` table to verify emails were logged
4. Verify the user received the email

### 8. Troubleshooting

**Emails not sending:**
- Verify SMTP credentials are correct
- Check firewall/network settings
- Verify SMTP server allows connections from your server IP
- Check email logs in the database for error messages

**Email in spam folder:**
- Configure SPF, DKIM, and DMARC records for your domain
- Use a dedicated email service (SendGrid, Mailgun, etc.) for better deliverability
- Ensure the "From" address matches your domain

## Notes

- Email sending is **non-blocking** - if email fails, the signup will still succeed
- The service gracefully handles missing SMTP configuration (logs warning, doesn't crash)
- All emails are logged to the database for tracking and debugging

