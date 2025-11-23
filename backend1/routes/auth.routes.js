const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/student-login", authController.studentLogin); // Avatar-based login for students
router.get("/students-for-login", authController.getStudentsForLogin); // Public endpoint to get student list for login

module.exports = router;
