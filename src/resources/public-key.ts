import type { HttpClient } from '../http';
import type { ApiResponse, PublicKeyResponse, RequestOptions } from '../types';

/**
 * Public Key API - retrieve the public key used for verifying webhook signatures.
 *
 * Exposed as `client.publicKey`.
 *
 * @see https://docs.kick.com/apis/public-key
 */
export class PublicKeyResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Retrieves the current PEM-encoded public key (`GET /public/v1/public-key`).
   *
   * Authentication is not required. Kick rotates this key, so fetch it rather than embedding a
   * copy.
   *
   * @param options - Per-request options.
   *
   * @returns The current public key.
   */
  getPublicKey = async (options?: RequestOptions): Promise<ApiResponse<PublicKeyResponse>> =>
    await this.http.request<ApiResponse<PublicKeyResponse>>({
      method: 'GET',
      path: '/public/v1/public-key',
      ...options
    });
}
