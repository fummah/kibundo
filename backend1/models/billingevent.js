module.exports = (sequelize, DataTypes) => {
  const BillingEvent = sequelize.define('BillingEvent', {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    stripe_event_id: { type: DataTypes.TEXT, unique: true },
    type: DataTypes.TEXT,
    payload: DataTypes.JSONB,
    received_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    processed: { type: DataTypes.BOOLEAN, defaultValue: false }
  }, {
    tableName: 'billing_events',
    timestamps: false
  });
  return BillingEvent;
};
