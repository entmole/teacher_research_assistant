"use client";

import { useActionState, useState } from "react";
import { inputClass, labelClass, primaryButtonClass } from "@/lib/ui";
import { saveAiSettings } from "./actions";
import { MAX_STYLE_RULES_LENGTH } from "./types";

const RULES_PLACEHOLDER = [
  "예:",
  "- 문장은 '~함.', '~임.'으로 끝낸다.",
  "- 주어(학생 이름, '위 학생은')는 쓰지 않는다.",
  "- 한 문장은 짧게 쓰고, 영어 표현은 그대로 둔다.",
].join("\n");

type Props = {
  aiEnabled: boolean;
  styleRules: string;
  /** 서버에 AI 키가 설정되어 있는지 */
  isServerConfigured: boolean;
};

/** AI 모드 켜기/끄기와 작성 방법(문체 규칙) 입력 */
export function AiSettingsForm({ aiEnabled, styleRules, isServerConfigured }: Props) {
  const [rules, setRules] = useState(styleRules);
  const [state, formAction, isPending] = useActionState(saveAiSettings, null);

  return (
    <form action={formAction} className="space-y-4">
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="aiEnabled"
          defaultChecked={aiEnabled}
          className="mt-0.5 h-5 w-5 accent-emerald-700"
        />
        <span>
          <span className="block text-sm font-semibold text-stone-900">AI 모드 사용</span>
          <span className="block text-xs text-stone-600">
            켜면 평가 코멘트 입력 칸에 &quot;문체 교정&quot; 버튼이 나타납니다. 끄면 AI 로 아무것도
            보내지 않습니다.
          </span>
        </span>
      </label>

      <div>
        <label htmlFor="style-rules" className={labelClass}>
          작성 방법 (우리 학교 문체 규칙)
        </label>
        <textarea
          id="style-rules"
          name="styleRules"
          value={rules}
          onChange={(event) => setRules(event.target.value)}
          rows={6}
          maxLength={MAX_STYLE_RULES_LENGTH}
          placeholder={RULES_PLACEHOLDER}
          className={`${inputClass} leading-6`}
        />
        <p className="mt-1 flex justify-between text-xs text-stone-500">
          <span>AI 는 이 규칙에 맞게 문체만 다듬고, 내용은 바꾸지 않습니다.</span>
          <span>
            {rules.length} / {MAX_STYLE_RULES_LENGTH}자
          </span>
        </p>
      </div>

      <ul className="space-y-1 rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-900">
        <li>
          문체 교정을 누르면 해당 코멘트와 작성 방법이 Google Gemini 로 전송됩니다. 무료 등급에서는
          Google 이 이 내용을 서비스 개선에 사용할 수 있습니다.
        </li>
        <li>코멘트에 학생 이름 등 개인정보를 적지 마세요.</li>
        <li>교정 결과는 제안으로만 표시되며, &quot;적용&quot;을 눌러야 저장됩니다.</li>
        {!isServerConfigured && (
          <li className="font-semibold">
            현재 서버에 AI 키(GEMINI_API_KEY)가 설정되지 않아 문체 교정을 사용할 수 없습니다.
          </li>
        )}
      </ul>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={isPending} className={primaryButtonClass}>
          {isPending ? "저장 중…" : "저장"}
        </button>
        {state && (
          <p
            role={state.ok ? "status" : "alert"}
            className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}
          >
            {state.ok ? state.message : state.error}
          </p>
        )}
      </div>
    </form>
  );
}
