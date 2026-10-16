import type { HttpClient } from '../http';
import type {
  ApiResponse,
  RequestOptions,
  SendChatMessageParams,
  SendChatMessageResponse
} from '../types';

/** Maximum number of user-perceived characters (grapheme clusters) per message. */
const MAX_CONTENT_GRAPHEMES = 500;

/** Maximum size of the UTF-8 encoded message content in bytes. */
const MAX_CONTENT_BYTES = 2048;

/** Rejects chat content over Kick's length limits. */
function validateChatContent(content: string): void {
  if (new TextEncoder().encode(content).length > MAX_CONTENT_BYTES) {
    throw new RangeError(
      `Chat message content must encode to at most ${MAX_CONTENT_BYTES} UTF-8 bytes`
    );
  }
  const segmenter = new Intl.Segmenter();
  const graphemeCount = [...segmenter.segment(content)].length;
  if (graphemeCount > MAX_CONTENT_GRAPHEMES) {
    throw new RangeError(
      `Chat message content must be at most ${MAX_CONTENT_GRAPHEMES} characters`
    );
  }
}

/**
 * Chat API - send and moderate chat messages.
 *
 * Exposed as `client.chat`.
 *
 * @see https://docs.kick.com/apis/chat
 */
export class ChatResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Posts a chat message to a channel as a user or a bot.
   *
   * `POST /public/v1/chat` - sending as a user requires the `broadcaster_user_id`; sending as a bot
   * always targets the channel attached to the token. The content limit is 500 grapheme clusters
   * and 2048 UTF-8 bytes.
   *
   * @param params - Message content and sender type.
   * @param options - Per-request options.
   *
   * @returns Whether the message was sent, and its UUID.
   * @throws {RangeError} When the content exceeds the chat message limits.
   */
  sendChatMessage = async (
    params: SendChatMessageParams,
    options?: RequestOptions
  ): Promise<ApiResponse<SendChatMessageResponse>> => {
    validateChatContent(params.content);
    return await this.http.request<ApiResponse<SendChatMessageResponse>>({
      method: 'POST',
      path: '/public/v1/chat',
      json: params,
      ...options
    });
  };

  /**
   * Deletes a chat message from a channel.
   *
   * `DELETE /public/v1/chat/{message_id}` - requires the `moderation:chat_message:manage` scope.
   *
   * @param messageId - UUID of the message to delete.
   * @param options - Per-request options.
   */
  deleteChatMessage = async (messageId: string, options?: RequestOptions): Promise<void> => {
    await this.http.request<void>({
      method: 'DELETE',
      path: `/public/v1/chat/${encodeURIComponent(messageId)}`,
      ...options
    });
  };
}
