import type { HttpClient } from '../http';
import type {
  ApiResponse,
  GetLivestreamsParams,
  GetUsersLivestreamsParams,
  Livestream,
  LivestreamStats,
  PaginatedResponse,
  RequestOptions
} from '../types';

/**
 * Livestreams API - discover active livestreams on Kick.
 *
 * Exposed as `client.livestreams`.
 *
 * @see https://docs.kick.com/apis/livestreams
 */
export class LivestreamsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Gets active livestreams, sorted from oldest to newest.
   *
   * `GET /public/v2/livestreams` - supports cursor pagination.
   *
   * @param params - Filter and pagination parameters.
   * @param options - Per-request options.
   *
   * @returns A cursor-paginated page of livestreams.
   */
  getLivestreams = async (
    params: GetLivestreamsParams = {},
    options?: RequestOptions
  ): Promise<PaginatedResponse<Livestream>> =>
    await this.http.request<PaginatedResponse<Livestream>>({
      method: 'GET',
      path: '/public/v2/livestreams',
      query: {
        category_id: params.category_id,
        language_code: params.language_code,
        limit: params.limit,
        cursor: params.cursor
      },
      ...options
    });

  /**
   * Gets the active livestreams for the given user IDs.
   *
   * `GET /public/v1/users/livestreams` - a maximum of 100 user IDs can be provided per request.
   *
   * @param params - Broadcaster user IDs to look up.
   * @param options - Per-request options.
   *
   * @returns The active livestreams of the requested users.
   * @throws {RangeError} When more than 100 user IDs are provided.
   */
  getUsersLivestreams = async (
    params: GetUsersLivestreamsParams,
    options?: RequestOptions
  ): Promise<ApiResponse<Livestream[]>> => {
    if (params.user_id.length > 100) {
      throw new RangeError('A maximum of 100 user IDs can be provided per request');
    }
    return await this.http.request<ApiResponse<Livestream[]>>({
      method: 'GET',
      path: '/public/v1/users/livestreams',
      query: {
        user_id: params.user_id
      },
      ...options
    });
  };

  /**
   * Gets the total number of active livestreams.
   *
   * `GET /public/v1/livestreams/stats`
   *
   * @param options - Per-request options.
   *
   * @returns Aggregate livestream statistics.
   */
  getLivestreamsStats = async (options?: RequestOptions): Promise<ApiResponse<LivestreamStats>> =>
    await this.http.request<ApiResponse<LivestreamStats>>({
      method: 'GET',
      path: '/public/v1/livestreams/stats',
      ...options
    });
}
