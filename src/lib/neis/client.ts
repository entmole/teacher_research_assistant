import "server-only";

/**
 * NEIS Open API 저수준 클라이언트.
 * 인증키(NEIS_API_KEY)는 이 파일에서만 읽으며, 'server-only' 로 클라이언트 번들 포함을 막는다.
 */
const NEIS_BASE_URL = "https://open.neis.go.kr/hub";
const PAGE_SIZE_WITH_KEY = 1000; // NEIS 최대값
const PAGE_SIZE_SAMPLE = 5; // 인증키가 없을 때 NEIS 가 허용하는 최대 건수
const MAX_PAGES = 10;
const NO_DATA_CODE = "INFO-200";
const OK_CODE = "INFO-000";

export class NeisError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = "NeisError";
  }
}

type NeisResult = { CODE: string; MESSAGE: string };
type NeisHead = [{ list_total_count: number }, { RESULT: NeisResult }];
type NeisBody<T> = [{ head: NeisHead }, { row: T[] }];
type NeisResponse<T> = { RESULT?: NeisResult } & Record<string, NeisBody<T> | NeisResult | undefined>;

type RequestOptions = {
  /** 응답 캐시 유지 시간(초) */
  revalidate: number;
};

/** 인증키 없이 샘플 모드(5건 제한)로 동작 중인지 여부 */
export function isNeisSampleMode(): boolean {
  return !process.env.NEIS_API_KEY;
}

async function requestPage<T>(
  service: string,
  params: Record<string, string>,
  pageIndex: number,
  options: RequestOptions,
): Promise<{ rows: T[]; totalCount: number }> {
  const apiKey = process.env.NEIS_API_KEY;
  const query = new URLSearchParams({
    Type: "json",
    pIndex: String(pageIndex),
    pSize: String(apiKey ? PAGE_SIZE_WITH_KEY : PAGE_SIZE_SAMPLE),
    ...params,
  });
  if (apiKey) query.set("KEY", apiKey);

  let response: Response;
  try {
    response = await fetch(`${NEIS_BASE_URL}/${service}?${query}`, {
      next: { revalidate: options.revalidate },
    });
  } catch {
    throw new NeisError("NEIS 서버에 연결하지 못했습니다.");
  }
  if (!response.ok) {
    throw new NeisError(`NEIS 서버 오류입니다. (HTTP ${response.status})`);
  }

  const json = (await response.json()) as NeisResponse<T>;

  // 데이터가 없거나 오류일 때는 최상위에 RESULT 만 내려온다.
  if (json.RESULT) {
    if (json.RESULT.CODE === NO_DATA_CODE) return { rows: [], totalCount: 0 };
    throw new NeisError(json.RESULT.MESSAGE, json.RESULT.CODE);
  }

  const body = json[service] as NeisBody<T> | undefined;
  if (!body) throw new NeisError("NEIS 응답 형식이 예상과 다릅니다.");

  const [{ head }, { row }] = body;
  const result = head[1].RESULT;
  if (result.CODE !== OK_CODE) throw new NeisError(result.MESSAGE, result.CODE);

  return { rows: row, totalCount: head[0].list_total_count };
}

/** 조건에 맞는 모든 행을 가져온다. (샘플 모드에서는 첫 5건만) */
export async function fetchNeisRows<T>(
  service: string,
  params: Record<string, string>,
  options: RequestOptions,
): Promise<T[]> {
  const first = await requestPage<T>(service, params, 1, options);
  if (isNeisSampleMode()) return first.rows;

  const rows = [...first.rows];
  for (let page = 2; rows.length < first.totalCount && page <= MAX_PAGES; page += 1) {
    const next = await requestPage<T>(service, params, page, options);
    if (next.rows.length === 0) break;
    rows.push(...next.rows);
  }
  return rows;
}
