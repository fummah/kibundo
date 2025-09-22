// models/student.js
module.exports = (sequelize, DataTypes) => {
  const Student = sequelize.define("Student", {
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
    },
        parent_id: {
      type: DataTypes.INTEGER
    }
  }, {
    tableName: 'students',
    timestamps: false
  });

    Student.associate = (models) => {

    Student.belongsTo(models.class, {
      foreignKey: 'class_id',
      as: 'class'
    });

    Student.belongsTo(models.user, {
    foreignKey: 'user_id',
    as: 'user'
  });

     Student.belongsTo(models.parent, {
      foreignKey: 'parent_id',
      as: 'parent'
    });

 Student.hasMany(models.student_subjects , {
      foreignKey: "student_id",
      as: 'subject'
    });

  };
  


  return Student;
};
