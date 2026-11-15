# 미적분Ⅰ 예습 플랫폼

학생은 휴대폰으로 차시별 예습(읽기 → 빈칸 → 질문 만들기)을 하고, 조별 대표 질문을 냅니다.
교사는 `teacher.html`에서 질문을 조별·분류별로 모아 보고, 크게 띄우고, 분류·별표·묶기를 합니다.

```
site/                 ← Netlify로 공개되는 폴더
├ index.html          학생 첫 화면 (예습 목록)
├ teacher.html        교사 화면 (암호)
├ config.js           ★ 설정: API_URL, 반 이름, 조 개수
├ lessons.json        예습 목록 (차시 추가 시 한 줄 추가)
├ lessons/A9.html     차시별 예습 (LESSON 자료만 바뀜)
└ assets/             공통 화면·KaTeX
apps-script/Code.gs   구글 시트에 붙일 코드 (공개되지 않음)
netlify.toml          Netlify 설정 (publish = site)
```

## 처음 한 번만

### 1. 구글 시트 연결 (질문 저장소)
1. 구글 드라이브에서 새 스프레드시트를 만든다 (예: `미적분Ⅰ 예습 질문`).
2. [확장 프로그램] → [Apps Script]를 열고, `apps-script/Code.gs` 내용을 모두 붙여 넣고 저장한다.
3. 코드 위쪽 `TEACHER_KEY_FIRST`를 교사 암호로 바꾸고 저장 → 함수 선택 칸에서 `처음설정` → [실행] → 권한 허용.
4. [배포] → [새 배포] → 톱니바퀴에서 **웹 앱** 선택
   - 다음 사용자 인증 정보로 실행: **나**
   - 액세스 권한이 있는 사용자: **모든 사용자**
5. 나온 **웹 앱 URL**(`https://script.google.com/macros/s/…/exec`)을 `site/config.js`의 `API_URL`에 넣는다.
   시트 주소는 `SHEET_URL`에 넣으면 교사 화면에 '시트 열기' 단추가 생긴다.

> 학교 구글 계정(Workspace)에서 '모든 사용자'가 안 보이면 개인 구글 계정으로 시트를 만든다.
> `Code.gs`를 고친 뒤에는 [배포] → [배포 관리] → 연필 → 버전 '새 버전'으로 다시 배포해야 반영된다.

### 2. Netlify 연결
1. Netlify → **Add new project** → **Import an existing project** → **GitHub** → 이 저장소 선택.
2. 설정은 `netlify.toml`이 알아서 함(빌드 명령 없음, 공개 폴더 `site`). **Deploy** 누르기.
3. 사이트 이름을 바꾸려면 Project configuration → Change project name (예: `bangsan-yeseup` → `bangsan-yeseup.netlify.app`).

이후로는 저장소에 새 파일이 들어오면 Netlify가 자동으로 다시 올린다.
(무료 플랜은 한 달 300크레딧, 배포 1번에 15크레딧 → 한 달 약 20번. 고친 것은 모아서 한 번에 올리기.)

## 새 차시 추가
1. `site/lessons/A9.html`을 복사해 `A10.html`로 만들고 `window.LESSON` 자료만 바꾼다.
2. `site/lessons.json`에 한 줄 추가한다.
3. 저장소에 올리면 끝.

교사용 정답 보기: 예습 주소 끝에 `#teacher` (예: `…/lessons/A9.html#teacher`).

## 체험 모드
`config.js`의 `API_URL`이 비어 있으면 질문이 그 기기에만 저장된다.
교사 화면에서 '예시 질문 넣기'로 기능을 미리 써 볼 수 있다.
