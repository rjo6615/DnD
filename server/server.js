const express = require("express");
const app = express();
app.set('trust proxy', true);
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require('path');
const config = require("./utils/config");
const connectToDatabase = require("./db/conn");
const routes = require("./routes");
const logger = require("./utils/logger");
const port = process.env.PORT || 5000;

// Restrict cross-origin requests to a single approved client
app.use(cors({
  origin(origin, callback) {
    if (!origin || origin === config.clientOrigin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(helmet());

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
});

app.use(['/login', '/logout', '/users/verify', '/me'], authLimiter);
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
  logger.error(err);
  const status = err.status || 500;
  const message = status === 500 ? 'Internal Server Error' : err.message;
  res.status(status).json({ message });
});

async function startServer() {
  try {
    await connectToDatabase();
    app.listen(port, '0.0.0.0', () => {
      logger.info(`Server is running on port: ${port}`);
    });
  } catch (err) {
    logger.error(err);
  }
}

startServer();
