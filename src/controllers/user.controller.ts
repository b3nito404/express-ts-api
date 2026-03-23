import { Request, Response, NextFunction } from 'express';
import userService from '../services/user.service';
import { sendSuccess, sendCreated } from '../utils/apiResponse';
import {
  CreateUserDto,
  UpdateUserDto,
  LoginDto,
  ChangePasswordDto,
  UserQueryDto,
} from '../dtos/user.dto';
import { UserRole } from '../models/user.model';

class UserController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: CreateUserDto = req.body;
      const result = await userService.register(dto);
      sendCreated(res, result, 'User registered successfully');
    } catch (err) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: LoginDto = req.body;
      const result = await userService.login(dto);
      sendSuccess(res, result, 'Login successful');
    } catch (err) {
      next(err);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query: UserQueryDto = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        role: req.query.role as UserRole,
        search: req.query.search as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
      };
      const result = await userService.getAll(query);
      sendSuccess(res, result.data, 'Users retrieved', 200, {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      });
    } catch (err) {
      next(err);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.getById(req.user!.id);
      sendSuccess(res, user, 'Profile retrieved');
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.getById(req.params.id);
      sendSuccess(res, user, 'User retrieved');
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: UpdateUserDto = req.body;
      const user = await userService.update(req.params.id, dto, req.user!.id, req.user!.role);
      sendSuccess(res, user, 'User updated');
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await userService.delete(req.params.id);
      sendSuccess(res, null, 'User deleted');
    } catch (err) {
      next(err);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: ChangePasswordDto = req.body;
      await userService.changePassword(req.user!.id, dto);
      sendSuccess(res, null, 'Password changed successfully');
    } catch (err) {
      next(err);
    }
  }
}

export default new UserController();