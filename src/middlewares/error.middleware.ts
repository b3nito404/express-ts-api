import { Request, Response, NextFunction } from 'express';
import { Error as MongooseError } from 'mongoose';
import { MongoServerError } from 'mongodb';
import logger from '../utils/logger';
import { sendError } from '../utils/apiResponse';
import { AppError } from '../services/user.service';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  logger.error({ message: err.message, stack: err.stack, path: req.path, method: req.method });

  // Known application errors
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode);
    return;
  }

  // Mongoose validation error
  if (err instanceof MongooseError.ValidationError) {
    const errors = Object.values(err.errors).map((e) => e.message);
    sendError(res, 'Validation error', 400, errors);
    return;
  }

  // Mongoose cast error (invalid ObjectId)
  if (err instanceof MongooseError.CastError) {
    sendError(res, `Invalid ${err.path}: ${err.value}`, 400);
    return;
  }

  // MongoDB duplicate key
  if (err instanceof MongoServerError && err.code === 11000) {
    const field = Object.keys(err.keyValue || {}).join(', ');
    sendError(res, `Duplicate value for field: ${field}`, 409);
    return;
  }

  // Default
  const statusCode = 500;
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  sendError(res, message, statusCode);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  sendError(res, `Route ${req.originalUrl} not found`, 404);
};