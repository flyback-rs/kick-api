import type { HttpClient } from '../http';
import type { Category, GetCategoriesParams, PaginatedResponse, RequestOptions } from '../types';

/**
 * Categories API - interact with the categories (games) available on Kick.
 *
 * Exposed as `client.categories`.
 *
 * @see https://docs.kick.com/apis/categories
 */
export class CategoriesResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Gets categories based on cursor, limit, names and tags, or IDs.
   *
   * `GET /public/v2/categories` - requires an app or user access token.
   *
   * @param params - Filter and pagination parameters.
   * @param options - Per-request options.
   *
   * @returns A cursor-paginated page of categories.
   */
  getCategories = async (
    params: GetCategoriesParams = {},
    options?: RequestOptions
  ): Promise<PaginatedResponse<Category>> =>
    await this.http.request<PaginatedResponse<Category>>({
      method: 'GET',
      path: '/public/v2/categories',
      query: {
        cursor: params.cursor,
        limit: params.limit,
        name: params.name?.length ? params.name.join(',') : undefined,
        tag: params.tag?.length ? params.tag.join(',') : undefined,
        id: params.id?.length ? params.id.join(',') : undefined
      },
      ...options
    });
}
