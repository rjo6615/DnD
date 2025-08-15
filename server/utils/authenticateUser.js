const bcrypt = require('bcryptjs');

async function authenticateUser(db, username, password) {
  const user = await db.collection('users').findOne({ username });
  if (!user) {
    return null;
  }
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return null;
  }
  return user;
}

module.exports = authenticateUser;
