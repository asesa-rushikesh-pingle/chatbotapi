'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {

      await queryInterface.addColumn('Users', 'primaryColor', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "",
    });

    await queryInterface.addColumn('Users', 'secondaryColor', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "",
    });

    await queryInterface.addColumn('Users', 'chatPosition', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "",
    });

    await queryInterface.addColumn('Users', 'greetingMessage', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "",
    });

    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
  },

  async down (queryInterface, Sequelize) {
     await queryInterface.removeColumn('Users', 'primaryColor');
    await queryInterface.removeColumn('Users', 'secondaryColor');
    await queryInterface.removeColumn('Users', 'chatPosition');
    await queryInterface.removeColumn('Users', 'greetingMessage');
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  }
};
