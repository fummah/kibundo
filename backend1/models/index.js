const { Sequelize, DataTypes } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "postgres"
  }
);

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Existing models
db.user = require("./user.model")(sequelize, DataTypes);
db.teacher = require("./teacher.model")(sequelize, DataTypes);
db.student = require("./student.model")(sequelize, DataTypes);
db.role = require("./role.model")(sequelize, DataTypes);
db.subject = require("./subject.model")(sequelize, DataTypes);
db.class = require("./class.model")(sequelize, DataTypes);

// New models from your schema
db.parent = require("./parent.model")(sequelize, DataTypes);

// Billing
db.subscription = require("./subscription.model")(sequelize, DataTypes);
db.billingEvent = require("./billingevent.model")(sequelize, DataTypes);

// Invoicing & Products
db.invoice = require("./invoice.model")(sequelize, DataTypes);
db.product = require("./product.model")(sequelize, DataTypes);
db.price = require("./price.model")(sequelize, DataTypes);
db.coupon = require("./coupon.model")(sequelize, DataTypes);

// Newsletter
db.emailTemplate = require("./emailtemplate.model")(sequelize, DataTypes);
db.segment = require("./segment.model")(sequelize, DataTypes);
db.campaign = require("./campaign.model")(sequelize, DataTypes);
db.emailLog = require("./emaillog.model")(sequelize, DataTypes);
db.newsletterOptIn = require("./newsletteroptin.model")(sequelize, DataTypes);

// Blog / News
db.blogpost = require("./blogpost.model")(sequelize, DataTypes);

// Academics
db.curriculum = require("./curriculum.model")(sequelize, DataTypes);

// Quizzes
db.quiz = require("./quiz.model")(sequelize, DataTypes);
db.quizItem = require("./quizitem.model")(sequelize, DataTypes);

// Homework
db.homeworkScan = require("./homeworkscan.model")(sequelize, DataTypes);
db.homeworkScanEvent = require("./homeworkscanevent.model")(sequelize, DataTypes);

// Agent Admin
db.agentPromptSet = require("./agentpromptset.model")(sequelize, DataTypes);
db.agentTest = require("./agenttest.model")(sequelize, DataTypes);

// Load associations if present
Object.keys(db).forEach(modelName => {
  if (db[modelName] && typeof db[modelName].associate === "function") {
    db[modelName].associate(db);
  }
});

module.exports = db;
