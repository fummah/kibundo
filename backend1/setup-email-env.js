// Helper script to add SMTP configuration to .env file
// Run with: node setup-email-env.js

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const envPath = path.join(__dirname, ".env");

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupEmail() {
  console.log("📧 Email SMTP Configuration Setup\n");
  console.log("This script will help you add SMTP configuration to your .env file.\n");

  // Check if .env exists
  if (!fs.existsSync(envPath)) {
    console.log("❌ .env file not found. Creating it...");
    fs.writeFileSync(envPath, "");
  }

  // Read existing .env
  let envContent = fs.readFileSync(envPath, "utf8");

  // Check if SMTP vars already exist
  const hasSmtp = /SMTP_HOST|SMTP_PORT|SMTP_USER|SMTP_PASSWORD/.test(envContent);

  if (hasSmtp) {
    console.log("⚠️  SMTP configuration already exists in .env file.");
    const overwrite = await question("Do you want to update it? (y/n): ");
    if (overwrite.toLowerCase() !== "y") {
      console.log("Cancelled.");
      rl.close();
      return;
    }
    // Remove existing SMTP lines
    envContent = envContent
      .split("\n")
      .filter((line) => !line.trim().startsWith("SMTP_"))
      .join("\n");
  }

  console.log("\nPlease provide the following information:\n");

  // Get SMTP configuration
  const smtpHost = await question("SMTP Host (e.g., smtp.gmail.com): ");
  const smtpPort = await question("SMTP Port (587 for TLS, 465 for SSL) [587]: ") || "587";
  const smtpSecure = await question("Use SSL? (true for port 465, false for port 587) [false]: ") || "false";
  const smtpUser = await question("SMTP Username/Email: ");
  const smtpPassword = await question("SMTP Password/App Password: ");
  const smtpFrom = await question('From Email (e.g., "Kibundo <noreply@kibundo.com>") [optional]: ');

  // Build SMTP config block
  let smtpConfig = "\n# SMTP Email Configuration\n";
  smtpConfig += `SMTP_HOST=${smtpHost}\n`;
  smtpConfig += `SMTP_PORT=${smtpPort}\n`;
  smtpConfig += `SMTP_SECURE=${smtpSecure}\n`;
  smtpConfig += `SMTP_USER=${smtpUser}\n`;
  smtpConfig += `SMTP_PASSWORD=${smtpPassword}\n`;
  if (smtpFrom) {
    smtpConfig += `SMTP_FROM=${smtpFrom}\n`;
  }

  // Append to .env
  envContent = envContent.trim() + "\n" + smtpConfig.trim() + "\n";

  // Write back to .env
  fs.writeFileSync(envPath, envContent);

  console.log("\n✅ SMTP configuration added to .env file!");
  console.log("\n📝 Next steps:");
  console.log("   1. Restart your backend server");
  console.log("   2. Run: node test-email.js to test the configuration");
  console.log("\n💡 For Gmail:");
  console.log("   - Enable 2-Factor Authentication");
  console.log("   - Generate App Password: https://myaccount.google.com/apppasswords");
  console.log("   - Use the 16-character app password as SMTP_PASSWORD\n");

  rl.close();
}

setupEmail().catch((err) => {
  console.error("❌ Error:", err);
  rl.close();
  process.exit(1);
});

