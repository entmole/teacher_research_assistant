import "server-only";

import { AiError, buildSystemInstruction, buildUserMessage, parseCorrections } from "./prompt";
import type { StyleCorrectionInput, StyleCorrector } from "./types";

/** Gemini 의 OpenAI 호환 주소. API 키를 Authorization: Bearer 로 보낸다. */
const GEMINI_CHAT_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
/**
 * 최신 Flash-Lite 모델을 가리키는 별칭. 문체 교정처럼 가벼운 작업에 충분하고 응답이 빠르다.
 * GEMINI_MODEL 환경변수로 바꿀 수 있다.
 */
const DEFAULT_MODEL = "gemini-flash-lite-latest";
const REQUEST_TIMEOUT_MS = 20_000;
/** 과부하(5xx)나 시간 초과일 때 다시 시도하는 횟수 */
const MAX_ATTEMPTS = 2;

type ChatResponse = {
  choices?: { message?: { content?: string | null }; finish_reason?: string }[];
  error?: { message?: string };
};

/** HTTP 상태별 안내 문구 */
function errorMessageFor(status: number): string {
  if (status === 429) {
    return "AI 무료 사용량 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.";
  }
  if (status === 400 || status === 401 || status === 403 || status === 404) {
    return "AI 설정(API 키 또는 모델)이 올바르지 않습니다. 관리자에게 문의해 주세요.";
  }
  return "AI 서버가 응답하지 않습니다. 잠시 후 다시 시도해 주세요.";
}

/** Google Gemini 로 문체를 교정한다. API 키는 이 파일(서버)에서만 사용한다. */
export function createGeminiCorrector(apiKey: string): StyleCorrector {
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  return {
    async correct({ styleRules, comments }: StyleCorrectionInput): Promise<string[]> {
      const requestBody = JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: "system", content: buildSystemInstruction(styleRules) },
          { role: "user", content: buildUserMessage(comments) },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "corrected_comments",
            schema: { type: "array", items: { type: "string" } },
          },
        },
      });

      // 무료 모델은 일시적 과부하가 잦으므로 한 번 더 시도한다.
      let response: Response | null = null;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        try {
          response = await fetch(GEMINI_CHAT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
            body: requestBody,
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            cache: "no-store",
          });
        } catch {
          response = null;
        }
        if (response && response.status < 500) break;
      }
      if (!response) {
        throw new AiError("AI 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }

      const parsed: unknown = await response.json().catch(() => ({}));
      // 오류일 때 Gemini 는 객체를 배열로 감싸 보내기도 한다.
      const body = (Array.isArray(parsed) ? parsed[0] : parsed) as ChatResponse;
      if (!response.ok) {
        // 원인 파악을 위해 서버 로그에만 남긴다. (코멘트 내용과 키는 남기지 않는다)
        console.error("Gemini 오류", response.status, body?.error?.message);
        throw new AiError(errorMessageFor(response.status));
      }

      const text = body.choices?.[0]?.message?.content ?? "";
      if (text === "") {
        console.error("Gemini 빈 응답", body.choices?.[0]?.finish_reason);
        throw new AiError("AI 가 결과를 만들지 못했습니다. 표현을 바꿔 다시 시도해 주세요.");
      }
      return parseCorrections(text, comments.length);
    },
  };
}
