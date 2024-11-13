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
    const total = `$${totalAmount.toFixed(2)}`;
    // Create a new order
    const newOrder = new Order({
      name,
      email,
      address,
      invoice_id,
      userId,
      products,
      orderTotal: total,
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

router.put("/:id", Auth, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!order) return res.status(404).send({ massage: "Order not found" });

    res.status(200).send({ message: order });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

router.get("/total-sales", Auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Prepare the filters
    let filter = { status: "completed" };
    // If a startDate and endDate are provided, filter by createdAt range
    if (startDate && endDate) {
      // Parse the startDate and endDate into Date objects
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Ensure end date includes the full day (i.e., until 11:59:59.999)
      end.setHours(23, 59, 59, 999); // End of the day

      // Add the date range to the filter
      filter.createdAt = { $gte: start, $lte: end };
    }

    // Find all completed orders
    const completedOrders = await Order.find(filter);

    // Calculate the total sales by reducing the array of orders
    const totalSales = completedOrders.reduce((sum, order) => {
      // Convert orderTotal to a number (remove the dollar sign and parse as float)
      const orderTotal = parseFloat(order.orderTotal.replace("$", ""));

      return sum + orderTotal; // Add the orderTotal of each completed order
    }, 0);
    const total = `$${totalSales.toFixed(2)}`;

    // Find all completed orders today (for today's total sales)
    const completedTodayOrders = await Order.find({
      status: "completed",
      createdAt: { $gte: startDate, $lt: endDate }, // Orders created today
    });

    // Calculate total sales for today's orders
    const totalSalesToday = completedTodayOrders.reduce((sum, order) => {
      const orderTotal = parseFloat(order.orderTotal.replace("$", ""));
      return sum + orderTotal;
    }, 0);

    res.status(200).send({
      message: "Total sales for completed orders retrieved successfully.",
      totalSales: total,
      totalSalesToday: `$${totalSalesToday.toFixed(2)}`, // Total sales for completed orders today
      totalCompletedOrders: completedOrders.length, // Total number of completed orders
      totalCompletedTodayOrders: completedTodayOrders.length, // Total number of orders today
    });
  } catch (error) {
    res.status(500).send({ message: `Server error: ${error.message}` });
  }
});

// Use aggregation to get the list of products with total ordered and total sales
router.get("/total-product-sales", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = {};

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Ensure end date includes the full day
      end.setHours(23, 59, 59, 999); // End of the day

      filter.createdAt = { $gte: start, $lte: end };
    }
    // Fetch all completed orders that match the filter
    const completedOrders = await Order.find(filter).populate(
      "productId",
      "name"
    );

    // Create an object to store the total quantity and sales for each product
    const productSales = {};

    // Loop through all completed orders
    completedOrders.forEach((order) => {
      // Loop through each product in the order
      order.products.forEach((product) => {
        const { productId, name, price, quantity } = product;
        const productPrice = parseFloat(price.replace("$", "")); // Remove the dollar sign and convert to float

        // If the product doesn't exist in the productSales object, initialize it
        if (!productSales[productId]) {
          productSales[productId] = {
            name,
            totalOrdered: 0,
            totalSales: 0,
            price,
          };
        }
        // Update total quantity and total sales for the product
        productSales[productId].totalOrdered += quantity;
        productSales[productId].totalSales += quantity * productPrice;
      });
    });

    // Convert the productSales object into an array for easy response
    const productSalesArray = Object.values(productSales).map((product) => ({
      name: product.name,
      totalOrdered: product.totalOrdered,
      totalSales: `$${product.totalSales.toFixed(2)}`,
      price: product.price,
    }));

    // Sort the products by totalSales in descending order
    productSalesArray.sort((a, b) => {
      const salesA = parseFloat(a.totalSales.replace("$", ""));
      const salesB = parseFloat(b.totalSales.replace("$", ""));
      return salesB - salesA; // For descending order
    });

    // Send the response
    res.status(200).send({
      message:
        "Total quantity and sales for each product retrieved successfully.",
      productSales: productSalesArray,
    });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

module.exports = router;
module.exports = router;
