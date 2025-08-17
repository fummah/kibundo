module.exports = (sequelize, DataTypes) => {
  const Invoice = sequelize.define('Invoice', {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    parent_id: DataTypes.INTEGER,
    stripe_invoice_id: { type: DataTypes.TEXT, unique: true },
    status: DataTypes.TEXT,
    total_cents: DataTypes.INTEGER,
    currency: DataTypes.TEXT,
    pdf_url: DataTypes.TEXT,
    lines: DataTypes.JSONB,
    taxes: DataTypes.JSONB,
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'invoices',
    timestamps: false
  });
  return Invoice;
};
