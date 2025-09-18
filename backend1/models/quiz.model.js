// models/quiz.model.js
module.exports = (sequelize, DataTypes) => {
  const Quiz = sequelize.define('quiz', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: DataTypes.TEXT,
    description: DataTypes.TEXT,
    tags: DataTypes.ARRAY(DataTypes.TEXT),
    subject: DataTypes.TEXT,
    grade: DataTypes.INTEGER,
    bundesland: DataTypes.TEXT,
    difficulty: DataTypes.TEXT,
    objectives: DataTypes.ARRAY(DataTypes.TEXT),
    status: { type: DataTypes.ENUM('draft', 'review', 'live'), defaultValue: 'draft' },
    created_by: DataTypes.INTEGER,
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'quizzes',
    timestamps: false,
  });

  Quiz.associate = (models) => {
    Quiz.hasMany(models.quizItem, {
      foreignKey: { name: 'quiz_id', allowNull: false },
      as: 'items',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      hooks: true,
    });
  };

  return Quiz;
};
