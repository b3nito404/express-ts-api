import jwt from 'jsonwebtoken';
import config from '../config';
import userRepository, { PaginatedResult } from '../repositories/user.repository';
import {
  CreateUserDto,
  UpdateUserDto,
  LoginDto,
  ChangePasswordDto,
  UserQueryDto,
  UserResponseDto,
  AuthResponseDto,
} from '../dtos/user.dto';
import { IUserDocument } from '../models/user.model';

class AppError extends Error {
  constructor(public message: string, public statusCode: number) {
    super(message);
    this.name = 'AppError';
  }
}

const toUserResponse = (user: IUserDocument): UserResponseDto => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role,
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

class UserService {
  async register(dto: CreateUserDto): Promise<AuthResponseDto> {
    const exists = await userRepository.emailExists(dto.email);
    if (exists) throw new AppError('Email already in use', 409);

    const user = await userRepository.create(dto);
    const token = this.generateToken(user._id.toString());

    return { token, user: toUserResponse(user) };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await userRepository.findByEmail(dto.email);
    if (!user || !user.isActive) throw new AppError('Invalid credentials', 401);

    const isMatch = await user.comparePassword(dto.password);
    if (!isMatch) throw new AppError('Invalid credentials', 401);

    const token = this.generateToken(user._id.toString());
    return { token, user: toUserResponse(user) };
  }

  async getAll(query: UserQueryDto): Promise<PaginatedResult<UserResponseDto>> {
    const result = await userRepository.findAll(query);
    return {
      ...result,
      data: result.data.map(toUserResponse),
    };
  }

  async getById(id: string): Promise<UserResponseDto> {
    const user = await userRepository.findById(id);
    if (!user) throw new AppError('User not found', 404);
    return toUserResponse(user);
  }

  async update(id: string, dto: UpdateUserDto, requesterId: string, requesterRole: string): Promise<UserResponseDto> {
    const user = await userRepository.findById(id);
    if (!user) throw new AppError('User not found', 404);

    if (requesterId !== id && requesterRole !== 'admin') {
      throw new AppError('Forbidden: cannot update another user', 403);
    }

    if (dto.email && dto.email !== user.email) {
      const exists = await userRepository.emailExists(dto.email, id);
      if (exists) throw new AppError('Email already in use', 409);
    }

    const updated = await userRepository.update(id, dto);
    if (!updated) throw new AppError('User not found', 404);
    return toUserResponse(updated);
  }

  async delete(id: string): Promise<void> {
    const deleted = await userRepository.delete(id);
    if (!deleted) throw new AppError('User not found', 404);
  }

  async changePassword(id: string, dto: ChangePasswordDto): Promise<void> {
    const user = await userRepository.findByEmail(
      (await userRepository.findById(id))?.email || ''
    );
    if (!user) throw new AppError('User not found', 404);

    const isMatch = await user.comparePassword(dto.currentPassword);
    if (!isMatch) throw new AppError('Current password is incorrect', 400);

    await userRepository.updatePassword(id, dto.newPassword);
  }

  private generateToken(userId: string): string {
    return jwt.sign({ id: userId }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    } as jwt.SignOptions);
  }
}

export { AppError };
export default new UserService();