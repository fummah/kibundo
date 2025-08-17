module.exports = (sequelize, DataTypes) => {
  const EmailTemplate = sequelize.define('EmailTemplate', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.TEXT, unique: true },
    subject: DataTypes.TEXT,
    body_html: DataTypes.TEXT,
    body_text: DataTypes.TEXT,
    category: DataTypes.TEXT,
    created_by: DataTypes.INTEGER,
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'email_templates',
    timestamps: false
  });
  return EmailTemplate;
};
