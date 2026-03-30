import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User, { UserRole } from '../src/models/user.model';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/api_db';

const seedUsers = [
  {
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'Admin@1234',
    role: UserRole.ADMIN,
    isActive: true,
  },
  {
    name: 'Regular User',
    email: 'user@example.com',
    password: 'User@1234',
    role: UserRole.USER,
    isActive: true,
  },
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing users
    await User.deleteMany({});
    console.log('Cleared existing users');

    // Insert seed users
    for (const userData of seedUsers) {
      const user = new User(userData);
      await user.save();
      console.log(`Created user: ${userData.email} (${userData.role})`);
    }

    console.log('\nSeed completed successfully!');
    console.log('Admin:  admin@example.com / Admin@1234');
    console.log('User:   user@example.com  / User@1234');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

seed();