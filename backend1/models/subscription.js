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
    }
  }, {
    tableName: 'subscriptions',
    timestamps: false
  });
  return Subscription;
};
