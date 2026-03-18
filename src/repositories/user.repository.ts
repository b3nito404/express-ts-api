import User, { IUserDocument } from '../models/user.model';
import { CreateUserDto, UpdateUserDto, UserQueryDto } from '../dtos/user.dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class UserRepository {
  async create(dto: CreateUserDto): Promise<IUserDocument> {
    const user = new User(dto);
    return user.save();
  }

  async findById(id: string): Promise<IUserDocument | null> {
    return User.findById(id);
  }

  async findByEmail(email: string): Promise<IUserDocument | null> {
    return User.findByEmail(email);
  }

  async findAll(query: UserQueryDto): Promise<PaginatedResult<IUserDocument>> {
    const {
      page = 1,
      limit = 10,
      role,
      isActive,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter: Record<string, unknown> = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [data, total] = await Promise.all([
      User.find(filter).sort(sort).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(id: string, dto: UpdateUserDto): Promise<IUserDocument | null> {
    return User.findByIdAndUpdate(id, { $set: dto }, { new: true, runValidators: true });
  }

  async delete(id: string): Promise<IUserDocument | null> {
    return User.findByIdAndDelete(id);
  }

  async emailExists(email: string, excludeId?: string): Promise<boolean> {
    const query: Record<string, unknown> = { email: email.toLowerCase() };
    if (excludeId) query._id = { $ne: excludeId };
    const count = await User.countDocuments(query);
    return count > 0;
  }

  async updatePassword(id: string, newPassword: string): Promise<IUserDocument | null> {
    const user = await User.findById(id);
    if (!user) return null;
    user.password = newPassword;
    return user.save();
  }
}

export default new UserRepository();