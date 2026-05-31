'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    return Promise.all([
      queryInterface.addColumn('Orders', 'age', {
        type: Sequelize.STRING,
        allowNull: true,
      }),
      queryInterface.addColumn('Orders', 'landmark', {
        type: Sequelize.STRING,
        allowNull: true
      }),
      
    ]);
  },

  async down (queryInterface, Sequelize) {
    return Promise.all([
      queryInterface.removeColumn('Orders', 'age'),
      queryInterface.removeColumn('Orders', 'landmark'),
   
    ]);
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  }
};
