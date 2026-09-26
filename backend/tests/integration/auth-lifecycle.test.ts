import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

describe('Phase 5: Auth & Role Isolation E2E Integration Tests', () => {
  const app = createApp();

  it('1. POST /api/auth/register should register a new participant and return JWT cookie', async () => {
    const uniqueEmail = `test.user.${Date.now()}@dogfood.local`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test Participant',
        email: uniqueEmail,
        password: 'Password123!',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(uniqueEmail);
    expect(res.body.data.user.role).toBe('PARTICIPANT');
    expect(res.body.data.user.passwordHash).toBeUndefined(); // Security: never leak password hash

    // Verify auth cookie set
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some((c: string) => c.includes('dogfood_session='))).toBe(true);
  });

  it('2. POST /api/auth/login should authenticate valid credentials and issue session token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'organizer@dogfood.local',
        password: 'Dogfood2026!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('ORGANIZER');
    expect(res.body.data.token).toBeDefined();
  });

  it('3. POST /api/auth/login should reject invalid password with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'organizer@dogfood.local',
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('4. Privilege Escalation Prevention: Participant cannot access /api/admin or organizer endpoints', async () => {
    // Login as participant
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'alice@dogfood.local',
        password: 'Dogfood2026!',
      });

    const token = loginRes.body.data.token;
    const cookie = loginRes.headers['set-cookie'];

    // Try to access audit logs (Organizer/Admin only)
    const auditRes = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${token}`)
      .set('Cookie', cookie);

    expect(auditRes.status).toBe(403);
    expect(auditRes.body.error.code).toBe('FORBIDDEN');
  });

  it('5. POST /api/auth/logout should clear session and cookies when authenticated', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'organizer@dogfood.local',
        password: 'Dogfood2026!',
      });
    const token = loginRes.body.data.token;
    const cookie = loginRes.headers['set-cookie'];

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
