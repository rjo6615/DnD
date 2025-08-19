const express = require("express");
const app = express();
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config({ path: "./config.env" });
const port = process.env.PORT || 5000;
const path = require('path');
const connectToDatabase = require("./db/conn");
const routes = require("./routes");

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(routes);

// Adjusted to serve static files from the correct build directory
app.use(express.static(path.join(__dirname, '../client/build')));

app.get('*', (req, res) => {
  // Adjusted path for sending index.html
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

// Centralized error-handling middleware
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

async function startServer() {
  try {
    await connectToDatabase();
    app.listen(port, '0.0.0.0', () => {
      console.log(`Server is running on port: ${port}`);
    });
  } catch (err) {
    console.error(err);
  }
}

startServer();
