import request from 'supertest';
import app from '../src/app';
import { createUser, loginUser, authHeader } from './helpers';
import { UserRole } from '../src/models/user.model';

const BASE = '/api/v1/users';

describe('User Auth Endpoints', () => {
  //Register
  describe('POST /users/register', () => {
    it('should register a new user and return token', async () => {
      const res = await request(app).post(`${BASE}/register`).send({
        name: 'Alice',
        email: 'alice@example.com',
        password: 'Password1',
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user).toMatchObject({ name: 'Alice', email: 'alice@example.com' });
      expect(res.body.data.user).not.toHaveProperty('password');
    });

    it('should reject duplicate email', async () => {
      await createUser({ email: 'dup@example.com' });
      const res = await request(app).post(`${BASE}/register`).send({
        name: 'Bob',
        email: 'dup@example.com',
        password: 'Password1',
      });
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should reject weak password', async () => {
      const res = await request(app).post(`${BASE}/register`).send({
        name: 'Bob',
        email: 'bob@example.com',
        password: 'weak',
      });
      expect(res.status).toBe(400);
    });

    it('should reject missing fields', async () => {
      const res = await request(app).post(`${BASE}/register`).send({ name: 'Bob' });
      expect(res.status).toBe(400);
    });
  });

  //login 
  describe('POST /users/login', () => {
    it('should login with valid credentials', async () => {
      await createUser({ email: 'login@example.com', password: 'Password1' });
      const res = await request(app).post(`${BASE}/login`).send({
        email: 'login@example.com',
        password: 'Password1',
      });
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('token');
    });

    it('should reject wrong password', async () => {
      await createUser({ email: 'wrongpw@example.com', password: 'Password1' });
      const res = await request(app).post(`${BASE}/login`).send({
        email: 'wrongpw@example.com',
        password: 'WrongPass1',
      });
      expect(res.status).toBe(401);
    });

    it('should reject non-existent email', async () => {
      const res = await request(app).post(`${BASE}/login`).send({
        email: 'ghost@example.com',
        password: 'Password1',
      });
      expect(res.status).toBe(401);
    });
  });
});

describe('User Protected Endpoints', () => {
  let token: string;
  let userId: string;

  beforeEach(async () => {
    const { user, token: t } = await createUser({ email: 'protected@example.com' });
    token = t;
    userId = user.id;
  });

  //GET /me 
  describe('GET /users/me', () => {
    it('should return current user profile', async () => {
      const res = await request(app).get(`${BASE}/me`).set(authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('protected@example.com');
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app).get(`${BASE}/me`);
      expect(res.status).toBe(401);
    });

    it('should reject invalid token', async () => {
      const res = await request(app).get(`${BASE}/me`).set('Authorization', 'Bearer invalid.token.here');
      expect(res.status).toBe(401);
    });
  });

  //PATCH /users/:id
  describe('PATCH /users/:id', () => {
    it('should update own profile', async () => {
      const res = await request(app)
        .patch(`${BASE}/${userId}`)
        .set(authHeader(token))
        .send({ name: 'Updated Name' });
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Name');
    });

    it('should reject update of another user by non-admin', async () => {
      const { user: other } = await createUser({ email: 'other@example.com' });
      const res = await request(app)
        .patch(`${BASE}/${other.id}`)
        .set(authHeader(token))
        .send({ name: 'Hacked' });
      expect(res.status).toBe(403);
    });

    it('should reject invalid mongo id', async () => {
      const res = await request(app)
        .patch(`${BASE}/not-a-valid-id`)
        .set(authHeader(token))
        .send({ name: 'Test' });
      expect(res.status).toBe(400);
    });
  });

  //Change Password
  describe('PATCH /users/me/password', () => {
    it('should change password with correct current password', async () => {
      const res = await request(app)
        .patch(`${BASE}/me/password`)
        .set(authHeader(token))
        .send({ currentPassword: 'Password1', newPassword: 'NewPassword2' });
      expect(res.status).toBe(200);
    });

    it('should reject wrong current password', async () => {
      const res = await request(app)
        .patch(`${BASE}/me/password`)
        .set(authHeader(token))
        .send({ currentPassword: 'WrongPass1', newPassword: 'NewPassword2' });
      expect(res.status).toBe(400);
    });
  });
});

describe('User Admin Endpoints', () => {
  let adminToken: string;
  let userToken: string;
  let targetUserId: string;

  beforeEach(async () => {
    const { token: at } = await createUser({ email: 'admin@example.com', role: UserRole.ADMIN });
    adminToken = at;
    const { token: ut, user } = await createUser({ email: 'regular@example.com' });
    userToken = ut;
    targetUserId = user.id;
  });

  describe('GET /users', () => {
    it('should allow admin to list users', async () => {
      const res = await request(app).get(`${BASE}`).set(authHeader(adminToken));
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should deny regular user from listing users', async () => {
      const res = await request(app).get(`${BASE}`).set(authHeader(userToken));
      expect(res.status).toBe(403);
    });

    it('should support pagination', async () => {
      const res = await request(app).get(`${BASE}?page=1&limit=5`).set(authHeader(adminToken));
      expect(res.status).toBe(200);
      expect(res.body.meta).toMatchObject({ page: 1, limit: 5 });
    });
  });

  describe('DELETE /users/:id', () => {
    it('should allow admin to delete a user', async () => {
      const res = await request(app)
        .delete(`${BASE}/${targetUserId}`)
        .set(authHeader(adminToken));
      expect(res.status).toBe(200);
    });

    it('should reject delete by regular user', async () => {
      const res = await request(app)
        .delete(`${BASE}/${targetUserId}`)
        .set(authHeader(userToken));
      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(app).delete(`${BASE}/${fakeId}`).set(authHeader(adminToken));
      expect(res.status).toBe(404);
    });
  });
});