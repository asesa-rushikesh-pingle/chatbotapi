'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Order extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Order.init({
    amount: DataTypes.INTEGER,
    slot: DataTypes.STRING,
    qty: DataTypes.INTEGER,
    name: DataTypes.STRING,
    mobile: DataTypes.STRING,
    address: DataTypes.STRING,
    city: DataTypes.STRING,
    picode: DataTypes.STRING,
    status: DataTypes.STRING,
    age: DataTypes.STRING,
    landmark: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'Order',
  });
  return Order;
};