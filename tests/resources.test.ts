import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { KickClient } from '../src';
import { createFetchMock, json, requestBody } from './helpers';

/** Creates a client with a fetch mock that replies with the queued responses. */
function setup(...queue: Response[]) {
  const { calls, fetchMock } = createFetchMock(...queue);
  const client = new KickClient({ apiKey: 'token', fetch: fetchMock });
  return { calls, client };
}

beforeEach(() => {
  // Keep tests independent of credentials that may exist in the environment.
  vi.stubEnv('KICK_API_KEY', '');
  vi.stubEnv('KICK_CLIENT_ID', '');
  vi.stubEnv('KICK_CLIENT_SECRET', '');
  vi.stubEnv('KICK_REDIRECT_URI', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('ads', () => {
  test('generates the idempotency UUID when no ad break id is provided', async () => {
    const { calls, client } = setup(json({ data: { id: 'break-id' }, message: 'OK' }));

    await client.ads.createAdBreak({ break_duration_seconds: 90 });

    const body = JSON.parse(requestBody(calls[0]));
    expect(body.break_duration_seconds).toBe(90);
    expect(body.id).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('channelRewards', () => {
  test('encodes path params in reward ids', async () => {
    const { calls, client } = setup(json({ data: {}, message: 'OK' }));

    await client.channelRewards.updateChannelReward('01JBAWK1J80HC/86WHY EP6NAV', {
      cost: 500
    });

    expect(calls[0].url.pathname).toBe(
      '/public/v1/channels/rewards/01JBAWK1J80HC%2F86WHY%20EP6NAV'
    );
    expect(calls[0].init.method).toBe('PATCH');
  });

  test('rejects channel reward updates without fields before making a request', async () => {
    const { calls, client } = setup();

    await expect(
      client.channelRewards.updateChannelReward('01JBAWK1J80HCJB86WHYEP6NAV', {})
    ).rejects.toThrow(TypeError);
    expect(calls).toHaveLength(0);
  });

  test('serializes redemption filters like the documented example', async () => {
    const { calls, client } = setup(
      json({ data: [], message: 'OK', pagination: { next_cursor: '' } })
    );

    await client.channelRewards.getChannelRewardRedemptions({
      reward_id: '01JBAWK1J80HCJB86WHYEP6NAV',
      status: 'accepted',
      id: ['redemption-1', 'redemption-2'],
      cursor: 'cursor-1'
    });

    const search = calls[0].url.searchParams;
    expect(search.get('reward_id')).toBe('01JBAWK1J80HCJB86WHYEP6NAV');
    expect(search.get('status')).toBe('accepted');
    expect(search.getAll('id')).toEqual(['redemption-1', 'redemption-2']);
    expect(search.get('cursor')).toBe('cursor-1');
  });
});

describe('categories', () => {
  test('sends only the pagination parameters when no filters are given', async () => {
    const { calls, client } = setup(
      json({ data: [], message: 'OK', pagination: { next_cursor: '' } })
    );

    await client.categories.getCategories({ cursor: 'cursor-1', limit: 25 });

    const search = calls[0].url.searchParams;
    expect(search.get('cursor')).toBe('cursor-1');
    expect(search.get('limit')).toBe('25');
    expect(search.has('name')).toBe(false);
    expect(search.has('tag')).toBe(false);
    expect(search.has('id')).toBe(false);
  });
});

describe('channels', () => {
  test('rejects empty channel updates before making a request', async () => {
    const { calls, client } = setup();

    await expect(client.channels.updateChannel({})).rejects.toThrow(TypeError);
    expect(calls).toHaveLength(0);
  });
});

describe('chat', () => {
  test('rejects content over 500 grapheme clusters even if it fits the byte limit', async () => {
    const { calls, client } = setup();

    // 501 emoji are 2004 UTF-8 bytes, under the 2048 byte limit, but 501 clusters.
    await expect(
      client.chat.sendChatMessage({ type: 'bot', content: '\u{1F600}'.repeat(501) })
    ).rejects.toThrow(RangeError);
    expect(calls).toHaveLength(0);
  });
});

describe('drops', () => {
  test('serializes claim filters like the documented example', async () => {
    const { calls, client } = setup(
      json({
        data: {
          claims: [],
          cursor: '01K0TDDR08Q5ZNWXK92SDH7SDH'
        },
        message: 'OK'
      })
    );

    await client.drops.getDropsClaims({
      campaign_id: '01JAXK8N4QWRTY5PM7ZEBVJDS8S',
      limit: 10,
      cursor: '01K0TDDR08Q5ZNWXK92VRXD7GW',
      user_id: 1234
    });

    const search = calls[0].url.searchParams;
    expect(search.get('campaign_id')).toBe('01JAXK8N4QWRTY5PM7ZEBVJDS8S');
    expect(search.get('limit')).toBe('10');
    expect(search.get('cursor')).toBe('01K0TDDR08Q5ZNWXK92VRXD7GW');
    expect(search.get('user_id')).toBe('1234');
  });

  test('rejects claim batches over the documented limit before making a request', async () => {
    const { calls, client } = setup();
    const claims = Array.from({ length: 101 }, (_, index) => ({
      claim_id: `claim-${index}`,
      external_status: 'initiated'
    }));

    await expect(client.drops.updateDropsClaims({ claims })).rejects.toThrow(RangeError);
    expect(calls).toHaveLength(0);
  });
});

describe('events', () => {
  test('includes the broadcaster filter only when provided', async () => {
    const { calls, client } = setup(json({ data: [], message: 'OK' }), json({ data: [] }));

    await client.events.getEventSubscriptions({ broadcaster_user_id: 2696 });
    await client.events.getEventSubscriptions();

    expect(calls[0].url.pathname).toBe('/public/v1/events/subscriptions');
    expect(calls[0].url.searchParams.get('broadcaster_user_id')).toBe('2696');
    expect(calls[1].url.searchParams.has('broadcaster_user_id')).toBe(false);
    expect(calls[0].init.method).toBe('GET');
  });

  test('subscribes with the documented body, defaulting the method to webhook', async () => {
    const { calls, client } = setup(
      json({ data: [{ name: 'chat.message.sent', version: 1, subscription_id: 'sub-1' }] })
    );

    const response = await client.events.createEventSubscriptions({
      events: [{ name: 'chat.message.sent', version: 1 }],
      broadcaster_user_id: 2696
    });

    expect(response.data[0].subscription_id).toBe('sub-1');
    expect(calls[0].init.method).toBe('POST');
    expect(JSON.parse(requestBody(calls[0]))).toEqual({
      events: [{ name: 'chat.message.sent', version: 1 }],
      method: 'webhook',
      broadcaster_user_id: 2696
    });
  });

  test('deletes a single subscription id through the query string', async () => {
    const { calls, client } = setup(new Response(null, { status: 204 }));

    await client.events.deleteEventSubscriptions({ id: 'sub-1' });

    expect(calls[0].url.pathname).toBe('/public/v1/events/subscriptions');
    expect(calls[0].url.searchParams.get('id')).toBe('sub-1');
    expect(calls[0].init.method).toBe('DELETE');
  });
});

describe('kicks', () => {
  test('fetches the leaderboard with the documented rank query', async () => {
    const { calls, client } = setup(json({ data: { lifetime: [], month: [], week: [] } }));

    const response = await client.kicks.getKicksLeaderboard({ top: 100 });

    expect(response.data.lifetime).toEqual([]);
    expect(calls[0].url.pathname).toBe('/public/v1/kicks/leaderboard');
    expect(calls[0].url.searchParams.get('top')).toBe('100');
    expect(calls[0].init.method).toBe('GET');
  });
});

describe('livestreams', () => {
  test('serializes livestream filters as repeated parameters', async () => {
    const { calls, client } = setup(
      json({ data: [], message: 'OK', pagination: { next_cursor: '' } })
    );

    await client.livestreams.getLivestreams({
      category_id: [515775, 516494],
      language_code: ['en', 'de'],
      limit: 200,
      cursor: 'cursor-1'
    });

    const search = calls[0].url.searchParams;
    expect(calls[0].url.pathname).toBe('/public/v2/livestreams');
    expect(search.getAll('category_id')).toEqual(['515775', '516494']);
    expect(search.getAll('language_code')).toEqual(['en', 'de']);
    expect(search.get('limit')).toBe('200');
    expect(search.get('cursor')).toBe('cursor-1');
  });

  test('rejects user livestream lookups over the documented limit before a request', async () => {
    const { calls, client } = setup();

    const user_id = Array.from({ length: 101 }, (_, index) => index + 1);
    await expect(client.livestreams.getUsersLivestreams({ user_id })).rejects.toThrow(RangeError);
    expect(calls).toHaveLength(0);
  });
});

describe('moderation', () => {
  test('omits the duration field for permanent bans', async () => {
    const { calls, client } = setup(json({ data: {}, message: 'OK' }));

    await client.moderation.banUser({ broadcaster_user_id: 2696, user_id: 156130 });

    expect(JSON.parse(requestBody(calls[0]))).toEqual({
      broadcaster_user_id: 2696,
      user_id: 156130
    });
  });

  test('unbans a user with a request body, as the docs specify', async () => {
    const { calls, client } = setup(json({ data: {}, message: 'OK' }));

    await client.moderation.unbanUser({ broadcaster_user_id: 2696, user_id: 156130 });

    expect(calls[0].url.pathname).toBe('/public/v1/moderation/bans');
    expect(calls[0].init.method).toBe('DELETE');
    expect(JSON.parse(requestBody(calls[0]))).toEqual({
      broadcaster_user_id: 2696,
      user_id: 156130
    });
  });
});
