const { Sequelize, DataTypes } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: "postgres"
});

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
db.user = require("./user.model")(sequelize, DataTypes);
db.teacher = require("./teacher.model")(sequelize, DataTypes);
db.student = require("./student.model")(sequelize, DataTypes);
db.role = require("./role.model")(sequelize, DataTypes);
db.subject = require("./subject.model")(sequelize, DataTypes);
db.class = require("./class.model")(sequelize, DataTypes);

// Set up associations (VERY IMPORTANT!)
if (db.user.associate) db.user.associate(db);
if (db.teacher.associate) db.teacher.associate(db);
if (db.student.associate) db.student.associate(db);
if (db.role.associate) db.role.associate(db);
if (db.subject.associate) db.subject.associate(db);
if (db.class.associate) db.class.associate(db);

module.exports = db;
