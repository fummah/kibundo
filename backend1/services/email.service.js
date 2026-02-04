let nodemailer = null;
try {
  nodemailer = require("nodemailer");
} catch (error) {
  console.warn("⚠️  nodemailer not installed. Email functionality will be disabled.");
  console.warn("   Run: npm install nodemailer");
}

const db = require("../models");

function getFrontendBase() {
  const raw = String(process.env.FRONTEND_URL || "http://localhost:5173").trim();
  return raw.replace(/\/+$/, "");
}

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
    const missing = [];
    if (!process.env.SMTP_HOST) missing.push("SMTP_HOST");
    if (!process.env.SMTP_PORT) missing.push("SMTP_PORT");
    if (!process.env.SMTP_USER) missing.push("SMTP_USER");
    if (!process.env.SMTP_PASSWORD) missing.push("SMTP_PASSWORD");
    console.warn("⚠️  SMTP credentials not configured. Email sending will be disabled.");
    if (missing.length) {
      console.warn("   Missing env vars:", missing.join(", "));
    }
    console.warn("   Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD (and optionally SMTP_FROM). ");
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
    console.warn(
      "   Current SMTP config:",
      JSON.stringify(
        {
          SMTP_HOST: process.env.SMTP_HOST || null,
          SMTP_PORT: process.env.SMTP_PORT || null,
          SMTP_SECURE: process.env.SMTP_SECURE || null,
          SMTP_USER: process.env.SMTP_USER ? "[set]" : null,
          SMTP_PASSWORD: process.env.SMTP_PASSWORD ? "[set]" : null,
          SMTP_FROM: process.env.SMTP_FROM || null,
        },
        null,
        2
      )
    );
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
    login_url: `${getFrontendBase()}/signin`,
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

/**
 * Send beta signup confirmation email
 */
async function sendBetaSignupEmail(user) {
  if (!nodemailer) {
    console.warn("⚠️  Email service not available. Skipping beta signup email.");
    return { success: false, error: "Email service not available" };
  }

  const variables = {
    full_name: `${user.first_name} ${user.last_name}`,
    email: user.email,
    login_url: `${getFrontendBase()}/signin`,
  };

  const subject = "🚀 Deine Beta-Anmeldung bei Kibundo";
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Deine Beta-Anmeldung bei Kibundo</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #FF7F32, #FF8400); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .beta-badge { display: inline-block; background: #FF8400; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 20px 0; }
        .status { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .status h3 { margin: 0 0 10px 0; color: #856404; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚀 Beta-Anmeldung erfolgreich!</h1>
        </div>
        <div class="content">
          <p>Hallo ${variables.full_name},</p>
          <p>vielen Dank für deine Anmeldung zum Kibundo Beta-Programm!</p>
          
          <div class="beta-badge">
            BETA-PROGRAMM TEILNEHMER
          </div>
          
          <div class="status">
            <h3>⏳ Warten auf Freischaltung</h3>
            <p>Deine Anmeldung wurde erfolgreich erhalten. Dein Account wird nun von unserem Team überprüft und freigeschaltet.</p>
            <p>Du erhältst eine weitere E-Mail, sobald dein Zugang aktiviert wurde.</p>
          </div>
          
          <p><strong>Was passiert als Nächstes?</strong></p>
          <ul>
            <li>Wir überprüfen deine Anmeldung (in der Regel innerhalb von 24-48 Stunden)</li>
            <li>Du erhältst eine Bestätigung, wenn dein Account freigeschaltet wurde</li>
            <li>Dann kannst du dich mit deinen Anmeldedaten einloggen</li>
          </ul>
          
          <p>Als Beta-Tester erhältst du exklusiven Zugang zu neuen Funktionen und kannst bei der Weiterentwicklung von Kibundo mitwirken.</p>
          
          <p>Bei Fragen stehen wir dir gerne zur Verfügung.</p>
          <p>Viel Spaß beim Entdecken!<br>Dein Kibundo Team</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Hallo ${variables.full_name},

Vielen Dank für deine Anmeldung zum Kibundo Beta-Programm!

🚀 BETA-PROGRAMM TEILNEHMER

⏳ Warten auf Freischaltung
Deine Anmeldung wurde erfolgreich erhalten. Dein Account wird nun von unserem Team überprüft und freigeschaltet.

Du erhältst eine weitere E-Mail, sobald dein Zugang aktiviert wurde.

Was passiert als Nächstes?
- Wir überprüfen deine Anmeldung (in der Regel innerhalb von 24-48 Stunden)
- Du erhältst eine Bestätigung, wenn dein Account freigeschaltet wurde
- Dann kannst du dich mit deinen Anmeldedaten einloggen

Als Beta-Tester erhältst du exklusiven Zugang zu neuen Funktionen und kannst bei der Weiterentwicklung von Kibundo mitwirken.

Bei Fragen stehen wir dir gerne zur Verfügung.

Viel Spaß beim Entdecken!
Dein Kibundo Team`;

  const result = await sendEmail({
    to: user.email,
    subject,
    html,
    text,
    parent_id: user.parent_id || null,
  });
  
  if (result.success) {
    console.log("✅ [sendBetaSignupEmail] Beta signup email sent successfully");
  } else {
    console.error("❌ [sendBetaSignupEmail] Failed to send beta signup email:", result.error);
  }
  
  return result;
}

/**
 * Send beta approval email
 */
async function sendBetaApprovalEmail(user) {
  if (!nodemailer) {
    console.warn("⚠️  Email service not available. Skipping beta approval email.");
    return { success: false, error: "Email service not available" };
  }

  const variables = {
    full_name: `${user.first_name} ${user.last_name}`,
    email: user.email,
    login_url: `${getFrontendBase()}/signin`,
  };

  const subject = "🎉 Dein Beta-Zugang wurde freigeschaltet!";
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Dein Beta-Zugang wurde freigeschaltet!</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #52c41a, #73d13d); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .success-badge { display: inline-block; background: #52c41a; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 20px 0; }
        .button { display: inline-block; padding: 12px 30px; background: #52c41a; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .feature-list { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .feature-list h3 { margin: 0 0 15px 0; color: #52c41a; }
        .feature-list ul { margin: 0; padding-left: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Beta-Zugang freigeschaltet!</h1>
        </div>
        <div class="content">
          <p>Hallo ${variables.full_name},</p>
          <p>großartige Nachrichten! Dein Beta-Zugang für Kibundo wurde erfolgreich freigeschaltet.</p>
          
          <div class="success-badge">
            ✅ ZUGANG AKTIVIERT
          </div>
          
          <p>Du kannst dich jetzt einloggen und sofort mit der Nutzung von Kibundo beginnen.</p>
          
          <p style="margin-top: 20px;">
            <a href="${variables.login_url}" class="button" style="color: white; text-decoration: none;">Jetzt einloggen</a>
          </p>
          
          <div class="feature-list">
            <h3>🚀 Was erwartet dich als Beta-Tester:</h3>
            <ul>
              <li>Exklusiver Zugang zu neuen Funktionen</li>
              <li>Möglichkeit, die Plattform mitzugestalten</li>
              <li>Prioritierter Support</li>
              <li>Einblicke in zukünftige Entwicklungen</li>
            </ul>
          </div>
          
          <p><strong>Deine Anmeldedaten:</strong></p>
          <p>E-Mail: ${variables.email}<br>
          Passwort: Das bei der Anmeldung gewählte Passwort</p>
          
          <p>Als Beta-Tester schätzen wir dein Feedback sehr! Bei Fragen oder Anregungen kannst du dich jederzeit an uns wenden.</p>
          
          <p>Wir freuen uns auf dich!<br>Dein Kibundo Team</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Hallo ${variables.full_name},

Großartige Nachrichten! Dein Beta-Zugang für Kibundo wurde erfolgreich freigeschaltet.

✅ ZUGANG AKTIVIERT

Du kannst dich jetzt einloggen und sofort mit der Nutzung von Kibundo beginnen.

Login hier: ${variables.login_url}

🚀 Was erwartet dich als Beta-Tester:
- Exklusiver Zugang zu neuen Funktionen
- Möglichkeit, die Plattform mitzugestalten
- Prioritierter Support
- Einblicke in zukünftige Entwicklungen

Deine Anmeldedaten:
E-Mail: ${variables.email}
Passwort: Das bei der Anmeldung gewählte Passwort

Als Beta-Tester schätzen wir dein Feedback sehr! Bei Fragen oder Anregungen kannst du dich jederzeit an uns wenden.

Wir freuen uns auf dich!
Dein Kibundo Team`;

  const result = await sendEmail({
    to: user.email,
    subject,
    html,
    text,
    parent_id: user.parent_id || null,
  });
  
  if (result.success) {
    console.log("✅ [sendBetaApprovalEmail] Beta approval email sent successfully");
  } else {
    console.error("❌ [sendBetaApprovalEmail] Failed to send beta approval email:", result.error);
  }
  
  return result;
}

/**
 * Send beta rejection email
 */
async function sendBetaRejectionEmail(user) {
  if (!nodemailer) {
    console.warn("⚠️  Email service not available. Skipping beta rejection email.");
    return { success: false, error: "Email service not available" };
  }

  const variables = {
    full_name: `${user.first_name} ${user.last_name}`,
    email: user.email,
    rejection_reason: user.rejection_reason || 'Keine Angabe',
  };

  const subject = "Information zu deiner Beta-Anmeldung";
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Information zu deiner Beta-Anmeldung</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #ff6b6b, #ee5a24); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .info-box h3 { margin: 0 0 10px 0; color: #856404; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Information zu deiner Beta-Anmeldung</h1>
        </div>
        <div class="content">
          <p>Hallo ${variables.full_name},</p>
          <p>vielen Dank für dein Interesse am Kibundo Beta-Programm.</p>
          
          <div class="info-box">
            <h3>ℹ️ Aktuell keine Plätze verfügbar</h3>
            <p>Leider können wir deine Beta-Anmeldung derzeit nicht annehmen. Das Beta-Programm ist momentan ausgebucht.</p>
            ${variables.rejection_reason !== 'Keine Angabe' ? `<p><strong>Grund:</strong> ${variables.rejection_reason}</p>` : ''}
          </div>
          
          <p><strong>Was bedeutet das für dich?</strong></p>
          <ul>
            <li>Behalten wir deine Daten für zukünftige Beta-Phasen</li>
            <li>Wir informieren dich, sobald wieder Plätze verfügbar sind</li>
            <li>Du kannst dich jederzeit erneut bewerben</li>
          </ul>
          
          <p>Wir bedauern die Unannehmlichkeiten und hoffen auf dein Verständnis.</p>
          
          <p>Bei Fragen stehen wir dir gerne zur Verfügung.</p>
          
          <p>Beste Grüße<br>Dein Kibundo Team</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Hallo ${variables.full_name},

Vielen Dank für dein Interesse am Kibundo Beta-Programm.

ℹ️ Aktuell keine Plätze verfügbar
Leider können wir deine Beta-Anmeldung derzeit nicht annehmen. Das Beta-Programm ist momentan ausgebucht.
${variables.rejection_reason !== 'Keine Angabe' ? `Grund: ${variables.rejection_reason}` : ''}

Was bedeutet das für dich?
- Behalten wir deine Daten für zukünftige Beta-Phasen
- Wir informieren dich, sobald wieder Plätze verfügbar sind
- Du kannst dich jederzeit erneut bewerben

Wir bedauern die Unannehmlichkeiten und hoffen auf dein Verständnis.

Bei Fragen stehen wir dir gerne zur Verfügung.

Beste Grüße
Dein Kibundo Team`;

  const result = await sendEmail({
    to: user.email,
    subject,
    html,
    text,
    parent_id: user.parent_id || null,
  });
  
  if (result.success) {
    console.log("✅ [sendBetaRejectionEmail] Beta rejection email sent successfully");
  } else {
    console.error("❌ [sendBetaRejectionEmail] Failed to send beta rejection email:", result.error);
  }
  
  return result;
}

module.exports = {
  getTransporter,
  sendEmail,
  sendTemplatedEmail,
  sendWelcomeEmail,
  sendBetaSignupEmail,
  sendBetaApprovalEmail,
  sendBetaRejectionEmail,
  replaceTemplateVariables,
};

