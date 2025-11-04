const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const db = require("../models");
const User = db.user;
const Student = db.student;
const Parent = db.parent;
const Teacher = db.teacher;

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
    const finalState = state || bundesland;

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
      try {
        const newParent = await Parent.create({
          user_id: newUser.id,
          created_by: newUser.id,
        });
        console.log("✅ PARENT record created successfully:", { parentId: newParent.id, userId: newUser.id, role_id: roleIdNum });
      } catch (parentError) {
        console.error("❌ FAILED to create Parent record:", parentError);
        throw parentError;
      }
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

    console.log("✅ Signup successful:", { userId: newUser.id, role_id: roleIdNum, email: newUser.email });

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
    // 1. Find user
    // 2️⃣ Find user by email OR username
    const user = await User.findOne({
      where: {
        [Op.or]: [{ email: username }, { username: username }]
      }
    });
    if (!user) return res.status(404).json({ message: "User not found" });

    // 2. Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    // 3. Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role_id: user.role_id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // 4. Exclude password from response
    const userData = { ...user.toJSON() };
    delete userData.password;

    res.status(200).json({ message: "Login successful", user: userData, token });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

