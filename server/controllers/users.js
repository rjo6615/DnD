const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const authenticateUser = require('../utils/authenticateUser');

const jwtSecretKey = process.env.JWT_SECRET;

async function login(req, res) {
  const { username, password } = req.body;
  const db_connect = req.db;
  try {
    const user = await authenticateUser(db_connect, username, password);
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    const token = jwt.sign({ username: user.username }, jwtSecretKey, { expiresIn: '1h' });
    res.json({ token });
    console.debug('JWT token generated for login request', {
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function verifyUser(req, res) {
  const { username, password } = req.body;
  const db_connect = req.db;
  try {
    const user = await authenticateUser(db_connect, username, password);
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    res.json({ valid: true });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
}

function getUsers(req, res) {
  const db_connect = req.db;
  db_connect
    .collection('users')
    .find({})
    .toArray(function (err, result) {
      if (err) {
        return res.status(500).json({ message: 'Internal server error' });
      }
      res.json(result);
    });
}

function getUser(req, res) {
  const db_connect = req.db;
  const myquery = { username: req.params.username };
  db_connect
    .collection('users')
    .findOne(myquery, function (err, user) {
      if (err) {
        return res.status(500).json({ message: 'Internal server error' });
      }
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    });
}

function addUser(req, res) {
  const { username, password } = req.body;

  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      return res.status(500).json({ message: 'Internal server error' });
    }

    const db_connect = req.db;
    const myobj = {
      username: username,
      password: hashedPassword,
    };

    db_connect.collection('users').insertOne(myobj, function (err, result) {
      if (err) {
        return res.status(500).json({ message: 'Internal server error' });
      }
      res.json(result);
    });
  });
}

module.exports = {
  login,
  verifyUser,
  getUsers,
  getUser,
  addUser,
};
