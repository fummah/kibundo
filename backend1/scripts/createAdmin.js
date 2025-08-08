const bcrypt = require("bcryptjs");
const db = require("../models"); // adjust this if your path is different
const User = db.user;

(async () => {
  try {
    const existingAdmin = await User.findOne({ where: { email: "admin@kibundo.com" } });
    if (existingAdmin) {
      console.log("❌ Admin already exists.");
      return;
    }

    const hashedPassword = await bcrypt.hash("Rachfort24", 10);
    const admin = await User.create({
      role_id: 0,
      email: "admin@kibundo.com",
      password: hashedPassword,
      first_name: "Super",
      last_name: "Admin"
    });

    console.log("✅ Admin created successfully:", admin.email);
  } catch (err) {
    console.error("❌ Error creating admin:", err);
  }
})();
