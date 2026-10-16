import type { HttpClient } from '../http';
import type {
  ApiResponse,
  BanUserParams,
  KickEmptyObject,
  RequestOptions,
  UnbanUserParams
} from '../types';

/**
 * Moderation API - restrict and restore user participation in chat rooms.
 *
 * Exposed as `client.moderation`.
 *
 * @see https://docs.kick.com/apis/moderation
 */
export class ModerationResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Bans or times out a user from participating in a broadcaster's chat room.
   *
   * `POST /public/v1/moderation/bans` - requires the `moderation:ban` scope. Omit `duration` for a
   * permanent ban, or set it to time the user out.
   *
   * @param params - Ban or timeout parameters.
   * @param options - Per-request options.
   */
  banUser = async (
    params: BanUserParams,
    options?: RequestOptions
  ): Promise<ApiResponse<KickEmptyObject>> =>
    await this.http.request<ApiResponse<KickEmptyObject>>({
      method: 'POST',
      path: '/public/v1/moderation/bans',
      json: params,
      ...options
    });

  /**
   * Unbans a user or removes a timeout from the specific user.
   *
   * `DELETE /public/v1/moderation/bans` - requires the `moderation:ban` scope.
   *
   * @param params - User and channel to lift the ban for.
   * @param options - Per-request options.
   */
  unbanUser = async (
    params: UnbanUserParams,
    options?: RequestOptions
  ): Promise<ApiResponse<KickEmptyObject>> =>
    await this.http.request<ApiResponse<KickEmptyObject>>({
      method: 'DELETE',
      path: '/public/v1/moderation/bans',
      json: params,
      ...options
    });
}
