const express = require("express");
const router = express.Router();
const { getAllUsers, getAllRoles, addstudent, addteacher, addclass, addsubject, getAllClasses, getAllStudents, 
    getAllTeachers, getAllSubjects, getSubjectById, getStudentById, getTeacherById, deleteSubject } = require("../controllers/user.controller");
const { getDashboard, getStatisticsDashboard, getReportFilters, generateReport, getOverviewDashboard } = require("../controllers/others.controller");
const { verifyToken } = require("../middlewares/authJwt");

// Protected route to get all users
router.get("/users", verifyToken, getAllUsers);
router.get("/analytics/dashboard", verifyToken, getDashboard);
router.get("/statistics/dashboard", verifyToken, getStatisticsDashboard);
router.get("/reports/filters", verifyToken, getReportFilters);
router.post("/reports/generate", verifyToken, generateReport);
router.get("/admin/dashboard", verifyToken, getOverviewDashboard);
router.post("/addteacher", verifyToken, addteacher);
router.post("/addstudent", verifyToken, addstudent);
router.get("/allroles", getAllRoles);
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

module.exports = router;
