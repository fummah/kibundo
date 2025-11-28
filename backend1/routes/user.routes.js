const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const db = require("../models");
const HomeworkScan = db.homeworkScan;
const { getAllUsers, getAllRoles, addstudent, addteacher, addclass, getClassById, addsubject, getAllClasses, getAllStudents, 
    getAllTeachers, getAllSubjects, getSubjectById, getStudentById, getTeacherById, deleteSubject, deleteStudent, deleteTeacher,
    getParentById, getAllParents, addparent, deleteParent, addproduct, getAllProducts, getProductById,
deleteProduct, addsubscription, getAllSubscriptions, getSubscriptionById, deleteSubscription, addblogpost,getAllBlogPosts, 
getBlogPostById, deleteBlogPost, addinvoice, getAllInvoices, getInvoiceById,deleteInvoice, addcoupon, 
getAllCoupons, getCouponById,deleteCoupon, addrole, updateRole, deleteRole, adduser,addquiz,  getQuizzes, getQuizById,  deleteQuiz, 
addcurriculum, getAllCurriculum,getCurriculumById, deleteCurriculum, addWorksheet, getAllWorksheets, getWorksheetById, deleteWorksheet,
    getAllStates, getAllAgents, getAgentsForStudent, getPublicTables,addAgent, getHomeworks, getHomeworkScanById, deleteHomeworkScan, getStudentIdByUserId, getStudentApiUsage, getStudentUsageStats, getAiAgentSettings,updateAiAgentSettings,updateAgent, 
    updateHomeworkCompletion,
    getCurrentUser, debugUser, deleteAgent, editUser,editSubject,editClass,deleteClass,editProduct,editSubscription, editQuiz, editStudent, editTeacher, editParent, 
updateStudentStatus, updateTeacherStatus, updateParentStatus, changePassword, adminUpdateCredentials, deleteUser } = require("../controllers/user.controller");
const { getDashboard, getStatisticsDashboard, getReportFilters, generateReport, getOverviewDashboard } = require("../controllers/others.controller");
const { verifyToken } = require("../middlewares/authJwt");

// Configure multer for simple file uploads (profile pictures, etc.)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// Simple file upload endpoint (profile pictures, etc.)
router.post("/upload", verifyToken, upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    
    const fileUrl = `/uploads/${req.file.filename}`;
    console.log("✅ File uploaded successfully:", fileUrl);
    
    res.json({
      success: true,
      message: "File uploaded successfully",
      url: fileUrl,
      fileUrl: fileUrl,
      path: fileUrl,
    });
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ 
      error: err.message || "File upload failed" 
    });
  }
});

// Protected route to get all users
router.get("/users", verifyToken, getAllUsers);
router.get("/current-user", verifyToken, getCurrentUser);
router.get("/debug-user/:id", verifyToken, debugUser);
router.post("/adduser", verifyToken, adduser);
router.get("/analytics/dashboard", verifyToken, getDashboard);
router.get("/statistics/dashboard", verifyToken, getStatisticsDashboard);
router.get("/reports/filters", verifyToken, getReportFilters);
router.post("/reports/generate", verifyToken, generateReport);
router.get("/admin/dashboard", verifyToken, getOverviewDashboard);
router.post("/addteacher", verifyToken, addteacher);
router.post("/addstudent", verifyToken, addstudent);
router.get("/allroles", getAllRoles);
router.post("/addrole", verifyToken, addrole);
router.put("/roles/:id", verifyToken, updateRole);
router.delete("/roles/:id", verifyToken, deleteRole);
router.post("/addclass", verifyToken, addclass);
router.get("/class/:id", verifyToken, getClassById);
router.delete("/class/:id", verifyToken, deleteClass);
router.post("/addsubject", verifyToken, addsubject);
router.get("/allclasses", verifyToken, getAllClasses);
router.get("/allstudents", verifyToken, getAllStudents);
router.get("/allteachers", verifyToken, getAllTeachers);
router.get("/allsubjects", verifyToken, getAllSubjects);
router.get('/subject/:id', verifyToken,getSubjectById);
// Specific student routes MUST come before /student/:id to avoid pattern matching issues
router.get("/student/agents", verifyToken, getAgentsForStudent);
router.get("/student/api-usage", verifyToken, getStudentApiUsage);
router.get("/student/:id/usage-stats", verifyToken, getStudentUsageStats);
router.get('/student/:id', verifyToken,getStudentById);
router.delete('/student/:id', verifyToken,deleteStudent);
router.get('/teacher/:id', verifyToken,getTeacherById);
router.delete('/teacher/:id', verifyToken,deleteTeacher);
router.delete('/subject/:id', verifyToken,deleteSubject);
router.get('/parent/:id', verifyToken,getParentById);
router.get("/parents", verifyToken, getAllParents);
router.post("/addparent", verifyToken, addparent);
router.delete('/parent/:id', verifyToken,deleteParent);
router.post("/addproduct", verifyToken, addproduct);
router.get("/products", verifyToken, getAllProducts);
router.get('/product/:id', verifyToken,getProductById);
router.delete('/product/:id', verifyToken,deleteProduct);
router.post("/addsubscription", verifyToken, addsubscription);
router.get("/subscriptions", verifyToken, getAllSubscriptions);
router.get('/subscription/:id', verifyToken,getSubscriptionById);
router.delete('/subscription/:id', verifyToken,deleteSubscription);
router.post("/addblogpost", verifyToken, addblogpost);
router.get("/blogposts", getAllBlogPosts);
router.get('/blogpost/:id',getBlogPostById);
router.delete('/blogpost/:id', verifyToken,deleteBlogPost);
router.post("/addinvoice", verifyToken, addinvoice);
router.get("/invoices", verifyToken, getAllInvoices);
router.get('/invoice/:id', verifyToken,getInvoiceById);
router.get('/invoices/:id/download', verifyToken, getInvoiceById);
router.get('/parents/:parentId/invoices/:id/download', verifyToken, getInvoiceById);
router.delete('/invoice/:id', verifyToken,deleteInvoice);
router.post("/addcoupon", verifyToken, addcoupon);
router.get("/coupons", verifyToken, getAllCoupons);
router.get('/coupon/:id', verifyToken,getCouponById);
router.delete('/coupon/:id', verifyToken,deleteCoupon);
router.post("/addquiz",verifyToken, addquiz);
router.get('/quizzes', verifyToken,getQuizzes);
router.get('/quiz/:id', verifyToken,getQuizById);
router.delete('/quiz/:id', verifyToken,deleteQuiz);
router.post("/addcurriculum",verifyToken, addcurriculum);
router.get('/curiculums', verifyToken,getAllCurriculum);
router.get('/curriculum/:id', verifyToken,getCurriculumById);
router.delete('/curriculum/:id', verifyToken,deleteCurriculum);
router.post("/addworksheet",verifyToken, addWorksheet);
router.get('/worksheets', verifyToken,getAllWorksheets);
router.get('/worksheet/:id', verifyToken,getWorksheetById);
router.delete('/worksheet/:id', verifyToken,deleteWorksheet);
router.get("/states", verifyToken, getAllStates);
router.get('/agents', verifyToken,getAllAgents);
router.get('/entities',getPublicTables);
router.get('/scans', verifyToken, (req, res) => {
  // Placeholder for scans endpoint - returns empty array for now
  res.json([]);
});
router.get('/games', verifyToken, (req, res) => {
  // Placeholder for games endpoint - returns empty array for now
  res.json([]);
});
router.post("/addagent",verifyToken, addAgent);
router.get("/homeworkscans/:id", verifyToken, getHomeworkScanById);
router.delete("/homeworkscans/:id", verifyToken, deleteHomeworkScan);
router.get("/homeworkscans",verifyToken, getHomeworks);
router.get("/student-id", verifyToken, getStudentIdByUserId);
router.put("/homeworkscans/:id/completion", verifyToken, updateHomeworkCompletion);
router.get("/student/:id/homeworkscans", verifyToken, async (req, res) => {
  try {
    const studentId = req.params.id;
    console.log("📚 Route /student/:id/homeworkscans called with ID:", studentId);
    
    // Directly query for this specific student's homework
    const homeworks = await HomeworkScan.findAll({
      where: { student_id: studentId },
      order: [['created_at', 'DESC']]
    });
    
    console.log("📚 Found", homeworks.length, "homework submissions for student", studentId);
    res.json(homeworks);
  } catch (err) {
    console.error("❌ Error fetching student homework:", err);
    res.status(500).json({ message: err.message });
  }
});
router.get("/aisettings", verifyToken,getAiAgentSettings);
router.put("/updateaisettings", verifyToken,updateAiAgentSettings);
router.put("/updateaiagents", verifyToken,updateAgent);
router.delete("/agents/:id", verifyToken, deleteAgent);
router.put("/users/:id", verifyToken, editUser);
router.delete("/users/:id", verifyToken, deleteUser);
router.post("/users/:id/change-password", verifyToken, changePassword);
// Test endpoint to verify route works
router.get("/test-credentials-route", (req, res) => {
  console.log("✅ TEST: Credentials route is working!");
  res.json({ message: "Route is working!" });
});

router.post("/users/:id/admin-update-credentials", verifyToken, adminUpdateCredentials);
router.put("/subjects/:id", verifyToken,editSubject);
router.put("/classes/:id", verifyToken,editClass);
router.put("/products/:id", verifyToken,editProduct);
router.put("/subscriptions/:id", verifyToken,editSubscription);
router.put("/quizzes/:id", verifyToken,editQuiz);
router.put("/students/:id", verifyToken,editStudent);
router.put("/teachers/:id", verifyToken,editTeacher);
router.put("/parents/:id", verifyToken,editParent);

// PATCH routes (alternative to PUT for partial updates)
router.patch("/student/:id", verifyToken, editStudent);
router.patch("/teacher/:id", verifyToken, editTeacher);
router.patch("/parent/:id", verifyToken, editParent);

// Status update routes
router.patch("/student/:id/status", verifyToken, updateStudentStatus);
router.patch("/teacher/:id/status", verifyToken, updateTeacherStatus);
router.patch("/parent/:id/status", verifyToken, updateParentStatus);

// Student-Subject assignment routes
router.post("/student/:studentId/subject/:subjectId", verifyToken, async (req, res) => {
  try {
    const { studentId, subjectId } = req.params;
    const db = require("../models");
    const StudentSubjects = db.student_subjects;
    
    // Check if relationship already exists
    const existing = await StudentSubjects.findOne({
      where: { student_id: studentId, subject_id: subjectId }
    });
    
    if (existing) {
      return res.status(409).json({ message: "Subject already assigned to student" });
    }
    
    // Create the relationship
    await StudentSubjects.create({
      student_id: parseInt(studentId),
      subject_id: parseInt(subjectId),
      created_by: String(req.user.id)
    });
    
    res.json({ message: "Subject assigned successfully" });
  } catch (err) {
    // console.error("Error assigning subject:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.delete("/student/:studentId/subject/:subjectId", verifyToken, async (req, res) => {
  try {
    const { studentId, subjectId } = req.params;
    const db = require("../models");
    const StudentSubjects = db.student_subjects;
    
    await StudentSubjects.destroy({
      where: { student_id: parseInt(studentId), subject_id: parseInt(subjectId) }
    });
    
    res.json({ message: "Subject unassigned successfully" });
  } catch (err) {
    // console.error("Error unassigning subject:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get assigned agent for a student
router.get("/student/:id/assigned-agent", verifyToken, (req, res) => {
  // For now, return ChildAgent as default for homework
  res.json({ 
    agent: "ChildAgent",
    agentName: "Homework Helper",
    studentId: req.params.id 
  });
});

// API Usage Invoice Routes
const apiUsageInvoiceService = require("../services/apiUsageInvoice.service");

// Generate/update API usage invoice for a specific parent
router.post("/parent/:parentId/generate-api-invoice", verifyToken, async (req, res) => {
  try {
    const { parentId } = req.params;
    console.log(`📊 API request: Generate invoice for parent ${parentId}`);
    
    const invoice = await apiUsageInvoiceService.generateApiUsageInvoice(parseInt(parentId));
    
    res.json({
      success: true,
      message: "Invoice generated/updated successfully",
      invoice: {
        id: invoice.id,
        parent_id: invoice.parent_id,
        status: invoice.status,
        total_cents: invoice.total_cents,
        total_amount: (invoice.total_cents / 100).toFixed(2),
        currency: invoice.currency,
        lines: invoice.lines,
        created_at: invoice.created_at
      }
    });
  } catch (error) {
    console.error("❌ Error generating API usage invoice:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate invoice",
      error: error.message
    });
  }
});

// Generate API usage invoices for all parents (admin only)
router.post("/generate-all-api-invoices", verifyToken, async (req, res) => {
  try {
    console.log(`📊 API request: Generate invoices for all parents`);
    
    const results = await apiUsageInvoiceService.generateAllApiUsageInvoices();
    
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    res.json({
      success: true,
      message: `Generated ${successCount} invoice(s), ${errorCount} error(s)`,
      results
    });
  } catch (error) {
    console.error("❌ Error generating all API usage invoices:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate invoices",
      error: error.message
    });
  }
});

// Payment routes
const paymentController = require("../controllers/payment.controller");
router.post("/payment/create-checkout-session", verifyToken, paymentController.createCheckoutSession);
router.get("/payment/checkout-session", verifyToken, paymentController.getCheckoutSession);
router.get("/payment/subscription-from-stripe", verifyToken, paymentController.getSubscriptionFromStripe);
router.post("/subscriptions/:id/sync", verifyToken, paymentController.syncSubscriptionFromStripe);
router.post("/payment/upgrade-subscription", verifyToken, paymentController.upgradeSubscription);

// Stripe webhook (must be before verifyToken middleware - uses raw body)
// Note: Raw body parsing is handled at server level for this route
router.post("/payment/webhook", paymentController.handleWebhook);

module.exports = router;
