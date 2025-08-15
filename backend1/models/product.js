module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define('Product', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    stripe_product_id: { type: DataTypes.TEXT, unique: true },
    name: DataTypes.TEXT,
    description: DataTypes.TEXT,
    active: { type: DataTypes.BOOLEAN, defaultValue: true },
    metadata: { type: DataTypes.JSONB, defaultValue: {} },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'products',
    timestamps: false
  });
  return Product;
};

