import assert from "node:assert/strict";
import { test } from "node:test";
import { AiError, buildSystemInstruction, buildUserMessage, parseCorrections } from "./prompt";

test("시스템 지시문에 교사의 작성 방법이 들어간다", () => {
  const instruction = buildSystemInstruction("  문장은 '~함.'으로 끝낸다.  ");
  assert.match(instruction, /<작성방법>\n문장은 '~함.'으로 끝낸다.\n<\/작성방법>/);
  assert.match(instruction, /내용은 바꾸지 않습니다/);
});

test("사용자 메시지는 코멘트의 JSON 배열이다", () => {
  assert.equal(buildUserMessage(["가", '나 "따옴표"']), '["가","나 \\"따옴표\\""]');
});

test("JSON 배열 응답을 코멘트 목록으로 바꾼다", () => {
  assert.deepEqual(parseCorrections('["잘함. ", "노력함."]', 2), ["잘함.", "노력함."]);
});

test("코드 블록으로 감싼 응답도 해석한다", () => {
  assert.deepEqual(parseCorrections('```json\n["잘함."]\n```', 1), ["잘함."]);
});

test("개수가 다르면 오류를 던진다", () => {
  assert.throws(() => parseCorrections('["하나"]', 2), AiError);
});

test("문자열 배열이 아니면 오류를 던진다", () => {
  assert.throws(() => parseCorrections('{"a":1}', 1), AiError);
  assert.throws(() => parseCorrections("[1]", 1), AiError);
  assert.throws(() => parseCorrections("교정했습니다", 1), AiError);
});
