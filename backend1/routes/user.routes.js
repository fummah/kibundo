const express = require("express");
const router = express.Router();
const { getAllUsers, getAllRoles, addstudent, addteacher, addclass, addsubject, getAllClasses, getAllStudents, 
    getAllTeachers, getAllSubjects, getSubjectById, getStudentById, getTeacherById, deleteSubject, 
    getParentById, getAllParents, addparent, deleteParent, addproduct, getAllProducts, getProductById,
deleteProduct, addsubscription, getAllSubscriptions, getSubscriptionById, deleteSubscription, addblogpost,getAllBlogPosts, 
getBlogPostById, deleteBlogPost, addinvoice, getAllInvoices, getInvoiceById,deleteInvoice, addcoupon, 
getAllCoupons, getCouponById,deleteCoupon, addrole, adduser,addquiz,  getQuizzes, getQuizById,  deleteQuiz, 
addcurriculum, getAllCurriculum,getCurriculumById, deleteCurriculum, addWorksheet, getAllWorksheets, getWorksheetById, deleteWorksheet,
getAllStates, getAllAgents,getPublicTables,addAgent, getHomeworks, getAiAgentSettings,updateAiAgentSettings,updateAgent } = require("../controllers/user.controller");
const { getDashboard, getStatisticsDashboard, getReportFilters, generateReport, getOverviewDashboard } = require("../controllers/others.controller");
const { verifyToken } = require("../middlewares/authJwt");

// Protected route to get all users
router.get("/users", verifyToken, getAllUsers);
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
router.post("/addclass", verifyToken, addclass);
router.post("/addsubject", verifyToken, addsubject);
router.get("/allclasses", verifyToken, getAllClasses);
router.get("/allstudents", verifyToken, getAllStudents);
router.get("/allteachers", verifyToken, getAllTeachers);
router.get("/allsubjects", verifyToken, getAllSubjects);
router.get('/subject/:id', verifyToken,getSubjectById);
router.get('/student/:id', verifyToken,getStudentById);
router.get('/teacher/:id', verifyToken,getTeacherById);
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
router.post("/addagent",verifyToken, addAgent);
router.get("/homeworkscans",verifyToken, getHomeworks);
router.get("/aisettings", verifyToken,getAiAgentSettings);
router.put("/updateaisettings", verifyToken,updateAiAgentSettings);
router.put("/updateaiagents", verifyToken,updateAgent);

// Get assigned agent for a student
router.get("/student/:id/assigned-agent", verifyToken, (req, res) => {
  // For now, return ChildAgent as default for homework
  res.json({ 
    agent: "ChildAgent",
    agentName: "Homework Helper",
    studentId: req.params.id 
  });
});

module.exports = router;
