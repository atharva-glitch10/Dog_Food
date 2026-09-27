import { describe, it, expect } from 'vitest';
import { paginationSchema, optionalStringParam, optionalEnumParam } from '../../src/utils/query.js';
import { detectFileType } from '../../src/modules/media/file-type.js';
import { redactSecrets } from '../../src/middleware/auditLogger.js';
import { importableRoles } from '../../src/modules/exports/bulk-import.service.js';
import { UpdateTrackSchema, UpdatePrizeSchema } from '../../src/modules/tracks-prizes/tracks-prizes.validator.js';
import { CreateWebhookSchema } from '../../src/modules/webhooks/webhooks.validator.js';

describe('query parameter parsing', () => {
  const schema = paginationSchema(12, 50).extend({
    search: optionalStringParam(200),
    sort: optionalEnumParam(['title', 'date', 'randomized']),
  });

  it('falls back to defaults for junk values instead of NaN', () => {
    expect(schema.parse({ page: 'abc', limit: 'xyz' })).toMatchObject({ page: 1, limit: 12 });
    expect(schema.parse({ page: 'NaN', limit: 'Infinity' })).toMatchObject({ page: 1, limit: 12 });
  });

  it('clamps out-of-range values', () => {
    expect(schema.parse({ page: '-5', limit: '5000' })).toMatchObject({ page: 1, limit: 50 });
    expect(schema.parse({ page: '0', limit: '0' })).toMatchObject({ page: 1, limit: 1 });
  });

  it('accepts valid values and takes the first of repeated keys', () => {
    expect(schema.parse({ page: '3', limit: '20' })).toMatchObject({ page: 3, limit: 20 });
    expect(schema.parse({ page: ['2', '9'], search: ['ai', 'web'] })).toMatchObject({ page: 2, search: 'ai' });
  });

  it('drops invalid enum and non-string values', () => {
    expect(schema.parse({ sort: 'DROP TABLE' }).sort).toBeUndefined();
    expect(schema.parse({ search: { $ne: '' } }).search).toBeUndefined();
    expect(schema.parse({ search: '   ' }).search).toBeUndefined();
  });
});

describe('magic-byte file type detection', () => {
  it('detects allowlisted types', () => {
    expect(detectFileType(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))?.ext).toBe('jpg');
    expect(detectFileType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.ext).toBe('png');
    expect(detectFileType(Buffer.from('GIF89a....'))?.ext).toBe('gif');
    expect(detectFileType(Buffer.from('RIFF\0\0\0\0WEBPVP8 '))?.ext).toBe('webp');
    expect(detectFileType(Buffer.from('%PDF-1.7'))?.ext).toBe('pdf');
  });

  it('rejects everything else', () => {
    expect(detectFileType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull();
    expect(detectFileType(Buffer.from('<!doctype html>'))).toBeNull();
    expect(detectFileType(Buffer.from('alert(1)'))).toBeNull();
    expect(detectFileType(Buffer.from('RIFF\0\0\0\0WAVE'))).toBeNull();
    expect(detectFileType(Buffer.alloc(0))).toBeNull();
  });
});

describe('audit log secret redaction', () => {
  it('redacts credentials at any depth, including bulk-import rows', () => {
    const out = redactSecrets({
      email: 'a@b.c',
      password: 'hunter2',
      users: [{ email: 'x@y.z', password: 'p1' }],
      nested: { secret: 's', token: 't' },
    });
    expect(out).toEqual({
      email: 'a@b.c',
      password: '[REDACTED]',
      users: [{ email: 'x@y.z', password: '[REDACTED]' }],
      nested: { secret: '[REDACTED]', token: '[REDACTED]' },
    });
  });
});

describe('bulk import role allowlist', () => {
  it('never allows ADMIN and only lets admins create organizers', () => {
    expect(importableRoles('ORGANIZER' as any)).toEqual(['PARTICIPANT', 'JUDGE']);
    expect(importableRoles('ADMIN' as any)).toEqual(['PARTICIPANT', 'JUDGE', 'ORGANIZER']);
    expect(importableRoles('ADMIN' as any)).not.toContain('ADMIN');
  });
});

describe('mass-assignment protection on update payloads', () => {
  it('rejects unknown keys such as eventId or nested relation writes', () => {
    expect(UpdateTrackSchema.safeParse({ eventId: 'other-event' }).success).toBe(false);
    expect(UpdateTrackSchema.safeParse({ event: { update: { name: 'x' } } }).success).toBe(false);
    expect(UpdatePrizeSchema.safeParse({ eventId: 'other-event' }).success).toBe(false);
    expect(UpdateTrackSchema.safeParse({ colorHex: 'red;background:url(x)' }).success).toBe(false);
    expect(UpdateTrackSchema.safeParse({ name: 'AI', colorHex: '#123abc' }).success).toBe(true);
    expect(UpdatePrizeSchema.safeParse({ trackId: null }).success).toBe(true);
  });

  it('only accepts known webhook event types', () => {
    expect(CreateWebhookSchema.safeParse({ targetUrl: 'https://example.com/h', events: ['PROJECT_SUBMITTED'] }).success).toBe(true);
    expect(CreateWebhookSchema.safeParse({ targetUrl: 'https://example.com/h', events: ['ANYTHING'] }).success).toBe(false);
    expect(CreateWebhookSchema.safeParse({ targetUrl: 'https://example.com/h', events: [] }).success).toBe(false);
  });
});
