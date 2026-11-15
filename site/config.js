/* ─────────────────────────────────────────────
   예습 플랫폼 설정 — 선생님이 고치는 곳은 이 파일 하나
   ───────────────────────────────────────────── */
window.YESEUP_CONFIG = {
  // 구글 Apps Script '웹 앱' 주소 (https://script.google.com/macros/s/…/exec)
  // 비워 두면 '체험 모드': 질문이 그 기기에만 저장된다.
  API_URL: "https://script.google.com/macros/s/AKfycby7CcBCJq9fTUXfqkqvWAT9h09pxtjxd2b6jvn4wvLJdcvYfaIe1BCJLB8gkD3LHnr3/exec",

  COURSE: "미적분Ⅰ",
  CLASS_NAME: "2학년",   // 반 이름 (예: "2학년 3반")
  GROUPS: 9,              // 조 개수
  MAX_QUESTIONS: 3,       // 조 대표 질문 최대 개수

  // 교사 화면 분류 꼬리표 기본값 (교사 화면에서 바꿀 수 있음)
  DEFAULT_TAGS: ["개념", "이유(왜?)", "방법(어떻게?)", "확장(만약?)"],

  // 질문이 쌓이는 구글 시트 주소 (적어 두면 교사 화면에 '시트 열기' 단추가 생김)
  SHEET_URL: ""
};
