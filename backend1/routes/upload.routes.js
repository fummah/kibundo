import express from "express";
import multer from "multer";
import { handleUpload } from "../controllers/uploadController.js";

const router = express.Router();

// Configure Multer to store files in the "uploads/" folder
const upload = multer({ dest: "uploads/" });

// Define POST route for uploading a single file
router.post("/", upload.single("file"), handleUpload);

export default router;
