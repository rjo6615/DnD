const jwt = require('jsonwebtoken');
const jwtSecretKey = process.env.JWT_SECRET;

module.exports = function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token;

  if (req.headers.cookie) {
    const match = req.headers.cookie
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith('token='));
    if (match) {
      token = match.split('=')[1];
    }
  }

  token = token || (authHeader && authHeader.split(' ')[1]);

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
