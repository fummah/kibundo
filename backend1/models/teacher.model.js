// models/teacher.js
module.exports = (sequelize, DataTypes) => {
  const Teacher = sequelize.define("Teacher", {
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
    class_id: {
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
    tableName: 'teachers',
    timestamps: false
  });

    // Optional: associate with Role if Role model exists
  Teacher.associate = (models) => {
    Teacher.belongsTo(models.user, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

     Teacher.associate = (models) => {

    Teacher.belongsTo(models.class, {
      foreignKey: 'class_id',
      as: 'class'
    });

    Teacher.belongsTo(models.user, {
    foreignKey: 'user_id',
    as: 'user'
  });

  };

  return Teacher;
};
