import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

describe('Security Hardening & SSRF Protection Tests', () => {
  const app = createApp();

  it('1. HTTP responses should include standard security headers', async () => {
    const res = await request(app).get('/api/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['x-xss-protection']).toBe('1; mode=block');
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    // HSTS is intentionally NOT sent in development/test mode.
    // Sending HSTS over HTTP would permanently poison browser caches.
    // In production (NODE_ENV=production, over HTTPS) it IS sent.
    expect(res.headers['strict-transport-security']).toBeUndefined();
  });

  // Webhook SSRF rejection through the real API (needs a database) lives in
  // tests/integration/platform-flow.test.ts; URL-level coverage is in tests/unit/webhook-ssrf-failures.test.ts.
});
