module.exports = (sequelize, DataTypes) => {
  const Campaign = sequelize.define('Campaign', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: DataTypes.TEXT,
    template_id: DataTypes.INTEGER,
    segment_id: DataTypes.INTEGER,
    status: { type: DataTypes.TEXT, defaultValue: 'draft' },
    scheduled_for: DataTypes.DATE,
    sent_at: DataTypes.DATE,
    provider_message_id: DataTypes.TEXT,
    errors: DataTypes.JSONB
  }, {
    tableName: 'campaigns',
    timestamps: false
  });
  return Campaign;
};
