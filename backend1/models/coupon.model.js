module.exports = (sequelize, DataTypes) => {
  const Coupon = sequelize.define('Coupon', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    stripe_coupon_id: { type: DataTypes.TEXT, unique: true },
    name: DataTypes.TEXT,
    percent_off: DataTypes.DECIMAL,
    amount_off_cents: DataTypes.INTEGER,
    currency: DataTypes.TEXT,
    valid: DataTypes.BOOLEAN,
    metadata: { type: DataTypes.JSONB, defaultValue: {} }
  }, {
    tableName: 'coupons',
    timestamps: false
  });
  return Coupon;
};
