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
├── index.html          # 메인: 서가 → 회원카드 → 꺼내서 펼치는 책 (목차 → Profile → Background → Activities → Credentials → Skills → Contact)
├── works.html          # 프로젝트 서가: 추천 도서 → 분류별 서가 / 목록으로 보기(검색·분류·연도), 책을 누르면 상세 창
├── manage.html         # 관리 페이지 (비밀번호, 링크 어디에도 없음)
├── projects.html       # 예전 주소 → works.html 로 이동
├── css/
│   ├── reset.css       # 브라우저 기본 스타일 초기화
│   ├── library.css     # 서가·회원카드·책 디자인 (맨 위 :root 에서 색상/폰트 변경)
│   ├── style.css       # 프로젝트 상세 창(케이스 스터디) 모양
│   └── responsive.css  # 상세 창 태블릿·모바일 대응
├── js/
│   ├── db.js           # Supabase 주소와 방문자용 공개 키
│   ├── data.js         # DB에서 그 직무 내용을 받아 화면에 채우기, 관리자 막대
│   ├── book.js         # 메인 전용: 책 페이지 자동 나누기, 스크롤로 넘기기, 휴대폰은 세로로
│   └── works.js        # 서가 전용: 추천 도서, 분류별 서가, 목록 보기, 상세 창
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
   - 책 페이지는 내용 양에 맞춰 자동으로 나뉘어요. 넘치면 다음 쪽에 '(이어서)'로 이어져요
   - 비어 있는 장(예: 활동이 하나도 없음)은 통째로 빠지고, 장 번호·목차·색인 탭도 남은 것만으로 다시 매겨져요
1. **올린 뒤 화면이 안 바뀌면** → HTML의 `?v=20261008c` 숫자를 바꿔서 다시 업로드
1. **이름·소개·기본 정보·이메일·링크** → `index.html` 아래쪽 `#bookSource` 안에서 직접 수정 (회원카드와 책 페이지에 들어가요)
2. **작업물** → `img/projects/`에 이미지 넣고, `projects` 표에 한 줄 추가 + `project_roles`에 보일 직무 연결
   - `id`는 영문 소문자·숫자·`-`만 (주소에 써요)
   - `date` → 최신순 정렬과 '목록으로 보기'의 연도 필터에 쓰여요
   - `kind`: 구분 → `personal`(개인 프로젝트) · `team`(팀 프로젝트) · `contest`(공모전) · `school`(학교 과제) · `client`(외주)
   - `client`: 주최·발주처. 목록 카드에는 안 보이고 '자세히 보기' 창에만 보여요. 비워두면 어디에도 안 보여요
   - `summary`(한 줄 요약), `did`(한 일), `tools`(사용한 도구), `result_value`·`result_label`(결과 숫자) → 프로젝트 카드에 보여요
   - `detail`: '자세히 보기'를 케이스 스터디(넓은 창)로 보여줄 때 채워요. 비워두면(`{}`) 기존 작은 창이 열려요
     - 모양: `{"sections": [ {"type": "...", "label": "Overview", "title": "...", "body": ["문단", ...]}, ... ]}`
     - `type` 종류: `text`(글) · `target`(persona, decisions) · `cards`(items) · `cast`(items: name, sound, color, note) · `scenario`(arc, scenes) · `mockup`(태블릿 목업, image 없으면 대표 이미지) · `gallery`(items: title, desc, image) · `palette`(colors: name, hex / fonts: style, sample, note) · `process`(steps, note) · `notes`(items: title, desc)
     - 섹션 번호는 순서대로 자동으로 붙어요. 예시는 `recycling-band` 프로젝트를 참고하세요
   - `featured` 켜기 → 서가 맨 위 '추천 도서'에 꽂혀요 (최대 8권, 하나도 없으면 최신 6권), `published` 끄기 → 숨기기
   - `category`가 같은 작업끼리 '분류별 서가' 한 칸에 꽂혀요. 영문 분류면 앞 두 글자(BR, PK…)가 청구기호가 돼요
3. **프로필 사진** → `img/profile.jpg`로 넣고 `index.html` `#bookSource`의 `img/profile.svg`를 `img/profile.jpg`로 변경
4. **이력서** → `files/resume.pdf`를 내 파일로 교체
5. **색상** → `css/library.css` 맨 위 `--blue` 값 변경

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
