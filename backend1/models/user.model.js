module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define("user", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    first_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'Pending'
    },
    contact_number: {
      type: DataTypes.STRING,
      allowNull: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: "users",
    timestamps: false
  });

  // Optional: associate with Role if Role model exists
  User.associate = (models) => {
    User.belongsTo(models.role, {
      foreignKey: 'role_id',
      as: 'role'
    });

    User.hasMany(models.student, {
    foreignKey: 'user_id',
    as: 'student'
  });

  User.hasMany(models.teacher, {
    foreignKey: 'user_id',
    as: 'teacher'
  });
  };


  return User;
};
