module.exports = (sequelize, DataTypes) => {
  const HomeworkScanEvent = sequelize.define('HomeworkScanEvent', {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    scan_id: DataTypes.BIGINT,
    actor_id: DataTypes.INTEGER,
    action: DataTypes.TEXT,
    payload: DataTypes.JSONB,
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'homework_scan_events',
    timestamps: false
  });
  return HomeworkScanEvent;
};
