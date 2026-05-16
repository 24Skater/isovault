export const PAGE_SIZE_DEFAULT = 50;
export const PAGE_SIZE_MAX = 100;

export function parsePagination(query: { page?: string; limit?: string }): {
  page: number;
  limit: number;
  offset: number;
} {
  const limit = Math.min(
    query.limit ? parseInt(query.limit, 10) || PAGE_SIZE_DEFAULT : PAGE_SIZE_DEFAULT,
    PAGE_SIZE_MAX,
  );
  const page = Math.max(query.page ? parseInt(query.page, 10) || 1 : 1, 1);
  return { page, limit, offset: (page - 1) * limit };
}
