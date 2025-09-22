module.exports = (sequelize, DataTypes) => {
  const State = sequelize.define('State', {
    id: { 
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    state_name: { 
      type: DataTypes.STRING(150),
      allowNull: false
    },
    created_at: { 
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    created_by: { 
      type: DataTypes.STRING(100),
      allowNull: false
    }
  }, {
    tableName: 'states',
    timestamps: false   // since we’re manually handling created_at
  });

  State.associate = (models) => {
    // Example: If you later create a "City" model
    // State.hasMany(models.City, { foreignKey: 'state_id', as: 'cities' });
  };

  return State;
};
