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
    const { range = '30' } = req.query;
    const days = parseInt(range, 10);
    
    // Generate date-based data based on the range
    const generateDateRange = (days) => {
      const result = [];
      const now = new Date();
      
      for (let i = days; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        result.push({
          date: date.toISOString().split('T')[0],
          value: Math.floor(Math.random() * 1000) + 500, // Random values for demo
          packageA: Math.floor(Math.random() * 300) + 100,
          packageB: Math.floor(Math.random() * 200) + 50,
          packageC: Math.floor(Math.random() * 150) + 30,
          b2b: Math.floor(Math.random() * 400) + 100,
          b2c: Math.floor(Math.random() * 600) + 200,
        });
      }
      return result;
    };
    
    const dateData = generateDateRange(days);
    
    // Format data for charts
    const byPackage = dateData.map(d => ({
      date: d.date,
      'Package A': d.packageA,
      'Package B': d.packageB,
      'Package C': d.packageC,
    }));
    
    const byMarketplace = dateData.map(d => ({
      date: d.date,
      'Web': Math.floor(d.value * 0.6),
      'Mobile': Math.floor(d.value * 0.4),
    }));
    
    const byClientType = dateData.map(d => ({
      date: d.date,
      'B2B': d.b2b,
      'B2C': d.b2c,
    }));
    
    // Get user stats
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { isActive: true } });
    
    // Prepare response
    const dashboardData = {
      chartData: {
        byPackage,
        byMarketplace,
        byClientType,
      },
      stats: {
        totalUsers,
        activeUsers,
        newUsers: Math.floor(totalUsers * 0.15), // 15% of total as new users
        totalRevenue: (totalUsers * 29.99).toFixed(2),
        activeSubscriptions: Math.floor(totalUsers * 0.7), // 70% have active subs
        monthlyGrowth: 12.5, // percentage
      },
      insights: {
        b2bB2c: "35% B2B / 65% B2C",
        deviceUsage: {
          Mobile: 62,
          Desktop: 38,
        },
        engagement: {
          avgSession: 8.5, // minutes
          pagesPerSession: 4.2,
          bounceRate: 42.3,
        },
        topPerforming: {
          product: "Premium Package",
          growth: 24.5,
        },
      },
      subscriptions: [
        {
          key: "1",
          package: "Basic",
          total: Math.floor(totalUsers * 0.5),
          active: Math.floor(totalUsers * 0.35),
          renewal: 78,
          price: "$19.99",
        },
        {
          key: "2",
          package: "Premium",
          total: Math.floor(totalUsers * 0.3),
          active: Math.floor(totalUsers * 0.25),
          renewal: 85,
          price: "$49.99",
        },
        {
          key: "3",
          package: "Enterprise",
          total: Math.floor(totalUsers * 0.2),
          active: Math.floor(totalUsers * 0.1),
          renewal: 92,
          price: "$99.99",
        },
      ],
    };

    res.status(200).json({ data: dashboardData });
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


