# 교사 업무수첩

초등 교사를 위한 업무 웹앱입니다. 현재 **2단계**까지 구현: 로그인, 학교 설정, 주간 시간표, 학사일정, 진도 관리.

- 스택: Next.js(App Router) · TypeScript · Tailwind · Supabase(Auth + Postgres, RLS) · Vercel
- 시간표·학사일정은 NEIS Open API 에서 불러오고, 직접 수정한 칸만 DB에 저장합니다.
- 학생 실명 등 개인정보는 저장하지 않습니다.

## 시작하기

1. **Supabase**: 프로젝트를 만들고 SQL Editor 에서 `supabase/migrations/` 의 SQL 파일을 번호 순서대로 실행합니다.
2. **NEIS 인증키**: [open.neis.go.kr](https://open.neis.go.kr) 에서 인증키를 발급받습니다.
3. **환경변수**: `.env.example` 을 `.env.local` 로 복사해 값을 채웁니다.
4. 실행

```bash
npm install
npm run dev
```

## 배포 (Vercel)

1. GitHub 저장소를 Vercel 에 연결합니다.
2. Vercel 프로젝트 환경변수에 `.env.example` 의 세 값을 등록합니다. (`NEIS_API_KEY` 는 `NEXT_PUBLIC_` 접두사 없이)
3. Supabase > Authentication > URL Configuration 의 Site URL 과 Redirect URLs 에
   배포 주소와 `https://<배포주소>/auth/callback` 을 추가합니다.

## 명령어

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run lint` | ESLint |
| `npm run typecheck` | 타입 검사 |
| `npm test` | 단위 테스트(시간표 병합 로직) |

## 폴더 구조

```
src/
├─ app/
│  ├─ (auth)/login/          로그인·회원가입
│  ├─ auth/callback/         이메일 확인 링크 처리
│  ├─ (app)/timetable/       주간 시간표 + 학사일정
│  ├─ (app)/progress/        학급별 진도표, 과목·단원·차시 편집
│  ├─ (app)/settings/school/ 학교·담임/전담·담당 학급 설정
│  └─ api/neis/schools/      학교 검색(서버가 NEIS 를 대신 호출)
├─ features/                 기능별 컴포넌트·서버 액션 (auth, school, timetable, schedule, progress)
├─ lib/
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
- **진도**: 과목 → 단원 → 차시를 등록하고, 같은 학년 학급별로 수업한 차시를 체크합니다. 학급별 진도율과 다음 차시를 나란히 비교합니다.
- **데이터 분리**: 모든 테이블에 RLS 가 걸려 있어 교사는 자신의 행만 읽고 쓸 수 있습니다.

## 이후 단계

3단계 평가 기록(A/B/C + 생기부 코멘트) → 4단계 AI 연동
