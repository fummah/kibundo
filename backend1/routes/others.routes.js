const express = require("express");
const router = express.Router();
const { getAllUsers } = require("../controllers/user.controller");
const { verifyToken } = require("../middlewares/authJwt");

// Protected route to get all users
router.get("/analytics", verifyToken, getAllUsers);

module.exports = router;
