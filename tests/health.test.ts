import request from 'supertest';
import app from '../src/app';

describe('Health Endpoints', () => {
  describe('GET /api/v1/health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBeLessThan(600);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('status');
      expect(res.body.data).toHaveProperty('uptime');
      expect(res.body.data).toHaveProperty('services');
    });
  });

  describe('GET /api/v1/health/live', () => {
    it('should return 200 with alive status', async () => {
      const res = await request(app).get('/api/v1/health/live');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('alive');
    });
  });

  describe('GET /api/v1/health/ready', () => {
    it('should return readiness status', async () => {
      const res = await request(app).get('/api/v1/health/ready');
      expect([200, 503]).toContain(res.status);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('database');
    });
  });
});
