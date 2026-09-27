/**
 * The OpenAPI document served at /api/docs must describe exactly the routes
 * the Express app registers — no undocumented endpoints, no phantom ones.
 */
import { describe, it, expect } from 'vitest';
import path from 'path';
import YAML from 'yamljs';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { listApiRoutes } from '../helpers/express-routes.js';

const app = createApp();
const spec = YAML.load(path.resolve(__dirname, '../../docs/openapi.yaml'));

const documented = new Set<string>();
for (const [p, ops] of Object.entries<any>(spec.paths)) {
  for (const method of Object.keys(ops)) documented.add(`${method.toUpperCase()} ${p}`);
}
const implemented = new Set(listApiRoutes(app).map((r) => `${r.method} ${r.path}`));

describe('OpenAPI coverage', () => {
  it('discovers the application routes', () => {
    expect(implemented.size).toBeGreaterThan(50);
  });

  it('documents every implemented route', () => {
    expect([...implemented].filter((r) => !documented.has(r)).sort()).toEqual([]);
  });

  it('documents no route that does not exist', () => {
    expect([...documented].filter((r) => !implemented.has(r)).sort()).toEqual([]);
  });

  it('marks every role-restricted or authenticated route with a security requirement', () => {
    for (const ops of Object.values<any>(spec.paths)) {
      for (const op of Object.values<any>(ops)) {
        if (/Requires authentication/.test(op.description)) expect(op.security?.length).toBeGreaterThan(0);
      }
    }
  });

  it('serves Swagger UI at /api/docs', async () => {
    const res = await request(app).get('/api/docs/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger-ui');
  });
});
