const express = require("express");
const Product = require("../model/product");
const Auth = require("../middleware/auth");
const { OrderValidator, Order } = require("../model/order");
const router = express.Router();

// creating order Invoice
router.post("/", Auth, async (req, res) => {
  try {
    const { name, email, address, invoice_id, userId, products } = req.body;
    const { error } = OrderValidator(req.body);
    if (error)
      return res.status(400).send({ message: error.details[0].message });

    // Calculate the total order price

    let totalAmount = 0;
    products.forEach((product) => {
      const quantity = parseInt(product.quantity, 10);
      const price = parseFloat(product.price.replace("$", ""));
      totalAmount += quantity * price;
    });

    // Create a new order
    const newOrder = new Order({
      name,
      email,
      address,
      invoice_id,
      userId,
      products,
      orderTotal: `$${totalAmount.toFixed(2)}`,
      status: "pending",
    });

    // Save the order to the database
    await newOrder.save();

    res.status(201).send({
      message: "Order placed successfully!",
      orderId: newOrder,
    });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Route to Get Total Sales
router.get("/totalSales", async (req, res) => {
  try {
    const { startDate, endDate } = req.query; // Optional date range filter

    const query = { status: "completed" }; // Only count completed orders

    // If a date range is provided, filter by the order date range
    if (startDate && endDate) {
      query.orderDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    // Calculate total sales by summing the orderTotal of completed orders
    const totalSales = await Order.aggregate([
      { $match: query },
      { $group: { _id: null, totalSales: { $sum: "$orderTotal" } } },
    ]);

    const total = totalSales.length > 0 ? totalSales[0].totalSales : 0;

    res.status(200).send({
      totalSales: total,
    });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Use aggregation to get the list of products with total ordered and total sales
router.get("/productSales", async (req, res) => {
  try {
    // Use aggregation to get the list of products with total ordered and total sales
    const results = await Order.aggregate([
      {
        $unwind: "$products", // Flatten the products array
      },
      {
        $group: {
          _id: "$products.productId", // Group by productId
          totalOrdered: { $sum: "$products.quantity" }, // Total quantity ordered for each product
          totalSales: {
            $sum: {
              $multiply: ["$products.quantity", "$products.price"], // Multiply quantity by price to get total sales
            },
          },
        },
      },
      {
        $lookup: {
          from: "products", // Join with the Product collection
          localField: "_id", // The field to match
          foreignField: "_id", // The field in the Product collection
          as: "productDetails", // Store the product details in a new field
        },
      },
      {
        $unwind: "$productDetails", // Unwind the product details array to access the fields
      },
      {
        $project: {
          _id: 0, // Remove the default _id field
          productId: "$_id", // Product ID
          productName: "$productDetails.name", // Product Name
          price: "$productDetails.price", // Product Price
          totalOrdered: 1, // Total quantity ordered
          totalSales: 1, // Total sales
        },
      },
      {
        $sort: { totalSales: -1 }, // Sort by totalSales in descending order (top selling first)
      },
    ]);

    // Return the aggregated results
    res.status(200).send({
      message:
        "List of products with total ordered and total sales (sorted by top selling)",
      data: results,
    });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

module.exports = router;

//   { "productId": "6722372a5043b1d3d8b1e22e", "quantity": "2" }
