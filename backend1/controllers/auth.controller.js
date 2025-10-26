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
    const { first_name, last_name, email,contact_number, state, password, confirm_password, role_id } = req.body;

    // 1. Check if passwords match
    if (password !== confirm_password) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // 2. Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // 3. Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      role_id,
      first_name,
      last_name,
      email,
      contact_number,
      state,
      password: hashedPassword,
    });

    // 4. Generate JWT token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role_id: newUser.role_id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    if (Number(role_id) === 1) {
      const newStudent = await Student.create({
        user_id: newUser.id,
        created_by: newUser.id,
      });
    } else if (Number(role_id) === 2) {
      const newParent = await Parent.create({
        user_id: newUser.id,
        created_by: newUser.id,
      });
    } else if (Number(role_id) === 3) {
      const newTeacher = await Teacher.create({
        user_id: newUser.id,
        class_id: 1,
        created_by: newUser.id,
      });
    }

    // 5. Return token and user info (excluding password)
    const userData = { ...newUser.toJSON() };
    delete userData.password;

    res.status(201).json({ message: "User registered", user: userData, token });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
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
    res.status(500).json({ message: "Server error" });
  }
};

