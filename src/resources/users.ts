import type { HttpClient } from '../http';
import type { ApiResponse, GetUsersParams, RequestOptions, User } from '../types';

/**
 * Users API - interact with user information.
 *
 * Sensitive fields such as the email address are only returned for the currently authorized user
 * with the `user:read` scope.
 *
 * Exposed as `client.users`.
 *
 * @see https://docs.kick.com/apis/users
 */
export class UsersResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Retrieves user information based on the provided user IDs.
   *
   * `GET /public/v1/users` - when no IDs are specified, information about the currently authorized
   * user is returned instead.
   *
   * @param params - User IDs to look up.
   * @param options - Per-request options.
   *
   * @returns The matching users. Empty when no user matches the given IDs.
   */
  getUsers = async (
    params: GetUsersParams = {},
    options?: RequestOptions
  ): Promise<ApiResponse<User[]>> =>
    await this.http.request<ApiResponse<User[]>>({
      method: 'GET',
      path: '/public/v1/users',
      query: {
        id: params.id
      },
      ...options
    });
}
