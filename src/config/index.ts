import dotenv from 'dotenv';

dotenv.config();

interface Config {
  server: {
    nodeEnv: string;
    port: number;
    apiVersion: string;
  };
  db: {
    uri: string;
    testUri: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
  log: {
    level: string;
  };
}

const config: Config = {
  server: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    apiVersion: process.env.API_VERSION || 'v1',
  },
  db: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/api_db',
    testUri: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/api_test_db',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default_secret_change_me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
  log: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

export default config;