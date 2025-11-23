let nodemailer = null;
try {
  nodemailer = require("nodemailer");
} catch (error) {
  console.warn("⚠️  nodemailer not installed. Email functionality will be disabled.");
  console.warn("   Run: npm install nodemailer");
}

const db = require("../models");

/**
 * Email Service
 * Handles sending emails using nodemailer with SMTP configuration
 */

// Create reusable transporter (singleton pattern)
let transporter = null;

/**
 * Initialize email transporter with SMTP settings from environment variables
 */
function getTransporter() {
  if (!nodemailer) {
    console.warn("⚠️  nodemailer not installed. Email sending disabled.");
    return null;
  }

  if (transporter) {
    return transporter;
  }

  // SMTP configuration from environment variables
  const smtpConfig = {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true" || false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  };

  // If no SMTP credentials are configured, create a test account (for development)
  if (!smtpConfig.auth.user || !smtpConfig.auth.pass) {
    console.warn("⚠️  SMTP credentials not configured. Email sending will be disabled.");
    console.warn("   Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASSWORD environment variables.");
    return null;
  }

  try {
    transporter = nodemailer.createTransport(smtpConfig);
    console.log("✅ Email transporter initialized");
    return transporter;
  } catch (error) {
    console.error("❌ Failed to initialize email transporter:", error);
    return null;
  }
}

/**
 * Replace template variables in email content
 * @param {string} template - Email template with {{variable}} placeholders
 * @param {object} variables - Object with variable values
 * @returns {string} - Processed template
 */
function replaceTemplateVariables(template, variables) {
  let processed = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    processed = processed.replace(regex, value || "");
  }
  return processed;
}

/**
 * Get email template from database
 * @param {string} templateName - Name of the template
 * @returns {object|null} - Template object or null if not found
 */
async function getEmailTemplate(templateName) {
  try {
    const template = await db.emailTemplate.findOne({
      where: { name: templateName },
    });
    return template;
  } catch (error) {
    console.error(`❌ Error fetching email template "${templateName}":`, error);
    return null;
  }
}

/**
 * Log email to database
 * @param {object} emailData - Email data to log
 */
async function logEmail(emailData) {
  try {
    await db.emailLog.create({
      email: emailData.to,
      event: emailData.status || "sent",
      parent_id: emailData.parent_id || null,
      campaign_id: emailData.campaign_id || null,
      payload: {
        subject: emailData.subject,
        body_html: emailData.html,
        body_text: emailData.text,
        error: emailData.error || null,
        sent_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Error logging email:", error);
    // Don't throw - email logging failure shouldn't break the flow
  }
}

/**
 * Send email using template from database
 * @param {string} templateName - Name of the email template
 * @param {string} to - Recipient email address
 * @param {object} variables - Variables to replace in template
 * @param {number|null} parentId - Parent ID for logging
 * @returns {Promise<object>} - Result object with success status
 */
async function sendTemplatedEmail(templateName, to, variables = {}, parentId = null) {
  const emailTransporter = getTransporter();
  if (!emailTransporter) {
    console.warn(`⚠️  Email not sent to ${to}: SMTP not configured`);
    return { success: false, error: "SMTP not configured" };
  }

  try {
    // Get template from database
    const template = await getEmailTemplate(templateName);
    if (!template) {
      console.error(`❌ Email template "${templateName}" not found`);
      return { success: false, error: `Template "${templateName}" not found` };
    }

    // Replace variables in subject and body
    const subject = replaceTemplateVariables(template.subject, variables);
    const html = replaceTemplateVariables(template.body_html || "", variables);
    const text = replaceTemplateVariables(template.body_text || "", variables);

    // Email options
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: to,
      subject: subject,
      html: html,
      text: text,
    };

    // Send email
    const info = await emailTransporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}:`, info.messageId);

    // Log email
    await logEmail({
      to,
      subject,
      html,
      text,
      status: "sent",
      parent_id: parentId || null,
      campaign_id: null,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Error sending email to ${to}:`, error);

    // Log failed email
    await logEmail({
      to,
      subject: templateName,
      html: "",
      text: "",
      status: "failed",
      error: error.message,
      parent_id: parentId || null,
      campaign_id: null,
    });

    return { success: false, error: error.message };
  }
}

/**
 * Send a simple email without template
 * @param {object} options - Email options {to, subject, html, text}
 * @returns {Promise<object>} - Result object with success status
 */
async function sendEmail(options) {
  const emailTransporter = getTransporter();
  if (!emailTransporter) {
    console.warn(`⚠️  Email not sent to ${options.to}: SMTP not configured`);
    return { success: false, error: "SMTP not configured" };
  }

  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: options.to,
      subject: options.subject,
      html: options.html || "",
      text: options.text || options.html || "",
    };

    const info = await emailTransporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${options.to}:`, info.messageId);

    // Log email
    await logEmail({
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      status: "sent",
      parent_id: options.parent_id || null,
      campaign_id: options.campaign_id || null,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Error sending email to ${options.to}:`, error);

    // Log failed email
    await logEmail({
      to: options.to,
      subject: options.subject || "",
      html: options.html || "",
      text: options.text || "",
      status: "failed",
      error: error.message,
      parent_id: options.parent_id || null,
      campaign_id: options.campaign_id || null,
    });

    return { success: false, error: error.message };
  }
}

/**
 * Send welcome/confirmation email after registration
 * @param {object} user - User object with email, first_name, last_name, password (plain text), parent_id
 * @returns {Promise<object>} - Result object
 */
async function sendWelcomeEmail(user) {
  console.log("📧 [sendWelcomeEmail] Starting email send for:", user.email);
  
  if (!user.email) {
    console.error("❌ [sendWelcomeEmail] No email address provided");
    return { success: false, error: "No email address provided" };
  }

  const variables = {
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    email: user.email || "",
    password: user.password || "",
    login_url: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/signin` : "http://localhost:5173/signin",
    full_name: `${user.first_name || ""} ${user.last_name || ""}`.trim() || "User",
  };

  console.log("📧 [sendWelcomeEmail] Variables:", { email: variables.email, full_name: variables.full_name, has_password: !!variables.password, parent_id: user.parent_id });

  // Try to use template from database first
  const templateResult = await sendTemplatedEmail("welcome_email", user.email, variables, user.parent_id);
  
  if (templateResult.success) {
    console.log("✅ [sendWelcomeEmail] Email sent using template");
    return templateResult;
  }

  console.log("📧 [sendWelcomeEmail] Template not found, using default email");

  // Fallback to default welcome email if template doesn't exist
  const defaultSubject = "Willkommen bei Kibundo!";
  
  // Build login credentials section if password is provided
  const loginCredentialsSection = variables.password ? `
    <div style="background: #fff; border: 2px solid #FF7F32; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #FF7F32;">Deine Anmeldedaten:</h3>
      <p style="margin: 10px 0;"><strong>E-Mail:</strong> ${variables.email}</p>
      <p style="margin: 10px 0;"><strong>Passwort:</strong> <code style="background: #f5f5f5; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${variables.password}</code></p>
      <p style="margin-top: 15px; font-size: 12px; color: #666;">⚠️ Bitte bewahre diese Daten sicher auf. Du kannst dein Passwort später in den Einstellungen ändern.</p>
    </div>
  ` : "";
  
  const defaultHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #FF7F32 0%, #FF9A36 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #FF7F32; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        code { background: #f5f5f5; padding: 4px 8px; border-radius: 4px; font-family: monospace; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Willkommen bei Kibundo!</h1>
        </div>
        <div class="content">
          <p>Hallo ${variables.full_name},</p>
          <p>vielen Dank für deine Registrierung bei Kibundo!</p>
          <p>Dein Account wurde erfolgreich erstellt. Du kannst dich jetzt anmelden und mit der Nutzung unserer Plattform beginnen.</p>
          ${loginCredentialsSection}
          <p style="margin-top: 20px;">
            <a href="${variables.login_url}" class="button" style="color: white; text-decoration: none;">Jetzt anmelden</a>
          </p>
          <p>Bei Fragen stehen wir dir gerne zur Verfügung.</p>
          <p>Viel Erfolg!<br>Dein Kibundo Team</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Build plain text version with login credentials
  let textContent = `Hallo ${variables.full_name},\n\nVielen Dank für deine Registrierung bei Kibundo!\n\nDein Account wurde erfolgreich erstellt.\n\n`;
  
  if (variables.password) {
    textContent += `Deine Anmeldedaten:\nE-Mail: ${variables.email}\nPasswort: ${variables.password}\n\n⚠️ Bitte bewahre diese Daten sicher auf. Du kannst dein Passwort später in den Einstellungen ändern.\n\n`;
  }
  
  textContent += `Du kannst dich jetzt hier anmelden: ${variables.login_url}\n\nBei Fragen stehen wir dir gerne zur Verfügung.\n\nViel Erfolg!\n\nDein Kibundo Team`;

  const result = await sendEmail({
    to: user.email,
    subject: defaultSubject,
    html: defaultHtml,
    text: textContent,
    parent_id: user.parent_id || null,
  });
  
  if (result.success) {
    console.log("✅ [sendWelcomeEmail] Default email sent successfully");
  } else {
    console.error("❌ [sendWelcomeEmail] Failed to send default email:", result.error);
  }
  
  return result;
}

module.exports = {
  getTransporter,
  sendEmail,
  sendTemplatedEmail,
  sendWelcomeEmail,
  replaceTemplateVariables,
};

