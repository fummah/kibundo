module.exports = (sequelize, DataTypes) => {
  const Price = sequelize.define('Price', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    stripe_price_id: { type: DataTypes.TEXT, unique: true },
    product_id: DataTypes.INTEGER,
    nickname: DataTypes.TEXT,
    unit_amount_cents: DataTypes.INTEGER,
    currency: DataTypes.TEXT,
    interval: DataTypes.TEXT,
    active: { type: DataTypes.BOOLEAN, defaultValue: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'prices',
    timestamps: false
  });
  return Price;
};
