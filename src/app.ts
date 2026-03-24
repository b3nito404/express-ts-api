import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import config from './config';
import logger from './utils/logger';
import userRoutes from './routes/user.route';
import healthRoutes from './routes/health.route';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

const app: Application = express();

//Secure middleuwares
app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// rate lim
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

//General Middleware 
app.use(compression());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

//http loggihng
if (config.server.nodeEnv !== 'test') {
  app.use(
    morgan('combined', {
      stream: { write: (message) => logger.http(message.trim()) },
    })
  );
}

//routes
const apiPrefix = `/api/${config.server.apiVersion}`;
app.use(`${apiPrefix}/health`, healthRoutes);
app.use(`${apiPrefix}/users`, userRoutes);

//root
app.get('/', (_, res) => {
  res.json({
    success: true,
    message: 'Express TypeScript API',
    version: config.server.apiVersion,
    docs: `${apiPrefix}/health`,
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;