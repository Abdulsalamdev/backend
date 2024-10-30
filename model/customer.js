const mongoose = require("mongoose");
const Joi = require("joi");

const customerSchema = new mongoose.Schema(
  {
    first_name: {
      type: String,
      required: true,
    },
    last_name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      uniqe: true,
      required: true,
    },
    phone_number: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      required: true,
    },
    file: {
      fileName: {
        type: String,
        required: [true, "Filename is required"], // e.g., 'document.pdf'
      },
      filePath: {
        type: String,
        match: [
          /^https?:\/\/.+\.(jpg|jpeg|png|gif)$/,
          "Please provide a valid image URL",
        ],
      },
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

const Customer = mongoose.model("Customer", customerSchema);

const CustomerValidator = (customer) => {
  const schema = Joi.object({
    first_name: Joi.string().required(),
    last_name: Joi.string().required(),
    phone_number: Joi.string().required(),
    gender: Joi.string().required(),
    email: Joi.string()
      .email({ tlds: { allow: true } })
      .required(),
  });
  return schema.validate(customer);
};

module.exports = { Customer, CustomerValidator };
