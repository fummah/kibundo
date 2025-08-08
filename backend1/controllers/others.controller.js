const db = require("../models");
const User = db.user;

exports.getDashboard = async (req, res) => {
  try {
    // Get total users
    const totalUsers = await User.count();

    // Get active users (assuming `isActive` is a boolean field)
    const activeUsers = await User.count({ where: { isActive: true } });

    // Get new users if you want (example for last 7 days)
    const { Op } = require("sequelize");
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const newUsers = await User.count({
      where: {
        created_at: {
          [Op.gte]: sevenDaysAgo
        }
      }
    });

    // Dashboard response
    const dashboardData = {
      stats: {
        totalUsers: totalUsers.toLocaleString(),
        activeUsers: activeUsers.toLocaleString(),
        newUsers: newUsers.toLocaleString()
      },
      customerInsights: {
        satisfaction: "92",
        sessionDuration: "15",
        retentionRate: "85"
      },
      revenue: {
        total: "123456",
        subscriptions: "567",
        renewalRate: "90"
      },
      lineData: [
        { date: "2025-07-01", value: 200 },
        { date: "2025-07-02", value: 300 },
        { date: "2025-07-03", value: 250 },
      ],
      barData: [
        { label: "Q1", value: 5000 },
        { label: "Q2", value: 7000 },
        { label: "Q3", value: 6500 },
      ]
    };

    res.status(200).json(dashboardData);
  } catch (err) {
    console.error("Error fetching dashboard:", err);
    res.status(500).json({ message: "Failed to load dashboard" });
  }
};

exports.getStatisticsDashboard = async (req, res) => {
  try {
    // Later you can replace these with dynamic values
    const dashboardData = {
      chartData: [
        { name: "Jan", value: 1000 },
        { name: "Feb", value: 1200 },
      ],
      stats: {
        totalUsers: 1250,
        activeSubscriptions: 875
      },
      insights: {
        b2bB2c: "60% B2B / 40% B2C",
        deviceUsage: {Mobile: 55, Desktop: 45},
        engagement: {Avg_Session: 25}
      },
      subscriptions: [
        { key: "1", package: "Basic", total: 500, active: 400, renewal: 80 },
        { key: "2", package: "Premium", total: 300, active: 250, renewal: 83 }
      ]
    };

    res.status(200).json(dashboardData);
  } catch (err) {
    console.error("Error fetching statistics dashboard:", err);
    res.status(500).json({ message: "Failed to load statistics dashboard" });
  }
};

// GET /api/reports/filters
exports.getReportFilters = (req, res) => {
  try {
    const filters = [
      { key: "course", label: "Course", options: ["Math", "Science", "English"] },
      { key: "level", label: "Level", options: ["Beginner", "Advanced"] },
      { key: "term", label: "Term", options: ["Q1", "Q2", "Q3"] },
      { key: "status", label: "Status", options: ["Active", "Inactive"] }
    ];

    res.status(200).json(filters);
  } catch (err) {
    console.error("Error fetching filters:", err);
    res.status(500).json({ message: "Failed to fetch filters" });
  }
};

// POST /api/reports/generate
exports.generateReport = (req, res) => {
  try {
    const { course, level, term, status } = req.body;

    // You can validate inputs or query DB here later

    // Dummy report data
    const report = {
      title: `Report for ${course} - ${level} (${term}) [${status}]`,
      totalRecords: 42,
      generatedAt: new Date().toISOString(),
      data: [
        { id: 1, student: "Alice", score: 85 },
        { id: 2, student: "Bob", score: 78 },
        { id: 3, student: "Charlie", score: 92 }
      ]
    };

    res.status(200).json(report);
  } catch (err) {
    console.error("Error generating report:", err);
    res.status(500).json({ message: "Failed to generate report" });
  }
};
exports.getOverviewDashboard = async (req, res) => {
  try {
    // Dummy data for now — replace with real DB logic later
    const dashboard = {
      totalUsers: 12500,
      activeSchools: 75,
      totalReports: 320,
      recentReports: [
        {
          title: "Monthly Usage Summary",
          date: "2025-07-01",
          status: "Approved"
        },
        {
          title: "Student Performance Q2",
          date: "2025-06-20",
          status: "Pending"
        }
      ],
      topSchools: [
        {
          name: "Greenhill Academy",
          students: 480
        },
        {
          name: "Ocean View High",
          students: 320
        }
      ],
      pendingContracts: 12,
      analytics: {
        loginsThisMonth: 2100,
        courseViews: 14500
      }
    };

    res.status(200).json(dashboard);
  } catch (err) {
    console.error("Error loading overview dashboard:", err);
    res.status(500).json({ message: "Failed to load overview dashboard" });
  }
};


