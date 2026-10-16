import type { HttpClient } from '../http';
import type {
  ApiResponse,
  DropsClaimsData,
  GetDropsClaimsParams,
  RequestOptions,
  UpdateDropsClaimsParams
} from '../types';

/**
 * Drops Public API - retrieve and update reward claims for Drops campaigns.
 *
 * Only OAuth apps associated with an organization can access these endpoints, using app access
 * tokens.
 *
 * Exposed as `client.drops`.
 *
 * @see https://docs.kick.com/drops/public-api
 */
export class DropsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Retrieves Drops reward claims for your organization's campaigns.
   *
   * `GET /public/v1/drops/claims`
   *
   * @param params - Filter and pagination parameters.
   * @param options - Per-request options.
   *
   * @returns Claims matching the query, and a cursor for the next page.
   */
  getDropsClaims = async (
    params: GetDropsClaimsParams = {},
    options?: RequestOptions
  ): Promise<ApiResponse<DropsClaimsData>> =>
    await this.http.request<ApiResponse<DropsClaimsData>>({
      method: 'GET',
      path: '/public/v1/drops/claims',
      query: {
        campaign_id: params.campaign_id,
        limit: params.limit,
        cursor: params.cursor,
        user_id: params.user_id,
        claim_id: params.claim_id,
        external_status: params.external_status
      },
      ...options
    });

  /**
   * Updates the `external_status` of one or more claims.
   *
   * `PATCH /public/v1/drops/claims` - up to 100 claims per request.
   *
   * @param params - Claim updates to apply.
   * @param options - Per-request options.
   * @throws {RangeError} When more than 100 claim updates are provided.
   */
  updateDropsClaims = async (
    params: UpdateDropsClaimsParams,
    options?: RequestOptions
  ): Promise<void> => {
    if (params.claims.length > 100) {
      throw new RangeError('A maximum of 100 claims can be updated per request');
    }
    await this.http.request<void>({
      method: 'PATCH',
      path: '/public/v1/drops/claims',
      json: params,
      ...options
    });
  };
}
