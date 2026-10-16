import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  buildAuthorizationUrl,
  createPkcePair,
  generateCodeChallenge,
  generateCodeVerifier,
  generateRandomString,
  KickApiError,
  KickClient
} from '../src';
import { authorization, createFetchMock, json } from './helpers';

beforeEach(() => {
  vi.stubEnv('KICK_API_KEY', '');
  vi.stubEnv('KICK_CLIENT_ID', '');
  vi.stubEnv('KICK_CLIENT_SECRET', '');
  vi.stubEnv('KICK_REDIRECT_URI', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('PKCE helpers', () => {
  test.each([43, 64, 128])(
    'generates %i-character verifiers within the RFC 7636 constraints',
    (length) => {
      const verifier = generateCodeVerifier(length);
      expect(verifier).toHaveLength(length);
      expect(verifier).toMatch(/^[A-Za-z0-9\-._~]{43,128}$/);
    }
  );

  test.each([42, 129])('rejects %i-character verifiers outside the RFC 7636 range', (length) => {
    expect(() => generateCodeVerifier(length)).toThrow(RangeError);
  });

  test('derives the S256 challenge from the RFC 7636 appendix B vector', async () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    await expect(generateCodeChallenge(verifier)).resolves.toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'
    );
  });

  test('creates a PKCE pair with a matching challenge', async () => {
    const pair = await createPkcePair();
    expect(pair.code_challenge_method).toBe('S256');
    await expect(generateCodeChallenge(pair.code_verifier)).resolves.toBe(pair.code_challenge);
  });

  test('generates random strings for state values', () => {
    const first = generateRandomString(32);
    const second = generateRandomString(32);
    expect(first).toHaveLength(32);
    expect(second).toHaveLength(32);
    expect(first).not.toBe(second);
  });
});

describe('buildAuthorizationUrl', () => {
  test('builds a fully qualified authorization URL', () => {
    const url = new URL(
      buildAuthorizationUrl({
        client_id: 'client-id',
        redirect_uri: 'https://yourapp.com/callback',
        scope: ['user:read', 'channel:read'],
        state: 'random-state',
        code_challenge: 'challenge'
      })
    );

    expect(url.origin).toBe('https://id.kick.com');
    expect(url.pathname).toBe('/oauth/authorize');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('client-id');
    expect(url.searchParams.get('redirect_uri')).toBe('https://yourapp.com/callback');
    expect(url.searchParams.get('scope')).toBe('user:read channel:read');
    expect(url.searchParams.get('state')).toBe('random-state');
    expect(url.searchParams.get('code_challenge')).toBe('challenge');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.has('redirect')).toBe(false);
  });

  test('adds the sacrificial redirect parameter for 127.0.0.1 callbacks', () => {
    const raw = buildAuthorizationUrl({
      client_id: 'client-id',
      redirect_uri: 'http://127.0.0.1:3000/callback',
      scope: 'user:read',
      state: 'state',
      code_challenge: 'challenge'
    });

    expect(raw).toContain('&redirect=127.0.0.1&');
    expect(raw.indexOf('&redirect=')).toBeLessThan(raw.indexOf('&redirect_uri='));
  });
});

describe('OAuthResource', () => {
  test('uses client defaults for authorization URLs', async () => {
    const client = new KickClient({
      clientId: 'client-id',
      redirectUri: 'https://yourapp.com/callback',
      fetch: createFetchMock().fetchMock
    });
    const pkce = await createPkcePair();

    const url = new URL(
      client.oauth.createAuthorizationUrl({
        scope: ['user:read'],
        state: 'state',
        code_challenge: pkce.code_challenge
      })
    );

    expect(url.searchParams.get('client_id')).toBe('client-id');
    expect(url.searchParams.get('redirect_uri')).toBe('https://yourapp.com/callback');
  });

  test('exchanges authorization codes with the client credentials as fallback', async () => {
    const { calls, fetchMock } = createFetchMock(
      json({
        access_token: 'user-token',
        refresh_token: 'refresh',
        token_type: 'Bearer',
        expires_in: 3600
      })
    );
    const client = new KickClient({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      redirectUri: 'https://yourapp.com/callback',
      apiKey: '',
      fetch: fetchMock
    });

    const token = await client.oauth.exchangeCode({ code: 'code-1', code_verifier: 'verifier' });

    expect(token.access_token).toBe('user-token');
    expect(calls[0].url.toString()).toBe('https://id.kick.com/oauth/token');
    expect(calls[0].init.method).toBe('POST');
    const form = new URLSearchParams(calls[0].init.body as string);
    expect(form.get('grant_type')).toBe('authorization_code');
    expect(form.get('code')).toBe('code-1');
    expect(form.get('code_verifier')).toBe('verifier');
    expect(form.get('redirect_uri')).toBe('https://yourapp.com/callback');
    expect(form.get('client_id')).toBe('client-id');
    expect(form.get('client_secret')).toBe('client-secret');
    expect(authorization(calls[0])).toBeNull();
  });

  test('refreshes tokens with the refresh_token grant', async () => {
    const { calls, fetchMock } = createFetchMock(
      json({
        access_token: 'new-token',
        refresh_token: 'new-refresh',
        token_type: 'Bearer',
        expires_in: 3600
      })
    );
    const client = new KickClient({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      fetch: fetchMock
    });

    const token = await client.oauth.refreshAccessToken({ refresh_token: 'old-refresh' });

    expect(token.access_token).toBe('new-token');
    const form = new URLSearchParams(calls[0].init.body as string);
    expect(form.get('grant_type')).toBe('refresh_token');
    expect(form.get('refresh_token')).toBe('old-refresh');
  });

  test('revokes tokens through the query string', async () => {
    const { calls, fetchMock } = createFetchMock(new Response('OK', { status: 200 }));
    const client = new KickClient({ fetch: fetchMock });

    await client.oauth.revokeToken({ token: 'some-token', token_hint_type: 'refresh_token' });

    expect(calls[0].url.pathname).toBe('/oauth/revoke');
    expect(calls[0].url.searchParams.get('token')).toBe('some-token');
    expect(calls[0].url.searchParams.get('token_hint_type')).toBe('refresh_token');
  });

  test('introspects the configured API key', async () => {
    const { calls, fetchMock } = createFetchMock(
      json({
        data: { active: true, client_id: 'client-id', token_type: 'app', scope: '', exp: 123 },
        message: 'OK'
      })
    );
    const client = new KickClient({ apiKey: 'test-token', fetch: fetchMock });

    const introspection = await client.oauth.introspectToken();

    expect(introspection.active).toBe(true);
    expect(introspection.token_type).toBe('app');
    expect(calls[0].url.toString()).toBe('https://id.kick.com/oauth/token/introspect');
    expect(authorization(calls[0])).toBe('Bearer test-token');
  });

  test('requires credentials for the client credentials flow', async () => {
    const client = new KickClient({ apiKey: 'token', fetch: createFetchMock().fetchMock });
    await expect(client.oauth.getAppAccessToken()).rejects.toThrow(/clientId/);
  });

  test('surfaces Kick OAuth error responses with their error code', async () => {
    // Shape from the OAuth docs: token endpoints respond 400 with `{ "error": ... }`.
    const { fetchMock } = createFetchMock(json({ error: 'Invalid request' }, 400));
    const client = new KickClient({ fetch: fetchMock });

    const error = await client.oauth
      .exchangeCode({
        code: 'code',
        code_verifier: 'verifier',
        client_id: 'client-id',
        client_secret: 'secret',
        redirect_uri: 'https://yourapp.com/callback'
      })
      .catch((e) => e);

    expect(error).toBeInstanceOf(KickApiError);
    expect(error.status).toBe(400);
    expect(error.errorCode).toBe('Invalid request');
    expect(error.message).toContain('Invalid request');
    expect(error.body).toEqual({ error: 'Invalid request' });
    expect(error.url).toBe('https://id.kick.com/oauth/token');
  });
});
