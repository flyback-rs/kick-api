/** Options for constructing a {@link KickApiError}. */
export interface KickApiErrorOptions {
  /** Human-readable error message. */
  message: string;
  /** HTTP status code returned by the server. */
  status: number;
  /** HTTP status text returned by the server. */
  statusText: string;
  /** HTTP method used for the request. */
  method: string;
  /** Full request URL. */
  url: string;
  /** Parsed response body (JSON object or raw text). */
  body?: unknown;
  /** Response headers. */
  headers?: Headers;
  /** Underlying error cause, if any. */
  cause?: unknown;
}

/**
 * Error thrown for a non-2xx response from the Kick API or OAuth server.
 *
 * Failures from `fetch` itself, including aborted requests, are not wrapped.
 */
export class KickApiError extends Error {
  /** HTTP status code returned by the server. */
  readonly status: number;

  /** HTTP status text returned by the server. */
  readonly statusText: string;

  /** HTTP method used for the request (e.g. `GET`, `POST`). */
  readonly method: string;

  /** Full URL of the failed request. */
  readonly url: string;

  /** Parsed response body (JSON object or raw text). */
  readonly body: unknown;

  /** Optional `data` payload included in the Kick API error response. */
  readonly data?: unknown;

  /** Optional error code extracted from OAuth `error` or Kick API `data` fields. */
  readonly errorCode?: string;

  /** Response headers returned by the server. */
  readonly headers: Headers;

  /**
   * Creates a new {@link KickApiError}.
   *
   * @param options - Details describing the failed HTTP request and response.
   */
  constructor(options: KickApiErrorOptions) {
    super(options.message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'KickApiError';
    this.status = options.status;
    this.statusText = options.statusText;
    this.method = options.method;
    this.url = options.url;
    this.body = options.body;
    this.headers = options.headers ?? new Headers();

    if (options.body && typeof options.body === 'object') {
      const record = options.body as Record<string, unknown>;
      if ('data' in record) {
        this.data = record.data;
        if (typeof record.data === 'string') {
          this.errorCode = record.data;
        }
      }
      if (typeof record.error === 'string') {
        this.errorCode = record.error;
      }
    }
  }
}
