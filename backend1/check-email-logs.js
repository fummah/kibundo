// Check email logs from database
// Run with: node check-email-logs.js

require("dotenv").config();
const db = require("./models");

async function checkEmailLogs() {
  try {
    console.log("📧 Checking email logs...\n");

    // Get recent email logs (last 10)
    const logs = await db.emailLog.findAll({
      order: [["created_at", "DESC"]],
      limit: 10,
      attributes: ["id", "email", "event", "payload", "created_at"],
    });

    if (logs.length === 0) {
      console.log("❌ No email logs found in database.");
      console.log("   This means no emails have been sent yet.\n");
      return;
    }

    console.log(`Found ${logs.length} recent email log entries:\n`);

    logs.forEach((log, index) => {
      console.log(`--- Email Log #${index + 1} ---`);
      console.log(`Email: ${log.email}`);
      console.log(`Status: ${log.event}`);
      console.log(`Sent at: ${log.created_at}`);
      
      if (log.payload) {
        const payload = typeof log.payload === 'string' ? JSON.parse(log.payload) : log.payload;
        if (payload.subject) {
          console.log(`Subject: ${payload.subject}`);
        }
        if (payload.error) {
          console.log(`Error: ${payload.error}`);
        }
      }
      console.log("");
    });

    // Count by status
    const sentCount = logs.filter((log) => log.event === "sent").length;
    const failedCount = logs.filter((log) => log.event === "failed").length;

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Sent: ${sentCount}`);
    console.log(`   ❌ Failed: ${failedCount}`);

    // Check for specific email
    const args = process.argv.slice(2);
    if (args.length > 0) {
      const emailToCheck = args[0];
      console.log(`\n🔍 Checking logs for: ${emailToCheck}`);
      const userLogs = logs.filter((log) => log.email.toLowerCase() === emailToCheck.toLowerCase());
      if (userLogs.length > 0) {
        console.log(`   Found ${userLogs.length} log(s) for this email:`);
        userLogs.forEach((log) => {
          console.log(`   - ${log.event} at ${log.created_at}`);
        });
      } else {
        console.log(`   ❌ No logs found for ${emailToCheck}`);
      }
    }
  } catch (error) {
    console.error("❌ Error checking email logs:", error);
  } finally {
    await db.sequelize.close();
  }
}

checkEmailLogs();

