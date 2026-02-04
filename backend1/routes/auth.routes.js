const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { betaSignupLimiter } = require("../middlewares/rateLimit");

// POST /beta-signup - Beta user registration with rate limiting
router.post("/beta-signup", betaSignupLimiter, (req, res, next) => {
  console.log("🚀 Beta signup route hit!", req.body);
  console.log("📝 Headers:", req.headers);
  next();
}, authController.betaSignup);

// Regular signup
router.post("/signup", authController.signup);

// Login
router.post("/login", authController.login);

// Student login
router.post("/student-login", authController.studentLogin);

// Public endpoint to get student list for login
router.get("/students-for-login", authController.getStudentsForLogin);

module.exports = router;
