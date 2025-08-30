const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../utils/config');
const jwtSecretKey = jwtSecret;

module.exports = function authenticateToken(req, res, next) {
  const token = req.cookies && req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  jwt.verify(token, jwtSecretKey, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    req.user = user;
    next();
  });
};
