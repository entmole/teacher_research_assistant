"use server";

import { revalidatePath } from "next/cache";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { getStyleCorrector } from "@/lib/ai";
import { AiError } from "@/lib/ai/prompt";
import { createClient, requireUser } from "@/lib/supabase/server";
import { MAX_COMMENT_LENGTH } from "@/features/assessment/types";
import { MAX_COMMENTS_PER_REQUEST, MAX_STYLE_RULES_LENGTH } from "./types";

/** AI 모드 켜기/끄기와 작성 방법 저장 (useActionState 용) */
export async function saveAiSettings(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const aiEnabled = formData.get("aiEnabled") === "on";
  const styleRules = String(formData.get("styleRules") ?? "").trim();

  if (styleRules.length > MAX_STYLE_RULES_LENGTH) {
    return fail(`작성 방법은 ${MAX_STYLE_RULES_LENGTH}자 이내로 입력해 주세요.`);
  }
  if (aiEnabled && styleRules.length === 0) {
    return fail("AI 모드를 켜려면 작성 방법을 입력해 주세요.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, ai_enabled: aiEnabled, style_rules: styleRules });
  if (error) return fail("저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");

  revalidatePath("/settings/school");
  revalidatePath("/assessments", "layout");
  return ok(aiEnabled ? "저장했습니다. AI 모드가 켜져 있습니다." : "저장했습니다. AI 모드가 꺼져 있습니다.");
}

export type CorrectionResult = { ok: true; comments: string[] } | { ok: false; error: string };

/**
 * 코멘트 문체 교정. 교사가 설정한 작성 방법에 맞게 문체만 다듬은 "제안"을 돌려준다.
 * 저장은 하지 않는다. (교사가 확인하고 적용해야 저장된다)
 */
export async function correctCommentStyle(comments: string[]): Promise<CorrectionResult> {
  const user = await requireUser();

  const isValid =
    Array.isArray(comments) &&
    comments.length >= 1 &&
    comments.length <= MAX_COMMENTS_PER_REQUEST &&
    comments.every(
      (comment) =>
        typeof comment === "string" &&
        comment.trim().length > 0 &&
        comment.length <= MAX_COMMENT_LENGTH,
    );
  if (!isValid) return { ok: false, error: "교정할 코멘트가 올바르지 않습니다." };

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("ai_enabled, style_rules")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.ai_enabled) {
    return { ok: false, error: "AI 모드가 꺼져 있습니다. 설정에서 켤 수 있습니다." };
  }
  if (profile.style_rules.trim() === "") {
    return { ok: false, error: "설정에서 작성 방법을 먼저 입력해 주세요." };
  }

  const corrector = getStyleCorrector();
  if (!corrector) {
    return { ok: false, error: "서버에 AI 키가 설정되지 않았습니다. 관리자에게 문의해 주세요." };
  }

  // 공용 키의 무료 한도를 보호하기 위해 교사별 하루 요청 수를 제한한다.
  const { data: isWithinLimit, error: usageError } = await supabase.rpc("consume_ai_request");
  if (usageError) return { ok: false, error: "사용량을 확인하지 못했습니다. 다시 시도해 주세요." };
  if (!isWithinLimit) {
    return { ok: false, error: "오늘 사용할 수 있는 AI 요청 횟수를 모두 썼습니다." };
  }

  try {
    const corrected = await corrector.correct({
      styleRules: profile.style_rules,
      comments: comments.map((comment) => comment.trim()),
    });
    return { ok: true, comments: corrected.map((c) => c.slice(0, MAX_COMMENT_LENGTH)) };
  } catch (error) {
    if (error instanceof AiError) return { ok: false, error: error.message };
    throw error;
  }
}
