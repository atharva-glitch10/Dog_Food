import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { generateHmacSignature } from '../../src/utils/crypto.js';
import { config } from '../../src/config/index.js';

describe('Phase 5: Certificates, Webhooks, and Exports Tests', () => {
  const app = createApp();

  let organizerToken: string;
  let organizerCookie: string[];

  beforeAll(async () => {
    const orgLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'organizer@dogfood.local', password: 'Dogfood2026!' });
    organizerToken = orgLogin.body.data.token;
    organizerCookie = orgLogin.headers['set-cookie'];
  });

  it('1. Cryptographic HMAC-SHA256 signature verification on certificates', () => {
    const payload = 'dogfood-2026:user-alice:PARTICIPANT:CERT-ABCD-1234';
    const signature = generateHmacSignature(payload, config.jwtSecret);

    expect(signature).toBeDefined();
    expect(typeof signature).toBe('string');
    expect(signature.length).toBe(64); // SHA-256 hex string length

    const signature2 = generateHmacSignature(payload, config.jwtSecret);
    expect(signature).toBe(signature2);

    // Tampered payload verification failure
    const tamperedPayload = 'dogfood-2026:user-eve:PARTICIPANT:CERT-ABCD-1234';
    const tamperedSig = generateHmacSignature(tamperedPayload, config.jwtSecret);
    expect(signature).not.toBe(tamperedSig);
  });

  it('2. GET /api/events/:eventId/exports/csv/participants should stream CSV for organizers', async () => {
    const eventsRes = await request(app).get('/api/events');
    const eventId = eventsRes.body.data[0].id;

    const res = await request(app)
      .get(`/api/events/${eventId}/exports/csv/participants`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .set('Cookie', organizerCookie);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('User ID');
    expect(res.text).toContain('Email');
  });

  it('3. GET /api/events/:eventId/exports/csv/projects should stream CSV for organizers', async () => {
    const eventsRes = await request(app).get('/api/events');
    const eventId = eventsRes.body.data[0].id;

    const res = await request(app)
      .get(`/api/events/${eventId}/exports/csv/projects`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .set('Cookie', organizerCookie);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('Project ID');
    expect(res.text).toContain('Title');
  });

  it('4. GET /api/events/:eventId/exports/csv/scores should stream CSV for organizers', async () => {
    const eventsRes = await request(app).get('/api/events');
    const eventId = eventsRes.body.data[0].id;

    const res = await request(app)
      .get(`/api/events/${eventId}/exports/csv/scores`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .set('Cookie', organizerCookie);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('Evaluation ID');
    expect(res.text).toContain('Judge Name');
  });

  it('5. Participant cannot access CSV export routes (403 Forbidden)', async () => {
    const partLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@dogfood.local', password: 'Dogfood2026!' });
    const partToken = partLogin.body.data.token;
    const partCookie = partLogin.headers['set-cookie'];

    const eventsRes = await request(app).get('/api/events');
    const eventId = eventsRes.body.data[0].id;

    const res = await request(app)
      .get(`/api/events/${eventId}/exports/csv/scores`)
      .set('Authorization', `Bearer ${partToken}`)
      .set('Cookie', partCookie);

    expect(res.status).toBe(403);
  });
});
