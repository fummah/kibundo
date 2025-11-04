module.exports = (sequelize, DataTypes) => {
  const Subscription = sequelize.define('Subscription', {
    id: { 
        type: DataTypes.BIGINT, 
        autoIncrement: true, 
        primaryKey: true 
    },
    parent_id: { 
        type: DataTypes.INTEGER, 
        allowNull: false 
    },
    stripe_subscription_id: { 
        type: DataTypes.TEXT, 
        unique: true 
    },
    plan_id: { 
        type: DataTypes.TEXT 
    },
    status: { 
      type: DataTypes.ENUM('trialing','active','past_due','canceled','incomplete','incomplete_expired','unpaid')
    },
    current_period_end: { 
        type: DataTypes.DATE 
    },
    raw: { 
        type: DataTypes.JSONB 
    },
    created_at: { 
        type: DataTypes.DATE, 
        defaultValue: DataTypes.NOW 
    },
    updated_at: { 
        type: DataTypes.DATE, 
        defaultValue: DataTypes.NOW 
    },
    created_by: {
      type: DataTypes.STRING, // updated from TIME to STRING (VARCHAR)
      allowNull: true
    }
  }, {
    tableName: 'subscriptions',
    timestamps: false
  });

  Subscription.associate = (models) => {
    Subscription.belongsTo(models.product, {
      foreignKey: 'plan_id',
      as: 'product'
    });
    
    Subscription.belongsTo(models.parent, {
      foreignKey: 'parent_id',
      as: 'parent'
    });
  };
  return Subscription;
};
