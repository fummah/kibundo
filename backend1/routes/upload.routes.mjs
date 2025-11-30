import express from "express";
import multer from "multer";
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { handleUpload } from "../controllers/uploadController.mjs";

// Import CommonJS module
const require = createRequire(import.meta.url);
const { verifyToken } = require("../middlewares/authJwt.js");

const router = express.Router();

// ✅ Ensure /uploads folder exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer to store files in the "uploads/" folder with proper filenames
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + "-" + file.originalname);
    },
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Accept images, PDFs, and Office documents
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/tiff',
      'application/pdf',
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.ms-excel', // .xls
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-powerpoint', // .ppt
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'text/plain', // .txt
      'application/zip', // Some files might be sent as zip
      'application/x-zip-compressed' // Windows zip
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not supported. Please upload images (JPEG, PNG, GIF, WebP, BMP, TIFF) or documents (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT). For best analysis results, use images or screenshots.`), false);
    }
  }
});

// Define POST route for uploading a single file
router.post("/",verifyToken, upload.single("file"), handleUpload);

export default router;
