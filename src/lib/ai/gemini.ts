import "server-only";

import { AiError, buildSystemInstruction, buildUserMessage, parseCorrections } from "./prompt";
import type { StyleCorrectionInput, StyleCorrector } from "./types";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
/** 최신 Flash 모델을 가리키는 별칭. GEMINI_MODEL 환경변수로 바꿀 수 있다. */
const DEFAULT_MODEL = "gemini-flash-latest";
const REQUEST_TIMEOUT_MS = 40_000;

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
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
      let response: Response;
      try {
        response = await fetch(`${GEMINI_BASE_URL}/models/${model}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: buildSystemInstruction(styleRules) }] },
            contents: [{ role: "user", parts: [{ text: buildUserMessage(comments) }] }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json",
              responseSchema: { type: "ARRAY", items: { type: "STRING" } },
            },
          }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          cache: "no-store",
        });
      } catch {
        throw new AiError("AI 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }

      const body = (await response.json().catch(() => ({}))) as GeminiResponse;
      if (!response.ok) {
        // 원인 파악을 위해 서버 로그에만 남긴다. (코멘트 내용과 키는 남기지 않는다)
        console.error("Gemini 오류", response.status, body.error?.message);
        throw new AiError(errorMessageFor(response.status));
      }
      if (body.promptFeedback?.blockReason) {
        throw new AiError("AI 가 이 내용을 처리하지 않았습니다. 표현을 바꿔 다시 시도해 주세요.");
      }

      const text = (body.candidates?.[0]?.content?.parts ?? [])
        .map((part) => part.text ?? "")
        .join("");
      if (text === "") {
        console.error("Gemini 빈 응답", body.candidates?.[0]?.finishReason);
        throw new AiError("AI 가 결과를 만들지 못했습니다. 다시 시도해 주세요.");
      }
      return parseCorrections(text, comments.length);
    },
  };
}
