import { prisma } from '../../utils/prisma.js';
import { generateRandomToken, generateHmacSignature } from '../../utils/crypto.js';
import { AppError } from '../../utils/response.js';

// ---------------------------------------------------------------------------
// SSRF Protection: validate that webhook target URLs are not internal addresses
// ---------------------------------------------------------------------------
function validateWebhookUrl(targetUrl: string) {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    throw new AppError('Invalid webhook URL format.', 400, 'INVALID_WEBHOOK_URL');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new AppError('Webhook URL protocol must be HTTP or HTTPS.', 400, 'INVALID_WEBHOOK_PROTOCOL');
  }

  // Reject embedded credentials (userinfo in URL)
  if (parsed.username || parsed.password) {
    throw new AppError('Webhook URL must not contain embedded credentials.', 400, 'INVALID_WEBHOOK_URL');
  }

  const hostname = parsed.hostname.toLowerCase();

  // Strip surrounding brackets for IPv6 literals
  const cleanHostname = hostname.replace(/^\[/, '').replace(/\]$/, '');

  // Prohibited hostnames and IP ranges (IPv4 + IPv6)
  const prohibitedHosts = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    '169.254.169.254',          // AWS/Azure/GCP IMDS
    'metadata.google.internal', // GCP metadata server
    '[::1]',
    '0x7f000001',               // Hex representation of 127.0.0.1
  ];

  if (
    prohibitedHosts.includes(hostname) ||
    prohibitedHosts.includes(cleanHostname) ||
    // IPv4 private ranges
    cleanHostname.startsWith('10.') ||
    cleanHostname.startsWith('192.168.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(cleanHostname) ||
    // IPv4 loopback range 127.0.0.0/8
    /^127\./.test(cleanHostname) ||
    // IPv6 private / link-local ranges
    cleanHostname.startsWith('fc') ||    // ULA fc00::/7
    cleanHostname.startsWith('fd') ||    // ULA fd00::/8
    cleanHostname.startsWith('fe80') ||  // Link-local fe80::/10
    // IPv4-mapped IPv6: ::ffff:a.b.c.d or Node.js-normalized ::ffff:hex form
    // Node.js URL parser normalizes ::ffff:127.0.0.1 → ::ffff:7f00:1
    // Block all ::ffff: mappings that resolve to loopback or private ranges:
    //   loopback:  127.x  → 7f00:0000 - 7fff:ffff
    //   private:   10.x   → a00:0 - aff:ffff
    //              172.16-31  → ac10:0 - ac1f:ffff
    //              192.168.x  → c0a8:0 - c0a8:ffff
    /^::ffff:(127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/i.test(cleanHostname) ||
    /^::ffff:7f[0-9a-f]{2}:/i.test(cleanHostname) ||   // loopback 127.x hex
    /^::ffff:a[0-9a-f]{2}:/i.test(cleanHostname) ||    // 10.x hex
    /^::ffff:c0a8:/i.test(cleanHostname) ||             // 192.168.x hex
    /^::ffff:ac1[0-9a-f]:/i.test(cleanHostname) ||     // 172.16-31.x hex
    cleanHostname === '0:0:0:0:0:0:0:1'                 // Full IPv6 loopback
  ) {
    throw new AppError(
      'SSRF Protection: Webhook target URL cannot target local, private, or cloud metadata IP ranges.',
      400,
      'SSRF_PROHIBITED_TARGET'
    );
  }
}

// ---------------------------------------------------------------------------
// Lightweight HTTP dispatcher with timeout + signature header.
// IMPORTANT: redirect:'manual' ensures we do NOT follow redirects automatically.
// Any redirect would bypass SSRF validation since the new destination is
// not checked. We treat any redirect response as a delivery failure.
// ---------------------------------------------------------------------------
const WEBHOOK_TIMEOUT_MS = 8_000;
const MAX_RESPONSE_BYTES = 1024 * 64; // 64 KB — prevent memory exhaustion

async function deliverWebhook(
  targetUrl: string,
  payloadString: string,
  signature: string
): Promise<number> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Dogfood-Signature': `sha256=${signature}`,
        'X-Dogfood-Event': 'dogfood.webhook',
        'User-Agent': 'DOGFOOD-Webhooks/1.0',
      },
      body: payloadString,
      signal: controller.signal,
      redirect: 'manual', // SSRF fix: never auto-follow redirects
    });

    // Treat 3xx redirects as failure — the destination is unvalidated
    if (response.status >= 300 && response.status < 400) {
      return 302; // Redirect received — treat as failure
    }

    // Consume body up to limit (prevent memory exhaustion on large responses)
    try {
      const reader = response.body?.getReader();
      if (reader) {
        let totalBytes = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          totalBytes += value?.length ?? 0;
          if (totalBytes > MAX_RESPONSE_BYTES) { reader.cancel(); break; }
        }
      }
    } catch {
      // Ignore body read errors — we already have the status code
    }

    return response.status;
  } catch (err: any) {
    if (err.name === 'AbortError') return 408; // Request timeout
    return 0; // Network error / DNS failure
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Count truly consecutive failures from the most recent deliveries.
// A "consecutive failure" sequence is broken by any successful delivery.
// ---------------------------------------------------------------------------
const CONSECUTIVE_FAILURE_THRESHOLD = 5;

async function countConsecutiveFailures(subscriptionId: string): Promise<number> {
  // Fetch the most recent deliveries (up to threshold + buffer)
  const recent = await prisma.webhookDelivery.findMany({
    where: { subscriptionId },
    orderBy: { deliveredAt: 'desc' },
    take: CONSECUTIVE_FAILURE_THRESHOLD + 5,
    select: { statusCode: true },
  });

  let consecutive = 0;
  for (const delivery of recent) {
    const isFailure = delivery.statusCode === 0 || delivery.statusCode >= 500 ||
                      (delivery.statusCode >= 300 && delivery.statusCode < 400);
    if (isFailure) {
      consecutive++;
    } else {
      break; // A success breaks the consecutive chain
    }
  }
  return consecutive;
}

export class WebhookService {
  async getSubscriptions(eventId: string) {
    return prisma.webhookSubscription.findMany({
      where: { eventId },
      include: {
        deliveries: {
          orderBy: { deliveredAt: 'desc' },
          take: 10,
          // Never expose the subscription secret in delivery responses
          select: {
            id: true,
            event: true,
            statusCode: true,
            attempts: true,
            deliveredAt: true,
          },
        },
      },
    });
  }

  async createSubscription(eventId: string, data: { targetUrl: string; events: string[] }) {
    validateWebhookUrl(data.targetUrl);

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');

    const secret = generateRandomToken(24);

    return prisma.webhookSubscription.create({
      data: {
        eventId,
        targetUrl: data.targetUrl,
        secret,
        events: data.events,
      },
    });
  }

  async deleteSubscription(subscriptionId: string) {
    return prisma.webhookSubscription.delete({ where: { id: subscriptionId } });
  }

  /**
   * Fire-and-forget webhook dispatcher.
   * Delivers the event payload to all active subscribers via HTTP POST,
   * signs each request with HMAC-SHA256, and logs the delivery outcome.
   *
   * SSRF protection: validateWebhookUrl is called at registration time.
   * redirect:'manual' prevents runtime bypass via redirect chains.
   * Consecutive failure tracking (not historical) drives auto-disable.
   */
  async dispatchEvent(eventId: string, eventName: string, payload: any) {
    try {
      const subscriptions = await prisma.webhookSubscription.findMany({
        where: {
          eventId,
          isActive: true,
          events: { has: eventName },
        },
      });

      if (subscriptions.length === 0) return;

      const envelope = {
        event: eventName,
        eventId,
        timestamp: new Date().toISOString(),
        data: payload,
      };
      const payloadString = JSON.stringify(envelope);

      await Promise.allSettled(
        subscriptions.map(async (sub) => {
          const signature = generateHmacSignature(payloadString, sub.secret);
          const statusCode = await deliverWebhook(sub.targetUrl, payloadString, signature);

          await prisma.webhookDelivery.create({
            data: {
              subscriptionId: sub.id,
              event: eventName,
              payload: envelope as any,
              statusCode,
              attempts: 1,
              deliveredAt: new Date(),
            },
          });

          const isFailure = statusCode === 0 || statusCode >= 500 ||
                            (statusCode >= 300 && statusCode < 400);

          if (isFailure) {
            // Fixed: count CONSECUTIVE failures (not all historical failures).
            // A successful delivery resets the counter.
            const consecutiveFails = await countConsecutiveFailures(sub.id);
            if (consecutiveFails >= CONSECUTIVE_FAILURE_THRESHOLD) {
              await prisma.webhookSubscription.update({
                where: { id: sub.id },
                data: { isActive: false },
              });
              console.warn(
                `[Webhooks] Subscription ${sub.id} auto-disabled after ${consecutiveFails} consecutive failures.`
              );
            }
          }
          // On success: no action needed — consecutive counter resets naturally
          // because countConsecutiveFailures walks backwards from newest delivery
        })
      );
    } catch (err) {
      // Log without leaking subscription details or internal paths
      console.error(`[Webhooks] Failed to dispatch event '${eventName}' for event ${eventId}`);
    }
  }

  /** Expose the SSRF validator for use in tests */
  static validateUrl(url: string) {
    validateWebhookUrl(url);
  }
}

export const webhookService = new WebhookService();
