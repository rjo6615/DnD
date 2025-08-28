const express = require("express");
const app = express();
app.set('trust proxy', 1);
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const csrf = require("csurf");
const path = require('path');
const config = require("./utils/config");
const connectToDatabase = require("./db/conn");
const routes = require("./routes");
const logger = require("./utils/logger");
const port = process.env.PORT || 5000;
const allowedOrigins = config.clientOrigins;

// Restrict cross-origin requests to approved clients
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
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

const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    sameSite: 'none',
    secure: true,
  },
});
app.use(csrfProtection);

app.get('/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  validate: { trustProxy: false },
});

app.use(['/login', '/logout', '/users/verify'], authLimiter);
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
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ message: 'Invalid CSRF token' });
  }
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
