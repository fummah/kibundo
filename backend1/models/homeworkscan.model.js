module.exports = (sequelize, DataTypes) => {
  const HomeworkScan = sequelize.define('HomeworkScan', {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    child_id: DataTypes.INTEGER,
    file_url: { type: DataTypes.TEXT, allowNull: false },
    detected_subject: DataTypes.TEXT,
    grade: DataTypes.INTEGER,
    publisher: DataTypes.TEXT,
    tags: DataTypes.ARRAY(DataTypes.TEXT),
    notes: DataTypes.TEXT,
    processed_at: DataTypes.DATE,
    created_by: DataTypes.INTEGER,
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'homework_scans',
    timestamps: false
  });
  return HomeworkScan;
};
