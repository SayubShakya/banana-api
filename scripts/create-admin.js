// Creates an admin account, or promotes an existing user to admin.
// Usage: npm run create-admin -- <username> <password>
//
// Scaffolding written with Claude (Anthropic), Oct 2026; reviewed by Sayub Shakya.

const path = require('node:path');
const bcrypt = require('bcryptjs');
const { openDatabase } = require('../server/db/database');

const [username, password] = process.argv.slice(2);
if (!username) {
  console.error('Usage: npm run create-admin -- <username> <password>');
  process.exit(1);
}

const db = openDatabase(process.env.DB_FILE || path.join(__dirname, '..', 'data', 'banana.db'));
const existing = db.findUserByUsername(username);

if (existing) {
  db.setRole(existing.id, 'admin');
  console.log(`${existing.username} is now an admin.`);
} else {
  if (!password || password.length < 8) {
    console.error('New admin needs a password of at least 8 characters.');
    process.exit(1);
  }
  db.createUser(username, bcrypt.hashSync(password, 10), 'admin');
  console.log(`Admin account "${username}" created.`);
}
db.close();
