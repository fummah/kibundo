module.exports = (sequelize, DataTypes) => {
  const Worksheet = sequelize.define('Worksheet', {
    id: { 
      type: DataTypes.INTEGER, 
      autoIncrement: true, 
      primaryKey: true 
    },
    title: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    description: { 
      type: DataTypes.TEXT, 
      allowNull: true 
    },
    subject: { 
      type: DataTypes.STRING, 
      allowNull: true 
    },
    grade_level: { 
      type: DataTypes.STRING, 
      allowNull: true 
    },
    file_url: { 
      type: DataTypes.TEXT, 
      allowNull: true 
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
    tableName: 'worksheets',
    timestamps: false // we are managing created_at / updated_at manually
  });

  Worksheet.associate = (models) => {

  };

  return Worksheet;
};
