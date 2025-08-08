// models/role.js
module.exports = (sequelize, DataTypes) => {
  const Role = sequelize.define("Role", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
     name: {
      type: DataTypes.STRING, // includes time zone support
      allowNull: true
    }
  }, {
    tableName: 'roles',
    timestamps: false
  });

    Role.associate = (models) => {
    Role.hasMany(models.user, {
      foreignKey: "role_id",
    });
  };

  return Role;
};
