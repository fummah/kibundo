module.exports = (sequelize, DataTypes) => {
  const Class = sequelize.define("Class", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    class_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    timestamps: false, // disable Sequelize's automatic createdAt/updatedAt
    tableName: "classes"
  });

    Class.associate = (models) => {
    Class.belongsTo(models.user, {
      foreignKey: 'created_by',
      as: 'userCreated'
    });

    Class.hasMany(models.student, {
    foreignKey: 'class_id',
    as: 'student'
  });

  Class.hasMany(models.teacher, {
    foreignKey: 'class_id',
    as: 'teacher'
  });
  };

  return Class;
};
