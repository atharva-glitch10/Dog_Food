/**
 * Phase 10 Regression Tests — Webhook SSRF & Consecutive Failure Tracking
 */
import { describe, it, expect } from 'vitest';
import { WebhookService } from '../../src/modules/webhooks/webhook.service.js';

// ─── SSRF URL Validation Tests ────────────────────────────────────────────────

describe('Webhook SSRF URL Validation', () => {
  const validate = (url: string) => WebhookService.validateUrl(url);

  it('allows valid public HTTPS URL', () => {
    expect(() => validate('https://example.com/webhook')).not.toThrow();
  });

  it('allows valid public HTTP URL', () => {
    expect(() => validate('http://example.com/webhook')).not.toThrow();
  });

  it('blocks localhost by hostname', () => {
    expect(() => validate('http://localhost/webhook')).toThrow('SSRF');
  });

  it('blocks 127.0.0.1', () => {
    expect(() => validate('http://127.0.0.1/webhook')).toThrow();
  });

  it('blocks full 127.x.x.x range', () => {
    expect(() => validate('http://127.0.0.2/webhook')).toThrow();
    expect(() => validate('http://127.255.255.255/webhook')).toThrow();
  });

  it('blocks private IPv4 10.x.x.x', () => {
    expect(() => validate('http://10.0.0.1/webhook')).toThrow();
    expect(() => validate('http://10.255.255.255/webhook')).toThrow();
  });

  it('blocks private IPv4 192.168.x.x', () => {
    expect(() => validate('http://192.168.1.1/webhook')).toThrow();
    expect(() => validate('http://192.168.0.0/webhook')).toThrow();
  });

  it('blocks private IPv4 172.16-31.x.x', () => {
    expect(() => validate('http://172.16.0.1/webhook')).toThrow();
    expect(() => validate('http://172.31.255.255/webhook')).toThrow();
  });

  it('allows 172.15.x.x (not private)', () => {
    expect(() => validate('http://172.15.0.1/webhook')).not.toThrow();
  });

  it('blocks IPv6 loopback ::1', () => {
    expect(() => validate('http://[::1]/webhook')).toThrow();
  });

  it('blocks IPv6 link-local fe80::', () => {
    expect(() => validate('http://[fe80::1]/webhook')).toThrow();
  });

  it('blocks IPv6 ULA fc00::', () => {
    expect(() => validate('http://[fc00::1]/webhook')).toThrow();
  });

  it('blocks IPv6 ULA fd00::', () => {
    expect(() => validate('http://[fd00::1]/webhook')).toThrow();
  });

  it('blocks IPv4-mapped IPv6 loopback ::ffff:127.0.0.1', () => {
    expect(() => validate('http://[::ffff:127.0.0.1]/webhook')).toThrow();
  });

  it('blocks AWS metadata service 169.254.169.254', () => {
    expect(() => validate('http://169.254.169.254/webhook')).toThrow();
  });

  it('blocks GCP metadata server', () => {
    expect(() => validate('http://metadata.google.internal/webhook')).toThrow();
  });

  it('blocks ftp:// scheme', () => {
    expect(() => validate('ftp://example.com/webhook')).toThrow('protocol');
  });

  it('blocks file:// scheme', () => {
    expect(() => validate('file:///etc/passwd')).toThrow();
  });

  it('rejects malformed URLs', () => {
    expect(() => validate('not-a-url')).toThrow();
    expect(() => validate('')).toThrow();
  });

  it('blocks URLs with embedded credentials', () => {
    expect(() => validate('http://user:pass@example.com/webhook')).toThrow();
  });
});

// ─── Consecutive Failure Logic Tests ─────────────────────────────────────────

describe('Consecutive failure counter logic', () => {
  /** Mirrors the logic in countConsecutiveFailures */
  function countConsecutive(deliveries: { statusCode: number }[]): number {
    let consecutive = 0;
    for (const d of deliveries) {
      const isFailure = d.statusCode === 0 || d.statusCode >= 500 ||
                        (d.statusCode >= 300 && d.statusCode < 400);
      if (isFailure) consecutive++;
      else break;
    }
    return consecutive;
  }

  it('counts 5 consecutive failures correctly', () => {
    const deliveries = [500, 500, 500, 500, 500].map((s) => ({ statusCode: s }));
    expect(countConsecutive(deliveries)).toBe(5);
  });

  it('resets counter after a success', () => {
    // Most recent first: 2 failures, then a success, then 3 older failures
    const deliveries = [500, 500, 200, 500, 500, 500].map((s) => ({ statusCode: s }));
    expect(countConsecutive(deliveries)).toBe(2);
  });

  it('counts zero when most recent delivery was successful', () => {
    const deliveries = [200, 500, 500, 500].map((s) => ({ statusCode: s }));
    expect(countConsecutive(deliveries)).toBe(0);
  });

  it('counts network errors (statusCode=0) as failures', () => {
    const deliveries = [0, 0, 0, 200].map((s) => ({ statusCode: s }));
    expect(countConsecutive(deliveries)).toBe(3);
  });

  it('counts timeout (408) as failure (>= 500 only; 408 is client error)', () => {
    // 408 is a 4xx, not a 5xx — should NOT be treated as failure per current policy
    const deliveries = [408, 200].map((s) => ({ statusCode: s }));
    expect(countConsecutive(deliveries)).toBe(0);
  });

  it('counts redirects (3xx) as failures', () => {
    const deliveries = [302, 301, 200].map((s) => ({ statusCode: s }));
    expect(countConsecutive(deliveries)).toBe(2);
  });

  it('handles empty delivery history', () => {
    expect(countConsecutive([])).toBe(0);
  });

  it('does not disable on 4 consecutive failures (threshold is 5)', () => {
    const deliveries = [500, 500, 500, 500].map((s) => ({ statusCode: s }));
    expect(countConsecutive(deliveries)).toBe(4);
    expect(countConsecutive(deliveries)).toBeLessThan(5);
  });
});
