// MongoDB initialization script
// Creates app user with read/write access to the database

db = db.getSiblingDB('api_db');

db.createUser({
  user: 'api_user',
  pwd: 'api_password',
  roles: [{ role: 'readWrite', db: 'api_db' }],
});

// Create initial indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ createdAt: -1 });

print('MongoDB initialized: api_db created with api_user');