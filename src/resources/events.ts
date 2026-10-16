import type { HttpClient } from '../http';
import type {
  ApiResponse,
  CreateEventSubscriptionsParams,
  DeleteEventSubscriptionsParams,
  EventSubscription,
  EventSubscriptionCreated,
  GetEventSubscriptionsParams,
  RequestOptions
} from '../types';

/**
 * Events API - manage webhook event subscriptions.
 *
 * Configure your webhook URL in the Kick developer settings before subscribing. Verify incoming
 * requests with `verifyWebhookRequest()`.
 *
 * Exposed as `client.events`.
 *
 * @see https://docs.kick.com/events/subscribe-to-events
 */
export class EventsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Gets the webhook event subscriptions of the authorized app or user.
   *
   * `GET /public/v1/events/subscriptions`
   *
   * @param params - Optional broadcaster filter.
   * @param options - Per-request options.
   *
   * @returns The current subscriptions.
   */
  getEventSubscriptions = async (
    params: GetEventSubscriptionsParams = {},
    options?: RequestOptions
  ): Promise<ApiResponse<EventSubscription[]>> =>
    await this.http.request<ApiResponse<EventSubscription[]>>({
      method: 'GET',
      path: '/public/v1/events/subscriptions',
      query: {
        broadcaster_user_id: params.broadcaster_user_id
      },
      ...options
    });

  /**
   * Subscribes to webhook events.
   *
   * `POST /public/v1/events/subscriptions` - with an app access token a `broadcaster_user_id` is
   * required; with a user access token the broadcaster is inferred from the token. There is a
   * subscription limit of 10,000 per event type per app.
   *
   * @param params - Events to subscribe to.
   * @param options - Per-request options.
   *
   * @returns One result per requested event, including an `error` for events that could not be
   *   subscribed.
   */
  createEventSubscriptions = async (
    params: CreateEventSubscriptionsParams,
    options?: RequestOptions
  ): Promise<ApiResponse<EventSubscriptionCreated[]>> =>
    await this.http.request<ApiResponse<EventSubscriptionCreated[]>>({
      method: 'POST',
      path: '/public/v1/events/subscriptions',
      json: {
        events: params.events,
        method: params.method ?? 'webhook',
        broadcaster_user_id: params.broadcaster_user_id
      },
      ...options
    });

  /**
   * Deletes webhook event subscriptions.
   *
   * `DELETE /public/v1/events/subscriptions`
   *
   * @param params - Subscription ID or IDs to delete.
   * @param options - Per-request options.
   */
  deleteEventSubscriptions = async (
    params: DeleteEventSubscriptionsParams,
    options?: RequestOptions
  ): Promise<void> => {
    const ids = Array.isArray(params.id) ? params.id : [params.id];
    await this.http.request<void>({
      method: 'DELETE',
      path: '/public/v1/events/subscriptions',
      query: {
        id: ids
      },
      ...options
    });
  };
}
