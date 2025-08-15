module.exports = (sequelize, DataTypes) => {
  const EmailLog = sequelize.define('EmailLog', {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    campaign_id: DataTypes.INTEGER,
    parent_id: DataTypes.INTEGER,
    email: DataTypes.TEXT,
    event: DataTypes.TEXT,
    provider_id: DataTypes.TEXT,
    payload: DataTypes.JSONB,
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'email_logs',
    timestamps: false
  });
  return EmailLog;
};
