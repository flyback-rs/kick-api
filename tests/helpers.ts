import { vi } from 'vitest';

/** Shared fetch-mock helpers for the vitest suites. */

export interface RecordedCall {
  url: URL;
  init: RequestInit;
}

/** Creates a fetch mock that records calls and replies with the queued responses. */
export function createFetchMock(...queue: Response[]) {
  const calls: RecordedCall[] = [];
  const fetchMock = vi.fn<typeof fetch>(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const href = input instanceof Request ? input.url : input instanceof URL ? input.href : input;
      calls.push({ url: new URL(href), init: init ?? {} });
      const response = queue.shift();
      if (!response) {
        throw new Error(`Unexpected fetch call to ${href}`);
      }
      return response;
    }
  );
  return { calls, fetchMock };
}

/** Creates a JSON response for the mock queue. */
export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

/** Reads the authorization header from a recorded call. */
export function authorization(call: RecordedCall): string | null {
  return new Headers(call.init.headers).get('authorization');
}

/** Reads the request body of a recorded call as a string. */
export function requestBody(call: RecordedCall): string {
  if (typeof call.init.body !== 'string') {
    throw new TypeError(`Expected the call to ${call.url.href} to record a string request body`);
  }
  return call.init.body;
}
