module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define('Product', {
    id: { 
      type: DataTypes.INTEGER, 
      autoIncrement: true, 
      primaryKey: true 
    },
    stripe_product_id: { 
      type: DataTypes.TEXT, 
      unique: true 
    },
    name: DataTypes.TEXT,
    description: DataTypes.TEXT,
    price: { 
      type: DataTypes.DECIMAL(10, 2), 
      allowNull: false, 
      defaultValue: 0 
    },
    active: { 
      type: DataTypes.BOOLEAN, 
      defaultValue: true 
    },
    metadata: { 
      type: DataTypes.JSONB, 
      defaultValue: {} 
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
      type: DataTypes.STRING, 
      allowNull: true
    }
  }, {
    tableName: 'products',
    timestamps: false
  });

  Product.associate = (models) => {
    Product.hasMany(models.subscription, {
      foreignKey: 'plan_id',
      as: 'product'
    });

    
  };

  return Product;
};
