const mongoose = require("mongoose");
const Joi = require("joi");

const orderSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  invoice_id: {
    type: String,
    required: true,
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  products: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: { type: String, required: true },
      price: { type: String, required: true },
    },
  ],
  orderTotal: { type: String, required: true }, // Calculated at the time of order creation
  status: { type: String, default: "pending" }, // Or any other statuses like 'completed'
  orderDate: { type: Date, default: Date.now },
});

const Order = mongoose.model("Order", orderSchema);

// order Validator

const OrderValidator = (order) => {
  const schema = Joi.object({
    userId: Joi.string().required(), // userId is a required string
    name: Joi.string().required(),
    email: Joi.string()
      .email({ tlds: { allow: true } })
      .required(),
    address: Joi.string().required(),
    invoice_id: Joi.string().required(),
    products: Joi.array()
      .items(
        Joi.object({
          productId: Joi.string().required(),
          quantity: Joi.string().required(),
          price: Joi.string().required(),
        })
      )
      .min(1)
      .required(), // products array must contain at least 1 product
  });
  return schema.validate(order);
};

module.exports = { Order, OrderValidator };
