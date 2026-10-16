import { base64UrlEncode } from './base64';
import { KICK_OAUTH_BASE_URL } from './constants';
import type { HttpClient } from './http';
import type {
  BuildAuthorizationUrlParams,
  ExchangeCodeParams,
  KickTokenIntrospection,
  KickTokenResponse,
  RefreshTokenParams,
  RequestOptions,
  RevokeTokenParams
} from './types';

/**
 * Parses an OAuth `expires_in` value as a number of seconds.
 *
 * @internal
 */
export function normalizeExpiresIn(value: number | string | undefined): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

/**
 * Returns a token response whose `expires_in` is a number when the server sent a numeric string.
 *
 * @internal
 */
function normalizeTokenResponse(token: KickTokenResponse): KickTokenResponse {
  const expiresIn = normalizeExpiresIn(token.expires_in);
  if (expiresIn === undefined || expiresIn === token.expires_in) {
    return token;
  }
  return { ...token, expires_in: expiresIn };
}

/** PKCE challenge method required by the Kick OAuth server. */
export const KICK_PKCE_CHALLENGE_METHOD = 'S256';

/**
 * Characters allowed in an RFC 7636 code verifier. This is the base64url alphabet, which is a
 * strict subset of the full PKCE character set.
 */
const CODE_VERIFIER_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/**
 * Generates a cryptographically random string, for OAuth `state` values and similar.
 *
 * @param length - Number of characters to generate. Defaults to `32`.
 *
 * @returns A random string from the base64url alphabet.
 */
export function generateRandomString(length = 32): string {
  const characters = new Uint8Array(length);
  crypto.getRandomValues(characters);
  let result = '';
  for (const character of characters) {
    // The alphabet has exactly 64 characters, so the byte range divides evenly
    // and the modulo introduces no bias.
    result += CODE_VERIFIER_ALPHABET[character % CODE_VERIFIER_ALPHABET.length];
  }
  return result;
}

/**
 * Generates a PKCE code verifier.
 *
 * @param length - Verifier length, between `43` and `128` characters as required by RFC 7636.
 *   Defaults to `128`.
 *
 * @returns A random code verifier.
 * @throws {RangeError} When `length` is outside the allowed range.
 * @see https://docs.kick.com/getting-started/generating-tokens-oauth2-flow
 */
export function generateCodeVerifier(length = 128): string {
  if (!Number.isInteger(length) || length < 43 || length > 128) {
    throw new RangeError('PKCE code verifier length must be an integer between 43 and 128');
  }
  return generateRandomString(length);
}

/**
 * Derives the PKCE code challenge for a verifier using the `S256` method.
 *
 * @param codeVerifier - The PKCE code verifier.
 *
 * @returns The base64url-encoded SHA-256 digest of the verifier.
 */
export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));
  return base64UrlEncode(new Uint8Array(digest));
}

/** A generated PKCE verifier/challenge pair. */
export interface PkcePair {
  /** The generated PKCE code verifier. */
  code_verifier: string;
  /** The `S256` code challenge derived from the verifier. */
  code_challenge: string;
  /** The challenge method, always `"S256"`. */
  code_challenge_method: 'S256';
}

/**
 * Generates a fresh PKCE verifier/challenge pair for the authorization flow.
 *
 * @param length - Verifier length between `43` and `128`. Defaults to `128`.
 *
 * @returns The generated PKCE pair.
 */
export async function createPkcePair(length = 128): Promise<PkcePair> {
  const code_verifier = generateCodeVerifier(length);
  const code_challenge = await generateCodeChallenge(code_verifier);
  return { code_verifier, code_challenge, code_challenge_method: KICK_PKCE_CHALLENGE_METHOD };
}

/**
 * Builds the Kick authorization URL (`GET /oauth/authorize`) to redirect a user to.
 *
 * If `redirect_uri` uses the host `127.0.0.1`, a `redirect=127.0.0.1` parameter is inserted before
 * it. Kick's authorization page rewrites the first `127.0.0.1` in the URL to `localhost`.
 *
 * @example
 *   ```ts
 *   const pkce = await createPkcePair();
 *   const url = buildAuthorizationUrl({
 *     client_id: 'your-client-id',
 *     redirect_uri: 'https://yourapp.com/callback',
 *     scope: ['user:read', 'channel:read'],
 *     state: generateRandomString(),
 *     code_challenge: pkce.code_challenge
 *   });
 *   ```;
 *
 * @param params - Authorization request parameters.
 *
 * @returns The fully qualified authorization URL.
 * @see https://docs.kick.com/getting-started/generating-tokens-oauth2-flow
 */
export function buildAuthorizationUrl(params: BuildAuthorizationUrlParams): string {
  const url = new URL('/oauth/authorize', params.oauthBaseUrl ?? KICK_OAUTH_BASE_URL);
  const search = url.searchParams;
  search.set('response_type', 'code');
  search.set('client_id', params.client_id);

  if (isLocalhostRedirect(params.redirect_uri)) {
    search.set('redirect', '127.0.0.1');
  }

  search.set('redirect_uri', params.redirect_uri);
  search.set('scope', Array.isArray(params.scope) ? params.scope.join(' ') : params.scope);
  search.set('state', params.state);
  search.set('code_challenge', params.code_challenge);
  search.set('code_challenge_method', params.code_challenge_method ?? KICK_PKCE_CHALLENGE_METHOD);
  return url.toString();
}

/** Whether `redirect_uri` uses the host `127.0.0.1`. */
function isLocalhostRedirect(redirectUri: string): boolean {
  try {
    return new URL(redirectUri).hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

/** Parameters accepted by {@link OAuthResource.createAuthorizationUrl}. */
export interface CreateAuthorizationUrlParams extends Omit<
  BuildAuthorizationUrlParams,
  'client_id' | 'redirect_uri' | 'oauthBaseUrl'
> {
  /** Client ID. Falls back to the client's `clientId` option. */
  client_id?: string;
  /** Redirect URI. Falls back to the client's `redirectUri` option. */
  redirect_uri?: string;
}

/** Default OAuth credentials shared by the resource methods. */
interface OAuthResourceDefaults {
  client_id?: string;
  client_secret?: string;
  redirect_uri?: string;
}

/**
 * OAuth 2.1 flows for the Kick API.
 *
 * Exposed as `client.oauth`. The authorization server lives on a different host
 * (`https://id.kick.com`) than the API server.
 *
 * @see https://docs.kick.com/getting-started/generating-tokens-oauth2-flow
 */
export class OAuthResource {
  constructor(
    private readonly http: HttpClient,
    private readonly defaults: OAuthResourceDefaults = {}
  ) {}

  /**
   * Builds the authorization URL to redirect a user to for the Authorization Code flow with PKCE.
   *
   * Generate a PKCE pair with {@link createPkcePair} and keep the verifier for the
   * {@link exchangeCode} call.
   *
   * @param params - Authorization request parameters.
   *
   * @returns The fully qualified authorization URL.
   * @throws {Error} When no client ID or redirect URI is available.
   */
  createAuthorizationUrl = (params: CreateAuthorizationUrlParams): string => {
    const client_id = params.client_id ?? this.defaults.client_id;
    const redirect_uri = params.redirect_uri ?? this.defaults.redirect_uri;
    if (!client_id) {
      throw new Error('A client_id is required to build the authorization URL');
    }
    if (!redirect_uri) {
      throw new Error('A redirect_uri is required to build the authorization URL');
    }
    return buildAuthorizationUrl({
      ...params,
      client_id,
      redirect_uri,
      oauthBaseUrl: this.http.oauthBaseUrl
    });
  };

  /**
   * Exchanges an authorization code for user access and refresh tokens (`POST /oauth/token` with
   * the `authorization_code` grant).
   *
   * @param params - Code exchange parameters, including the PKCE verifier.
   * @param options - Per-request options.
   *
   * @returns The issued token pair.
   */
  exchangeCode = async (
    params: ExchangeCodeParams,
    options?: RequestOptions
  ): Promise<KickTokenResponse> =>
    normalizeTokenResponse(
      await this.http.request<KickTokenResponse>({
        method: 'POST',
        path: '/oauth/token',
        base: 'oauth',
        auth: false,
        form: {
          grant_type: 'authorization_code',
          code: params.code,
          code_verifier: params.code_verifier,
          redirect_uri: params.redirect_uri ?? this.defaults.redirect_uri,
          client_id: params.client_id ?? this.defaults.client_id,
          client_secret: params.client_secret ?? this.defaults.client_secret
        },
        ...options
      })
    );

  /**
   * Requests an app access token with the Client Credentials flow (`POST /oauth/token` with the
   * `client_credentials` grant).
   *
   * App access tokens can read publicly available data and subscribe to webhook events for any
   * channel. They cannot act on behalf of a user.
   *
   * @param options - Per-request options.
   *
   * @returns The issued app access token.
   * @throws {Error} When no client ID or client secret is available.
   */
  getAppAccessToken = async (options?: RequestOptions): Promise<KickTokenResponse> => {
    const client_id = this.defaults.client_id;
    const client_secret = this.defaults.client_secret;
    if (!client_id || !client_secret) {
      throw new Error('A clientId and clientSecret are required to request an app access token');
    }
    return normalizeTokenResponse(
      await this.http.request<KickTokenResponse>({
        method: 'POST',
        path: '/oauth/token',
        base: 'oauth',
        auth: false,
        form: {
          grant_type: 'client_credentials',
          client_id,
          client_secret
        },
        ...options
      })
    );
  };

  /**
   * Refreshes an access token (`POST /oauth/token` with the `refresh_token` grant). Refresh tokens
   * are reusable until rotated or revoked.
   *
   * @param params - Refresh parameters, including the refresh token.
   * @param options - Per-request options.
   *
   * @returns The new token pair.
   */
  refreshAccessToken = async (
    params: RefreshTokenParams,
    options?: RequestOptions
  ): Promise<KickTokenResponse> =>
    normalizeTokenResponse(
      await this.http.request<KickTokenResponse>({
        method: 'POST',
        path: '/oauth/token',
        base: 'oauth',
        auth: false,
        form: {
          grant_type: 'refresh_token',
          refresh_token: params.refresh_token,
          client_id: params.client_id ?? this.defaults.client_id,
          client_secret: params.client_secret ?? this.defaults.client_secret
        },
        ...options
      })
    );

  /**
   * Revokes an access or refresh token (`POST /oauth/revoke`).
   *
   * @param params - Token to revoke and an optional hint of its type.
   * @param options - Per-request options.
   */
  revokeToken = async (params: RevokeTokenParams, options?: RequestOptions): Promise<void> => {
    await this.http.request<void>({
      method: 'POST',
      path: '/oauth/revoke',
      base: 'oauth',
      auth: false,
      query: {
        token: params.token,
        token_hint_type: params.token_hint_type
      },
      ...options
    });
  };

  /**
   * Checks whether a token is valid and returns information about it (`POST
   * /oauth/token/introspect`).
   *
   * @param token - Token to introspect. Defaults to the client's configured API key.
   * @param options - Per-request options.
   *
   * @returns Introspection result for the token.
   * @throws {Error} When no token is available to introspect.
   */
  introspectToken = async (
    token?: string,
    options?: RequestOptions
  ): Promise<KickTokenIntrospection> => {
    const bearer = token ?? (await this.http.getApiKey());
    if (!bearer) {
      throw new Error('No token available to introspect');
    }
    const response = await this.http.request<{ data: KickTokenIntrospection }>({
      method: 'POST',
      path: '/oauth/token/introspect',
      base: 'oauth',
      bearer,
      ...options
    });
    return response.data;
  };
}
