const express = require("express");
const app = express();
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
dotenv.config();
const { PORT } = process.env;
const userRoutes = require("./routes/users");
const productRoutes = require("./routes/products");
const customerRoutes = require("./routes/customers");
const orderRoutes = require("./routes/orders");
mongoose
  .connect("mongodb://localhost:27017")
  .then(() => {
    console.log("Connected to MongoDb server");
    app.listen(PORT, () => {
      console.log(`server is running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => console.error("Could not connect to MongoDB server", err));

mongoose.set("strictPopulate", false);
app.use(cors());
app.use(express.json());

app.use("/auth", userRoutes);
app.use("/product", productRoutes);
app.use("/customer", customerRoutes);
app.use("/invoice", orderRoutes);
