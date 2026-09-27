/**
 * End-to-end platform flow against a real PostgreSQL database, driven through
 * the HTTP API exactly as the frontend does:
 *
 * register -> create team -> submit -> add judges + rubric -> auto-assign ->
 * score -> normalize -> publish results -> vote -> generate + verify certificate
 *
 * plus deadline enforcement and persistence across a fresh PrismaClient.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/utils/prisma.js';

const app = createApp();
const PASSWORD = 'Integration2026!';
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const runId = Date.now().toString(36);

type Agent = ReturnType<typeof request.agent>;

async function registerUser(label: string): Promise<{ agent: Agent; email: string; id: string }> {
  const agent = request.agent(app);
  const email = `${label}-${runId}@it.test`;
  const res = await agent.post('/api/auth/register').send({ email, password: PASSWORD, name: `IT ${label}` });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return { agent, email, id: res.body.data.user.id };
}

async function login(email: string, password = PASSWORD): Promise<Agent> {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ email, password });
  expect(res.status, JSON.stringify(res.body)).toBe(200);
  return agent;
}

function eventPayload(slug: string, offsets: Partial<Record<string, number>> = {}) {
  const now = Date.now();
  const at = (key: string, fallback: number) => new Date(now + (offsets[key] ?? fallback)).toISOString();
  return {
    slug,
    name: `Integration ${slug}`,
    description: 'Event created by the integration test suite.',
    registrationStartDate: at('registrationStartDate', -2 * DAY),
    registrationEndDate: at('registrationEndDate', 2 * DAY),
    submissionStartDate: at('submissionStartDate', -1 * DAY),
    submissionDeadline: at('submissionDeadline', 1 * DAY),
    judgingStartDate: at('judgingStartDate', -1 * HOUR),
    judgingDeadline: at('judgingDeadline', 3 * DAY),
    settings: {
      minTeamSize: 1,
      maxTeamSize: 4,
      allowCommunityVoting: true,
      votingEligibility: 'VERIFIED_USERS',
      votesPerUser: 2,
      hideResultsUntilPublished: true,
      assignmentsPerProject: 2,
    },
  };
}

async function createEvent(organizer: Agent, slug: string, offsets?: Partial<Record<string, number>>) {
  const res = await organizer.post('/api/events').send(eventPayload(slug, offsets));
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return res.body.data as { id: string; slug: string };
}

async function createSubmittedProject(member: Agent, eventId: string, title: string) {
  const team = await member.post(`/api/events/${eventId}/teams`).send({ name: `${title} Team` });
  expect(team.status, JSON.stringify(team.body)).toBe(201);

  const project = await member.post(`/api/events/${eventId}/submissions`).send({
    title,
    tagline: `${title} tagline`,
    problemStatement: 'A sufficiently long problem statement.',
    solutionDescription: 'A sufficiently long solution description.',
    technologies: ['TypeScript'],
    repoUrl: 'https://github.com/example/repo',
  });
  expect(project.status, JSON.stringify(project.body)).toBe(201);

  const submitted = await member.post(`/api/projects/${project.body.data.id}/submit`);
  expect(submitted.status, JSON.stringify(submitted.body)).toBe(200);
  return project.body.data.id as string;
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Full platform flow (real database)', () => {
  let organizer: Agent;
  let eventId: string;
  const people: Record<string, { agent: Agent; email: string; id: string }> = {};
  const projectIds: Record<string, string> = {};
  let criteria: { id: string; title: string; weight: number; maxScore: number }[] = [];

  beforeAll(async () => {
    organizer = await login('organizer@dogfood.local', 'Dogfood2026!');
    const event = await createEvent(organizer, `it-flow-${runId}`);
    eventId = event.id;
    for (const label of ['alpha', 'beta', 'voter', 'judge1', 'judge2']) {
      people[label] = await registerUser(label);
    }
  });

  it('1. participants create teams and submit projects', async () => {
    projectIds.alpha = await createSubmittedProject(people.alpha.agent, eventId, 'Alpha Project');
    projectIds.beta = await createSubmittedProject(people.beta.agent, eventId, 'Beta Project');

    const gallery = await request(app).get(`/api/events/${eventId}/gallery`);
    expect(gallery.status).toBe(200);
    expect(gallery.body.data.projects.map((p: any) => p.id).sort()).toEqual(
      [projectIds.alpha, projectIds.beta].sort()
    );
  });

  it('2. organizer rejects SSRF webhook targets and registers a webhook', async () => {
    for (const targetUrl of ['http://127.0.0.1:8080/hook', 'http://169.254.169.254/latest/meta-data/']) {
      const res = await organizer.post(`/api/events/${eventId}/webhooks`).send({ targetUrl, events: ['RESULTS_PUBLISHED'] });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('SSRF_PROHIBITED_TARGET');
    }

    // .invalid never resolves, so the delivery fails fast without external traffic
    const ok = await organizer
      .post(`/api/events/${eventId}/webhooks`)
      .send({ targetUrl: 'https://hooks.dogfood.invalid/receiver', events: ['RESULTS_PUBLISHED'] });
    expect(ok.status).toBe(201);
    expect(ok.body.data.secret).toHaveLength(48);
  });

  it('3. organizer configures the rubric and judges, then auto-assigns', async () => {
    const rubric = await organizer.post(`/api/events/${eventId}/rubrics`).send({
      name: 'IT Rubric',
      criteria: [
        { title: 'Impact', description: 'Impact', weight: 60, maxScore: 10 },
        { title: 'Execution', description: 'Execution', weight: 40, maxScore: 10 },
      ],
    });
    expect(rubric.status, JSON.stringify(rubric.body)).toBe(200);
    criteria = rubric.body.data.criteria;
    expect(criteria.map((c) => c.weight).sort()).toEqual([0.4, 0.6]);

    for (const label of ['judge1', 'judge2']) {
      const res = await organizer.post(`/api/events/${eventId}/judges`).send({ email: people[label].email });
      expect(res.status, JSON.stringify(res.body)).toBe(201);
    }

    const assign = await organizer.post(`/api/events/${eventId}/judges/assign/auto`).send({ seed: 42, targetPerProject: 2 });
    expect(assign.status, JSON.stringify(assign.body)).toBe(200);
    expect(assign.body.data.totalAssignments).toBe(4);
    expect(assign.body.data.coverageSummary.fullyCoveredProjects).toBe(2);
  });

  it('4. judges score their assigned projects', async () => {
    // judge1 is harsh, judge2 lenient; both prefer Alpha
    const plan: Record<string, Record<string, [number, number]>> = {
      judge1: { alpha: [6, 6], beta: [4, 4] },
      judge2: { alpha: [10, 9], beta: [8, 7] },
    };
    const impact = criteria.find((c) => c.title === 'Impact')!;
    const execution = criteria.find((c) => c.title === 'Execution')!;

    for (const judge of ['judge1', 'judge2']) {
      const assignments = await people[judge].agent.get(`/api/events/${eventId}/judges/my-assignments`);
      expect(assignments.status, JSON.stringify(assignments.body)).toBe(200);
      expect(assignments.body.data).toHaveLength(2);

      for (const project of ['alpha', 'beta']) {
        const [i, e] = plan[judge][project];
        const res = await people[judge].agent.post('/api/evaluations').send({
          eventId,
          projectId: projectIds[project],
          scores: [
            { criterionId: impact.id, score: i },
            { criterionId: execution.id, score: e },
          ],
        });
        expect(res.status, JSON.stringify(res.body)).toBe(201);
        expect(res.body.data.weightedTotal).toBe((i / 10) * 60 + (e / 10) * 40);
      }
    }

    // Out-of-range scores are rejected by the scoring engine
    const bad = await people.judge1.agent.post('/api/evaluations').send({
      eventId,
      projectId: projectIds.alpha,
      scores: [
        { criterionId: impact.id, score: 11 },
        { criterionId: execution.id, score: 5 },
      ],
    });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('SCORE_OUT_OF_BOUNDS');
  });

  it('5. organizer normalizes scores and publishes results', async () => {
    const norm = await organizer.post(`/api/events/${eventId}/judging/normalize`).send({});
    expect(norm.status, JSON.stringify(norm.body)).toBe(200);
    const rankings = norm.body.data.rankings;
    expect(rankings.map((r: any) => r.projectId)).toEqual([projectIds.alpha, projectIds.beta]);
    expect(rankings[0].finalRank).toBe(1);

    // Hidden from the public until published
    const hidden = await request(app).get(`/api/events/${eventId}/results`);
    expect(hidden.status).toBe(403);
    expect(hidden.body.error.code).toBe('RESULTS_NOT_PUBLISHED');

    const publish = await organizer.post(`/api/events/${eventId}/results/publish`);
    expect(publish.status).toBe(200);
    expect(publish.body.data.status).toBe('RESULTS_PUBLISHED');

    const results = await request(app).get(`/api/events/${eventId}/results`);
    expect(results.status).toBe(200);
    expect(results.body.data.rankings[0].id ?? results.body.data.rankings[0].projectId).toBe(projectIds.alpha);
  });

  it('6. the RESULTS_PUBLISHED webhook is dispatched and its delivery is logged', async () => {
    let deliveries: { event: string; statusCode: number | null }[] = [];
    for (let i = 0; i < 40 && deliveries.length === 0; i++) {
      deliveries = await prisma.webhookDelivery.findMany({
        where: { subscription: { eventId } },
        select: { event: true, statusCode: true },
      });
      if (deliveries.length === 0) await new Promise((r) => setTimeout(r, 250));
    }
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0].event).toBe('RESULTS_PUBLISHED');
  });

  it('7. community voting enforces self-vote, duplicate and limit rules', async () => {
    const anonymous = await request(app).post(`/api/events/${eventId}/vote/${projectIds.alpha}`);
    expect(anonymous.status).toBe(401);
    expect(anonymous.body.error.code).toBe('AUTH_REQUIRED');

    const self = await people.alpha.agent.post(`/api/events/${eventId}/vote/${projectIds.alpha}`);
    expect(self.status).toBe(400);
    expect(self.body.error.code).toBe('SELF_VOTE_PROHIBITED');

    const first = await people.voter.agent.post(`/api/events/${eventId}/vote/${projectIds.alpha}`);
    expect(first.status, JSON.stringify(first.body)).toBe(201);

    const dup = await people.voter.agent.post(`/api/events/${eventId}/vote/${projectIds.alpha}`);
    expect(dup.status).toBe(400);
    expect(dup.body.error.code).toBe('DUPLICATE_VOTE');

    const second = await people.voter.agent.post(`/api/events/${eventId}/vote/${projectIds.beta}`);
    expect(second.status).toBe(201);

    // votesPerUser = 2: a third vote hits the limit before anything else
    const third = await people.voter.agent.post(`/api/events/${eventId}/vote/${projectIds.beta}`);
    expect(third.body.error.code).toBe('MAX_VOTES_REACHED');

    expect(await prisma.vote.count({ where: { eventId } })).toBe(2);
  });

  it('8. concurrent votes from one user cannot exceed the limit', async () => {
    const racer = await registerUser('racer');
    const results = await Promise.all(
      [projectIds.alpha, projectIds.beta, projectIds.alpha, projectIds.beta].map((pid) =>
        racer.agent.post(`/api/events/${eventId}/vote/${pid}`)
      )
    );
    expect(results.filter((r) => r.status === 201)).toHaveLength(2);
    expect(await prisma.vote.count({ where: { eventId, userId: racer.id } })).toBe(2);
  });

  it('9. organizer generates certificates that verify, and tampering is detected', async () => {
    const gen = await organizer.post(`/api/events/${eventId}/certificates/generate`).send({ type: 'PARTICIPANT' });
    expect(gen.status, JSON.stringify(gen.body)).toBe(201);
    const certs = gen.body.data.certificates;
    expect(certs).toHaveLength(2);

    const code = certs[0].verificationCode;
    const verify = await request(app).get(`/api/certificates/verify/${code}`);
    expect(verify.status).toBe(200);
    expect(verify.body.data.isValid).toBe(true);

    await prisma.certificate.update({ where: { verificationCode: code }, data: { signature: 'forged' } });
    const tampered = await request(app).get(`/api/certificates/verify/${code}`);
    expect(tampered.body.data.isValid).toBe(false);

    const unknown = await request(app).get('/api/certificates/verify/CERT-NOPE-NOPE');
    expect(unknown.status).toBe(404);
  });
});

describe('Deadline enforcement (real database)', () => {
  let organizer: Agent;

  beforeAll(async () => {
    organizer = await login('organizer@dogfood.local', 'Dogfood2026!');
  });

  it('rejects project creation after the submission deadline', async () => {
    const event = await createEvent(organizer, `it-late-${runId}`, {
      submissionStartDate: -3 * DAY,
      submissionDeadline: -1 * DAY,
    });
    const member = await registerUser('late');
    const team = await member.agent.post(`/api/events/${event.id}/teams`).send({ name: 'Late Team' });
    expect(team.status).toBe(201);

    const res = await member.agent.post(`/api/events/${event.id}/submissions`).send({
      title: 'Too Late',
      problemStatement: 'A sufficiently long problem statement.',
      solutionDescription: 'A sufficiently long solution description.',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('DEADLINE_EXCEEDED');
  });

  it('rejects submission and edits once the deadline passes after drafting', async () => {
    const event = await createEvent(organizer, `it-cutoff-${runId}`);
    const member = await registerUser('cutoff');
    await member.agent.post(`/api/events/${event.id}/teams`).send({ name: 'Cutoff Team' });
    const draft = await member.agent.post(`/api/events/${event.id}/submissions`).send({
      title: 'Almost There',
      problemStatement: 'A sufficiently long problem statement.',
      solutionDescription: 'A sufficiently long solution description.',
    });
    expect(draft.status).toBe(201);

    await prisma.event.update({ where: { id: event.id }, data: { submissionDeadline: new Date(Date.now() - HOUR) } });

    const submit = await member.agent.post(`/api/projects/${draft.body.data.id}/submit`);
    expect(submit.status).toBe(400);
    expect(submit.body.error.code).toBe('DEADLINE_EXCEEDED');

    const edit = await member.agent.put(`/api/projects/${draft.body.data.id}`).send({ title: 'Edited Late' });
    expect(edit.status).toBe(400);
    expect(edit.body.error.code).toBe('DEADLINE_EXCEEDED');
  });

  it('rejects evaluations before judging opens and after it closes', async () => {
    const event = await createEvent(organizer, `it-judging-${runId}`, {
      judgingStartDate: 2 * DAY,
      judgingDeadline: 4 * DAY,
    });
    const member = await registerUser('judged');
    const projectId = await createSubmittedProject(member.agent, event.id, 'Judged Project');

    const rubric = await organizer.post(`/api/events/${event.id}/rubrics`).send({
      name: 'R',
      criteria: [{ title: 'Only', description: 'Only', weight: 1, maxScore: 10 }],
    });
    const criterionId = rubric.body.data.criteria[0].id;
    const judge = await registerUser('timedjudge');
    await organizer.post(`/api/events/${event.id}/judges`).send({ email: judge.email });
    await organizer.post(`/api/events/${event.id}/judges/assign/auto`).send({ seed: 1, targetPerProject: 1 });

    const body = { eventId: event.id, projectId, scores: [{ criterionId, score: 7 }] };

    const early = await judge.agent.post('/api/evaluations').send(body);
    expect(early.status).toBe(400);
    expect(early.body.error.code).toBe('JUDGING_NOT_STARTED');

    await prisma.event.update({
      where: { id: event.id },
      data: { judgingStartDate: new Date(Date.now() - 2 * DAY), judgingDeadline: new Date(Date.now() - HOUR) },
    });
    const late = await judge.agent.post('/api/evaluations').send(body);
    expect(late.status).toBe(400);
    expect(late.body.error.code).toBe('DEADLINE_EXCEEDED');

    expect(await prisma.evaluation.count({ where: { eventId: event.id } })).toBe(0);
  });
});

describe('Persistence (real database)', () => {
  it('data written through the API is visible to a brand-new PrismaClient', async () => {
    const member = await registerUser('persist');
    const organizer = await login('organizer@dogfood.local', 'Dogfood2026!');
    const event = await createEvent(organizer, `it-persist-${runId}`);
    const team = await member.agent.post(`/api/events/${event.id}/teams`).send({ name: `Persist ${runId}` });
    expect(team.status).toBe(201);

    // A separate client with its own connection pool, as after a process restart
    const fresh = new PrismaClient();
    try {
      const stored = await fresh.team.findUnique({ where: { id: team.body.data.id }, include: { members: true } });
      expect(stored?.name).toBe(`Persist ${runId}`);
      expect(stored?.members.map((m) => m.userId)).toEqual([member.id]);
      expect(await fresh.user.findUnique({ where: { email: member.email } })).not.toBeNull();
    } finally {
      await fresh.$disconnect();
    }

    // And a brand-new app instance can log the same user in
    const secondApp = createApp();
    const res = await request(secondApp).post('/api/auth/login').send({ email: member.email, password: PASSWORD });
    expect(res.status).toBe(200);
  });
});

describe('Registration cannot self-assign privileged roles (real database)', () => {
  it.each(['ADMIN', 'ORGANIZER', 'JUDGE'])('rejects self-registration as %s', async (role) => {
    const email = `self-${role.toLowerCase()}-${runId}@it.test`;
    const res = await request(app).post('/api/auth/register').send({ email, password: PASSWORD, name: 'Mallory', role });
    expect(res.status).toBe(400);
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
  });

  it('creates participants when no role (or PARTICIPANT) is sent', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: `plain-${runId}@it.test`, password: PASSWORD, name: 'Plain', role: 'PARTICIPANT' });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('PARTICIPANT');
  });
});
