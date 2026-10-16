# kick-api

A universal TypeScript package for using the [Kick API](https://docs.kick.com/).

- Type definitions for all Kick Public API endpoints
- OAuth 2.1 helpers: PKCE generation, authorization URLs, token exchange, refresh, revocation and introspection
- Webhook signature verification built on the Web Crypto API - no native dependencies
- Runs in Node.js, browsers, Bun, Deno and edge runtimes using only Web platform APIs (`fetch`, `crypto`, `URL`)
- Ships ESM and CJS builds with full type declarations

## Installation

```sh
npm install kick-api
```

## Quick start

```ts
import { KickClient } from 'kick-api';

// Reads KICK_API_KEY from the environment.
const client = new KickClient();

const me = await client.users.getUsers();
const { data: channels } = await client.channels.getChannels({ slug: ['KingCondor'] });
```

### App access tokens (Client Credentials)

When a client ID and secret are configured and no API key is set, requests
automatically obtain and refresh an app access token. A key you pass in - to
the constructor or to `setApiKey` - is never replaced, even after it expires.
Refresh user tokens with `client.oauth.refreshAccessToken()`, or call
`setApiKey()` with no arguments to clear a key and go back to app tokens:

```ts
const client = new KickClient({
  clientId: process.env.KICK_CLIENT_ID,
  clientSecret: process.env.KICK_CLIENT_SECRET
});

const { data: categories } = await client.categories.getCategories({ limit: 10 });
```

### User access tokens (Authorization Code + PKCE)

```ts
import { createPkcePair, generateRandomString, KickClient } from 'kick-api';

const client = new KickClient({
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  redirectUri: 'https://yourapp.com/callback'
});

// 1. Redirect the user to Kick.
const pkce = await createPkcePair();
const state = generateRandomString();
const url = client.oauth.createAuthorizationUrl({
  scope: ['user:read', 'channel:read'],
  state,
  code_challenge: pkce.code_challenge
});

// 2. Exchange the code received on your callback for tokens.
const token = await client.oauth.exchangeCode({
  code: 'authorization-code',
  code_verifier: pkce.code_verifier
});
client.setApiKey(token.access_token, token.expires_in);

// 3. Refresh when expired (refresh tokens are reusable until revoked).
const refreshed = await client.oauth.refreshAccessToken({
  refresh_token: token.refresh_token!
});
```

### Verifying webhooks

Always verify the `Kick-Event-Signature` header before trusting a webhook.
Fetch the public key from the API - Kick can rotate it at any time.

```ts
import { fetchWebhookPublicKey, verifyWebhookRequest } from 'kick-api';

const publicKey = await fetchWebhookPublicKey();

// e.g. inside a fetch-style server handler:
const valid = await verifyWebhookRequest({ publicKey, request });
if (!valid) {
  return new Response('invalid signature', { status: 401 });
}
```

`verifyWebhookRequest` is replay-protected by default: it returns `false` for requests whose
timestamp header is more than 5 minutes away from the current time, in either direction, even when
the signature is valid. Kick's docs do not specify a freshness window; this follows the common
industry default. Pass `maxAgeSeconds` (in seconds) to use a different window, or
`Number.POSITIVE_INFINITY` to accept messages of any age.

```ts
// Reject anything older than 60 seconds:
const valid = await verifyWebhookRequest({ publicKey, request, maxAgeSeconds: 60 });
```

## Resources

| Client namespace        | API                                                                              |
| ----------------------- | -------------------------------------------------------------------------------- |
| `client.ads`            | [Ads](https://docs.kick.com/apis/ads)                                            |
| `client.categories`     | [Categories](https://docs.kick.com/apis/categories)                              |
| `client.channelRewards` | [Channel Rewards](https://docs.kick.com/apis/channel-rewards)                    |
| `client.channels`       | [Channels](https://docs.kick.com/apis/channels)                                  |
| `client.chat`           | [Chat](https://docs.kick.com/apis/chat)                                          |
| `client.drops`          | [Drops](https://docs.kick.com/drops/public-api)                                  |
| `client.events`         | [Events](https://docs.kick.com/events/subscribe-to-events)                       |
| `client.kicks`          | [KICKs](https://docs.kick.com/apis/kicks)                                        |
| `client.livestreams`    | [Livestreams](https://docs.kick.com/apis/livestreams)                            |
| `client.moderation`     | [Moderation](https://docs.kick.com/apis/moderation)                              |
| `client.publicKey`      | [Public Key](https://docs.kick.com/apis/public-key)                              |
| `client.users`          | [Users](https://docs.kick.com/apis/users)                                        |
| `client.oauth`          | [OAuth 2.1](https://docs.kick.com/getting-started/generating-tokens-oauth2-flow) |

Covers the current Public API, including Categories V2, Livestreams V2, and token
introspection at `POST /oauth/token/introspect`. Every method accepts an optional
`RequestOptions` argument (`signal`, `headers`).

## Environment variables

These are used when the corresponding `KickClient` option is omitted.

| Variable             | Purpose                       |
| -------------------- | ----------------------------- |
| `KICK_API_KEY`       | Bearer token for API requests |
| `KICK_CLIENT_ID`     | OAuth client ID               |
| `KICK_CLIENT_SECRET` | OAuth client secret           |
| `KICK_REDIRECT_URI`  | Default OAuth redirect URI    |

## Error handling

Non-2xx responses throw a `KickApiError` with the HTTP status, method, URL,
parsed body and, when available, a machine-readable `errorCode` (such as
`invalid_client` or `CHANNEL_IS_NOT_LIVE`).

```ts
import { KickApiError } from 'kick-api';

try {
  await client.chat.sendChatMessage({ type: 'bot', content: 'hello' });
} catch (error) {
  if (error instanceof KickApiError && error.status === 429) {
    // rate limited - back off and retry
  }
}
```

## Development

- Install dependencies:

```sh
pnpm install
```

- Run the unit tests:

```sh
pnpm run test
```

- Run the type checker and linter:

```sh
pnpm run typecheck
pnpm run lint
```

- Build the library:

```sh
pnpm run build
```
