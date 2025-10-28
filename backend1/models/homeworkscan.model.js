module.exports = (sequelize, DataTypes) => {
  const HomeworkScan = sequelize.define("HomeworkScan", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    student_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    file_url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    detected_subject: {
      type: DataTypes.STRING,
      allowNull: true
    },
    grade: {
      type: DataTypes.STRING,
      allowNull: true
    },
    publisher: {
      type: DataTypes.STRING,
      allowNull: true
    },
    tags: {
      type: DataTypes.STRING,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    processed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    raw_text: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    api_tokens_used: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    api_cost_usd: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: true,
      defaultValue: 0.000000
    }
    // NOTE: status column doesn't exist in database yet
    // Uncomment this after your backend developer adds this column:
    // status: {
    //   type: DataTypes.ENUM('pending', 'completed', 'cancelled'),
    //   defaultValue: 'pending'
    // }
  }, {
    timestamps: false, // disable Sequelize's automatic createdAt/updatedAt
    tableName: "homework_scans"
  });

  HomeworkScan.associate = (models) => {

    HomeworkScan.belongsTo(models.student, {
      foreignKey: 'student_id',
      as: 'student'
    });
  };

  return HomeworkScan;
};
