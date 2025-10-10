import express from "express";
import multer from "multer";
import { handleUpload } from "../controllers/uploadController.js";
import { verifyToken } from "../middlewares/authJwt.js";

const router = express.Router();


// Configure Multer to store files in the "uploads/" folder
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 25 * 1024 * 1024 // 25 MB
  }
});

// Define POST route for uploading a single file
router.post("/",verifyToken, upload.single("file"), handleUpload);

export default router;
