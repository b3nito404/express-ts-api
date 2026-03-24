import mongoose from 'mongoose';
import app from './app';
import config from './config';
import logger from './utils/logger';

const { port, nodeEnv } = config.server;
const { uri } = config.db;

let server: ReturnType<typeof app.listen>;

const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.info(`MongoDB connected: ${mongoose.connection.host}`);
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const startServer = async (): Promise<void> => {
  await connectDB();

  server = app.listen(port, () => {
    logger.info(`Server running in ${nodeEnv} mode on port ${port}`);
    logger.info(`API available at http://localhost:${port}/api/${config.server.apiVersion}`);
  });
};

const shutdown = async (signal: string): Promise<void> => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server?.close(async () => {
    logger.info('HTTP server closed');
    await mongoose.connection.close(false);
    logger.info('MongoDB connection closed');
    process.exit(0);
  });

  // Force shutdown after 10s
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  shutdown('unhandledRejection');
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  shutdown('uncaughtException');
});

startServer();

export default app;