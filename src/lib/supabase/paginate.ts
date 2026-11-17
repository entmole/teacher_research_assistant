/** Supabase 는 한 번에 최대 1000행만 돌려주므로, 행이 많을 수 있는 조회는 나눠서 모두 가져온다. */
const PAGE_SIZE = 1000;
const MAX_PAGES = 50;

type PageResult<T> = { data: T[] | null; error: unknown };

/**
 * fetchPage(from, to) 로 받은 조회를 끝까지 반복해 모든 행을 모은다.
 * 조회에는 반드시 정렬(order)을 넣어 쪽 사이에 행이 겹치거나 빠지지 않게 한다.
 */
export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * PAGE_SIZE;
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) throw new Error("데이터를 불러오지 못했습니다.");
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}
