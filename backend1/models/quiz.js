module.exports = (sequelize, DataTypes) => {
  const Quiz = sequelize.define('Quiz', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: DataTypes.TEXT,
    description: DataTypes.TEXT,
    tags: DataTypes.ARRAY(DataTypes.TEXT),
    subject: DataTypes.TEXT,
    grade: DataTypes.INTEGER,
    bundesland: DataTypes.TEXT,
    difficulty: DataTypes.TEXT,
    objectives: DataTypes.ARRAY(DataTypes.TEXT),
    status: { type: DataTypes.ENUM('draft','review','live'), defaultValue: 'draft' },
    created_by: DataTypes.INTEGER,
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'quizzes',
    timestamps: false
  });
  return Quiz;
};
