import { env } from 'std-env';
import { KICK_API_BASE_URL, KICK_OAUTH_BASE_URL } from './constants';
import { HttpClient } from './http';
import { normalizeExpiresIn, OAuthResource } from './oauth';
import { AdsResource } from './resources/ads';
import { CategoriesResource } from './resources/categories';
import { ChannelRewardsResource } from './resources/channel-rewards';
import { ChannelsResource } from './resources/channels';
import { ChatResource } from './resources/chat';
import { DropsResource } from './resources/drops';
import { EventsResource } from './resources/events';
import { KicksResource } from './resources/kicks';
import { LivestreamsResource } from './resources/livestreams';
import { ModerationResource } from './resources/moderation';
import { PublicKeyResource } from './resources/public-key';
import { UsersResource } from './resources/users';

/**
 * Options for constructing a {@link KickClient}.
 *
 * Omitted credentials fall back to `KICK_API_KEY`, `KICK_CLIENT_ID`, `KICK_CLIENT_SECRET`, and
 * `KICK_REDIRECT_URI` when those environment variables are set.
 */
export interface KickClientOptions {
  /**
   * Bearer token used to authorize API requests. Can be a user access token or an app access token.
   * Defaults to the `KICK_API_KEY` environment variable.
   */
  apiKey?: string;
  /** OAuth client ID. Defaults to the `KICK_CLIENT_ID` environment variable. */
  clientId?: string;
  /** OAuth client secret. Defaults to the `KICK_CLIENT_SECRET` environment variable. */
  clientSecret?: string;
  /**
   * Redirect URI used by {@link OAuthResource.createAuthorizationUrl} when no `redirect_uri` is
   * passed explicitly. Defaults to the `KICK_REDIRECT_URI` environment variable.
   */
  redirectUri?: string;
  /** API base URL. Defaults to `https://api.kick.com`. */
  baseUrl?: string;
  /** OAuth server base URL. Defaults to `https://id.kick.com`. */
  oauthBaseUrl?: string;
  /** Custom fetch implementation. Defaults to the global `fetch`. */
  fetch?: typeof fetch;
  /**
   * Whether requests should automatically obtain and refresh an app access token with the Client
   * Credentials flow when no user-supplied API key is configured. A key passed to the constructor
   * or to {@link KickClient.setApiKey} is never replaced, even after it expires — refresh those with
   * {@link OAuthResource.refreshAccessToken}. Defaults to `true` when both a client ID and client
   * secret are available.
   */
  autoAppToken?: boolean;
}

/**
 * Client for the Kick Public API and OAuth 2.1 server.
 *
 * @example
 *   ```ts
 *   import { KickClient } from 'kick-api';
 *
 *   // Reads KICK_API_KEY from the environment when running in Node.js.
 *   const client = new KickClient({ apiKey: 'your-access-token' });
 *
 *   const me = await client.users.getUsers();
 *   const channels = await client.channels.getChannels({ slug: ['KingCondor'] });
 *   ```;
 *
 * @example
 *   ```ts
 *   // Client credentials flow
 *   const client = new KickClient({
 *   clientId: 'your-client-id',
 *   clientSecret: 'your-client-secret'
 *   });
 *
 *   const { data: categories } = await client.categories.getCategories({ limit: 10 });
 *   ```;
 */
export class KickClient {
  /** Ads API - read and manage ads for a channel. */
  readonly ads: AdsResource;

  /** Categories API - browse categories (games) on Kick. */
  readonly categories: CategoriesResource;

  /** Channel Rewards API - manage channel points rewards and redemptions. */
  readonly channelRewards: ChannelRewardsResource;

  /** Channels API - read channel information and update stream metadata. */
  readonly channels: ChannelsResource;

  /** Chat API - send and delete chat messages. */
  readonly chat: ChatResource;

  /** Drops Public API - retrieve and update reward claims for Drops campaigns. */
  readonly drops: DropsResource;

  /** Events API - manage webhook event subscriptions. */
  readonly events: EventsResource;

  /** KICKs API - KICKs leaderboards. */
  readonly kicks: KicksResource;

  /** Livestreams API - discover active livestreams. */
  readonly livestreams: LivestreamsResource;

  /** Moderation API - ban and unban users in chat. */
  readonly moderation: ModerationResource;

  /** Public Key API - fetch the key used to verify webhook signatures. */
  readonly publicKey: PublicKeyResource;

  /** Users API - look up user information. */
  readonly users: UsersResource;

  /** OAuth 2.1 flows - tokens, authorization URLs, revocation, introspection. */
  readonly oauth: OAuthResource;

  readonly #http: HttpClient;
  readonly #autoAppToken: boolean;
  #apiKey?: string;
  #apiKeyExpiresAt?: number;
  /** `'user'` keys are caller-supplied and never replaced. `'app'` keys were issued by this client. */
  #apiKeySource?: 'user' | 'app';
  /** In-flight client-credentials request, shared by concurrent callers. */
  #appTokenRequest?: Promise<string | undefined>;

  /**
   * Creates a new Kick API client.
   *
   * @param options - Client configuration. Omitted credentials fall back to environment variables.
   */
  constructor(options: KickClientOptions = {}) {
    const clientId = options.clientId ?? env.KICK_CLIENT_ID;
    const clientSecret = options.clientSecret ?? env.KICK_CLIENT_SECRET;
    const redirectUri = options.redirectUri ?? env.KICK_REDIRECT_URI;
    const apiKey = options.apiKey ?? env.KICK_API_KEY;

    this.#autoAppToken = options.autoAppToken ?? Boolean(clientId && clientSecret);
    if (apiKey) {
      this.setApiKey(apiKey);
    }

    this.#http = new HttpClient({
      baseUrl: options.baseUrl ?? KICK_API_BASE_URL,
      oauthBaseUrl: options.oauthBaseUrl ?? KICK_OAUTH_BASE_URL,
      fetch: options.fetch ?? globalThis.fetch,
      getApiKey: () => this.ensureApiKey()
    });

    this.oauth = new OAuthResource(this.#http, {
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri
    });
    this.ads = new AdsResource(this.#http);
    this.categories = new CategoriesResource(this.#http);
    this.channelRewards = new ChannelRewardsResource(this.#http);
    this.channels = new ChannelsResource(this.#http);
    this.chat = new ChatResource(this.#http);
    this.drops = new DropsResource(this.#http);
    this.events = new EventsResource(this.#http);
    this.kicks = new KicksResource(this.#http);
    this.livestreams = new LivestreamsResource(this.#http);
    this.moderation = new ModerationResource(this.#http);
    this.publicKey = new PublicKeyResource(this.#http);
    this.users = new UsersResource(this.#http);
  }

  /**
   * Returns the currently configured API key without triggering a token request.
   *
   * @returns The API key, or `undefined` when none is configured.
   */
  getApiKey(): string | undefined {
    return this.#apiKey;
  }

  /**
   * Sets or clears the API key used for authenticated requests.
   *
   * @example
   *   ```ts
   *   const token = await client.oauth.exchangeCode({ code, code_verifier });
   *   // Pins this user token. It will not be replaced by an app access token.
   *   client.setApiKey(token.access_token, token.expires_in);
   *   ```;
   *
   * @param apiKey - The bearer token to use, or `undefined` to clear it. A key passed here is never
   *   replaced by an app access token. Clearing it lets the next request obtain one again, when
   *   `autoAppToken` is enabled.
   * @param expiresIn - Lifetime of the token in seconds, as returned by the token endpoints. Used
   *   only when this client refreshes an app access token it obtained itself.
   */
  setApiKey(apiKey?: string, expiresIn?: number | string): void {
    if (!apiKey) {
      this.#apiKey = undefined;
      this.#apiKeyExpiresAt = undefined;
      this.#apiKeySource = undefined;
      return;
    }
    this.#apiKey = apiKey;
    this.#apiKeySource = 'user';
    this.#apiKeyExpiresAt = expiryTimestamp(expiresIn);
  }

  /**
   * Ensures an API key is available for the next authenticated request.
   *
   * An app access token is requested only when `autoAppToken` is enabled and no key was passed to
   * the constructor or {@link setApiKey}. A key you set is returned as-is, including after it
   * expires.
   *
   * @returns The API key to use, or `undefined` when none is available.
   */
  async ensureApiKey(): Promise<string | undefined> {
    if (this.#apiKey !== undefined && !this.#isApiKeyExpired()) {
      return this.#apiKey;
    }
    if (!this.#autoAppToken || this.#apiKeySource === 'user') {
      return this.#apiKey;
    }
    this.#appTokenRequest ??= this.#requestAppAccessToken();
    return await this.#appTokenRequest;
  }

  /**
   * Requests an app access token and caches it, unless the caller set a key while the request was
   * in flight.
   */
  async #requestAppAccessToken(): Promise<string | undefined> {
    try {
      const token = await this.oauth.getAppAccessToken();
      if (this.#apiKeySource === 'user') {
        return this.#apiKey;
      }
      this.#apiKey = token.access_token;
      this.#apiKeySource = 'app';
      this.#apiKeyExpiresAt = expiryTimestamp(token.expires_in);
      return this.#apiKey;
    } finally {
      this.#appTokenRequest = undefined;
    }
  }

  /**
   * Whether the cached app access token has passed its expiry time.
   *
   * User-supplied keys are never treated as expired here, so they are not replaced.
   */
  #isApiKeyExpired(): boolean {
    return (
      this.#apiKeySource === 'app'
      && this.#apiKeyExpiresAt !== undefined
      && Date.now() >= this.#apiKeyExpiresAt
    );
  }
}

/** Converts an `expires_in` value into an absolute expiry timestamp, with a 30-second safety margin. */
function expiryTimestamp(expiresIn: number | string | undefined): number | undefined {
  const seconds = normalizeExpiresIn(expiresIn);
  if (seconds === undefined) {
    return undefined;
  }
  return Date.now() + Math.max(0, seconds - 30) * 1000;
}
