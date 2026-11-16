export type StyleCorrectionInput = {
  /** 교사가 설정한 작성 방법(문체 규칙) */
  styleRules: string;
  /** 교정할 코멘트 목록 */
  comments: string[];
};

/**
 * 문체 교정기. AI 제공자를 바꿔 끼울 수 있도록 인터페이스로 분리한다.
 * (현재는 Gemini 만 구현. Claude 등을 추가할 때 이 인터페이스를 구현하면 된다)
 */
export type StyleCorrector = {
  /** 입력과 같은 개수·순서로 교정한 코멘트를 돌려준다. 실패하면 AiError 를 던진다. */
  correct(input: StyleCorrectionInput): Promise<string[]>;
};
