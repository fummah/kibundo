const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const db = require("../models");
const User = db.user;
const Student = db.student;
const Parent = db.parent;
const Teacher = db.teacher;
const emailService = require("../services/email.service");

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ where: { email } });

    // Always return success to avoid account enumeration
    if (!user) {
      return res.status(200).json({ message: "If this email exists, reset instructions have been sent." });
    }

    if (!process.env.JWT_SECRET) {
      console.error("❌ Forgot password error: JWT_SECRET is not configured");
      return res.status(500).json({ message: "Server misconfiguration", error: "JWT_SECRET is not configured" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, type: "password_reset" },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    let frontendBase = process.env.FRONTEND_URL;
    if (!frontendBase) {
      const origin = req.get('origin') || req.get('referer');
      if (origin) {
        try {
          const url = new URL(origin);
          frontendBase = `${url.protocol}//${url.host}`;
        } catch {
          // ignore
        }
      }
    }
    if (!frontendBase) {
      const xfProto = req.get('x-forwarded-proto');
      const xfHost = req.get('x-forwarded-host');
      if (xfProto && xfHost) {
        frontendBase = `${xfProto}://${xfHost}`;
      }
    }
    if (!frontendBase) {
      frontendBase = "http://localhost:5173";
    }
    frontendBase = String(frontendBase).replace(/\/+$/, "");
    const resetUrl = `${frontendBase}/reset-password?token=${encodeURIComponent(token)}`;

    await emailService.sendEmail({
      to: user.email,
      subject: "Password Reset - Kibundo",
      html: `
        <p>Hello${user.first_name ? ` ${user.first_name}` : ""},</p>
        <p>You requested a password reset. Click the link below to set a new password:</p>
        <p><a href="${resetUrl}">Reset Password</a></p>
        <p>This link expires in 15 minutes.</p>
        <p>If you did not request this, you can ignore this email.</p>
      `,
      text: `You requested a password reset. Open this link to set a new password: ${resetUrl} (expires in 15 minutes). If you did not request this, ignore this email.`,
    });

    return res.status(200).json({ message: "If this email exists, reset instructions have been sent." });
  } catch (err) {
    console.error("❌ Forgot password error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password, confirm_password } = req.body || {};
    if (!token || !password) {
      return res.status(400).json({ message: "Token and new password are required" });
    }
    if (confirm_password != null && password !== confirm_password) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (!process.env.JWT_SECRET) {
      console.error("❌ Reset password error: JWT_SECRET is not configured");
      return res.status(500).json({ message: "Server misconfiguration", error: "JWT_SECRET is not configured" });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    if (payload?.type !== "password_reset" || !payload?.id) {
      return res.status(400).json({ message: "Invalid reset token" });
    }

    const user = await User.findByPk(payload.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const hashed = await bcrypt.hash(password, 10);
    await user.update({ password: hashed });

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("❌ Reset password error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.betaSignup = async (req, res) => {
  try {
    // Handle both field name variations (frontend may send 'phone' or 'contact_number', 'bundesland' or 'state')
    const { 
      first_name, 
      last_name, 
      email, 
      contact_number, 
      phone,  // Frontend sends 'phone'
      state,
      bundesland,  // Frontend sends 'bundesland'
      gender,  // 'male' or 'female'
      password, 
      confirm_password, 
      role_id,
      is_beta
    } = req.body;

    // Normalize field names (support both frontend and backend naming)
    const finalContactNumber = contact_number || phone;
    const finalState = state || bundesland || null;

    console.log("🔍 Beta signup request received:", { 
      role_id, 
      email, 
      is_beta,
      role_id_type: typeof role_id,
      role_id_value: role_id,
      fullBody: JSON.stringify({ first_name, last_name, email, role_id, finalContactNumber, finalState, is_beta })
    });

    // Validate required fields
    if (!first_name || !last_name || !email || !password || !confirm_password || !role_id || !is_beta) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    // Ensure this is a beta signup
    if (!is_beta) {
      return res.status(400).json({ message: "This endpoint is for beta signups only" });
    }

    // 1. Check if passwords match
    if (password !== confirm_password) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // 2. Validate role_id - Ensure it's a valid role
    // Role IDs: 1=Student, 2=Parent, 3=Teacher, 10=Admin
    const validRoleIds = [1, 2, 3, 10];
    const roleIdNum = Number(role_id);
    
    console.log("🎯 Role validation:", { 
      original_role_id: role_id, 
      converted_roleIdNum: roleIdNum,
      isValid: validRoleIds.includes(roleIdNum)
    });
    
    if (!validRoleIds.includes(roleIdNum)) {
      return res.status(400).json({ 
        message: `Invalid role_id. Valid roles are: 1 (Student), 2 (Parent), 3 (Teacher), 10 (Admin). Received: ${role_id}` 
      });
    }

    // 3. Check if user exists and handle appropriately
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      // If user already exists, check if they're already a beta user
      if (existingUser.is_beta) {
        return res.status(409).json({ 
          message: "Du bist bereits für das Beta-Programm angemeldet.",
          already_beta: true,
          beta_status: existingUser.beta_status
        });
      } else {
        // If user exists but is not a beta user, convert them to beta
        const betaUpdate = {
          is_beta: true,
          beta_status: 'pending',
          beta_requested_at: new Date(),
          isActive: false,
        };
        if (finalContactNumber) betaUpdate.contact_number = finalContactNumber;
        if (finalState) betaUpdate.state = finalState;

        await existingUser.update(betaUpdate);

        const userData = { ...existingUser.toJSON() };
        delete userData.password;

        console.log("📧 Attempting to send beta signup confirmation email to:", userData.email);
        emailService.sendBetaSignupEmail(userData)
          .then((result) => {
            if (result?.success) {
              console.log("✅ Beta signup confirmation email sent successfully to:", userData.email, "Message ID:", result.messageId);
            } else {
              console.error("❌ Failed to send beta signup confirmation email to:", userData.email, "Error:", result?.error);
            }
          })
          .catch((emailError) => {
            console.error("❌ Exception sending beta signup confirmation email to:", userData.email, "Error:", emailError);
          });

        return res.status(200).json({ 
          message: "Dein bestehender Account wurde für das Beta-Programm angemeldet!",
          user: userData,
          beta_status: 'pending',
          requires_approval: true,
          converted_to_beta: true
        });
      }
    }

    // 4. Hash password and create user with beta status
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      role_id: roleIdNum,
      first_name,
      last_name,
      email,
      contact_number: finalContactNumber,
      state: finalState,
      gender: gender && ['male', 'female'].includes(gender.toLowerCase()) ? gender.toLowerCase() : null,
      password: hashedPassword,
      is_beta: true,
      beta_status: 'pending',
      beta_requested_at: new Date(),
      isActive: false,
    });

    console.log("✅ Beta user created:", { userId: newUser.id, role_id: newUser.role_id, expectedRoleId: roleIdNum });

    // 5. Create role-specific records
    // Role 1 = Student
    if (roleIdNum === 1) {
      const newStudent = await Student.create({
        user_id: newUser.id,
        created_by: newUser.id,
      });
      console.log("✅ Beta Student record created:", { studentId: newStudent.id, userId: newUser.id });
    } 
    // Role 2 = Parent
    else if (roleIdNum === 2) {
      console.log("🎯 Creating BETA PARENT record for role_id = 2, user_id =", newUser.id);
      let newParent = null;
      try {
        newParent = await Parent.create({
          user_id: newUser.id,
          created_by: newUser.id,
        });
        console.log("✅ BETA PARENT record created successfully:", { parentId: newParent.id, userId: newUser.id, role_id: roleIdNum });
      } catch (parentError) {
        console.error("❌ FAILED to create Beta Parent record:", parentError);
        throw parentError;
      }
      
      // Store parent_id for email sending
      newUser.parent_id = newParent.id;
      
      // For parents: email is the portal login (username)
      await User.update(
        { username: email },
        { where: { id: newUser.id } }
      );
      console.log("✅ Set username to email for beta parent:", email);
    } 
    // Role 3 = Teacher
    else if (roleIdNum === 3) {
      console.log("🎯 Creating BETA TEACHER record for role_id = 3, user_id =", newUser.id);
      try {
        const newTeacher = await Teacher.create({
          user_id: newUser.id,
          class_id: 1,
          created_by: newUser.id,
        });
        console.log("✅ BETA TEACHER record created successfully:", { teacherId: newTeacher.id, userId: newUser.id, role_id: roleIdNum });
      } catch (teacherError) {
        console.error("❌ FAILED to create Beta Teacher record:", teacherError);
        throw teacherError;
      }
    }
    // Role 10 = Admin (no additional record needed)
    else {
      console.log("⚠️ No role-specific record to create for role_id:", roleIdNum);
    }

    // 6. Return success message (no token for beta users - they need approval)
    const userData = { ...newUser.toJSON() };
    delete userData.password;

    console.log("✅ Beta signup successful:", { userId: newUser.id, role_id: roleIdNum, email: newUser.email, parent_id: newUser.parent_id || null });

    console.log("📧 Attempting to send beta signup confirmation email to:", userData.email);
    emailService.sendBetaSignupEmail(userData)
      .then((result) => {
        if (result?.success) {
          console.log("✅ Beta signup confirmation email sent successfully to:", userData.email, "Message ID:", result.messageId);
        } else {
          console.error("❌ Failed to send beta signup confirmation email to:", userData.email, "Error:", result?.error);
        }
      })
      .catch((emailError) => {
        console.error("❌ Exception sending beta signup confirmation email to:", userData.email, "Error:", emailError);
      });

    res.status(201).json({ 
      message: "Beta registration successful! Your account is pending approval.", 
      user: userData,
      beta_status: 'pending',
      requires_approval: true
    });
  } catch (err) {
    console.error("❌ Beta signup error:", err);
    res.status(500).json({ 
      message: "Server error during beta signup", 
      error: err.message 
    });
  }
};

exports.signup = async (req, res) => {
  try {
    // Handle both field name variations (frontend may send 'phone' or 'contact_number', 'bundesland' or 'state')
    const { 
      first_name, 
      last_name, 
      email, 
      contact_number, 
      phone,  // Frontend sends 'phone'
      state,
      bundesland,  // Frontend sends 'bundesland'
      gender,  // 'male' or 'female'
      password, 
      confirm_password, 
      role_id 
    } = req.body;

    // Normalize field names (support both frontend and backend naming)
    const finalContactNumber = contact_number || phone;
    const finalState = state || bundesland || null;

    console.log("🔍 Signup request received:", { 
      role_id, 
      email, 
      role_id_type: typeof role_id,
      role_id_value: role_id,
      fullBody: JSON.stringify({ first_name, last_name, email, role_id, finalContactNumber, finalState })
    });

    // Validate required fields
    if (!first_name || !last_name || !email || !password || !confirm_password || !role_id) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    // 1. Check if passwords match
    if (password !== confirm_password) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // 2. Validate role_id - Ensure it's a valid role
    // Role IDs: 1=Student, 2=Parent, 3=Teacher, 10=Admin
    const validRoleIds = [1, 2, 3, 10];
    const roleIdNum = Number(role_id);
    
    console.log("🎯 Role validation:", { 
      original_role_id: role_id, 
      converted_roleIdNum: roleIdNum,
      isValid: validRoleIds.includes(roleIdNum)
    });
    
    if (!validRoleIds.includes(roleIdNum)) {
      return res.status(400).json({ 
        message: `Invalid role_id. Valid roles are: 1 (Student), 2 (Parent), 3 (Teacher), 10 (Admin). Received: ${role_id}` 
      });
    }

    // 3. Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // 4. Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      role_id: roleIdNum,
      first_name,
      last_name,
      email,
      contact_number: finalContactNumber,
      state: finalState,
      gender: gender && ['male', 'female'].includes(gender.toLowerCase()) ? gender.toLowerCase() : null,
      password: hashedPassword,
    });

    console.log("✅ User created:", { userId: newUser.id, role_id: newUser.role_id, expectedRoleId: roleIdNum });

    // 5. Create role-specific records
    // Role 1 = Student
    if (roleIdNum === 1) {
      const newStudent = await Student.create({
        user_id: newUser.id,
        created_by: newUser.id,
      });
      console.log("✅ Student record created:", { studentId: newStudent.id, userId: newUser.id });
    } 
    // Role 2 = Parent
    else if (roleIdNum === 2) {
      console.log("🎯 Creating PARENT record for role_id = 2, user_id =", newUser.id);
      let newParent = null;
      try {
        newParent = await Parent.create({
          user_id: newUser.id,
          created_by: newUser.id,
        });
        console.log("✅ PARENT record created successfully:", { parentId: newParent.id, userId: newUser.id, role_id: roleIdNum });
      } catch (parentError) {
        console.error("❌ FAILED to create Parent record:", parentError);
        throw parentError;
      }
      
      // Store parent_id for email sending
      newUser.parent_id = newParent.id;
      
      // For parents: email is the portal login (username)
      await User.update(
        { username: email },
        { where: { id: newUser.id } }
      );
      console.log("✅ Set username to email for parent:", email);
    } 
    // Role 3 = Teacher
    else if (roleIdNum === 3) {
      console.log("🎯 Creating TEACHER record for role_id = 3, user_id =", newUser.id);
      try {
        const newTeacher = await Teacher.create({
          user_id: newUser.id,
          class_id: 1,
          created_by: newUser.id,
        });
        console.log("✅ TEACHER record created successfully:", { teacherId: newTeacher.id, userId: newUser.id, role_id: roleIdNum });
      } catch (teacherError) {
        console.error("❌ FAILED to create Teacher record:", teacherError);
        throw teacherError;
      }
    }
    // Role 10 = Admin (no additional record needed)
    else {
      console.log("⚠️ No role-specific record to create for role_id:", roleIdNum);
    }

    // 6. Generate JWT token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role_id: newUser.role_id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // 7. Return token and user info (excluding password)
    const userData = { ...newUser.toJSON() };
    delete userData.password;

    console.log("✅ Signup successful:", { userId: newUser.id, role_id: roleIdNum, email: newUser.email, parent_id: newUser.parent_id || null });

    // 8. Send welcome/confirmation email (non-blocking)
    // Include plain password and parent_id for email
    const emailData = {
      ...userData,
      password: password, // Include plain password for email
      parent_id: newUser.parent_id || null, // Include parent_id for logging
    };
    
    console.log("📧 Attempting to send welcome email to:", emailData.email, "with parent_id:", emailData.parent_id);
    emailService.sendWelcomeEmail(emailData)
      .then((result) => {
        if (result.success) {
          console.log("✅ Welcome email sent successfully to:", emailData.email, "Message ID:", result.messageId);
        } else {
          console.error("❌ Failed to send welcome email to:", emailData.email, "Error:", result.error);
        }
      })
      .catch((emailError) => {
        console.error("❌ Exception sending welcome email to:", emailData.email, "Error:", emailError);
        // Don't fail the signup if email fails
      });

    res.status(201).json({ 
      message: "User registered successfully", 
      user: userData, 
      token,
      role_id: roleIdNum 
    });
  } catch (err) {
    console.error("❌ Signup error:", err);
    res.status(500).json({ 
      message: "Server error during signup", 
      error: err.message 
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Email/Username and password are required." });
    }
    
    // 1. Find user - prioritize email, then username (handle null/empty username)
    // Fix: Always try email first, then username (if not null/empty)
    // This ensures login works even if username is changed or cleared in admin
    let user = null;
    
    // First, try to find by email (most stable identifier)
    user = await User.findOne({
      where: { email: username }
    });
    
    // If not found by email, try username (only if username field is not null/empty)
    if (!user) {
      const whereClause = {
        [Op.and]: [
          { username: username },
          { username: { [Op.ne]: null } },
          { username: { [Op.ne]: '' } }
        ]
      };
      user = await User.findOne({
        where: whereClause
      });
    }
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2. Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // ENFORCE: No tokens/sessions for pending beta users
    if (user.is_beta && user.beta_status !== 'approved') {
      if (user.beta_status === 'pending') {
        return res.status(403).json({ 
          message: "Your beta account is pending approval. You will receive an email once your account is approved.",
          beta_status: user.beta_status,
          requires_approval: true
        });
      } else if (user.beta_status === 'rejected') {
        return res.status(403).json({ 
          message: "Your beta account application has been rejected. Please contact support for more information.",
          beta_status: user.beta_status
        });
      } else {
        return res.status(403).json({ 
          message: "Your beta account status is invalid. Please contact support.",
          beta_status: user.beta_status
        });
      }
    }

    // ENFORCE: active === true (for all users)
    if (!user.isActive) {
      return res.status(403).json({ 
        message: "Your account has been deactivated. Please contact support.",
        is_active: false
      });
    }

    // ENFORCE: status === 'Active' (for regular users only)
    if (!user.is_beta && user.status !== 'Active') {
      return res.status(403).json({ 
        message: "Your account is suspended. Please contact support.",
        status: user.status
      });
    }

    // ONLY AFTER ALL CHECKS PASS: Generate token
    if (!process.env.JWT_SECRET) {
      console.error("❌ Login error: JWT_SECRET is not configured");
      return res.status(500).json({ message: "Server misconfiguration", error: "JWT_SECRET is not configured" });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, role_id: user.role_id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // 7. Exclude password from response
    const userData = { ...user.toJSON() };
    delete userData.password;

    res.status(200).json({ message: "Login successful", user: userData, token });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Student avatar-based login (no password required)
exports.studentLogin = async (req, res) => {
  try {
    const { studentId, name } = req.body;
    
    if (!studentId && !name) {
      return res.status(400).json({ message: "Student ID or name is required." });
    }

    // Find student by ID or by name (first_name + last_name)
    let student = null;
    let user = null;
    
    if (studentId) {
      student = await Student.findOne({
        where: { id: studentId },
        include: [{
          model: User,
          as: 'user'
        }]
      });
      if (student && student.user) {
        user = student.user;
      }
    } else if (name) {
      // Try to find by first_name or first_name + last_name
      const nameParts = name.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;
      
      const whereClause = lastName 
        ? { first_name: firstName, last_name: lastName, role_id: 1 }
        : { first_name: firstName, role_id: 1 };
      
      user = await User.findOne({
        where: whereClause
      });
      
      if (user) {
        student = await Student.findOne({
          where: { user_id: user.id }
        });
      }
    }

    if (!student || !user) {
      return res.status(404).json({ message: "Student not found" });
    }

    if (user.role_id !== 1) {
      return res.status(403).json({ message: "User is not a student" });
    }

    // ENFORCE: No tokens/sessions for pending beta users
    if (user.is_beta && user.beta_status !== 'approved') {
      if (user.beta_status === 'pending') {
        return res.status(403).json({ 
          message: "Your beta account is pending approval. You will receive an email once your account is approved.",
          beta_status: user.beta_status,
          requires_approval: true
        });
      } else if (user.beta_status === 'rejected') {
        return res.status(403).json({ 
          message: "Your beta account application has been rejected. Please contact support for more information.",
          beta_status: user.beta_status
        });
      } else {
        return res.status(403).json({ 
          message: "Your beta account status is invalid. Please contact support.",
          beta_status: user.beta_status
        });
      }
    }

    // ENFORCE: active === true
    if (!user.isActive) {
      return res.status(403).json({ 
        message: "Your account has been deactivated. Please contact support.",
        is_active: false
      });
    }

    // ENFORCE: status === 'Active' for regular users
    if (!user.is_beta && user.status !== 'Active') {
      return res.status(403).json({ 
        message: "Your account is suspended. Please contact support.",
        status: user.status
      });
    }

    // Generate token (no password check for students)
    if (!process.env.JWT_SECRET) {
      console.error("❌ Student login error: JWT_SECRET is not configured");
      return res.status(500).json({ message: "Server misconfiguration", error: "JWT_SECRET is not configured" });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, role_id: user.role_id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Exclude password from response
    const userData = { ...user.toJSON() };
    delete userData.password;

    res.status(200).json({ 
      message: "Student login successful", 
      user: userData, 
      token,
      student: {
        id: student.id,
        class_id: student.class_id
      }
    });
  } catch (err) {
    console.error("❌ Student login error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Public endpoint to get list of students for login selection (avatar + name only)
exports.getStudentsForLogin = async (req, res) => {
  try {
    const students = await Student.findAll({
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'first_name', 'last_name', 'avatar', 'gender'],
        where: { role_id: 1, status: 'Active' }
      }],
      attributes: ['id']
    });
    
    const studentList = students
      .filter(s => s.user) // Only include students with valid user records
      .map(s => ({
        id: s.id,
        studentId: s.id,
        userId: s.user.id,
        name: `${s.user.first_name} ${s.user.last_name || ''}`.trim(),
        firstName: s.user.first_name,
        lastName: s.user.last_name,
        avatar: s.user.avatar,
        gender: s.user.gender
      }));
    
    res.status(200).json({ students: studentList });
  } catch (err) {
    console.error("❌ Get students for login error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

