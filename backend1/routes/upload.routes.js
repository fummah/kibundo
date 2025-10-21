import express from "express";
import multer from "multer";
import { handleUpload } from "../controllers/uploadController.js";
import { verifyToken } from "../middlewares/authJwt.js";

const router = express.Router();


// Configure Multer to store files in the "uploads/" folder
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Accept common image formats and PDFs
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not supported. Please upload JPEG, PNG, GIF, WebP, or PDF files only.`), false);
    }
  }
});

// Define POST route for uploading a single file
router.post("/",verifyToken, upload.single("file"), handleUpload);

export default router;
