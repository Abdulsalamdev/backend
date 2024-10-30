const mongoose = require("mongoose");
const Joi = require("joi");

const productSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    brand: {
      type: String,
      required: true,
    },
    price: {
      type: String,
      required: true,
    },
    negotitable: {
      type: Boolean,
    },
    discription: {
      type: String,
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

//creating a Product model
const Product = mongoose.model("Product", productSchema);

// creating a product validator

const ProductValidator = (product) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    brand: Joi.string().required(),
    price: Joi.string().required(),
    negotitable: Joi.boolean(),
    discription: Joi.string(),
  });
  return schema.validate(product);
};

module.exports = { Product, ProductValidator };
