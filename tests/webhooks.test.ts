import { describe, expect, test } from 'vitest';
import {
  buildWebhookSignaturePayload,
  fetchWebhookPublicKey,
  KICK_WEBHOOK_MAX_AGE_SECONDS,
  KickApiError,
  verifyWebhookRequest,
  verifyWebhookSignature
} from '../src';
import { createFetchMock, json } from './helpers';

const MESSAGE_ID = '01JBQ0Z1W4KJ2YQ3F6P1V0T2C9';
const TIMESTAMP = '2026-01-01T12:00:00Z';
const BODY = JSON.stringify({
  message_id: 'uuid-1',
  content: 'Hello [emote:4148074:HYPERCLAP]',
  created_at: TIMESTAMP
});

const encoder = new TextEncoder();

/** Generates an RSA key pair for signing test payloads. */
async function createKeyPair(): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    },
    true,
    ['sign', 'verify']
  );
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

/** Exports a public key as a PEM block, like `GET /public/v1/public-key` does. */
async function exportPem(key: CryptoKey): Promise<string> {
  const spki = new Uint8Array(await crypto.subtle.exportKey('spki', key));
  return `-----BEGIN PUBLIC KEY-----\n${toBase64(spki)}\n-----END PUBLIC KEY-----`;
}

/** Signs a webhook payload the way Kick does. */
async function sign(
  key: CryptoKey,
  messageId: string,
  timestamp: string,
  body: string
): Promise<string> {
  const data = encoder.encode(buildWebhookSignaturePayload(messageId, timestamp, body));
  const signature = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, data));
  return toBase64(signature);
}

/** Creates an RFC3339 timestamp offset by `offsetSeconds` relative to the current time. */
function timestampAt(offsetSeconds: number): string {
  return new Date(Date.now() + offsetSeconds * 1000).toISOString();
}

interface SignedRequestOptions {
  keyPair: CryptoKeyPair;
  timestamp: string;
  /** Uses the `Kick-Event-Timestamp` header, like Drops claim webhooks, when true. */
  dropsTimestamp?: boolean;
}

/** Builds a signed webhook request for the given timestamp header value. */
async function createWebhookRequest(options: SignedRequestOptions): Promise<Request> {
  const signature = await sign(options.keyPair.privateKey, MESSAGE_ID, options.timestamp, BODY);
  return new Request('https://example.com/webhook', {
    method: 'POST',
    headers: {
      'kick-event-signature': signature,
      'kick-event-message-id': MESSAGE_ID,
      [options.dropsTimestamp ? 'kick-event-timestamp' : 'kick-event-message-timestamp']:
        options.timestamp
    },
    body: BODY
  });
}

describe('buildWebhookSignaturePayload', () => {
  test('concatenates message id, timestamp and body with dots', () => {
    expect(buildWebhookSignaturePayload('id', 'timestamp', 'body')).toBe('id.timestamp.body');
  });
});

describe('verifyWebhookSignature', () => {
  test('accepts a valid signature', async () => {
    const keyPair = await createKeyPair();
    const publicKey = await exportPem(keyPair.publicKey);
    const signature = await sign(keyPair.privateKey, MESSAGE_ID, TIMESTAMP, BODY);

    await expect(
      verifyWebhookSignature({
        publicKey,
        signature,
        message_id: MESSAGE_ID,
        timestamp: TIMESTAMP,
        body: BODY
      })
    ).resolves.toBe(true);
  });

  test('rejects a tampered body', async () => {
    const keyPair = await createKeyPair();
    const publicKey = await exportPem(keyPair.publicKey);
    const signature = await sign(keyPair.privateKey, MESSAGE_ID, TIMESTAMP, BODY);

    await expect(
      verifyWebhookSignature({
        publicKey,
        signature,
        message_id: MESSAGE_ID,
        timestamp: TIMESTAMP,
        body: BODY.replace('Hello', 'Goodbye')
      })
    ).resolves.toBe(false);
  });

  test('rejects signatures created with a different key', async () => {
    const [keyPair, otherKeyPair] = await Promise.all([createKeyPair(), createKeyPair()]);
    const publicKey = await exportPem(keyPair.publicKey);
    const signature = await sign(otherKeyPair.privateKey, MESSAGE_ID, TIMESTAMP, BODY);

    await expect(
      verifyWebhookSignature({
        publicKey,
        signature,
        message_id: MESSAGE_ID,
        timestamp: TIMESTAMP,
        body: BODY
      })
    ).resolves.toBe(false);
  });

  test('rejects malformed signature values', async () => {
    const keyPair = await createKeyPair();
    const publicKey = await exportPem(keyPair.publicKey);

    await expect(
      verifyWebhookSignature({
        publicKey,
        signature: 'not-a-signature!!',
        message_id: MESSAGE_ID,
        timestamp: TIMESTAMP,
        body: BODY
      })
    ).resolves.toBe(false);
  });

  test('honors an opt-in maxAgeSeconds freshness window', async () => {
    const keyPair = await createKeyPair();
    const publicKey = await exportPem(keyPair.publicKey);

    const freshTimestamp = timestampAt(-30);
    const freshSignature = await sign(keyPair.privateKey, MESSAGE_ID, freshTimestamp, BODY);
    await expect(
      verifyWebhookSignature({
        publicKey,
        signature: freshSignature,
        message_id: MESSAGE_ID,
        timestamp: freshTimestamp,
        body: BODY,
        maxAgeSeconds: 60
      })
    ).resolves.toBe(true);

    const staleTimestamp = timestampAt(-(KICK_WEBHOOK_MAX_AGE_SECONDS + 60));
    const staleSignature = await sign(keyPair.privateKey, MESSAGE_ID, staleTimestamp, BODY);
    await expect(
      verifyWebhookSignature({
        publicKey,
        signature: staleSignature,
        message_id: MESSAGE_ID,
        timestamp: staleTimestamp,
        body: BODY,
        maxAgeSeconds: 60
      })
    ).resolves.toBe(false);
  });

  test('does not check freshness when maxAgeSeconds is omitted', async () => {
    const keyPair = await createKeyPair();
    const publicKey = await exportPem(keyPair.publicKey);
    // TIMESTAMP is a fixed date, always older than any reasonable replay window.
    const signature = await sign(keyPair.privateKey, MESSAGE_ID, TIMESTAMP, BODY);

    await expect(
      verifyWebhookSignature({
        publicKey,
        signature,
        message_id: MESSAGE_ID,
        timestamp: TIMESTAMP,
        body: BODY
      })
    ).resolves.toBe(true);
  });

  test('throws when the public key is not a valid RSA key', async () => {
    await expect(
      verifyWebhookSignature({
        publicKey: 'not a pem',
        signature: 'AAAA',
        message_id: MESSAGE_ID,
        timestamp: TIMESTAMP,
        body: BODY
      })
    ).rejects.toThrow(/invalid keyData/i);
  });
});

describe('verifyWebhookRequest', () => {
  test('verifies an incoming webhook request and leaves its body readable', async () => {
    const keyPair = await createKeyPair();
    const publicKey = await exportPem(keyPair.publicKey);
    const timestamp = timestampAt(0);
    const request = await createWebhookRequest({ keyPair, timestamp });
    request.headers.set('kick-event-type', 'chat.message.sent');
    request.headers.set('kick-event-version', '1');

    await expect(verifyWebhookRequest({ publicKey, request })).resolves.toBe(true);
    await expect(request.text()).resolves.toBe(BODY);
  });

  test('accepts the Drops timestamp header', async () => {
    const keyPair = await createKeyPair();
    const publicKey = await exportPem(keyPair.publicKey);
    const request = await createWebhookRequest({
      keyPair,
      timestamp: timestampAt(0),
      dropsTimestamp: true
    });

    await expect(verifyWebhookRequest({ publicKey, request })).resolves.toBe(true);
  });

  test('rejects requests without the required headers', async () => {
    const keyPair = await createKeyPair();
    const publicKey = await exportPem(keyPair.publicKey);
    const request = new Request('https://example.com/webhook', {
      method: 'POST',
      body: BODY
    });

    await expect(verifyWebhookRequest({ publicKey, request })).resolves.toBe(false);
  });

  test('rejects requests older than the default replay window', async () => {
    const keyPair = await createKeyPair();
    const publicKey = await exportPem(keyPair.publicKey);
    const timestamp = timestampAt(-(KICK_WEBHOOK_MAX_AGE_SECONDS + 60));
    const request = await createWebhookRequest({ keyPair, timestamp });

    await expect(verifyWebhookRequest({ publicKey, request })).resolves.toBe(false);
  });

  test('rejects future-dated requests beyond the replay window', async () => {
    const keyPair = await createKeyPair();
    const publicKey = await exportPem(keyPair.publicKey);
    const timestamp = timestampAt(KICK_WEBHOOK_MAX_AGE_SECONDS + 60);
    const request = await createWebhookRequest({ keyPair, timestamp });

    await expect(verifyWebhookRequest({ publicKey, request })).resolves.toBe(false);
  });

  test('honors a custom replay window', async () => {
    const keyPair = await createKeyPair();
    const publicKey = await exportPem(keyPair.publicKey);

    // Within the override: 30 seconds old against a 60-second window.
    const freshRequest = await createWebhookRequest({ keyPair, timestamp: timestampAt(-30) });
    await expect(
      verifyWebhookRequest({ publicKey, request: freshRequest, maxAgeSeconds: 60 })
    ).resolves.toBe(true);

    // Outside the override: 2 minutes old against a 60-second window, which is within the default.
    const oldRequest = await createWebhookRequest({
      keyPair,
      timestamp: timestampAt(-(2 * KICK_WEBHOOK_MAX_AGE_SECONDS))
    });
    await expect(
      verifyWebhookRequest({ publicKey, request: oldRequest, maxAgeSeconds: 60 })
    ).resolves.toBe(false);
  });

  test('rejects malformed timestamp headers', async () => {
    const keyPair = await createKeyPair();
    const publicKey = await exportPem(keyPair.publicKey);
    const request = await createWebhookRequest({ keyPair, timestamp: 'not-a-date' });

    await expect(verifyWebhookRequest({ publicKey, request })).resolves.toBe(false);
  });

  test('accepts requests of any age when maxAgeSeconds is Infinity', async () => {
    const keyPair = await createKeyPair();
    const publicKey = await exportPem(keyPair.publicKey);
    // TIMESTAMP predates the tests, so it would fail the default window.
    const request = await createWebhookRequest({ keyPair, timestamp: TIMESTAMP });

    await expect(
      verifyWebhookRequest({ publicKey, request, maxAgeSeconds: Number.POSITIVE_INFINITY })
    ).resolves.toBe(true);
  });
});

describe('fetchWebhookPublicKey', () => {
  test('fetches the PEM public key from the API', async () => {
    const keyPair = await createKeyPair();
    const pem = await exportPem(keyPair.publicKey);
    const { calls, fetchMock } = createFetchMock(
      json({ data: { public_key: pem }, message: 'OK' })
    );

    await expect(fetchWebhookPublicKey({ fetch: fetchMock })).resolves.toBe(pem);
    expect(calls[0].url.toString()).toBe('https://api.kick.com/public/v1/public-key');
  });

  test('throws KickApiError when the API responds with an error', async () => {
    const { fetchMock } = createFetchMock(json({ data: null, message: 'Unauthorized' }, 401));

    const error = await fetchWebhookPublicKey({ fetch: fetchMock }).catch((e) => e);
    expect(error).toBeInstanceOf(KickApiError);
    expect(error.status).toBe(401);
  });
});
