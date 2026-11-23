/**
 * 미적분Ⅰ 예습 플랫폼 — 질문 저장소 (구글 시트 + Apps Script)
 *
 * 설치(처음 한 번):
 *  1) 구글 시트를 새로 만들고 [확장 프로그램] → [Apps Script]를 연다.
 *  2) 이 파일 내용을 모두 붙여 넣고 저장한다.
 *  3) 아래 TEACHER_KEY_FIRST 값을 원하는 교사 암호로 바꾸고,
 *     위쪽 함수 선택 칸에서 '처음설정'을 골라 [실행] → 권한 허용.
 *  4) [배포] → [새 배포] → 유형: 웹 앱
 *       - 다음 사용자 인증 정보로 실행: 나
 *       - 액세스 권한이 있는 사용자: 모든 사용자
 *     → 배포 후 나오는 '웹 앱 URL'(…/exec)을 사이트 config.js의 API_URL에 넣는다.
 *  ※ 2026-11-23: 개인 질문(submitOne) · 조별 질문 보기(board) · 조 대표 고르기(pick) 추가, '기기'·'조대표' 열 추가.
 *  ※ 이 파일을 고친 뒤에는 [배포] → [배포 관리] → 연필 → 버전 '새 버전'으로 다시 배포해야 반영된다.
 */

var TEACHER_KEY_FIRST = "여기에-교사-암호";  // 처음설정 실행 전에 바꾸기
var SHEET_NAME = "질문";
var HEAD = ["id", "시각", "차시", "반", "조", "순서", "질문", "상태", "분류", "별표", "묶음", "기기", "조대표"];
var COL = { id: 1, time: 2, lesson: 3, cls: 4, group: 5, order: 6, text: 7, status: 8, tag: 9, star: 10, cluster: 11, device: 12, pick: 13 };
var MAX_GROUP = 30, MAX_Q = 3, MAX_LEN = 300;

function 처음설정() {
  if (!TEACHER_KEY_FIRST || TEACHER_KEY_FIRST === "여기에-교사-암호") throw new Error("TEACHER_KEY_FIRST를 원하는 암호로 바꾼 뒤 실행하세요.");
  PropertiesService.getScriptProperties().setProperty("TEACHER_KEY", TEACHER_KEY_FIRST);
  sheet_();
  Logger.log("설정 완료: 교사 암호를 저장하고 '질문' 시트를 만들었습니다.");
}

/* ── 도움 함수 ── */
function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.getRange(1, 1, 1, HEAD.length).setValues([HEAD]).setFontWeight("bold");
    sh.setFrozenRows(1);
    sh.setColumnWidth(COL.text, 420);
  } else if (sh.getLastColumn() < HEAD.length) {
    // 예전 시트(11열)에 '기기', '조대표' 열을 더한다
    sh.getRange(1, 1, 1, HEAD.length).setValues([HEAD]).setFontWeight("bold");
  }
  return sh;
}
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function isTeacher_(k) { var t = PropertiesService.getScriptProperties().getProperty("TEACHER_KEY"); return !!t && String(k || "") === t; }
function tags_() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty("TAGS") || "null"); } catch (e) { return null; } }
function safe_(s) { s = String(s == null ? "" : s).replace(/\s+$/g, ""); return /^[=+\-@]/.test(s) ? "'" + s : s; } // 시트 수식 방지
function unsafe_(s) { s = String(s == null ? "" : s); return s; }
function rows_() {
  var sh = sheet_(), n = sh.getLastRow();
  if (n < 2) return [];
  var v = sh.getRange(2, 1, n - 1, HEAD.length).getValues();
  return v.map(function (r, i) {
    return { row: i + 2, id: String(r[0]), time: r[1] instanceof Date ? r[1].toISOString() : String(r[1]),
      lesson: String(r[2]), cls: String(r[3]), group: Number(r[4]), order: Number(r[5]), text: unsafe_(r[6]),
      status: String(r[7] || "active"), tag: String(r[8] || ""), star: r[9] === true || String(r[9]).toUpperCase() === "TRUE",
      cluster: String(r[10] || ""), device: String(r[11] || ""),
      pick: r[12] === true || String(r[12]).toUpperCase() === "TRUE" };
  });
}
function strip_(r) { var o = {}; for (var k in r) if (k !== "row" && k !== "device") o[k] = r[k]; return o; }
function okLesson_(l) { return /^[A-Za-z0-9_-]{1,20}$/.test(l); }
function okGroup_(g) { return g >= 1 && g <= MAX_GROUP && Math.floor(g) === g; }

/* ── 읽기 ── */
function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    if (p.action === "group") {
      var g = Number(p.group);
      var rs = rows_().filter(function (r) { return r.lesson === p.lesson && r.group === g && r.status === "active"; })
        .sort(function (a, b) { return a.order - b.order; })
        .map(function (r) { return { text: r.text, order: r.order, time: r.time }; });
      return out_({ ok: true, rows: rs });
    }
    if (p.action === "board") {
      // 학생 화면: 조별로 나눈 개인 질문 (숨긴 질문 제외, 기기 정보는 보내지 않음)
      var dev = String(p.device || "");
      var bs = rows_().filter(function (r) { return r.lesson === p.lesson && r.status === "active"; })
        .sort(function (a, b) { return a.group - b.group || (a.time < b.time ? -1 : 1); })
        .map(function (r) { return { id: r.id, group: r.group, text: r.text, pick: r.pick, time: r.time, mine: !!dev && r.device === dev }; });
      return out_({ ok: true, rows: bs });
    }
    if (!isTeacher_(p.key)) return out_({ ok: false, error: "암호가 맞지 않습니다." });
    if (p.action === "check") return out_({ ok: true });
    if (p.action === "list") {
      var all = rows_().filter(function (r) { return !p.lesson || r.lesson === p.lesson; });
      return out_({ ok: true, tags: tags_(), rows: all.map(strip_) });
    }
    return out_({ ok: false, error: "알 수 없는 요청" });
  } catch (err) { return out_({ ok: false, error: String(err) }); }
}

/* ── 쓰기 ── */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var b = JSON.parse(e.postData.contents);
    lock.waitLock(15000);
    var sh = sheet_();

    if (b.action === "submit") {
      var lesson = String(b.lesson || ""), group = Number(b.group);
      if (!/^[A-Za-z0-9_-]{1,20}$/.test(lesson)) return out_({ ok: false, error: "차시 이름이 올바르지 않습니다." });
      if (!(group >= 1 && group <= MAX_GROUP && Math.floor(group) === group)) return out_({ ok: false, error: "조 번호가 올바르지 않습니다." });
      var qs = (b.questions || []).map(function (q) { return String(q || "").trim().slice(0, MAX_LEN); }).filter(String).slice(0, MAX_Q);
      if (!qs.length) return out_({ ok: false, error: "질문이 비어 있습니다." });
      // 같은 차시·같은 조의 이전 제출은 '바뀜' 처리
      rows_().forEach(function (r) {
        if (r.lesson === lesson && r.group === group && r.status === "active") sh.getRange(r.row, COL.status).setValue("replaced");
      });
      var now = new Date(), cls = String(b.cls || "").slice(0, 30);
      var add = qs.map(function (q, i) {
        return [Utilities.getUuid().slice(0, 8), now, lesson, cls, group, i + 1, safe_(q), "active", "", false, "", "", false];
      });
      sh.getRange(sh.getLastRow() + 1, 1, add.length, HEAD.length).setValues(add);
      return out_({ ok: true, rows: qs.map(function (q, i) { return { text: q, order: i + 1 }; }) });
    }

    if (b.action === "submitOne") {
      // 학생 한 명이 질문 하나를 낸다. 같은 기기가 다시 내면 이전 질문은 '바뀜' 처리
      var l1 = String(b.lesson || ""), g1 = Number(b.group), dev = String(b.device || "").slice(0, 40);
      if (!okLesson_(l1)) return out_({ ok: false, error: "차시 이름이 올바르지 않습니다." });
      if (!okGroup_(g1)) return out_({ ok: false, error: "조 번호가 올바르지 않습니다." });
      if (!/^[A-Za-z0-9_-]{6,40}$/.test(dev)) return out_({ ok: false, error: "기기 정보가 올바르지 않습니다." });
      var q1 = String(b.text || "").trim().slice(0, MAX_LEN);
      if (!q1) return out_({ ok: false, error: "질문이 비어 있습니다." });
      rows_().forEach(function (r) {
        if (r.lesson === l1 && r.device === dev && r.status === "active") sh.getRange(r.row, COL.status).setValue("replaced");
      });
      var id1 = Utilities.getUuid().slice(0, 8);
      sh.getRange(sh.getLastRow() + 1, 1, 1, HEAD.length).setValues([[id1, new Date(), l1, String(b.cls || "").slice(0, 30), g1, 1, safe_(q1), "active", "", false, "", dev, false]]);
      return out_({ ok: true, id: id1 });
    }

    if (b.action === "pick") {
      // 조에서 대표 질문 하나 고르기 (id가 비면 고르기 취소)
      var l2 = String(b.lesson || ""), g2 = Number(b.group), id2 = String(b.id || "");
      if (!okLesson_(l2) || !okGroup_(g2)) return out_({ ok: false, error: "요청이 올바르지 않습니다." });
      var mine = rows_().filter(function (r) { return r.lesson === l2 && r.group === g2 && r.status === "active"; });
      if (id2 && !mine.some(function (r) { return r.id === id2; })) return out_({ ok: false, error: "우리 조 질문이 아닙니다." });
      mine.forEach(function (r) {
        var v = r.id === id2;
        if (v !== r.pick) sh.getRange(r.row, COL.pick).setValue(v);
      });
      return out_({ ok: true });
    }

    if (!isTeacher_(b.key)) return out_({ ok: false, error: "암호가 맞지 않습니다." });

    if (b.action === "update") {
      var map = {}; rows_().forEach(function (r) { map[r.id] = r.row; });
      (b.items || []).forEach(function (it) {
        var row = map[String(it.id)]; if (!row) return;
        if ("tag" in it) sh.getRange(row, COL.tag).setValue(safe_(String(it.tag).slice(0, 40)));
        if ("star" in it) sh.getRange(row, COL.star).setValue(!!it.star);
        if ("cluster" in it) sh.getRange(row, COL.cluster).setValue(safe_(String(it.cluster).slice(0, 10)));
        if ("status" in it && ["active", "hidden"].indexOf(it.status) >= 0) sh.getRange(row, COL.status).setValue(it.status);
      });
      return out_({ ok: true });
    }
    if (b.action === "tags") {
      var t = (b.tags || []).map(function (x) { return String(x).trim().slice(0, 40); }).filter(String).slice(0, 12);
      PropertiesService.getScriptProperties().setProperty("TAGS", JSON.stringify(t));
      return out_({ ok: true });
    }
    return out_({ ok: false, error: "알 수 없는 요청" });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}
