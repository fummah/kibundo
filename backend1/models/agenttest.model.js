module.exports = (sequelize, DataTypes) => {
  const AgentTest = sequelize.define('AgentTest', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    prompt_set_id: DataTypes.INTEGER,
    input: DataTypes.JSONB,
    output: DataTypes.JSONB,
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'agent_tests',
    timestamps: false
  });
  return AgentTest;
};
