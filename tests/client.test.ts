import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { KickApiError, KickClient } from '../src';
import { authorization, createFetchMock, json } from './helpers';
import type { User } from '../src';

const user: User = {
  name: 'testuser',
  profile_picture: 'https://example.com/avatar.jpg',
  user_id: 123
};

beforeEach(() => {
  // Keep tests independent of credentials that may exist in the environment.
  vi.stubEnv('KICK_API_KEY', '');
  vi.stubEnv('KICK_CLIENT_ID', '');
  vi.stubEnv('KICK_CLIENT_SECRET', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('KickClient', () => {
  test('authorizes requests and parses response envelopes', async () => {
    const { calls, fetchMock } = createFetchMock(json({ data: [user], message: 'OK' }));
    const client = new KickClient({ apiKey: 'test-token', fetch: fetchMock });

    const response = await client.users.getUsers();

    expect(response.data).toEqual([user]);
    expect(calls).toHaveLength(1);
    expect(calls[0].url.toString()).toBe('https://api.kick.com/public/v1/users');
    expect(authorization(calls[0])).toBe('Bearer test-token');
  });

  test('merges custom per-request headers into the outgoing request', async () => {
    const { calls, fetchMock } = createFetchMock(json({ data: [user], message: 'OK' }));
    const client = new KickClient({ apiKey: 'test-token', fetch: fetchMock });

    await client.users.getUsers({}, { headers: { 'x-custom-header': 'custom-value' } });

    const headers = new Headers(calls[0].init.headers);
    expect(headers.get('x-custom-header')).toBe('custom-value');
    expect(headers.get('accept')).toBe('application/json');
    expect(headers.get('authorization')).toBe('Bearer test-token');
  });

  test('falls back to the KICK_API_KEY environment variable', async () => {
    vi.stubEnv('KICK_API_KEY', 'env-token');
    const { calls, fetchMock } = createFetchMock(json({ data: [], message: 'OK' }));

    const client = new KickClient({ fetch: fetchMock });
    await client.users.getUsers();

    expect(client.getApiKey()).toBe('env-token');
    expect(authorization(calls[0])).toBe('Bearer env-token');
  });

  test('serializes array query parameters as repeated parameters', async () => {
    const { calls, fetchMock } = createFetchMock(
      json({ data: [], message: 'OK' }),
      json({ data: [], message: 'OK' }),
      json({ data: [], message: 'OK' })
    );
    const client = new KickClient({ apiKey: 'token', fetch: fetchMock });

    await client.users.getUsers({ id: [1, 2] });
    await client.channels.getChannels({ slug: ['KingCondor', 'maCSmooT'] });
    await client.livestreams.getUsersLivestreams({ user_id: [7] });

    expect(calls[0].url.searchParams.getAll('id')).toEqual(['1', '2']);
    expect(calls[1].url.searchParams.getAll('slug')).toEqual(['KingCondor', 'maCSmooT']);
    expect(calls[2].url.searchParams.getAll('user_id')).toEqual(['7']);
  });

  test('serializes category filters as comma-separated values', async () => {
    const { calls, fetchMock } = createFetchMock(
      json({ data: [], message: 'OK', pagination: { next_cursor: '' } })
    );
    const client = new KickClient({ apiKey: 'token', fetch: fetchMock });

    await client.categories.getCategories({ id: [1, 2, 3], name: ['Old School RuneScape'], limit: 5 });

    expect(calls[0].url.searchParams.get('id')).toBe('1,2,3');
    expect(calls[0].url.searchParams.get('name')).toBe('Old School RuneScape');
    expect(calls[0].url.searchParams.get('limit')).toBe('5');
    expect(calls[0].url.searchParams.has('tag')).toBe(false);
  });

  test('obtains and caches app access tokens with client credentials', async () => {
    const { calls, fetchMock } = createFetchMock(
      json({ access_token: 'app-token', token_type: 'Bearer', expires_in: 3600 }),
      json({ data: [], message: 'OK' }),
      json({ data: [], message: 'OK' })
    );
    const client = new KickClient({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      fetch: fetchMock
    });

    await client.channels.getChannels({ slug: ['KingCondor'] });
    await client.channels.getChannels({ slug: ['KingCondor'] });

    expect(calls).toHaveLength(3);
    expect(calls[0].url.toString()).toBe('https://id.kick.com/oauth/token');
    const form = new URLSearchParams(calls[0].init.body as string);
    expect(form.get('grant_type')).toBe('client_credentials');
    expect(form.get('client_id')).toBe('client-id');
    expect(form.get('client_secret')).toBe('client-secret');
    expect(authorization(calls[1])).toBe('Bearer app-token');
    expect(authorization(calls[2])).toBe('Bearer app-token');
  });

  test('sends JSON bodies and validates chat message content locally', async () => {
    const { calls, fetchMock } = createFetchMock(
      json({ data: { is_sent: true, message_id: 'uuid-1' }, message: 'OK' })
    );
    const client = new KickClient({ apiKey: 'token', fetch: fetchMock });

    const response = await client.chat.sendChatMessage({ type: 'bot', content: 'hello chat' });

    expect(response.data).toEqual({ is_sent: true, message_id: 'uuid-1' });
    expect(calls[0].init.method).toBe('POST');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({
      type: 'bot',
      content: 'hello chat'
    });

    await expect(
      client.chat.sendChatMessage({ type: 'bot', content: 'x'.repeat(2049) })
    ).rejects.toThrow(RangeError);
    expect(calls).toHaveLength(1);
  });

  test('handles 204 responses and query-based DELETE requests', async () => {
    const { calls, fetchMock } = createFetchMock(
      new Response(null, { status: 204 }),
      new Response(null, { status: 204 })
    );
    const client = new KickClient({ apiKey: 'token', fetch: fetchMock });

    await expect(client.chat.deleteChatMessage('message id')).resolves.toBeUndefined();
    await expect(
      client.events.deleteEventSubscriptions({ id: ['sub-1', 'sub-2'] })
    ).resolves.toBeUndefined();

    expect(calls[0].url.pathname).toBe('/public/v1/chat/message%20id');
    expect(calls[0].init.method).toBe('DELETE');
    expect(calls[1].url.pathname).toBe('/public/v1/events/subscriptions');
    expect(calls[1].url.searchParams.getAll('id')).toEqual(['sub-1', 'sub-2']);
  });

  test('throws KickApiError with status and error code on failure', async () => {
    const { fetchMock } = createFetchMock(
      json({ data: 'CHANNEL_IS_NOT_LIVE', message: 'Channel is not live' }, 400)
    );
    const client = new KickClient({ apiKey: 'token', fetch: fetchMock });

    const error = await client.ads.createAdBreak({ break_duration_seconds: 30 }).catch((e) => e);

    expect(error).toBeInstanceOf(KickApiError);
    expect(error.status).toBe(400);
    expect(error.errorCode).toBe('CHANNEL_IS_NOT_LIVE');
    expect(error.method).toBe('POST');
    expect(error.message).toContain('Channel is not live');
  });

  test('rejects mixing broadcaster_user_id and slug before making a request', async () => {
    const { calls, fetchMock } = createFetchMock();
    const client = new KickClient({ apiKey: 'token', fetch: fetchMock });

    await expect(
      client.channels.getChannels({
        broadcaster_user_id: [1],
        slug: ['KingCondor']
      } as Parameters<typeof client.channels.getChannels>[0])
    ).rejects.toThrow(TypeError);
    expect(calls).toHaveLength(0);
  });
});
