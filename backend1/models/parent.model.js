// models/parent.js
module.exports = (sequelize, DataTypes) => {
  const Parent = sequelize.define("Parent", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE, // includes time zone support
      allowNull: true
    },
    created_by: {
      type: DataTypes.STRING, // updated from TIME to STRING (VARCHAR)
      allowNull: true
    }
  }, {
    tableName: 'parents',
    timestamps: false
  });

    // Optional: associate with Role if Role model exists
  Parent.associate = (models) => {
    Parent.belongsTo(models.user, {
      foreignKey: 'user_id',
      as: 'user'
    });

      Parent.hasMany(models.student, {
    foreignKey: 'parent_id',
    as: 'student'
  });

    Parent.hasMany(models.subscription, {
      foreignKey: 'parent_id',
      as: 'subscriptions'
    });

    Parent.hasMany(models.invoice, {
      foreignKey: 'parent_id',
      as: 'invoices'
    });
  };

  return Parent;
};
