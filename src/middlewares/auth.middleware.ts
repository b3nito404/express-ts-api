import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import userRepository from '../repositories/user.repository';
import { sendUnauthorized, sendForbidden } from '../utils/apiResponse';
import { UserRole } from '../models/user.model';

interface JwtPayload {
  id: string;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: UserRole;
        email: string;
      };
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      sendUnauthorized(res, 'No token provided');
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    const user = await userRepository.findById(decoded.id);
    if (!user || !user.isActive) {
      sendUnauthorized(res, 'User not found or inactive');
      return;
    }

    req.user = { id: user._id.toString(), role: user.role, email: user.email };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      sendUnauthorized(res, 'Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      sendUnauthorized(res, 'Invalid token');
    } else {
      sendUnauthorized(res);
    }
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }
    if (!roles.includes(req.user.role)) {
      sendForbidden(res, 'You do not have permission to perform this action');
      return;
    }
    next();
  };
};