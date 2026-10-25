# portfolio-creative

박영희(PARK Younghee)의 CREATIVE 포트폴리오입니다. Design · Marketing · PR

## 직무별로 따로 보이기

이 사이트는 한 번에 한 직무만 보여줍니다 (design, marketing, pr).
주소 뒤의 `?v=코드`로 어떤 직무를 보여줄지 정하고, 방문자 화면에는 직무를 바꾸는 버튼이 없습니다.

모든 내용은 **Supabase DB**에 있고, 사이트는 열릴 때 그 직무 내용만 받아와요.
사이트 코드에는 다른 직무의 내용도, 링크 코드도, 관리 비밀번호도 들어 있지 않아요.

- 고치는 곳: Supabase → **Table Editor** → 왼쪽 위 schema를 **portfolio**로 바꾸기
  - `roles` 직무별 표지 문장·소개·흘러가는 띠·링크 코드 / `skills` 직무별 스킬
  - `projects` 프로젝트, `project_roles` 어느 직무에 보일지(sort 작을수록 먼저)
  - `resume_items` 학력·경력·교육·대외/교내활동·수상·어학·자격증 (모든 직무 공통)
- 방문자는 테이블을 직접 읽을 수 없고, 공개 함수 `get_portfolio`로 그 직무 내용만 받아요.
- 직무별 링크 복사와 관리자 모드는 따로 연결되지 않은 관리 페이지(`manage.html`)에서 비밀번호를 넣고 사용해요. 비밀번호는 DB에서 확인하고, 15분에 10번 틀리면 잠겨요.

## 📁 폴더 구조

```
portfolio/
├── index.html          # 메인: 첫 화면(한 줄 소개 · 기본 정보) → 대표 프로젝트 3개 → 소개·학력 → 경력·교육 → 대외·교내활동 → 수상·어학·자격증 → 스킬 → 연락처
├── works.html          # 전체 프로젝트 아카이브: 연도별 목록 + 검색 · 분야 · 구분 필터
├── project.html        # 프로젝트 상세: project.html?id=프로젝트id
├── manage.html         # 관리 페이지 (비밀번호, 링크 어디에도 없음)
├── projects.html       # 예전 주소 → works.html 로 이동
├── css/
│   ├── reset.css       # 브라우저 기본 스타일 초기화
│   └── site.css        # 모든 페이지 디자인 (맨 위 :root 에서 색상/폰트 변경)
├── js/
│   ├── db.js           # Supabase 주소와 방문자용 공개 키
│   ├── data.js         # DB에서 그 직무 내용을 받기, 프로젝트 카드 모양, 관리자 막대
│   ├── main.js         # 메인 전용: 이력 · 스킬 · 대표 프로젝트 채우기
│   ├── works.js        # 아카이브 전용
│   └── project.js      # 프로젝트 상세 전용
├── img/
│   ├── favicon.svg     # 브라우저 탭 아이콘
│   ├── og-image.svg    # 링크 공유 미리보기 이미지
│   ├── profile.svg     # 프로필 사진
│   ├── icons/          # Skills 아이콘 (같은 파일명으로 교체 가능)
│   └── projects/       # 작업물 이미지
├── files/
│   └── resume.pdf      # 이력서
└── .nojekyll           # GitHub Pages 설정용 (지우지 마세요)
```

## ✏️ 내 정보로 바꾸기

1. **내용 고치기** → Supabase Table Editor (schema: portfolio). 저장하면 사이트에 바로 반영돼요
   - `resume_items`의 `kind`로 종류를 골라요: education · experience · training · activity · award · language · certificate
     - 활동(activity)은 `activity_type`을 external(대외) 또는 campus(교내)로, 맡은 역할은 `my_role`
     - 어학(language)은 `score`(점수)와 `expires_date`(유효기간, 비우면 '평생 유효')
     - 날짜는 `start_date`(취득일·시작일), 재직 중·수강 중이면 `end_date`를 비워요
   - 순서 상관없이 **최신순 자동 정렬**, 자격증은 **연도별 자동 묶음**, 개수도 자동
   - 경력·교육·활동 4개, 자격증 6개를 넘으면 자동으로 **더보기**로 접힘 (`js/main.js` 맨 위 `LIMITS`에서 변경)
   - 비어 있는 칸(예: 어학이 하나도 없음)은 제목까지 통째로 안 보이고, 섹션 번호·메뉴도 남은 것만으로 다시 매겨져요
1. **올린 뒤 화면이 안 바뀌면** → HTML의 `?v=20261008c` 숫자를 바꿔서 다시 업로드
1. **이름·기본 정보·자기소개·이메일·링크** → `index.html`에서 직접 수정 (✏️ 표시가 있는 곳)
2. **작업물** → `img/projects/`에 이미지 넣고, `projects` 표에 한 줄 추가 + `project_roles`에 보일 직무 연결
   - `id`는 영문 소문자·숫자·`-`만 (주소에 써요)
   - `date` → 아카이브의 연도 묶음과 최신순 정렬에 쓰여요
   - `kind`: 구분 → `personal`(개인 프로젝트) · `team`(팀 프로젝트) · `contest`(공모전) · `school`(학교 과제) · `client`(외주)
   - `client`: 주최·발주처. 목록 카드에는 안 보이고 상세 페이지에만 보여요. 비워두면 어디에도 안 보여요
   - `summary`(한 줄 요약), `did`(한 일), `tools`(사용한 도구), `result_value`·`result_label`(결과 숫자) → 카드와 상세 페이지에 보여요
   - `detail`: 상세 페이지의 섹션들이에요. 순서대로 01, 02… 번호가 붙어요. 비워두면(`{}`) `description`·`problem`·`action`·`did`로 섹션을 만들어요
   - 상세 페이지 위쪽 정보 칸에는 `my_role`·`period_label`·`kind`·`client`·`team`·`tools`가, 맨 아래에는 `result`·`tags`가 들어가요
     - 모양: `{"sections": [ {"type": "...", "label": "Overview", "title": "...", "body": ["문단", ...]}, ... ]}`
     - `type` 종류: `text`(글) · `target`(persona, decisions) · `cards`(items) · `cast`(items: name, sound, color, note) · `scenario`(arc, scenes) · `mockup`(태블릿 목업, image 없으면 대표 이미지) · `gallery`(items: title, desc, image) · `palette`(colors: name, hex / fonts: style, sample, note) · `process`(steps, note) · `notes`(items: title, desc)
     - 섹션 번호는 순서대로 자동으로 붙어요. 예시는 `recycling-band` 프로젝트를 참고하세요
   - `featured` 켜기 → 메인 '대표 프로젝트'에 보여요 (최신 3개까지, 하나도 없으면 최신순 3개). 아카이브에는 '대표' 표시가 붙어요. `published` 끄기 → 숨기기
   - `category` · `kind` → 아카이브의 분야 · 구분 필터가 이 값으로 자동 생성돼요 (한 가지뿐이면 그 필터는 숨겨요)
3. **프로필 사진** → `img/profile.jpg`로 넣고 `index.html`의 `img/profile.svg`를 `img/profile.jpg`로 변경
4. **이력서** → `files/resume.pdf`를 내 파일로 교체
5. **색상** → `css/site.css` 맨 위 `--accent` 값 변경

> 💡 이미지는 가로 1200px 정도, 장당 500KB 이하로 줄여서 올리면 사이트가 빨리 열립니다.

## 🚀 GitHub Pages로 배포하기

1. GitHub에서 **New repository** 생성
   - 이름을 `내아이디.github.io` 로 하면 → `https://내아이디.github.io` 주소가 됩니다
   - 다른 이름(예: `portfolio`)이면 → `https://내아이디.github.io/portfolio`
2. **Add file → Upload files** 에서 이 폴더 **안의 내용 전부**를 끌어다 놓고 Commit
   - `index.html`이 저장소 맨 바깥(루트)에 있어야 합니다
3. **Settings → Pages** → Source: `Deploy from a branch`, Branch: `main` / `/ (root)` → Save
4. 1~2분 뒤 상단에 표시되는 주소로 접속하면 완성 🎉

## ⚠️ 주의

- 파일·폴더 이름은 **영문 소문자**로 (GitHub Pages는 대소문자를 구분합니다. `Profile.JPG` ≠ `profile.jpg`)
- 링크 미리보기(카카오톡 등)를 확실히 띄우려면 `og-image`를 **JPG/PNG**로 바꾸고, `index.html`의 `og:image` 값을 전체 주소(`https://내아이디.github.io/img/og-image.jpg`)로 적어주세요.
