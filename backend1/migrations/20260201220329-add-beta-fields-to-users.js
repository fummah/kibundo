'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add beta fields to users table
    await queryInterface.addColumn('users', 'is_beta', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });

    await queryInterface.addColumn('users', 'beta_status', {
      type: Sequelize.ENUM('pending', 'approved', 'rejected'),
      defaultValue: null
    });

    await queryInterface.addColumn('users', 'beta_requested_at', {
      type: Sequelize.DATE,
      defaultValue: null
    });

    await queryInterface.addColumn('users', 'beta_approved_at', {
      type: Sequelize.DATE,
      defaultValue: null
    });

    await queryInterface.addColumn('users', 'beta_approved_by', {
      type: Sequelize.INTEGER,
      defaultValue: null,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  async down (queryInterface, Sequelize) {
    // Remove beta fields from users table
    await queryInterface.removeColumn('users', 'is_beta');
    await queryInterface.removeColumn('users', 'beta_status');
    await queryInterface.removeColumn('users', 'beta_requested_at');
    await queryInterface.removeColumn('users', 'beta_approved_at');
    await queryInterface.removeColumn('users', 'beta_approved_by');
  }
};
