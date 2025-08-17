module.exports = (sequelize, DataTypes) => {
  const NewsletterOptIn = sequelize.define('NewsletterOptIn', {
    parent_id: { type: DataTypes.INTEGER, primaryKey: true },
    opted_in: { type: DataTypes.BOOLEAN, defaultValue: true },
    double_optin_token: DataTypes.TEXT,
    confirmed_at: DataTypes.DATE
  }, {
    tableName: 'newsletter_opt_in',
    timestamps: false
  });
  return NewsletterOptIn;
};
