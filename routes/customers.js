const express = require("express");
const router = express.Router();
const dotenv = require("dotenv");
const multer = require("multer");
const Auth = require("../middleware/auth");
const { CustomerValidator, Customer } = require("../model/customer");
const { PORT } = process.env;
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

// create a new customer
router.post("/", Auth, upload.single("file"), async (req, res) => {
  try {
    const { first_name, last_name, email, phone_number, gender } = req.body;
    const { error } = CustomerValidator(req.body);
    if (error)
      return res.status(400).send({ message: error.details[0].message });

    const filePath = req.file
      ? `http://localhost:${PORT}/uploads/${req.file.filename}`
      : null; // Create a full URL

    if (!filePath) {
      return res.status(400).send({ message: "File upload failed" });
    }

    const newCustomer = new Customer({
      first_name,
      last_name,
      email,
      phone_number,
      gender,
      file: {
        fileName: req.file.filename,
        filePath: filePath,
      },
    });
    await newCustomer.save();

    return res.status(201).send({
      message: "Customer created successfully",
      newCustomer,
    });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// getting customers list
router.get("/", Auth, async (req, res) => {
  try {
    const filters = {};
    if (req.query.first_name) {
      filters.first_name = new RegExp(req.query.first_name, "i");
    }
    if (req.query.last_name) {
      filters.last_name = new RegExp(req.query.last_name, "i");
    }
    if (req.query.email) {
      filters.email = new RegExp(req.query.email, "i");
    }
    const customers = await Customer.find(filters).sort("first_name");

    return res.status(200).send({ message: customers });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

//getting a customer
router.get("/:id", Auth, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer)
      return res.status(404).send({ message: "Customer not found" });

    return res.status(200).send({ message: customer });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// update a customer
router.put("/:id", Auth, async (req, res) => {
  try {
    const { first_name, last_name, email, phone_number, gender, fileName } =
      req.body;
    const { error } = CustomerValidator(req.body);
    if (error)
      return res.status(400).send({ message: error.details[0].message });

    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!customer)
      return res.status(404).send({ message: "Customer not found" });

    return res.status(200).send({ message: customer });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

//delete a customer
router.delete("/:id", Auth, async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer)
      return res.status(404).send({ message: "Customer not found" });

    return res.status(200).send({ message: "Customer deleted successfully" });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});
module.exports = router;
