import type { HttpClient } from '../http';
import type {
  ApiResponse,
  Channel,
  GetChannelsParams,
  RequestOptions,
  UpdateChannelParams
} from '../types';

/**
 * Channels API - interact with channels on Kick.
 *
 * Exposed as `client.channels`.
 *
 * @see https://docs.kick.com/apis/channels
 */
export class ChannelsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Retrieves channel information based on broadcaster user IDs or channel slugs.
   *
   * `GET /public/v1/channels` - you can either provide broadcaster user IDs (up to 50), slugs (up
   * to 50, max 25 characters each), or nothing to get the channel of the currently authorized user.
   * Mixing both parameter types in one request is not allowed.
   *
   * @param params - Channel selectors.
   * @param options - Per-request options.
   *
   * @returns The matching channels.
   * @throws {TypeError} When both `broadcaster_user_id` and `slug` are set.
   */
  getChannels = async (
    params: GetChannelsParams = {},
    options?: RequestOptions
  ): Promise<ApiResponse<Channel[]>> => {
    const broadcasterUserIds =
      'broadcaster_user_id' in params ? params.broadcaster_user_id : undefined;
    const slugs = 'slug' in params ? params.slug : undefined;
    if (broadcasterUserIds?.length && slugs?.length) {
      throw new TypeError(
        'broadcaster_user_id and slug cannot be combined in the same getChannels request'
      );
    }
    return await this.http.request<ApiResponse<Channel[]>>({
      method: 'GET',
      path: '/public/v1/channels',
      query: {
        broadcaster_user_id: broadcasterUserIds,
        slug: slugs
      },
      ...options
    });
  };

  /**
   * Updates livestream metadata for the authenticated broadcaster's channel.
   *
   * `PATCH /public/v1/channels` - requires the `channel:write` scope. At least one field must be
   * set.
   *
   * @param params - Metadata fields to update.
   * @param options - Per-request options.
   * @throws {TypeError} When no fields are provided.
   */
  updateChannel = async (params: UpdateChannelParams, options?: RequestOptions): Promise<void> => {
    if (
      params.category_id === undefined
      && params.custom_tags === undefined
      && params.stream_title === undefined
    ) {
      throw new TypeError('At least one field must be set to update a channel');
    }
    await this.http.request<void>({
      method: 'PATCH',
      path: '/public/v1/channels',
      json: params,
      ...options
    });
  };
}
