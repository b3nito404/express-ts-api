import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: unknown[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200,
  meta?: ApiResponse['meta']
): Response => {
  const response: ApiResponse<T> = { success: true, message, data };
  if (meta) response.meta = meta;
  return res.status(statusCode).json(response);
};

export const sendCreated = <T>(res: Response, data: T, message = 'Resource created'): Response =>
  sendSuccess(res, data, message, 201);

export const sendError = (
  res: Response,
  message = 'Internal server error',
  statusCode = 500,
  errors?: unknown[]
): Response => {
  const response: ApiResponse = { success: false, message };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

export const sendNotFound = (res: Response, message = 'Resource not found'): Response =>
  sendError(res, message, 404);

export const sendBadRequest = (res: Response, message = 'Bad request', errors?: unknown[]): Response =>
  sendError(res, message, 400, errors);

export const sendUnauthorized = (res: Response, message = 'Unauthorized'): Response =>
  sendError(res, message, 401);

export const sendForbidden = (res: Response, message = 'Forbidden'): Response =>
  sendError(res, message, 403);

export const sendConflict = (res: Response, message = 'Resource already exists'): Response =>
  sendError(res, message, 409);