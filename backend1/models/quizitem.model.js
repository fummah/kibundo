module.exports = (sequelize, DataTypes) => {
  const QuizItem = sequelize.define('QuizItem', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    quiz_id: DataTypes.INTEGER,
    type: DataTypes.TEXT,
    prompt: DataTypes.TEXT,
    options: DataTypes.JSONB,
    answer_key: DataTypes.JSONB,
    hints: DataTypes.JSONB,
    position: { type: DataTypes.INTEGER, defaultValue: 0 }
  }, {
    tableName: 'quiz_items',
    timestamps: false
  });
  return QuizItem;
};
