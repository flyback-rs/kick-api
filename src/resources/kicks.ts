import type { HttpClient } from '../http';
import type {
  ApiResponse,
  GetKicksLeaderboardParams,
  KicksLeaderboard,
  RequestOptions
} from '../types';

/**
 * KICKs API - interact with KICKs related information.
 *
 * Exposed as `client.kicks`.
 *
 * @see https://docs.kick.com/apis/kicks
 */
export class KicksResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Gets the KICKs leaderboard for the authenticated broadcaster.
   *
   * `GET /public/v1/kicks/leaderboard` - requires the `kicks:read` scope.
   *
   * @param params - Leaderboard size.
   * @param options - Per-request options.
   *
   * @returns Leaderboard entries for the week, month and all time.
   */
  getKicksLeaderboard = async (
    params: GetKicksLeaderboardParams = {},
    options?: RequestOptions
  ): Promise<ApiResponse<KicksLeaderboard>> =>
    await this.http.request<ApiResponse<KicksLeaderboard>>({
      method: 'GET',
      path: '/public/v1/kicks/leaderboard',
      query: {
        top: params.top
      },
      ...options
    });
}
