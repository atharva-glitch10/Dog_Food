/**
 * Upload hardening: the real type is detected from magic bytes; the client
 * MIME type and file name are ignored; only jpg/png/webp/gif/pdf are stored,
 * with a server-chosen extension; /uploads is served with safe headers.
 */
import { describe, it, expect, vi, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';

vi.mock('../../src/utils/prisma.js', () => ({ prisma: {} }));
vi.mock('../../src/middleware/requireAuth.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { id: 'user-1', email: 'u@test.local', role: 'PARTICIPANT' };
    next();
  },
  optionalAuth: (_req: any, _res: any, next: any) => next(),
  invalidateUserCache: () => {},
}));

import { createApp } from '../../src/app.js';
import { UPLOAD_DIR } from '../../src/modules/media/media.routes.js';

const app = createApp();
const created: string[] = [];

const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

function upload(buffer: Buffer, filename: string, contentType: string) {
  return request(app).post('/api/media/upload').attach('file', buffer, { filename, contentType });
}

afterAll(() => {
  for (const f of created) fs.rmSync(path.join(UPLOAD_DIR, f), { force: true });
});

describe('POST /api/media/upload', () => {
  it('rejects an HTML file disguised as image/png', async () => {
    const res = await upload(Buffer.from('<html><script>alert(1)</script></html>'), 'evil.html', 'image/png');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
  });

  it('rejects a JavaScript file disguised as image/png with a .png name', async () => {
    const res = await upload(Buffer.from('fetch("/api/auth/me").then(r => r.text())'), 'avatar.png', 'image/png');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
  });

  it('rejects SVG even when declared as image/svg+xml', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>';
    const res = await upload(Buffer.from(svg), 'logo.svg', 'image/svg+xml');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
  });

  it('accepts a real PNG and derives the extension from its content, not its name', async () => {
    const res = await upload(PNG_1x1, 'screenshot.html', 'text/html');
    expect(res.status).toBe(201);
    expect(res.body.data.mimetype).toBe('image/png');
    expect(res.body.data.filename).toMatch(/\.png$/);
    created.push(res.body.data.filename);
    expect(fs.existsSync(path.join(UPLOAD_DIR, res.body.data.filename))).toBe(true);
  });

  it('rejects a request without a file', async () => {
    const res = await request(app).post('/api/media/upload');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MISSING_FILE');
  });
});

describe('GET /uploads/*', () => {
  it('serves images inline with nosniff and a sandbox CSP', async () => {
    const name = `test-${Date.now()}.png`;
    fs.writeFileSync(path.join(UPLOAD_DIR, name), PNG_1x1);
    created.push(name);
    const res = await request(app).get(`/uploads/${name}`);
    expect(res.status).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toContain('sandbox');
    expect(res.headers['content-disposition']).toBeUndefined();
  });

  it('forces a download for non-image files (e.g. legacy .html uploads)', async () => {
    const name = `legacy-${Date.now()}.html`;
    fs.writeFileSync(path.join(UPLOAD_DIR, name), '<script>alert(1)</script>');
    created.push(name);
    const res = await request(app).get(`/uploads/${name}`);
    expect(res.status).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-disposition']).toBe('attachment');
  });
});
