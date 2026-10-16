import type { HttpClient } from '../http';
import type {
  AdBreak,
  AdBreakStatus,
  ApiResponse,
  CreateAdBreakParams,
  RequestOptions
} from '../types';

/**
 * Ads API - read and manage ads for a channel.
 *
 * All endpoints operate on the authenticated broadcaster's channel.
 *
 * Exposed as `client.ads`.
 *
 * @see https://docs.kick.com/apis/ads
 */
export class AdsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Creates an ad break on the authenticated broadcaster's channel.
   *
   * `POST /public/v1/ads/ad-break` - requires the `ads:write` scope.
   *
   * @param params - Ad break duration and an optional idempotency UUID.
   * @param options - Per-request options.
   *
   * @returns The created ad break and the remaining ad breaks in the period.
   */
  createAdBreak = async (
    params: CreateAdBreakParams,
    options?: RequestOptions
  ): Promise<ApiResponse<AdBreak>> =>
    await this.http.request<ApiResponse<AdBreak>>({
      method: 'POST',
      path: '/public/v1/ads/ad-break',
      json: {
        id: params.id ?? crypto.randomUUID(),
        break_duration_seconds: params.break_duration_seconds
      },
      ...options
    });

  /**
   * Gets the ad break status for the authenticated broadcaster's channel.
   *
   * `GET /public/v1/ads/ad-break-status` - requires the `ads:read` or `ads:write` scope.
   *
   * @param options - Per-request options.
   *
   * @returns Current ad settings, limits and recent ad breaks.
   */
  getAdBreakStatus = async (options?: RequestOptions): Promise<ApiResponse<AdBreakStatus>> =>
    await this.http.request<ApiResponse<AdBreakStatus>>({
      method: 'GET',
      path: '/public/v1/ads/ad-break-status',
      ...options
    });

  /**
   * Enrolls the authenticated broadcaster's channel in ads.
   *
   * `POST /public/v1/ads/enroll` - requires the `ads:write` scope.
   *
   * @param options - Per-request options.
   */
  enrollInAds = async (options?: RequestOptions): Promise<ApiResponse<unknown>> =>
    await this.http.request<ApiResponse<unknown>>({
      method: 'POST',
      path: '/public/v1/ads/enroll',
      ...options
    });
}
