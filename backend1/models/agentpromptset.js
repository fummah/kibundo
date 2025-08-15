module.exports = (sequelize, DataTypes) => {
  const AgentPromptSet = sequelize.define('AgentPromptSet', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.TEXT, unique: true },
    description: DataTypes.TEXT,
    prompts: { type: DataTypes.JSONB, allowNull: false },
    version: { type: DataTypes.TEXT, defaultValue: 'v1' },
    stage: { type: DataTypes.ENUM('staging','prod'), defaultValue: 'staging' },
    created_by: DataTypes.INTEGER,
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'agent_prompt_sets',
    timestamps: false
  });
  return AgentPromptSet;
};
