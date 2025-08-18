const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config({ path: "./config.env" });
const port = process.env.PORT || 5000;
const path = require('path');
const connectToDatabase = require("./db/conn");
const routes = require("./routes");

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
function parseCookies(req, res, next) {
  req.cookies = {};
  const raw = req.headers.cookie;
  if (raw) {
    raw.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      const key = parts.shift().trim();
      const value = decodeURIComponent(parts.join('='));
      req.cookies[key] = value;
    });
  }
  next();
}
app.use(parseCookies);
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
