module.exports = (sequelize, DataTypes) => {
  const Curriculum = sequelize.define('Curriculum', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    bundesland: DataTypes.TEXT,
    subject: DataTypes.TEXT,
    grade: DataTypes.INTEGER,
    version: { type: DataTypes.TEXT, defaultValue: 'v1' },
    content: { type: DataTypes.JSONB, allowNull: false },
    status: { type: DataTypes.ENUM('draft','review','published'), defaultValue: 'draft' },
    created_by: DataTypes.INTEGER,
    published_at: DataTypes.DATE,
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'curricula',
    timestamps: false
  });
  return Curriculum;
};
