import { KickApiError } from './errors';
import type { RequestOptions } from './types';

/**
 * HTTP methods used by the Kick API.
 *
 * @internal
 */
export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

/**
 * A single query string value. Arrays are serialized as repeated parameters.
 *
 * @internal
 */
export type QueryValue =
  | string
  | number
  | boolean
  | readonly (string | number)[]
  | null
  | undefined;

/**
 * Query string values keyed by parameter name.
 *
 * @internal
 */
export type QueryParams = Record<string, QueryValue>;

/**
 * Form-encoded body values keyed by field name.
 *
 * @internal
 */
export type FormValues = Record<string, string | number | boolean | null | undefined>;

/**
 * A single HTTP request issued by the client.
 *
 * @internal
 */
export interface RequestConfig extends RequestOptions {
  /** HTTP method. */
  method: HttpMethod;
  /** Path relative to the selected base URL, starting with `/`. */
  path: string;
  /** Base URL to use. Defaults to the API server. */
  base?: 'api' | 'oauth';
  /** Query string parameters. `undefined` and `null` values are omitted. */
  query?: QueryParams;
  /** JSON request body. */
  json?: unknown;
  /** Form-encoded request body. */
  form?: FormValues;
  /** Whether to attach the configured API key as a Bearer token. Defaults to `true`. */
  auth?: boolean;
  /** Explicit Bearer token overriding the configured API key. */
  bearer?: string;
}

/**
 * Options for constructing an {@link HttpClient}.
 *
 * @internal
 */
export interface HttpClientOptions {
  /** Base URL of the Kick API server. */
  baseUrl: string;
  /** Base URL of the Kick OAuth server. */
  oauthBaseUrl: string;
  /** Fetch implementation used for all requests. */
  fetch: typeof fetch;
  /** Resolves the API key to attach to authenticated requests. */
  getApiKey?: () => string | undefined | Promise<string | undefined>;
}

/**
 * Appends query values to a `URLSearchParams` instance.
 *
 * Array values become repeated parameters (`?id=1&id=2`).
 *
 * @internal
 */
function appendQuery(searchParams: URLSearchParams, query: QueryParams): void {
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        searchParams.append(key, String(item));
      }
    } else {
      searchParams.set(key, String(value));
    }
  }
}

/**
 * Serializes form values as `application/x-www-form-urlencoded`.
 *
 * @internal
 */
function toFormBody(form: FormValues): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(form)) {
    if (value === undefined || value === null) {
      continue;
    }
    searchParams.set(key, String(value));
  }
  return searchParams.toString();
}

/**
 * Extracts a human-readable error message from a parsed error body.
 *
 * @internal
 */
function extractErrorMessage(body: unknown): string | undefined {
  if (body === null || typeof body !== 'object') {
    return undefined;
  }
  const record = body as Record<string, unknown>;
  if (typeof record.message === 'string' && record.message.length > 0) {
    return record.message;
  }
  if (typeof record.error === 'string' && record.error.length > 0) {
    return record.error;
  }
  return undefined;
}

/**
 * HTTP client for the Kick API and OAuth servers.
 *
 * @internal
 */
export class HttpClient {
  /** Base URL of the Kick API server. */
  readonly baseUrl: string;

  /** Base URL of the Kick OAuth server. */
  readonly oauthBaseUrl: string;

  /** Fetch implementation used for all requests. */
  readonly fetch: typeof fetch;

  readonly #getApiKey: () => string | undefined | Promise<string | undefined>;

  constructor(options: HttpClientOptions) {
    this.baseUrl = options.baseUrl;
    this.oauthBaseUrl = options.oauthBaseUrl;
    this.fetch = options.fetch;
    this.#getApiKey = options.getApiKey ?? (() => undefined);
  }

  /**
   * Resolves the API key that would be attached to the next authenticated request.
   *
   * @returns The API key, or `undefined` when none is configured.
   */
  async getApiKey(): Promise<string | undefined> {
    return await this.#getApiKey();
  }

  /**
   * Sends an HTTP request and parses the JSON response.
   *
   * @typeParam T - Expected shape of the parsed response body.
   * @param config - Request configuration.
   *
   * @returns The parsed response body, or `undefined` for `204 No Content` responses.
   * @throws {KickApiError} When the server responds with a non-2xx status.
   */
  async request<T>(config: RequestConfig): Promise<T> {
    const baseUrl = config.base === 'oauth' ? this.oauthBaseUrl : this.baseUrl;
    const url = new URL(config.path, baseUrl);
    if (config.query) {
      appendQuery(url.searchParams, config.query);
    }

    const headers = new Headers({ accept: 'application/json' });
    if (config.headers) {
      new Headers(config.headers).forEach((value, key) => headers.set(key, value));
    }

    let body: string | undefined;
    if (config.json !== undefined) {
      headers.set('content-type', 'application/json');
      body = JSON.stringify(config.json);
    } else if (config.form) {
      headers.set('content-type', 'application/x-www-form-urlencoded');
      body = toFormBody(config.form);
    }

    const token = config.bearer ?? (config.auth === false ? undefined : await this.#getApiKey());
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }

    const response = await this.fetch(url.toString(), {
      method: config.method,
      headers,
      body,
      signal: config.signal
    });

    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    let parsed: unknown;
    if (text.length > 0) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }

    if (!response.ok) {
      const apiMessage = extractErrorMessage(parsed);
      throw new KickApiError({
        message: apiMessage
          ? `Kick API error (${response.status}): ${apiMessage}`
          : `Kick API request failed with status ${response.status} ${response.statusText}`,
        status: response.status,
        statusText: response.statusText,
        method: config.method,
        url: url.toString(),
        body: parsed,
        headers: response.headers
      });
    }

    if (text.length === 0) {
      return undefined as T;
    }
    return parsed as T;
  }
}
