/**
 * Default base URL for the Kick Public API server.
 *
 * @see https://docs.kick.com/
 */
export const KICK_API_BASE_URL = 'https://api.kick.com';

/**
 * Default base URL for the Kick OAuth 2.1 authorization server.
 *
 * @see https://docs.kick.com/getting-started/generating-tokens-oauth2-flow
 */
export const KICK_OAUTH_BASE_URL = 'https://id.kick.com';

/**
 * All OAuth 2.1 scopes supported by the Kick API.
 *
 * @see https://docs.kick.com/getting-started/scopes
 */
export const KICK_SCOPES = [
  'user:read',
  'channel:read',
  'channel:write',
  'channel:rewards:read',
  'channel:rewards:write',
  'chat:write',
  'streamkey:read',
  'events:subscribe',
  'moderation:ban',
  'moderation:chat_message:manage',
  'kicks:read',
  'ads:read',
  'ads:write'
] as const;

/**
 * All webhook event types supported by the Kick Events API.
 *
 * @see https://docs.kick.com/events/event-types
 */
export const KICK_EVENT_TYPES = [
  'chat.message.sent',
  'channel.followed',
  'channel.subscription.renewal',
  'channel.subscription.gifts',
  'channel.subscription.new',
  'channel.reward.redemption.updated',
  'livestream.status.updated',
  'livestream.metadata.updated',
  'moderation.banned',
  'kicks.gifted'
] as const;

/**
 * Path of the endpoint that returns the public key used to verify webhook signatures.
 *
 * @see https://docs.kick.com/apis/public-key
 */
export const KICK_PUBLIC_KEY_PATH = '/public/v1/public-key';

/**
 * HTTP header names sent by Kick on webhook requests.
 *
 * @see https://docs.kick.com/events/webhook-security
 * @see https://docs.kick.com/drops/drops-guide#webhook-headers
 */
export const KICK_WEBHOOK_HEADERS = {
  /** Unique message ID (ULID), used as an idempotency key. */
  MESSAGE_ID: 'kick-event-message-id',
  /** Subscription ID (ULID) associated with the event. */
  SUBSCRIPTION_ID: 'kick-event-subscription-id',
  /** Base64-encoded RSA-SHA256 signature used to verify the sender. */
  SIGNATURE: 'kick-event-signature',
  /** RFC3339 date-time timestamp of when the message was sent. */
  MESSAGE_TIMESTAMP: 'kick-event-message-timestamp',
  /** Timestamp header on Drops claim webhooks. */
  DROPS_TIMESTAMP: 'kick-event-timestamp',
  /** Event type name (e.g. `chat.message.sent`). */
  EVENT_TYPE: 'kick-event-type',
  /** Event version string (e.g. `1`). */
  EVENT_VERSION: 'kick-event-version'
} as const;
