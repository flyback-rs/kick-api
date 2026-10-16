import type { KICK_EVENT_TYPES, KICK_SCOPES } from './constants';

/* -------------------------------------------------------------------------- */
/*                                    Common                                  */
/* -------------------------------------------------------------------------- */

/**
 * OAuth 2.1 scope supported by the Kick API.
 *
 * @see https://docs.kick.com/getting-started/scopes
 */
export type KickScope = (typeof KICK_SCOPES)[number];

/**
 * Name of a webhook event delivered by the Kick Events API.
 *
 * @see https://docs.kick.com/events/event-types
 */
export type KickEventType = (typeof KICK_EVENT_TYPES)[number];

/** Per-request options accepted by every resource method. */
export interface RequestOptions {
  /** Abort signal used to cancel the request. */
  signal?: AbortSignal;
  /** Additional headers merged into the outgoing request. */
  headers?: HeadersInit;
}

/**
 * Standard Kick API response envelope.
 *
 * @typeParam T - Shape of the `data` payload.
 */
export interface ApiResponse<T> {
  /** Response payload. */
  data: T;
  /** Human-readable status message, usually `"OK"`. */
  message: string;
}

/** Cursor pagination metadata returned by paginated Kick API endpoints. */
export interface Pagination {
  /** Cursor to pass as `cursor` on the next request to fetch the next page. */
  next_cursor: string;
}

/**
 * Standard Kick API response envelope for paginated endpoints.
 *
 * @typeParam T - Shape of each item in the `data` array.
 */
export interface PaginatedResponse<T> {
  /** Page of results. */
  data: T[];
  /** Human-readable status message, usually `"OK"`. */
  message: string;
  /** Cursor pagination metadata. */
  pagination: Pagination;
}

/** Empty JSON object used as the `data` payload of some write endpoints. */
export type KickEmptyObject = Record<string, never>;

/* -------------------------------------------------------------------------- */
/*                                    OAuth                                   */
/* -------------------------------------------------------------------------- */

/**
 * Type of an access token issued by the Kick OAuth server.
 *
 * - `app` - obtained with the Client Credentials flow.
 * - `user` - obtained with the Authorization Code flow.
 */
export type KickTokenType = 'user' | 'app';

/** Response body of the Kick OAuth token endpoints (`POST /oauth/token`). */
export interface KickTokenResponse {
  /** Bearer token used to authorize API requests. */
  access_token: string;
  /** Token type, typically `"Bearer"`. */
  token_type: string;
  /** Lifetime of the access token in seconds. */
  expires_in: number | string;
  /** Refresh token, only issued for user access tokens. */
  refresh_token?: string;
  /** Space-separated list of granted scopes, only issued for user access tokens. */
  scope?: string;
}

/** Response `data` of `POST /oauth/token/introspect`. */
export interface KickTokenIntrospection {
  /** Whether the token is currently valid. When `false` no other fields are returned. */
  active: boolean;
  /** Client ID the token was issued to. */
  client_id?: string;
  /** Token type, `"user"` or `"app"`. */
  token_type?: KickTokenType;
  /** Space-separated list of scopes granted to the token. */
  scope?: string;
  /** Unix timestamp (seconds) at which the token expires. */
  exp?: number;
}

/**
 * Parameters for building the OAuth authorization URL (`GET /oauth/authorize`).
 *
 * @see https://docs.kick.com/getting-started/generating-tokens-oauth2-flow
 */
export interface BuildAuthorizationUrlParams {
  /** Your application's client ID. */
  client_id: string;
  /** URI to redirect the user to after authorization. Must match the app settings exactly. */
  redirect_uri: string;
  /** Scopes to request. */
  scope: KickScope[] | string;
  /** Random opaque value kept between the request and callback to prevent CSRF. */
  state: string;
  /** PKCE challenge derived from the code verifier with `S256`. */
  code_challenge: string;
  /** PKCE challenge method. Only `"S256"` is supported by Kick. Defaults to `"S256"`. */
  code_challenge_method?: 'S256';
  /** Overrides the OAuth server origin. Defaults to `https://id.kick.com`. */
  oauthBaseUrl?: string;
}

/** Parameters for `POST /oauth/token` with the `authorization_code` grant. */
export interface ExchangeCodeParams {
  /** Authorization code received on the redirect callback. */
  code: string;
  /** The PKCE code verifier that matches the `code_challenge` sent to the authorize endpoint. */
  code_verifier: string;
  /** Redirect URI used in the authorization request. Falls back to the client's `redirectUri`. */
  redirect_uri?: string;
  /** Client ID. Falls back to the client's `clientId`. */
  client_id?: string;
  /** Client secret. Falls back to the client's `clientSecret`. */
  client_secret?: string;
}

/**
 * Parameters for `POST /oauth/token` with the `refresh_token` grant.
 *
 * Refresh tokens are reusable until they are rotated or revoked.
 */
export interface RefreshTokenParams {
  /** Refresh token received from a previous token exchange. */
  refresh_token: string;
  /** Client ID. Falls back to the client's `clientId`. */
  client_id?: string;
  /** Client secret. Falls back to the client's `clientSecret`. */
  client_secret?: string;
}

/** Parameters for `POST /oauth/revoke`. */
export interface RevokeTokenParams {
  /** The access or refresh token to revoke. */
  token: string;
  /** Hint describing the kind of token being revoked. */
  token_hint_type?: 'access_token' | 'refresh_token';
}

/* -------------------------------------------------------------------------- */
/*                                  Categories                                */
/* -------------------------------------------------------------------------- */

/** A category (game) available on Kick. */
export interface Category {
  /** Unique category ID. */
  id: number;
  /** Display name of the category. */
  name: string;
  /** Tags associated with the category. */
  tags: string[];
  /** URL of the category thumbnail image. */
  thumbnail: string;
}

/** Parameters for `GET /public/v2/categories`. */
export interface GetCategoriesParams {
  /** Pagination cursor from a previous response. */
  cursor?: string;
  /** Maximum number of results to return. Defaults to `25`, maximum `1000`. */
  limit?: number;
  /** Filter by category names. */
  name?: string[];
  /** Filter by category tags. */
  tag?: string[];
  /** Filter by category IDs. */
  id?: number[];
}

/* -------------------------------------------------------------------------- */
/*                                    Users                                   */
/* -------------------------------------------------------------------------- */

/** A Kick user. */
export interface User {
  /** Email address. Only returned for the currently authorized user. */
  email?: string;
  /** Display name of the user. */
  name: string;
  /** URL of the user's profile picture. */
  profile_picture: string;
  /** Unique user ID. */
  user_id: number;
}

/** Parameters for `GET /public/v1/users`. */
export interface GetUsersParams {
  /**
   * User IDs to look up. When omitted, information about the currently authorized user is returned
   * instead.
   */
  id?: number[];
}

/* -------------------------------------------------------------------------- */
/*                                   Channels                                 */
/* -------------------------------------------------------------------------- */

/** Slim category representation embedded in channel and livestream responses. */
export interface ChannelCategory {
  /** Unique category ID. */
  id: number;
  /** Display name of the category. */
  name: string;
  /** URL of the category thumbnail image. */
  thumbnail: string;
}

/** Live stream information attached to a channel. */
export interface ChannelStream {
  /** Custom tags set on the stream. */
  custom_tags: string[];
  /** Whether the channel is currently live. */
  is_live: boolean;
  /** Whether the stream is flagged as mature content. */
  is_mature: boolean;
  /** Stream key. Only returned when the token has the `streamkey:read` scope. */
  key: string;
  /** BCP 47 language code of the stream. */
  language: string;
  /** ISO 8601 timestamp of when the stream started. */
  start_time: string;
  /** URL of the stream thumbnail image. */
  thumbnail: string;
  /** URL of the stream. */
  url: string;
  /** Current number of viewers. */
  viewer_count: number;
}

/** A Kick channel. */
export interface Channel {
  /** Number of active subscriptions, including gifted subscriptions. */
  active_subscribers_count: number;
  /** Number of currently active gifted subscriptions. */
  active_gifted_subscribers_count: number;
  /** URL of the channel banner image. */
  banner_picture: string;
  /** User ID of the channel owner. */
  broadcaster_user_id: number;
  /** Number of subscriptions that were canceled but have not yet expired. */
  canceled_subscribers_count: number;
  /** Category the channel is currently streaming in. */
  category: ChannelCategory;
  /** Channel description. */
  channel_description: string;
  /** URL slug of the channel. */
  slug: string;
  /** Live stream information for the channel. */
  stream: ChannelStream;
  /** Current stream title. */
  stream_title: string;
}

/**
 * Parameters for `GET /public/v1/channels`.
 *
 * Provide broadcaster user IDs or slugs, but not both. When neither is provided, the channel of the
 * currently authorized user is returned.
 */
export type GetChannelsParams =
  | {
      /** Broadcaster user IDs (up to 50). Cannot be combined with `slug`. */
      broadcaster_user_id?: number[];
    }
  | {
      /**
       * Channel slugs (up to 50, max 25 characters each). Cannot be combined with
       * `broadcaster_user_id`.
       */
      slug?: string[];
    };

/**
 * Parameters for `PATCH /public/v1/channels`.
 *
 * At least one field must be set.
 */
export interface UpdateChannelParams {
  /** New category ID for the channel. */
  category_id?: number;
  /** New custom tags for the stream (maximum of 10). */
  custom_tags?: string[];
  /** New stream title. */
  stream_title?: string;
}

/* -------------------------------------------------------------------------- */
/*                               Channel Rewards                              */
/* -------------------------------------------------------------------------- */

/** A channel points reward. */
export interface ChannelReward {
  /** Background color of the reward as a hex color, e.g. `#00e701`. */
  background_color: string;
  /** Cost of the reward in channel points. */
  cost: number;
  /** Description shown to viewers. */
  description: string;
  /** Unique reward ID (ULID). */
  id: string;
  /** Whether the reward is enabled. */
  is_enabled: boolean;
  /** Whether redemptions of the reward are currently paused. */
  is_paused: boolean;
  /** Whether viewers must enter text when redeeming. */
  is_user_input_required: boolean;
  /** Whether redemptions skip the requests queue and are auto-accepted. */
  should_redemptions_skip_request_queue: boolean;
  /** Title of the reward. */
  title: string;
}

/** Parameters for `POST /public/v1/channels/rewards`. */
export interface CreateChannelRewardParams {
  /** Title of the reward (max 50 characters). */
  title: string;
  /** Cost of the reward in channel points (`>= 1`). */
  cost: number;
  /** Description shown to viewers (max 200 characters). */
  description?: string;
  /** Background color of the reward as a hex color. Defaults to `#00e701`. */
  background_color?: string;
  /** Whether the reward is enabled. Defaults to `true`. */
  is_enabled?: boolean;
  /** Whether viewers must enter text when redeeming. Defaults to `false`. */
  is_user_input_required?: boolean;
  /** Whether redemptions skip the requests queue. Defaults to `false`. */
  should_redemptions_skip_request_queue?: boolean;
}

/**
 * Parameters for `PATCH /public/v1/channels/rewards/{id}`.
 *
 * At least one field must be set. Only the app that created the reward can update it.
 */
export interface UpdateChannelRewardParams {
  /** New title (max 50 characters). */
  title?: string;
  /** New cost in channel points (`>= 1`). */
  cost?: number;
  /** New description (max 200 characters). */
  description?: string;
  /** New background color as a hex color. */
  background_color?: string;
  /** New enabled state. */
  is_enabled?: boolean;
  /** New paused state. */
  is_paused?: boolean;
  /** New user-input requirement. */
  is_user_input_required?: boolean;
  /** New skip-queue behavior. */
  should_redemptions_skip_request_queue?: boolean;
}

/** Status of a channel reward redemption. */
export type ChannelRewardRedemptionStatus = 'pending' | 'accepted' | 'rejected';

/** A single channel reward redemption. */
export interface ChannelRewardRedemption {
  /** Unique redemption ID (ULID). */
  id: string;
  /** ISO 8601 timestamp of when the reward was redeemed. */
  redeemed_at: string;
  /** The user who redeemed the reward. */
  redeemer: {
    /** User ID of the redeemer. */
    user_id: number;
  };
  /** Current status of the redemption. */
  status: ChannelRewardRedemptionStatus;
  /** Text entered by the redeemer, if input was required. */
  user_input: string;
}

/** Reward summary attached to a group of redemptions. */
export interface ChannelRewardSummary {
  /** Unique reward ID (ULID). */
  id: string;
  /** Title of the reward. */
  title: string;
  /** Cost of the reward in channel points. */
  cost?: number;
  /** Description shown to viewers. */
  description?: string;
  /** Whether your app can manage the reward and its redemptions. */
  can_manage?: boolean;
  /** Only present when the reward has been deleted. */
  is_deleted?: boolean;
}

/** Redemptions grouped by the reward they belong to. */
export interface ChannelRewardRedemptionsByReward {
  /** Redemptions for the reward. */
  redemptions: ChannelRewardRedemption[];
  /** The reward the redemptions belong to. */
  reward: ChannelRewardSummary;
}

/** Parameters for `GET /public/v1/channels/rewards/redemptions`. */
export interface GetChannelRewardRedemptionsParams {
  /** Only list redemptions of this reward (ULID). */
  reward_id?: string;
  /** Only list redemptions with this status. Defaults to `"pending"`. */
  status?: ChannelRewardRedemptionStatus;
  /** Only list redemptions with these IDs (ULIDs). Cannot be combined with any other filter. */
  id?: string[];
  /** Pagination cursor from a previous response. */
  cursor?: string;
}

/**
 * Parameters for `POST /public/v1/channels/rewards/redemptions/accept` and `POST
 * /public/v1/channels/rewards/redemptions/reject`.
 */
export interface ChannelRewardRedemptionsParams {
  /** Redemption IDs (ULIDs) to accept or reject. Up to 25 unique IDs per request. */
  ids: string[];
}

/** A redemption that could not be accepted or rejected. */
export interface FailedRedemption {
  /** Redemption ID (ULID). */
  id: string;
  /** Why the redemption failed. */
  reason: 'UNKNOWN' | 'NOT_PENDING' | 'NOT_FOUND' | 'NOT_OWNED';
}

/* -------------------------------------------------------------------------- */
/*                                    Chat                                    */
/* -------------------------------------------------------------------------- */

/**
 * Parameters for `POST /public/v1/chat` when sending as a user.
 *
 * The message is sent to the channel identified by `broadcaster_user_id`.
 */
export interface SendChatMessageAsUserParams {
  /** Must be `"user"` to send the message on behalf of the authorized user. */
  type: 'user';
  /** Message content (max 500 grapheme clusters and 2048 UTF-8 bytes). */
  content: string;
  /** Broadcaster user ID of the channel to send the message to. */
  broadcaster_user_id: number;
  /** UUID of a message to reply to. */
  reply_to_message_id?: string;
}

/**
 * Parameters for `POST /public/v1/chat` when sending as a bot.
 *
 * The message is always sent to the channel attached to your bot token and `broadcaster_user_id` is
 * ignored.
 */
export interface SendChatMessageAsBotParams {
  /** Must be `"bot"` to send the message as a bot account. */
  type: 'bot';
  /** Message content (max 500 grapheme clusters and 2048 UTF-8 bytes). */
  content: string;
  /** Ignored for bot messages. */
  broadcaster_user_id?: number;
  /** UUID of a message to reply to. */
  reply_to_message_id?: string;
}

/** Parameters for `POST /public/v1/chat`. */
export type SendChatMessageParams = SendChatMessageAsUserParams | SendChatMessageAsBotParams;

/** Response `data` of `POST /public/v1/chat`. */
export interface SendChatMessageResponse {
  /** Whether the message was sent. */
  is_sent: boolean;
  /** UUID of the sent message. */
  message_id: string;
}

/* -------------------------------------------------------------------------- */
/*                                  Moderation                                */
/* -------------------------------------------------------------------------- */

/** Parameters for `POST /public/v1/moderation/bans`. */
export interface BanUserParams {
  /** Broadcaster user ID of the channel to ban in. */
  broadcaster_user_id: number;
  /** User ID of the user to ban or time out. */
  user_id: number;
  /**
   * Timeout period in minutes (`1`–`10080`). Omit this field to issue a permanent ban instead of a
   * timeout.
   */
  duration?: number;
  /** Reason for the ban (max 100 characters). */
  reason?: string;
}

/** Parameters for `DELETE /public/v1/moderation/bans`. */
export interface UnbanUserParams {
  /** Broadcaster user ID of the channel to unban in. */
  broadcaster_user_id: number;
  /** User ID of the user to unban or remove the timeout for. */
  user_id: number;
}

/* -------------------------------------------------------------------------- */
/*                                 Livestreams                                */
/* -------------------------------------------------------------------------- */

/** Broadcaster information attached to a livestream. */
export interface LivestreamUser {
  /** Unique user ID of the broadcaster. */
  id: number;
  /** URL of the broadcaster's profile picture. */
  profile_picture: string;
  /** Display name of the broadcaster. */
  username: string;
}

/** Category information attached to a livestream. */
export interface LivestreamCategory {
  /** Unique category ID. */
  id: number;
  /** Display name of the category. */
  name: string;
  /** URL of the category thumbnail image. */
  thumbnail: string;
}

/** Channel information attached to a livestream. */
export interface LivestreamChannel {
  /** URL slug of the channel. */
  slug: string;
}

/** An active livestream. */
export interface Livestream {
  /** Broadcaster of the stream. */
  broadcaster_user: LivestreamUser;
  /** Category the stream is listed in. */
  category: LivestreamCategory;
  /** Channel the stream belongs to. */
  channel: LivestreamChannel;
  /** Whether the stream is flagged as mature content. */
  has_mature_content: boolean;
  /** Unique livestream ID (UUID). */
  id: string;
  /** BCP 47 language code of the stream. */
  language_code: string;
  /** ISO 8601 timestamp of when the stream started. */
  started_at: string;
  /** Tags set on the stream. */
  tags: string[];
  /** URL of the stream thumbnail image. */
  thumbnail: string;
  /** Stream title. */
  title: string;
  /** Current number of viewers. */
  viewer_count: number;
}

/** Parameters for `GET /public/v2/livestreams`. */
export interface GetLivestreamsParams {
  /** Only return streams in these categories (maximum of 25 IDs). */
  category_id?: number[];
  /** Only return streams in these languages (maximum of 25 BCP 47 language tags). */
  language_code?: string[];
  /** Number of results per page (`1`–`1000`). Defaults to `100`. */
  limit?: number;
  /** Pagination cursor from a previous response. */
  cursor?: string;
}

/** Parameters for `GET /public/v1/users/livestreams`. */
export interface GetUsersLivestreamsParams {
  /** Broadcaster user IDs to fetch active livestreams for (maximum of 100). */
  user_id: number[];
}

/** Response `data` of `GET /public/v1/livestreams/stats`. */
export interface LivestreamStats {
  /** Total number of active livestreams. */
  total_count: number;
}

/* -------------------------------------------------------------------------- */
/*                                    KICKs                                   */
/* -------------------------------------------------------------------------- */

/** A single entry in the KICKs leaderboard. */
export interface KicksLeaderboardEntry {
  /** Total KICKs gifted by the user. */
  gifted_amount: number;
  /** Position of the user on the leaderboard. */
  rank: number;
  /** Unique user ID. */
  user_id: number;
  /** Display name of the user. */
  username: string;
}

/** KICKs leaderboard results across time ranges. */
export interface KicksLeaderboard {
  /** All-time leaderboard. */
  lifetime: KicksLeaderboardEntry[];
  /** Current month's leaderboard. */
  month: KicksLeaderboardEntry[];
  /** Current week's leaderboard. */
  week: KicksLeaderboardEntry[];
}

/** Parameters for `GET /public/v1/kicks/leaderboard`. */
export interface GetKicksLeaderboardParams {
  /** Number of entries to return from the top of the leaderboard (`1`–`100`). Defaults to `10`. */
  top?: number;
}

/* -------------------------------------------------------------------------- */
/*                                     Ads                                    */
/* -------------------------------------------------------------------------- */

/** Parameters for `POST /public/v1/ads/ad-break`. */
export interface CreateAdBreakParams {
  /** Duration of the ad break in seconds (`7`–`90`). */
  break_duration_seconds: number;
  /** UUID identifying the ad break. Defaults to a random UUID generated with `crypto.randomUUID()`. */
  id?: string;
}

/**
 * Reason an ad break could not be created.
 *
 * @see https://docs.kick.com/apis/ads
 */
export type AdBreakErrorCode =
  | 'CHANNEL_IS_NOT_LIVE'
  | 'CHANNEL_NOT_OPTED_IN'
  | 'ADS_BLOCKED'
  | 'AD_BREAK_ACTIVE'
  | 'MAX_AD_BREAKS_REACHED'
  | 'AUTO_ADS_ACTIVE';

/**
 * Reason a channel could not be enrolled in ads.
 *
 * @see https://docs.kick.com/apis/ads
 */
export type AdsEnrollErrorCode = 'CHANNEL_NOT_FOUND' | 'CHANNEL_IS_LIVE' | 'CHANNEL_NEVER_STREAMED';

/** Response `data` of `POST /public/v1/ads/ad-break`. */
export interface AdBreak {
  /** Unique ad break ID (UUID). */
  id: string;
  /** Number of ad breaks remaining in the current period. */
  remaining_ad_breaks: number;
}

/** An individual ad break in the ad break status history. */
export interface AdBreakStatusItem {
  /** Duration of the ad break in seconds. */
  break_duration_seconds: number;
  /** ISO 8601 timestamp of when the ad break was created. */
  created_at: string;
  /** Unique ad break ID (UUID). */
  id: string;
  /** Source that created the ad break (e.g. manual). */
  source: string;
  /** Current status of the ad break. */
  status: string;
}

/** Ad break limits for the channel. */
export interface AdBreakLimits {
  /** Maximum number of ad breaks per period. */
  max: number;
  /** Length of the period in seconds. */
  period_seconds: number;
}

/** Response `data` of `GET /public/v1/ads/ad-break-status`. */
export interface AdBreakStatus {
  /** Ad breaks that have run in the current period. */
  ad_breaks: AdBreakStatusItem[];
  /** Whether ads are currently blocked on the channel. */
  ads_blocked: boolean;
  /** Whether auto ads are active on the channel. */
  auto_ads_active: boolean;
  /** Ad break limits for the channel. */
  limits: AdBreakLimits;
  /** Whether the channel is opted in to ads. */
  opted_in: boolean;
  /** Number of ad breaks remaining in the current period. */
  remaining_ad_breaks: number;
}

/* -------------------------------------------------------------------------- */
/*                                   Events                                   */
/* -------------------------------------------------------------------------- */

/** An event to subscribe to. All Kick events are currently at version `1`. */
export interface KickEvent {
  /** Name of the event. */
  name: KickEventType;
  /** Version of the event to subscribe to. Currently always `1`. */
  version: number;
}

/** An existing webhook event subscription. */
export interface EventSubscription {
  /** Client ID of the app the subscription belongs to. */
  app_id: string;
  /** Broadcaster user ID the subscription is for. */
  broadcaster_user_id: number;
  /** ISO 8601 timestamp of when the subscription was created. */
  created_at: string;
  /** Name of the subscribed event. */
  event: KickEventType;
  /** Unique subscription ID. */
  id: string;
  /** Delivery method of the subscription, currently always `"webhook"`. */
  method: string;
  /** ISO 8601 timestamp of when the subscription was last updated. */
  updated_at: string;
  /** Version of the subscribed event. */
  version: number;
}

/** Parameters for `GET /public/v1/events/subscriptions`. */
export interface GetEventSubscriptionsParams {
  /** Only return subscriptions for this broadcaster. */
  broadcaster_user_id?: number;
}

/** Parameters for `POST /public/v1/events/subscriptions`. */
export interface CreateEventSubscriptionsParams {
  /** Events to subscribe to. */
  events: KickEvent[];
  /** Delivery method. Only `"webhook"` is currently supported. */
  method?: 'webhook';
  /**
   * Broadcaster user ID to subscribe for. Required with an app access token; ignored with a user
   * access token, which subscribes for its own user.
   */
  broadcaster_user_id?: number;
}

/** Result of a subscription request for a single event. */
export interface EventSubscriptionCreated {
  /** Name of the event. */
  name: string;
  /** Version of the event. */
  version: number;
  /** ID of the created subscription. Not present when `error` is set. */
  subscription_id?: string;
  /** Error description when the subscription could not be created. */
  error?: string;
}

/** Parameters for `DELETE /public/v1/events/subscriptions`. */
export interface DeleteEventSubscriptionsParams {
  /** Subscription ID, or list of subscription IDs, to delete. */
  id: string | string[];
}

/* -------------------------------------------------------------------------- */
/*                                    Drops                                   */
/* -------------------------------------------------------------------------- */

/**
 * A Drops reward claim.
 *
 * @see https://docs.kick.com/drops/public-api
 */
export interface DropsClaim {
  /** Unique claim ID (ULID). Also used as an idempotency key. */
  claim_id: string;
  /** User ID of the viewer who claimed the reward. */
  user_id: number;
  /** Campaign the claim belongs to (ULID). */
  campaign_id: string;
  /** Reward that was claimed (ULID). */
  reward_id: string;
  /** External reward reference configured when the reward was created. */
  external_id: string;
  /** Your fulfillment status for the claim. Set to `"initiated"` when a claim is created. */
  external_status: string;
  /** ISO 8601 timestamp of when the claim was created. */
  created_at: string;
  /** ISO 8601 timestamp of when the claim was last updated. */
  updated_at: string;
}

/** Response `data` of `GET /public/v1/drops/claims`. */
export interface DropsClaimsData {
  /** Claims matching the query. */
  claims: DropsClaim[];
  /** Cursor to pass as `cursor` to fetch the next page of claims. */
  cursor: string;
}

/** Parameters for `GET /public/v1/drops/claims`. */
export interface GetDropsClaimsParams {
  /** Only return claims for this campaign. */
  campaign_id?: string;
  /** Number of results to return (`1`–`1000`). Defaults to `10`. */
  limit?: number;
  /** Pagination cursor from a previous response. */
  cursor?: string;
  /** Only return claims of this user. */
  user_id?: number;
  /** Only return this claim. */
  claim_id?: string;
  /** Only return claims with this external status. */
  external_status?: string;
}

/** A single claim update for `PATCH /public/v1/drops/claims`. */
export interface DropsClaimUpdate {
  /** Claim ID (ULID) to update. */
  claim_id: string;
  /** New fulfillment status for the claim. */
  external_status: string;
}

/** Parameters for `PATCH /public/v1/drops/claims`. */
export interface UpdateDropsClaimsParams {
  /** Claim updates to apply. Up to 100 per request. */
  claims: DropsClaimUpdate[];
}

/* -------------------------------------------------------------------------- */
/*                                  Public key                                */
/* -------------------------------------------------------------------------- */

/** Response `data` of `GET /public/v1/public-key`. */
export interface PublicKeyResponse {
  /** PEM-encoded RSA public key used to verify webhook signatures. */
  public_key: string;
}

/* -------------------------------------------------------------------------- */
/*                              Webhook payloads                              */
/* -------------------------------------------------------------------------- */

/** A badge displayed next to a chat sender's name. */
export interface WebhookUserBadge {
  /** Display text of the badge, e.g. `"Moderator"`. */
  text: string;
  /** Machine-readable badge type, e.g. `"moderator"`, `"sub_gifter"`, `"subscriber"`. */
  type: string;
  /** Count associated with the badge, e.g. months subscribed. */
  count?: number;
}

/** Chat identity of a webhook user, such as name color and badges. */
export interface WebhookUserIdentity {
  /** Hex color of the user's chat name. */
  username_color: string;
  /** Badges displayed next to the user's name. */
  badges: WebhookUserBadge[];
}

/** A user referenced in a webhook payload without chat identity information. */
export interface WebhookUserProfile {
  /** Unique user ID. */
  user_id: number;
  /** Display name of the user. */
  username: string;
  /** Whether the user is verified. */
  is_verified: boolean;
  /** URL of the user's profile picture. */
  profile_picture: string;
  /** URL slug of the user's channel. */
  channel_slug: string;
}

/** A user referenced in a webhook payload. */
export interface WebhookUser extends WebhookUserProfile {
  /** Whether the user is anonymous. */
  is_anonymous: boolean;
  /** Chat identity information, or `null` when none applies to the payload. */
  identity: WebhookUserIdentity | null;
}

/**
 * A webhook user whose profile fields are `null` when `is_anonymous` is `true`, such as an
 * anonymous gifter.
 */
export interface AnonymousWebhookUser {
  /** Whether the user is anonymous. */
  is_anonymous: boolean;
  /** Unique user ID, `null` when anonymous. */
  user_id: number | null;
  /** Display name, `null` when anonymous. */
  username: string | null;
  /** Verified state, `null` when anonymous. */
  is_verified: boolean | null;
  /** Profile picture URL, `null` when anonymous. */
  profile_picture: string | null;
  /** Channel slug, `null` when anonymous. */
  channel_slug: string | null;
  /** Chat identity, `null` when anonymous. */
  identity: WebhookUserIdentity | null;
}

/** An emote position range within a chat message. */
export interface ChatMessageEmotePosition {
  /** Start index of the emote within the message content. */
  s: number;
  /** End index of the emote within the message content. */
  e: number;
}

/** An emote used in a chat message. */
export interface ChatMessageEmote {
  /** Emote ID. */
  emote_id: string;
  /** Positions of the emote within the message content. */
  positions: ChatMessageEmotePosition[];
}

/** The message a chat message was sent as a reply to. */
export interface ChatMessageReply {
  /** UUID of the message being replied to. */
  message_id: string;
  /** Content of the message being replied to. */
  content: string;
  /** Sender of the message being replied to. */
  sender: WebhookUser;
}

/** Payload of the `chat.message.sent` webhook event. */
export interface ChatMessageSentPayload {
  /** UUID of the message. */
  message_id: string;
  /** Present when the message is a reply to another message. */
  replies_to?: ChatMessageReply;
  /** Broadcaster whose chat the message was sent in. */
  broadcaster: WebhookUser;
  /** User who sent the message. */
  sender: WebhookUser;
  /** Raw message content, with emotes in `[emote:id:name]` notation. */
  content: string;
  /** Emotes used in the message. */
  emotes: ChatMessageEmote[];
  /** ISO 8601 timestamp of when the message was sent. */
  created_at: string;
}

/** Payload of the `channel.followed` webhook event. */
export interface ChannelFollowedPayload {
  /** Broadcaster who was followed. */
  broadcaster: WebhookUser;
  /** User who followed the channel. */
  follower: WebhookUser;
}

/** Payload of the `channel.subscription.new` and `channel.subscription.renewal` webhook events. */
export interface ChannelSubscriptionPayload {
  /** Broadcaster who was subscribed to. */
  broadcaster: WebhookUser;
  /** User who subscribed or renewed. */
  subscriber: WebhookUser;
  /** Subscription duration in months. */
  duration: number;
  /** ISO 8601 timestamp of when the subscription started. */
  created_at: string;
  /** ISO 8601 timestamp of when the subscription expires. */
  expires_at: string;
}

/** Payload of the `channel.subscription.gifts` webhook event. */
export interface ChannelSubscriptionGiftsPayload {
  /** Broadcaster who received the gifted subscriptions. */
  broadcaster: WebhookUser;
  /** User who gifted the subscriptions. Profile fields are `null` when anonymous. */
  gifter: AnonymousWebhookUser;
  /** Users who received a gifted subscription. */
  giftees: WebhookUser[];
  /** ISO 8601 timestamp of when the gifts were created. */
  created_at: string;
  /** ISO 8601 timestamp of when the gifted subscriptions expire. */
  expires_at: string;
}

/** Reward information inside a `channel.reward.redemption.updated` payload. */
export interface WebhookReward {
  /** Unique reward ID (ULID). */
  id: string;
  /** Title of the reward. */
  title: string;
  /** Cost of the reward in channel points. */
  cost: number;
  /** Description shown to viewers. */
  description: string;
}

/**
 * Payload of the `channel.reward.redemption.updated` webhook event.
 *
 * Fired when a redemption is created and whenever its status changes.
 */
export interface ChannelRewardRedemptionUpdatedPayload {
  /** Unique redemption ID (ULID). */
  id: string;
  /** Text entered by the redeemer, if input was required. */
  user_input: string;
  /** Current status of the redemption. */
  status: ChannelRewardRedemptionStatus;
  /** ISO 8601 timestamp of when the reward was redeemed. */
  redeemed_at: string;
  /** Reward that was redeemed. */
  reward: WebhookReward;
  /** User who redeemed the reward. */
  redeemer: WebhookUserProfile;
  /** Broadcaster whose reward was redeemed. */
  broadcaster: WebhookUserProfile;
}

/** Payload of the `livestream.status.updated` webhook event. */
export interface LivestreamStatusUpdatedPayload {
  /** Broadcaster whose stream status changed. */
  broadcaster: WebhookUser;
  /** Whether the stream is now live. */
  is_live: boolean;
  /** Title of the stream. */
  title: string;
  /** ISO 8601 timestamp of when the stream started. */
  started_at: string;
  /** ISO 8601 timestamp of when the stream ended, `null` while live. */
  ended_at: string | null;
}

/** Stream metadata inside a `livestream.metadata.updated` payload. */
export interface LivestreamMetadata {
  /** Title of the stream. */
  title: string;
  /** BCP 47 language code of the stream. */
  language: string;
  /** Whether the stream is flagged as mature content. */
  has_mature_content: boolean;
  /** Category the stream is listed in. */
  category: ChannelCategory;
}

/** Payload of the `livestream.metadata.updated` webhook event. */
export interface LivestreamMetadataUpdatedPayload {
  /** Broadcaster whose stream metadata changed. */
  broadcaster: WebhookUser;
  /** Updated stream metadata. */
  metadata: LivestreamMetadata;
}

/** Ban details inside a `moderation.banned` payload. */
export interface ModerationBannedMetadata {
  /** Reason for the ban. */
  reason: string;
  /** ISO 8601 timestamp of when the ban was created. */
  created_at: string;
  /** ISO 8601 timestamp of when the ban expires, `null` for permanent bans. */
  expires_at: string | null;
}

/** Payload of the `moderation.banned` webhook event. */
export interface ModerationBannedPayload {
  /** Broadcaster whose chat the user was banned from. */
  broadcaster: WebhookUser;
  /** Moderator who issued the ban. */
  moderator: WebhookUser;
  /** User who was banned. */
  banned_user: WebhookUser;
  /** Ban details. */
  metadata: ModerationBannedMetadata;
}

/** Details of a KICKs gift. */
export interface KicksGift {
  /** Number of KICKs gifted. */
  amount: number;
  /** Name of the gift, e.g. `"Rage Quit"`. */
  name: string;
  /** Gift type, e.g. `"LEVEL_UP"`. */
  type: string;
  /** Gift tier, e.g. `"MID"`. */
  tier: string;
  /** Optional message attached to the gift. */
  message: string;
  /** Duration in seconds the gift pinned in chat. */
  pinned_time_seconds: number;
}

/** Payload of the `kicks.gifted` webhook event. */
export interface KicksGiftedPayload {
  /** Broadcaster who received the KICKs. */
  broadcaster: WebhookUserProfile;
  /** User who sent the KICKs. */
  sender: WebhookUserProfile;
  /** Details of the gift. */
  gift: KicksGift;
  /** ISO 8601 timestamp of when the gift was created. */
  created_at: string;
}

/**
 * Payload of the synchronous Drops claim webhook.
 *
 * @see https://docs.kick.com/drops/drops-guide
 */
export interface DropsClaimWebhookPayload {
  /** Unique claim ID (ULID). Use as an idempotency key. */
  claim_id: string;
  /** User ID of the viewer who claimed the reward. */
  user_id: number;
  /** Campaign the claim belongs to (ULID). */
  campaign_id: string;
  /** Reward that was claimed (ULID). */
  reward_id: string;
  /** External reward reference, when configured. */
  external_id?: string;
}

/**
 * Maps each webhook event type to the shape of its payload.
 *
 * @example
 *   ```ts
 *   const payload: KickWebhookPayloadMap['chat.message.sent'] = JSON.parse(body);
 *   ```;
 */
export interface KickWebhookPayloadMap {
  'chat.message.sent': ChatMessageSentPayload;
  'channel.followed': ChannelFollowedPayload;
  'channel.subscription.new': ChannelSubscriptionPayload;
  'channel.subscription.renewal': ChannelSubscriptionPayload;
  'channel.subscription.gifts': ChannelSubscriptionGiftsPayload;
  'channel.reward.redemption.updated': ChannelRewardRedemptionUpdatedPayload;
  'livestream.status.updated': LivestreamStatusUpdatedPayload;
  'livestream.metadata.updated': LivestreamMetadataUpdatedPayload;
  'moderation.banned': ModerationBannedPayload;
  'kicks.gifted': KicksGiftedPayload;
}
