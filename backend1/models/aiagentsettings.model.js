// models/aiagent_settings.model.js
module.exports = (sequelize, DataTypes) => {
  const AiAgentSettings = sequelize.define('AiAgentSettings', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    child_default_ai: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    parent_default_ai: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    temperature: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: false,
      defaultValue: 0.7,
      validate: {
        min: 0,
        max: 1,
      },
    },
    openai_model: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'gpt-4o',
    },
  }, {
    tableName: 'aiagent_settings',
    timestamps: true,         // enables createdAt and updatedAt
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return AiAgentSettings;
};
