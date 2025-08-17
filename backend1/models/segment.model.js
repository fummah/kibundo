module.exports = (sequelize, DataTypes) => {
  const Segment = sequelize.define('Segment', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.TEXT, unique: true },
    description: DataTypes.TEXT,
    criteria: { type: DataTypes.JSONB, allowNull: false },
    created_by: DataTypes.INTEGER,
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'segments',
    timestamps: false
  });
  return Segment;
};
