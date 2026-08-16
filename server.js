const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");

dotenv.config();

const { connectDB } = require("./config/db");

// 🔗 ROUTES
const userRoutes = require("./routes/user.routes");
const adminRoutes = require("./routes/admin.routes");

connectDB();

const app = express();

// 🔐 SECURITY MIDDLEWARE
app.use(helmet());

// 🌍 CORS CONFIG (restrict in production)
app.use(
  cors({
    origin: "*", // ⚠️ change to your frontend URL in production
    credentials: true,
  })
);

// 📦 BODY PARSER
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🚀 API ROUTES
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);

// 🩺 HEALTH CHECK
app.get("/", (req, res) => {
  res.send("API is running...");
});

// 🔥 SERVER START
const PORT = process.env.PORT || 5000;

app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);