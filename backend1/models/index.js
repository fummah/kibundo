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
db.parent = require("./parent")(sequelize, DataTypes);

// Billing
db.subscription = require("./subscription")(sequelize, DataTypes);
db.billingEvent = require("./billingevent")(sequelize, DataTypes);

// Invoicing & Products
db.invoice = require("./invoice")(sequelize, DataTypes);
db.product = require("./product")(sequelize, DataTypes);
db.price = require("./price")(sequelize, DataTypes);
db.coupon = require("./coupon")(sequelize, DataTypes);

// Newsletter
db.emailTemplate = require("./emailtemplate")(sequelize, DataTypes);
db.segment = require("./segment")(sequelize, DataTypes);
db.campaign = require("./campaign")(sequelize, DataTypes);
db.emailLog = require("./emaillog")(sequelize, DataTypes);
db.newsletterOptIn = require("./newsletteroptin")(sequelize, DataTypes);

// Blog / News
db.blogPost = require("./blogpost")(sequelize, DataTypes);

// Academics
db.curriculum = require("./curriculum")(sequelize, DataTypes);

// Quizzes
db.quiz = require("./quiz")(sequelize, DataTypes);
db.quizItem = require("./quizitem")(sequelize, DataTypes);

// Homework
db.homeworkScan = require("./homeworkscan")(sequelize, DataTypes);
db.homeworkScanEvent = require("./homeworkscanevent")(sequelize, DataTypes);

// Agent Admin
db.agentPromptSet = require("./agentpromptset")(sequelize, DataTypes);
db.agentTest = require("./agenttest")(sequelize, DataTypes);

// Load associations if present
Object.keys(db).forEach(modelName => {
  if (db[modelName] && typeof db[modelName].associate === "function") {
    db[modelName].associate(db);
  }
});

module.exports = db;
