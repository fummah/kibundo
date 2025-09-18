// models/quizitem.model.js
module.exports = (sequelize, DataTypes) => {
  const QuizItem = sequelize.define('quizItem', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    quiz_id: { type: DataTypes.INTEGER, allowNull: false },
    type: DataTypes.TEXT,
    prompt: DataTypes.TEXT,
    options: DataTypes.JSONB,
    answer_key: DataTypes.JSONB,
    hints: DataTypes.JSONB,
    position: { type: DataTypes.INTEGER, defaultValue: 0 }
  }, {
    tableName: 'quiz_items',
    timestamps: false,
  });

  QuizItem.associate = (models) => {
    QuizItem.belongsTo(models.quiz, {
      foreignKey: { name: 'quiz_id', allowNull: false },
      as: 'quiz',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      hooks: true,
    });
  };

  return QuizItem;
};
