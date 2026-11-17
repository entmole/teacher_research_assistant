# 교사 업무수첩

초등 교사를 위한 업무 웹앱입니다. 현재 **4단계**까지 구현: 로그인, 학교 설정, 주간 시간표, 학사일정, 진도 관리, 평가 기록, AI 문체 교정.

- 스택: Next.js(App Router) · TypeScript · Tailwind · Supabase(Auth + Postgres, RLS) · Vercel
- 시간표·학사일정은 NEIS Open API 에서 불러오고, 직접 수정한 칸만 DB에 저장합니다.
- 학생 실명 등 개인정보는 저장하지 않습니다.

## 시작하기

1. **Supabase**: 프로젝트를 만들고 SQL Editor 에서 `supabase/migrations/` 의 SQL 파일을 번호 순서대로 실행합니다.
2. **NEIS 인증키**: [open.neis.go.kr](https://open.neis.go.kr) 에서 인증키를 발급받습니다.
3. **Gemini API 키(선택)**: AI 문체 교정을 쓰려면 Google AI Studio 에서 키를 발급받습니다.
4. **환경변수**: `.env.example` 을 `.env.local` 로 복사해 값을 채웁니다.
5. 실행

```bash
npm install
npm run dev
```

## 배포 (Vercel)

1. GitHub 저장소를 Vercel 에 연결합니다.
2. Vercel 프로젝트 환경변수에 `.env.example` 의 값을 등록합니다. (`NEIS_API_KEY`, `GEMINI_API_KEY` 는 `NEXT_PUBLIC_` 접두사 없이)
3. Supabase > Authentication > URL Configuration 의 Site URL 과 Redirect URLs 에
   배포 주소와 `https://<배포주소>/auth/callback` 을 추가합니다.

## 명령어

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run lint` | ESLint |
| `npm run typecheck` | 타입 검사 |
| `npm test` | 단위 테스트 |

`main` 에 올리거나 PR 을 만들면 GitHub Actions(`.github/workflows/ci.yml`)가 위 검사와 빌드를 자동으로 실행합니다.

## 폴더 구조

```
src/
├─ app/
│  ├─ (auth)/login/          로그인·회원가입
│  ├─ auth/callback/         이메일 확인 링크 처리
│  ├─ (app)/timetable/       주간 시간표 + 학사일정
│  ├─ (app)/hours/           과목별 시수, 수업일수
│  ├─ (app)/progress/        학급별 진도표, 과목·단원·차시 편집
│  ├─ (app)/assessments/     평가 목록, 학생 번호별 등급·코멘트 입력
│  ├─ (app)/settings/school/ 학교·담임/전담·담당 학급 설정
│  └─ api/neis/schools/      학교 검색(서버가 NEIS 를 대신 호출)
├─ features/                 기능별 컴포넌트·서버 액션 (auth, school, timetable, schedule, progress, assessment, ai)
├─ lib/
│  ├─ ai/                    AI 문체 교정 (server-only, 제공자 교체 가능한 인터페이스)
│  ├─ neis/                  NEIS 클라이언트 (server-only, 인증키는 여기서만 사용)
│  ├─ supabase/              Supabase 서버 클라이언트
│  └─ date.ts                날짜·주차·학년도 계산
├─ types/database.ts         DB 타입
└─ proxy.ts                  세션 갱신·비로그인 차단 (Next.js 16 의 middleware)
supabase/migrations/         스키마·RLS SQL
```

## 동작 방식

- **시간표**: 화면 = NEIS 원본 + `timetable_overrides`(직접 수정분). 수정분을 지우면 NEIS 원본으로 돌아갑니다.
- **담임**: 학급 하나의 전체 시간표를 봅니다.
- **전담**: 여러 학급을 등록하고, "내 수업" 보기에서 전담 과목 수업만 모아 봅니다.
- **학사일정**: NEIS 학사일정 + `custom_events`(직접 추가한 일정)를 요일 머리글과 목록에 표시합니다.
- **시수·수업일수**: 학급의 학년도 시간표(NEIS + 직접 수정분)에서 과목별 시수를 세고, 직접 입력한 연간 기준 시수와 비교합니다. 수업일수는 "오늘까지 수업한 날", "NEIS 에 입력된 날", "달력 기준 예정 수업일수(평일 − 휴업일·공휴일)"를 보여 줍니다. 학년도 전체·1학기·2학기로 나눠 볼 수 있습니다.
- **진도**: 과목 → 단원 → 차시를 등록하고, 같은 학년 학급별로 수업한 차시를 체크합니다. 학급별 진도율과 다음 차시를 나란히 비교합니다.
- **평가**: 과목별 평가를 만들고 학급의 학생 번호별로 A/B/C 등급과 생기부 코멘트를 기록합니다. 학생은 이름 없이 번호로만 관리하며, 결과는 "번호·등급·코멘트" 형식으로 복사할 수 있습니다.
- **AI 문체 교정**: 설정에서 AI 모드를 켜고 학교별 작성 방법(문체 규칙)을 입력하면, 평가 코멘트를 그 규칙에 맞게 문체만 다듬은 제안을 받습니다. 제안은 교사가 "적용"을 눌러야 저장되며, AI 모드를 끄면 아무것도 전송하지 않습니다. 교사별 하루 200회로 제한합니다.
- **시간표 ↔ 진도**: 시간표 칸을 눌러 그 학급·과목의 다음 차시를 바로 "수업함"으로 기록할 수 있습니다.
- **학년도 전환**: 새 학년도에는 "작년 과목 가져오기"로 단원·차시를 복사합니다. (진도 기록·평가는 복사하지 않음)
- **결번·내보내기**: 평가 입력표에서 결번 번호를 제외할 수 있고, 결과를 엑셀용 CSV 로 내려받을 수 있습니다.
- **교과서 자료실**: 학년·과목·출판사별 단원·차시를 교사끼리 공유합니다. 진도표(엑셀 표나 텍스트)를 붙여넣어 단원·차시를 한꺼번에 만들고, "자료실에 공유"하면 다른 교사가 불러와 고쳐 쓸 수 있습니다. 불러온 내용은 복사본이라 자료실이 바뀌어도 영향이 없습니다.
- **학생별 종합 보기**: 한 학급의 모든 평가 등급과 코멘트를 학생 번호별로 모아 보고, 코멘트를 이어 붙여 복사합니다.
- **데이터 백업**: 설정 화면에서 내 데이터 전체를 JSON 파일로 내려받습니다.
- **로그인**: 이메일·비밀번호 또는 카카오로 로그인합니다.
- **가입 제한(초대 코드)**: DB 의 `private.app_settings` 에 `signup_invite_code` 값이 있으면 초대 코드가 필요합니다. 이메일 가입은 가입할 때, 카카오 가입은 첫 로그인 직후에 한 번 입력합니다. 초대가 확인되기 전에는 어떤 화면도 쓸 수 없습니다.
- **비밀번호**: 로그인 화면의 "비밀번호를 잊으셨나요?"로 재설정 메일을 받고, 설정 화면에서 비밀번호를 바꿀 수 있습니다.
- **데이터 분리**: 모든 테이블에 RLS 가 걸려 있어 교사는 자신의 행만 읽고 쓸 수 있습니다.

## 카카오 로그인 설정

1. [Kakao Developers](https://developers.kakao.com) 에서 애플리케이션을 만들고 카카오 로그인을 켭니다.
2. Redirect URI 에 `https://<프로젝트>.supabase.co/auth/v1/callback` 을 등록합니다.
3. REST API 키와 Client Secret 을 Supabase > Authentication > Sign In / Providers > Kakao 에 입력합니다.
4. 카카오 동의 항목에서 이메일을 받을 수 없으면 Supabase 의 Kakao 설정에서 "Allow users without an email" 을 켭니다.

## 초대 코드 바꾸기

Supabase SQL Editor 에서 실행합니다. 값을 지우면(delete) 누구나 가입할 수 있습니다.

```sql
insert into private.app_settings (key, value) values ('signup_invite_code', '새-초대-코드')
on conflict (key) do update set value = excluded.value;
```

## 자료실 기본 자료 넣기 (관리자)

검증된 교과서 내용을 "기본 자료"로 넣으려면 Supabase SQL Editor 에서 실행합니다. 교사는 기본 자료를 올릴 수 없습니다.

```sql
with t as (
  insert into public.textbooks (grade, semester, subject, publisher)
  values (5, 1, '영어', '출판사명')
  on conflict (grade, semester, subject, publisher) do update set subject = excluded.subject
  returning id
)
insert into public.textbook_versions (textbook_id, owner_id, kind, note, content, unit_count, lesson_count)
select id, null, 'base', '출처 메모',
  '[{"title": "1. 단원명", "lessons": ["1차시 제목", "2차시 제목"]}]'::jsonb, 1, 2
from t;
```

## AI 제공자 바꾸기

`src/lib/ai/types.ts` 의 `StyleCorrector` 를 구현한 파일을 추가하고 `src/lib/ai/index.ts` 에서 골라 주면 됩니다. (현재는 Gemini 만 구현)
