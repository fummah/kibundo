// Test email configuration
// Run with: node test-email.js

require("dotenv").config();
const emailService = require("./services/email.service");

async function testEmail() {
  console.log("📧 Testing email configuration...\n");

  // Check environment variables
  console.log("Environment variables:");
  console.log("  SMTP_HOST:", process.env.SMTP_HOST || "❌ NOT SET");
  console.log("  SMTP_PORT:", process.env.SMTP_PORT || "❌ NOT SET");
  console.log("  SMTP_USER:", process.env.SMTP_USER || "❌ NOT SET");
  console.log("  SMTP_PASSWORD:", process.env.SMTP_PASSWORD ? "✅ SET (hidden)" : "❌ NOT SET");
  console.log("  SMTP_FROM:", process.env.SMTP_FROM || process.env.SMTP_USER || "❌ NOT SET");
  console.log("");

  // Test sending email
  const testEmail = process.env.TEST_EMAIL || "test@example.com";
  console.log(`Attempting to send test email to: ${testEmail}\n`);

  try {
    const result = await emailService.sendWelcomeEmail({
      email: testEmail,
      first_name: "Test",
      last_name: "User",
    });

    if (result.success) {
      console.log("✅ Email sent successfully!");
      console.log("   Message ID:", result.messageId);
    } else {
      console.log("❌ Email failed to send:");
      console.log("   Error:", result.error);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testEmail();

