import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

describe('Phase 5: Event, Team, and Project Submission Workflow Tests', () => {
  const app = createApp();

  let organizerToken: string;
  let organizerCookie: string[];
  let participantToken: string;
  let participantCookie: string[];

  beforeAll(async () => {
    // 1. Login as Organizer
    const orgLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'organizer@dogfood.local', password: 'Dogfood2026!' });
    organizerToken = orgLogin.body.data.token;
    organizerCookie = orgLogin.headers['set-cookie'];

    // 2. Login as Participant
    const partLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@dogfood.local', password: 'Dogfood2026!' });
    participantToken = partLogin.body.data.token;
    participantCookie = partLogin.headers['set-cookie'];
  });

  it('1. GET /api/events should list active public events', async () => {
    const res = await request(app).get('/api/events');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('2. GET /api/events/:eventId/gallery should list submitted projects', async () => {
    const eventsRes = await request(app).get('/api/events');
    const eventId = eventsRes.body.data[0].id;

    const res = await request(app).get(`/api/events/${eventId}/gallery?search=Dogfood`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.projects)).toBe(true);
  });

  it('3. POST /api/events should reject invalid chronological dates (regDeadline > subDeadline)', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${organizerToken}`)
      .set('Cookie', organizerCookie)
      .send({
        slug: `invalid-date-event-${Date.now()}`,
        name: 'Invalid Date Hackathon',
        description: 'Testing chronological date validations',
        registrationDeadline: '2026-10-30T00:00:00Z',
        submissionDeadline: '2026-10-15T00:00:00Z', // Before registration deadline!
        judgingDeadline: '2026-11-05T00:00:00Z',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('4. Participant can view their team and invite code', async () => {
    const eventsRes = await request(app).get('/api/events');
    const eventId = eventsRes.body.data[0].id;

    const teamRes = await request(app)
      .get(`/api/events/${eventId}/teams/my-team`)
      .set('Authorization', `Bearer ${participantToken}`)
      .set('Cookie', participantCookie);

    expect(teamRes.status).toBe(200);
    if (teamRes.body.data) {
      expect(teamRes.body.data.inviteCode).toBeDefined();
    }
  });

  it('5. GET /api/events/:eventId/audit-logs should return paginated audit logs for organizers', async () => {
    const eventsRes = await request(app).get('/api/events');
    const eventId = eventsRes.body.data[0].id;

    const res = await request(app)
      .get(`/api/events/${eventId}/audit-logs?page=1&limit=10`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .set('Cookie', organizerCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.logs).toBeDefined();
    expect(res.body.data.pagination).toBeDefined();
  });
});
