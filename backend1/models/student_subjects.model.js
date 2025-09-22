module.exports = (sequelize, DataTypes) => {
  const StudentSubjects = sequelize.define('StudentSubjects', {
    id: { 
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true 
    },
    student_id: { 
      type: DataTypes.INTEGER,
      allowNull: false
    },
    subject_id: { 
      type: DataTypes.INTEGER,
      allowNull: false
    },
    created_by: { 
      type: DataTypes.STRING,
      allowNull: false
    },
    created_at: { 
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: { 
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'student_subjects',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['student_id', 'subject_id']
      }
    ]
  });

  StudentSubjects.associate = (models) => {
    StudentSubjects.belongsTo(models.student, {
      foreignKey: 'student_id',
      as: 'student'
    });
    StudentSubjects.belongsTo(models.subject, {
      foreignKey: 'subject_id',
      as: 'subject'
    });
  };

  return StudentSubjects;
};
