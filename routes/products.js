const express = require("express");
const router = express.Router();
const dotenv = require("dotenv");
const multer = require("multer");
const Auth = require("../middleware/auth");
const { ProductValidator, Product } = require("../model/product");
const { PORT } = process.env;
const path = require("path");
dotenv.config();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname); // Unique file name
  },
});
const upload = multer({ storage });

// add a new product
router.post("/", Auth, upload.single("file"), async (req, res) => {
  try {
    const { name, brand, negotitable, discription, price } = req.body;
    const { error } = ProductValidator(req.body);
    if (error)
      return res.status(400).send({ message: error.details[0].message });

    const filePath = req.file
      ? `http://localhost:${PORT}/uploads/${req.file.filename}`
      : null; // Create a full URL

    if (!filePath) {
      return res.status(400).send({ message: "File upload failed" });
    }

    const newProduct = new Product({
      name,
      brand,
      price,
      discription,
      negotitable,
      file: {
        fileName: req.file.filename,
        filePath: filePath,
      },
    });

    await newProduct.save();
    return res.status(201).send({
      message: "Successfully created a product",
      newProduct,
    });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// get list of product
router.get("/", Auth, async (req, res) => {
  try {
    const filters = {};
    if (req.query.name) {
      filters.name = new RegExp(req.query.name, "i");
    }
    if (req.query.price) {
      filters.price = { $gte: req.query.price };
    }
    if (req.query.brand) {
      filters.brand = new RegExp(req.query.brand, "i");
    }

    // Calculate the total number of products
    const totalProducts = await Product.countDocuments(filters);

    // Filter by createdAt if date range is provided (e.g., startDate and endDate)
    if (req.query.startDate && req.query.endDate) {
      // Parse the start and end dates from query params
      const startDate = new Date(req.query.startDate);
      const endDate = new Date(req.query.endDate);

      // Add the date range filter to the filters object
      filters.createdAt = { $gte: startDate, $lte: endDate };
    } else if (req.query.startDate) {
      // If only start date is provided
      const startDate = new Date(req.query.startDate);
      filters.createdAt = { $gte: startDate };
    } else if (req.query.endDate) {
      // If only end date is provided
      const endDate = new Date(req.query.endDate);
      filters.createdAt = { $lte: endDate };
    }

    const newlyAddedProducts = await Product.countDocuments(filters);
    const products = await Product.find(filters).sort("brand");

    // const newProduct;
    return res.status(200).send({
      totalProducts: totalProducts,
      newProducts: newlyAddedProducts,
    });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

module.exports = router;
