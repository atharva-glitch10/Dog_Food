import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

describe('Backend API Integration Tests', () => {
  const app = createApp();

  it('GET /api/health should return healthy status and platform metadata', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.platform).toBe('DOGFOOD 2026');
  });

  it('POST /api/auth/register should validate payload and return 400 on bad data', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'invalid-email', password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/auth/login should reject empty credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: '', password: '' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/auth/me should reject unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/events should reject unauthorized creation from guest with 401', async () => {
    const res = await request(app)
      .post('/api/events')
      .send({
        slug: 'test-event',
        name: 'Test Hackathon',
        description: 'Testing event authorization checks',
      });

    expect(res.status).toBe(401);
  });
});
