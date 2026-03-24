import request from 'supertest';
import app from '../src/app';
import { UserRole } from '../src/models/user.model';

export const createUser = async (overrides: Partial<{
  name: string;
  email: string;
  password: string;
  role: UserRole;
}> = {}) => {
  const data = {
    name: overrides.name ?? 'Test User',
    email: overrides.email ?? `test_${Date.now()}@example.com`,
    password: overrides.password ?? 'Password1',
    role: overrides.role,
  };

  const res = await request(app).post('/api/v1/users/register').send(data);
  return { user: res.body.data?.user, token: res.body.data?.token, raw: res };
};

export const loginUser = async (email: string, password: string) => {
  const res = await request(app).post('/api/v1/users/login').send({ email, password });
  return { token: res.body.data?.token, user: res.body.data?.user, raw: res };
};

export const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });