/**
 * TypeScript client for the Kick Public API.
 *
 * @packageDocumentation
 */

export { KickClient } from './client';
export type { KickClientOptions } from './client';

export {
  KICK_API_BASE_URL,
  KICK_EVENT_TYPES,
  KICK_OAUTH_BASE_URL,
  KICK_PUBLIC_KEY_PATH,
  KICK_SCOPES,
  KICK_WEBHOOK_HEADERS
} from './constants';
export { KickApiError } from './errors';
export type { KickApiErrorOptions } from './errors';

export {
  buildAuthorizationUrl,
  createPkcePair,
  generateCodeChallenge,
  generateCodeVerifier,
  generateRandomString,
  KICK_PKCE_CHALLENGE_METHOD,
  OAuthResource
} from './oauth';
export type { CreateAuthorizationUrlParams, PkcePair } from './oauth';

export { AdsResource } from './resources/ads';
export { CategoriesResource } from './resources/categories';
export { ChannelRewardsResource } from './resources/channel-rewards';
export { ChannelsResource } from './resources/channels';
export { ChatResource } from './resources/chat';
export { DropsResource } from './resources/drops';
export { EventsResource } from './resources/events';
export { KicksResource } from './resources/kicks';
export { LivestreamsResource } from './resources/livestreams';
export { ModerationResource } from './resources/moderation';
export { PublicKeyResource } from './resources/public-key';
export { UsersResource } from './resources/users';

export type * from './types';

export {
  buildWebhookSignaturePayload,
  fetchWebhookPublicKey,
  KICK_WEBHOOK_MAX_AGE_SECONDS,
  verifyWebhookRequest,
  verifyWebhookSignature
} from './webhooks';
export type {
  FetchWebhookPublicKeyOptions,
  VerifyWebhookRequestOptions,
  VerifyWebhookSignatureOptions
} from './webhooks';
