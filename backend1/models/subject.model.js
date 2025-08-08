module.exports = (sequelize, DataTypes) => {
  const Subject = sequelize.define("Subject", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    subject_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
      class_id: {
      type: DataTypes.INTEGER,
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
    tableName: "subjects"
  });

  Subject.associate = (models) => {
    Subject.belongsTo(models.user, {
      foreignKey: 'created_by',
      as: 'userCreated'
    });

      Subject.belongsTo(models.class, {
      foreignKey: "class_id",
      as: "class"
    });

  };

  return Subject;
};
