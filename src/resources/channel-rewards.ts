import type { HttpClient } from '../http';
import type {
  ApiResponse,
  ChannelReward,
  ChannelRewardRedemptionsByReward,
  ChannelRewardRedemptionsParams,
  CreateChannelRewardParams,
  FailedRedemption,
  GetChannelRewardRedemptionsParams,
  PaginatedResponse,
  RequestOptions,
  UpdateChannelRewardParams
} from '../types';

/**
 * Channel Rewards API - interact with channel points rewards for a channel.
 *
 * Exposed as `client.channelRewards`.
 *
 * @see https://docs.kick.com/apis/channel-rewards
 */
export class ChannelRewardsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Gets the channel rewards of the authenticated broadcaster's channel.
   *
   * `GET /public/v1/channels/rewards` - requires the `channel:rewards:read` or
   * `channel:rewards:write` scope. Channels may have up to 50 rewards, including disabled ones.
   *
   * @param options - Per-request options.
   *
   * @returns All rewards for the channel.
   */
  getChannelRewards = async (options?: RequestOptions): Promise<ApiResponse<ChannelReward[]>> =>
    await this.http.request<ApiResponse<ChannelReward[]>>({
      method: 'GET',
      path: '/public/v1/channels/rewards',
      ...options
    });

  /**
   * Creates a channel reward in the broadcaster's channel.
   *
   * `POST /public/v1/channels/rewards` - requires the `channel:rewards:write` scope.
   *
   * @param params - Reward to create.
   * @param options - Per-request options.
   *
   * @returns The created reward.
   */
  createChannelReward = async (
    params: CreateChannelRewardParams,
    options?: RequestOptions
  ): Promise<ApiResponse<ChannelReward>> =>
    await this.http.request<ApiResponse<ChannelReward>>({
      method: 'POST',
      path: '/public/v1/channels/rewards',
      json: params,
      ...options
    });

  /**
   * Updates a channel reward in the broadcaster's channel.
   *
   * `PATCH /public/v1/channels/rewards/{id}` - only the app that created the reward can update it.
   * At least one field must be set.
   *
   * @param rewardId - ULID of the reward to update.
   * @param params - Fields to update.
   * @param options - Per-request options.
   *
   * @returns The updated reward.
   * @throws {TypeError} When no fields are provided.
   */
  updateChannelReward = async (
    rewardId: string,
    params: UpdateChannelRewardParams,
    options?: RequestOptions
  ): Promise<ApiResponse<ChannelReward>> => {
    if (Object.values(params).every((value) => value === undefined)) {
      throw new TypeError('At least one field must be set to update a channel reward');
    }
    return await this.http.request<ApiResponse<ChannelReward>>({
      method: 'PATCH',
      path: `/public/v1/channels/rewards/${encodeURIComponent(rewardId)}`,
      json: params,
      ...options
    });
  };

  /**
   * Deletes a channel reward in the broadcaster's channel.
   *
   * `DELETE /public/v1/channels/rewards/{id}` - only the app that created the reward can delete it.
   *
   * @param rewardId - ULID of the reward to delete.
   * @param options - Per-request options.
   */
  deleteChannelReward = async (rewardId: string, options?: RequestOptions): Promise<void> => {
    await this.http.request<void>({
      method: 'DELETE',
      path: `/public/v1/channels/rewards/${encodeURIComponent(rewardId)}`,
      ...options
    });
  };

  /**
   * Gets channel reward redemptions for the authenticated broadcaster's channel.
   *
   * `GET /public/v1/channels/rewards/redemptions` - requires the `channel:rewards:read` or
   * `channel:rewards:write` scope.
   *
   * @param params - Filter and pagination parameters.
   * @param options - Per-request options.
   *
   * @returns A cursor-paginated page of redemptions grouped by reward.
   */
  getChannelRewardRedemptions = async (
    params: GetChannelRewardRedemptionsParams = {},
    options?: RequestOptions
  ): Promise<PaginatedResponse<ChannelRewardRedemptionsByReward>> =>
    await this.http.request<PaginatedResponse<ChannelRewardRedemptionsByReward>>({
      method: 'GET',
      path: '/public/v1/channels/rewards/redemptions',
      query: {
        reward_id: params.reward_id,
        status: params.status,
        id: params.id,
        cursor: params.cursor
      },
      ...options
    });

  /**
   * Accepts channel reward redemptions for the authenticated broadcaster's channel.
   *
   * `POST /public/v1/channels/rewards/redemptions/accept` - the response only includes redemptions
   * that failed to be accepted.
   *
   * @param params - Redemption IDs (ULIDs) to accept, up to 25 per request.
   * @param options - Per-request options.
   *
   * @returns Redemptions that could not be accepted.
   */
  acceptChannelRewardRedemptions = async (
    params: ChannelRewardRedemptionsParams,
    options?: RequestOptions
  ): Promise<ApiResponse<FailedRedemption[]>> =>
    await this.http.request<ApiResponse<FailedRedemption[]>>({
      method: 'POST',
      path: '/public/v1/channels/rewards/redemptions/accept',
      json: params,
      ...options
    });

  /**
   * Rejects channel reward redemptions for the authenticated broadcaster's channel.
   *
   * `POST /public/v1/channels/rewards/redemptions/reject` - the response only includes redemptions
   * that failed to be rejected.
   *
   * @param params - Redemption IDs (ULIDs) to reject, up to 25 per request.
   * @param options - Per-request options.
   *
   * @returns Redemptions that could not be rejected.
   */
  rejectChannelRewardRedemptions = async (
    params: ChannelRewardRedemptionsParams,
    options?: RequestOptions
  ): Promise<ApiResponse<FailedRedemption[]>> =>
    await this.http.request<ApiResponse<FailedRedemption[]>>({
      method: 'POST',
      path: '/public/v1/channels/rewards/redemptions/reject',
      json: params,
      ...options
    });
}
