import { base64ToBytes } from './base64';
import { KICK_API_BASE_URL, KICK_PUBLIC_KEY_PATH, KICK_WEBHOOK_HEADERS } from './constants';
import { KickApiError } from './errors';
import type { ApiResponse, PublicKeyResponse } from './types';

/**
 * Default maximum age of a webhook message accepted by {@link verifyWebhookRequest}, in seconds.
 * Applies in both directions: older messages are rejected, and so are messages timestamped further
 * into the future.
 *
 * Kick's docs do not specify a replay window; this follows the common industry default of five
 * minutes.
 */
export const KICK_WEBHOOK_MAX_AGE_SECONDS = 300;

/** Options for {@link verifyWebhookSignature}. */
export interface VerifyWebhookSignatureOptions {
  /** PEM-encoded RSA public key from `GET /public/v1/public-key`. */
  publicKey: string;
  /** Raw value of the `Kick-Event-Signature` header. */
  signature: string;
  /** Value of the `Kick-Event-Message-Id` header. */
  message_id: string;
  /** Value of the `Kick-Event-Message-Timestamp` header, or `Kick-Event-Timestamp` for Drops. */
  timestamp: string;
  /** Raw request body, exactly as received, before any JSON parsing. */
  body: string;
  /**
   * Maximum age in seconds of the message, measured from its timestamp header in both directions
   * (past and future). Messages outside the window return `false` without the signature being
   * checked. Omitted by default, for a pure signature check - {@link verifyWebhookRequest} enables
   * the check with `KICK_WEBHOOK_MAX_AGE_SECONDS`.
   */
  maxAgeSeconds?: number;
}

/** Options for {@link verifyWebhookRequest}. */
export interface VerifyWebhookRequestOptions {
  /** PEM-encoded RSA public key from `GET /public/v1/public-key`. */
  publicKey: string;
  /** The incoming webhook `Request`. */
  request: Request;
  /**
   * Raw request body. When omitted, the request is cloned and its body is read, leaving the
   * original request usable.
   */
  body?: string;
  /**
   * Maximum age in seconds of the incoming request, measured from its timestamp header in both
   * directions (past and future). Stale and future-dated requests return `false` before the
   * signature is verified. Defaults to `KICK_WEBHOOK_MAX_AGE_SECONDS` (5 minutes). Pass
   * `Number.POSITIVE_INFINITY` to accept messages of any age.
   */
  maxAgeSeconds?: number;
}

/** Options for {@link fetchWebhookPublicKey}. */
export interface FetchWebhookPublicKeyOptions {
  /** Fetch implementation. Defaults to the global `fetch`. */
  fetch?: typeof fetch;
  /** API base URL. Defaults to `https://api.kick.com`. */
  baseUrl?: string;
  /** Abort signal used to cancel the request. */
  signal?: AbortSignal;
}

/**
 * Extracts the PEM payload from a public key, accepting both a full PEM block and a raw base64
 * body.
 */
function pemToDer(publicKey: string): Uint8Array<ArrayBuffer> {
  const match = /-----BEGIN PUBLIC KEY-----([\s\S]*?)-----END PUBLIC KEY-----/.exec(publicKey);
  return base64ToBytes(match ? match[1] : publicKey);
}

/**
 * Whether a webhook timestamp header parses as a date within `maxAgeSeconds` of the current time,
 * in both directions, to allow for clock skew between Kick and consumer servers.
 */
function isFreshTimestamp(timestamp: string, maxAgeSeconds: number): boolean {
  const timestampMs = Date.parse(timestamp);
  if (Number.isNaN(timestampMs)) {
    return false;
  }
  return Math.abs(Date.now() - timestampMs) <= maxAgeSeconds * 1000;
}

/**
 * Builds the signed string for a webhook request.
 *
 * The signature is an RSA-SHA256 signature over `${message_id}.${timestamp}.${body}`,
 * base64-encoded.
 *
 * @param message_id - Value of the `Kick-Event-Message-Id` header.
 * @param timestamp - Value of the `Kick-Event-Message-Timestamp` header.
 * @param body - Raw request body.
 *
 * @returns The string that Kick signed.
 * @see https://docs.kick.com/events/webhook-security
 */
export function buildWebhookSignaturePayload(
  message_id: string,
  timestamp: string,
  body: string
): string {
  return `${message_id}.${timestamp}.${body}`;
}

/**
 * Verifies the `Kick-Event-Signature` header of a webhook message.
 *
 * A pure signature check: a captured message can be replayed at any later time, so server handlers
 * are encouraged to use {@link verifyWebhookRequest} or pass `maxAgeSeconds` to reject stale
 * messages as well.
 *
 * @example
 *   ```ts
 *   const publicKey = await fetchWebhookPublicKey();
 *   const valid = await verifyWebhookSignature({
 *     publicKey,
 *     signature: req.headers['kick-event-signature'],
 *     message_id: req.headers['kick-event-message-id'],
 *     timestamp: req.headers['kick-event-message-timestamp'],
 *     body: rawBody
 *   });
 *   ```;
 *
 * @param options - Signature verification inputs.
 *
 * @returns `true` when the signature is valid, `false` when it is not, or when `maxAgeSeconds` is
 *   set and the timestamp is outside its window.
 * @throws {Error} When `publicKey` is not a valid PEM-encoded RSA public key.
 */
export async function verifyWebhookSignature(
  options: VerifyWebhookSignatureOptions
): Promise<boolean> {
  if (
    options.maxAgeSeconds !== undefined
    && !isFreshTimestamp(options.timestamp, options.maxAgeSeconds)
  ) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    'spki',
    pemToDer(options.publicKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );

  let signature: Uint8Array<ArrayBuffer>;
  try {
    signature = base64ToBytes(options.signature);
  } catch {
    return false;
  }

  const data = new TextEncoder().encode(
    buildWebhookSignaturePayload(options.message_id, options.timestamp, options.body)
  );
  return await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, data);
}

/**
 * Verifies the signature of an incoming webhook `Request` against its raw body.
 *
 * Event webhooks send the timestamp in `Kick-Event-Message-Timestamp`. Drops claim webhooks send it
 * in `Kick-Event-Timestamp`.
 *
 * Replay-protected by default: requests whose timestamp header is more than
 * `KICK_WEBHOOK_MAX_AGE_SECONDS` (5 minutes) away from the current time, in both directions, return
 * `false` without the signature being verified.
 *
 * @param options - Request verification inputs.
 *
 * @returns `true` when the request is authentic and fresh, `false` otherwise.
 * @throws {Error} When `publicKey` is not a valid PEM-encoded RSA public key.
 */
export async function verifyWebhookRequest(options: VerifyWebhookRequestOptions): Promise<boolean> {
  const { request } = options;
  const signature = request.headers.get(KICK_WEBHOOK_HEADERS.SIGNATURE);
  const message_id = request.headers.get(KICK_WEBHOOK_HEADERS.MESSAGE_ID);
  const timestamp =
    request.headers.get(KICK_WEBHOOK_HEADERS.MESSAGE_TIMESTAMP)
    ?? request.headers.get(KICK_WEBHOOK_HEADERS.DROPS_TIMESTAMP);
  if (!signature || !message_id || !timestamp) {
    return false;
  }

  const body = options.body ?? (await request.clone().text());
  return await verifyWebhookSignature({
    publicKey: options.publicKey,
    signature,
    message_id,
    timestamp,
    body,
    maxAgeSeconds: options.maxAgeSeconds ?? KICK_WEBHOOK_MAX_AGE_SECONDS
  });
}

/**
 * Fetches the current webhook public key from `GET /public/v1/public-key`.
 *
 * Kick rotates this key. Fetch it from this endpoint rather than embedding a copy.
 *
 * @param options - Fetch options.
 *
 * @returns The PEM-encoded RSA public key.
 * @throws {KickApiError} When the endpoint responds with a non-2xx status.
 * @see https://docs.kick.com/apis/public-key
 */
export async function fetchWebhookPublicKey(
  options: FetchWebhookPublicKeyOptions = {}
): Promise<string> {
  const baseUrl = options.baseUrl ?? KICK_API_BASE_URL;
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const url = `${baseUrl}${KICK_PUBLIC_KEY_PATH}`;

  const response = await fetchImpl(url, {
    headers: { accept: 'application/json' },
    signal: options.signal
  });

  const text = await response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }

  if (!response.ok) {
    throw new KickApiError({
      message: `Kick API request failed with status ${response.status} ${response.statusText}`,
      status: response.status,
      statusText: response.statusText,
      method: 'GET',
      url,
      body: parsed,
      headers: response.headers
    });
  }

  const publicKey = (parsed as ApiResponse<PublicKeyResponse>)?.data?.public_key;
  if (typeof publicKey !== 'string' || publicKey.length === 0) {
    throw new Error('Kick API response did not include a public key');
  }
  return publicKey;
}
