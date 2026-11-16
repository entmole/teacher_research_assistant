import "server-only";

import { createGeminiCorrector } from "./gemini";
import type { StyleCorrector } from "./types";

/**
 * 서버에 설정된 AI 제공자의 문체 교정기를 돌려준다. API 키가 없으면 null.
 * 다른 제공자(예: Claude)를 추가할 때는 여기에서 환경변수에 따라 골라 주면 된다.
 */
export function getStyleCorrector(): StyleCorrector | null {
  const geminiKey = process.env.GEMINI_API_KEY;
  return geminiKey ? createGeminiCorrector(geminiKey) : null;
}

export function isAiConfigured(): boolean {
  return getStyleCorrector() !== null;
}
