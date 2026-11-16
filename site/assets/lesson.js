/* 예습 플랫폼 — 차시 예습 화면 엔진 (넘겨 보기형: 태블릿·PC 우선, 휴대폰도 됨)
   각 차시 파일(lessons/A○.html)은 window.LESSON 자료만 담고, 화면은 이 파일이 그린다.
   한 장씩 넘기기: 시작 → 카드들 → 질문 만들기 → 조 질문 내기 (교사 보기: 시작 → 카드들 → 예상 질문) */
(function () {
  var L = window.LESSON, C = window.YESEUP_CONFIG || {};
  var TEACHER = location.hash === "#teacher";
  var SKEY = "yeseup_" + L.id;
  var MAXQ = C.MAX_QUESTIONS || 3;
  var FRAMES = [
    { k: "why", label: "왜 ___일까?", text: "왜 ___일까?" },
    { k: "diff", label: "___와 ___는<br>무엇이 다를까?", text: "___와 ___는 무엇이 다를까?" },
    { k: "if", label: "만약 ___라면<br>어떻게 될까?", text: "만약 ___라면 어떻게 될까?" },
    { k: "how", label: "___는 어떻게<br>구할 수 있을까?", text: "___는 어떻게 구할 수 있을까?" }
  ];

  var st = load() || {};
  st.blanks = st.blanks || {}; st.confuse = st.confuse || []; st.mine = st.mine || [];
  st.gq = st.gq || ["", "", ""]; st.active = st.active == null ? null : st.active;
  function load() { try { return JSON.parse(localStorage.getItem(SKEY)); } catch (e) { return null; } }
  function save() { if (TEACHER) return; try { localStorage.setItem(SKEY, JSON.stringify(st)); } catch (e) {} }

  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function math(el) {
    if (window.renderMathInElement) {
      try { window.renderMathInElement(el, { delimiters: [{ left: "$", right: "$", display: false }], throwOnError: false }); return; } catch (e) {}
    }
    $$("*", el).concat([el]).forEach(function (n) {
      Array.prototype.forEach.call(n.childNodes, function (t) { if (t.nodeType === 3) t.nodeValue = t.nodeValue.replace(/\$/g, ""); });
    });
  }
  function norm(s) {
    return String(s).toLowerCase().replace(/\s+/g, "").replace(/²/g, "^2").replace(/³/g, "^3")
      .replace(/\*\*/g, "^").replace(/\*/g, "").replace(/[{}$]/g, "").replace(/−/g, "-");
  }
  function cardDone(i) { return Object.keys(L.cards[i].blanks || {}).every(function (k) { var b = st.blanks[k]; return b && (b.s === "ok" || b.s === "shown" || b.s === "seen"); }); }
  /* 줄바꿈: 수식·빈칸이 뒤따르는 조사와 떨어지지 않게 묶는다 */
  function glue(t) {
    return String(t)
      .replace(/(\$[^$]+\$)([가-힣]+[.,!?]?)/g, '<span class="nb">$1$2</span>')
      .replace(/\[\[(\w+)\]\]([가-힣]+[.,!?]?)?/g, function (_, k, j) { return '<span class="nb">[[' + k + ']]' + (j || "") + "</span>"; })
      .replace(/([가-힣]+[.,]?)\s(<span class="nb">\[\[\w+\]\][^<]*<\/span>)/g, '<span class="nb">$1 $2</span>');
  }
  function blanks(t) { return t.replace(/\[\[(\w+)\]\]/g, function (_, k) { return '<span class="bk" data-b="' + k + '"></span>'; }); }
  function para(t, cls) { return '<p' + (cls ? ' class="' + cls + '"' : "") + ">" + blanks(glue(t)) + "</p>"; }

  /* ── 장(슬라이드) 목록 ── */
  var SL = [{ id: "intro", chip: "시작", name: "시작하기" }];
  L.cards.forEach(function (c, i) { SL.push({ id: "c" + i, chip: String(i + 1), name: (i + 1) + ". " + c.title, card: i }); });
  if (TEACHER) SL.push({ id: "expect", chip: "예상", name: "예상 학생 질문" });
  else { SL.push({ id: "q", chip: "질문", name: "질문 만들기" }); SL.push({ id: "send", chip: "내기", name: "조 질문 내기" }); }
  function idx(id) { for (var i = 0; i < SL.length; i++) if (SL[i].id === id) return i; return 0; }

  /* ── 화면 그리기 ── */
  var h = [];
  h.push('<header class="top"><a class="back" href="../index.html">← 목록</a>');
  h.push('<div class="ttl"><span class="meta">' + esc(C.COURSE || "") + " · " + esc(L.unit || "") + "</span><h1>" + esc(L.id) + ". " + esc(L.title) +
    (TEACHER ? '<span class="tbadge">교사용 · 정답</span>' : "") + "</h1></div>");
  h.push('<nav class="steps" id="steps">' + SL.map(function (s, i) {
    return '<button data-i="' + i + '" class="' + (s.card != null ? "num" : "word") + '" title="' + esc(s.name.replace(/\$/g, "")) + '">' + s.chip + "</button>";
  }).join("") + "</nav></header>");
  h.push('<main class="stage" id="stage"><div class="track" id="track">');

  SL.forEach(function (s) {
    h.push('<section class="slide" data-id="' + s.id + '"><div class="inner">');
    if (s.id === "intro") {
      h.push('<div class="intro"><div class="meta">' + esc(C.COURSE || "") + " · " + esc(L.unit || "") + " · 예습 약 " + (L.minutes || 7) + "분</div>");
      h.push("<h2>" + esc(L.id) + ". " + esc(L.title) + "</h2>");
      if (TEACHER) h.push('<p class="lead">교사용 미리보기입니다. 빈칸 정답이 빨간색으로, 카드마다 지도 메모가 보이고, 마지막 장에 예상 학생 질문이 있습니다.</p>');
      else {
        h.push('<ol class="howto"><li><b>읽고 빈칸 채우기</b><span>카드 ' + L.cards.length + "장을 넘기며 읽어 봐.<br>「답 보기」는 눌러서 확인, 숫자 칸은 직접 써 봐.</span></li>");
        h.push("<li><b>헷갈리면 표시하기</b><span>「여기가 헷갈려요」를 눌러 두면 질문 재료가 돼.</span></li>");
        h.push("<li><b>질문 만들고 조 질문 내기</b><span>마지막에 조에서 대표 질문을 골라 한 사람이 내자.</span></li></ol>");
      }
      h.push('<button class="btn pri big" data-go="1">시작하기 →</button>');
      h.push('<p class="tip">아래 화살표, 키보드 ← →, 손가락으로 옆으로 밀어서 넘길 수 있어.</p></div>');
    } else if (s.card != null) {
      var c = L.cards[s.card], i = s.card;
      h.push('<section class="card' + (c.figure ? " has-fig" : "") + '" data-i="' + i + '"><div class="card-head"><span class="pill' + (c.today ? " today" : "") + '">' + esc(c.tag) + "</span>");
      h.push("<h2>" + (i + 1) + ". " + c.title + '</h2><span class="check">✓ 완료</span></div><div class="cbody"><div class="ctext">');
      (c.lines || []).forEach(function (ln) { h.push(para(ln)); });
      if (c.formula) h.push('<div class="formula">' + [].concat(c.formula).map(function (f) { return para(f); }).join("") + "</div>");
      if (c.after) [].concat(c.after).forEach(function (ln) { h.push(para(ln)); });
      if (c.example) h.push('<div class="exbox"><span class="exlab">예시</span>' + c.example.map(function (f) { return para(f); }).join("") + "</div>");
      if (c.note) h.push(para(c.note, "note"));
      h.push("</div>");
      if (c.figure) h.push('<div class="fig">' + c.figure + (c.caption ? '<div class="cap">' + c.caption + "</div>" : "") + "</div>");
      if (TEACHER) { if (c.teacherNote) h.push('<div class="tnote side">지도 메모 · ' + c.teacherNote + "</div>"); }
      else if (c.confuse) h.push('<div class="side"><button class="confuse" data-i="' + i + '"><span class="qi">?</span>여기가 헷갈려요</button></div>');
      h.push("</div></section>");
    } else if (s.id === "expect") {
      h.push('<section class="expect"><h2>예상 학생 질문</h2><ol>');
      (L.teacher && L.teacher.expected || []).forEach(function (e) {
        var f = FRAMES.filter(function (x) { return x.k === e.frame; })[0];
        h.push('<li><span class="ft">' + (f ? f.text.replace(/___/g, "○") : "") + "</span>" + e.q + (e.link ? '<span class="lk">→ ' + e.link + "</span>" : "") + "</li>");
      });
      h.push('</ol><p class="lead" style="margin:10px 0 0">학생들이 낸 조 질문은 <a href="../teacher.html">교사 화면</a>에서 모아 봅니다.</p></section>');
    } else if (s.id === "q") {
      h.push('<section class="qbox" id="qbox"><h2>질문 만들기</h2><p class="lead">헷갈린 곳을 질문으로 바꿔 보자. 질문틀을 고르면 문장이 시작돼.</p><div class="two">');
      h.push('<div><div class="step">1. 헷갈린 곳 고르기</div><div class="chips" id="cchips"></div>');
      h.push('<div class="step">2. 질문틀 고르기</div><div class="frames">');
      FRAMES.forEach(function (f) { h.push('<button data-k="' + f.k + '">' + f.label + "</button>"); });
      h.push("</div></div><div>");
      h.push('<div class="step">3. 내 말로 고쳐 쓰기</div><textarea id="draft" placeholder="여기에 질문을 써 보자"></textarea>');
      h.push('<button class="btn gold wide" id="addMine">내 질문에 담기</button><ol class="mine" id="mine"></ol>');
      if (L.example) h.push('<details class="ex"><summary>좋은 질문 예시 보기</summary>' + L.example + "</details>");
      h.push("</div></div></section>");
    } else if (s.id === "send") {
      h.push('<section class="send" id="send"><h2>조 질문 내기</h2><p class="lead">조에서 내 질문을 서로 보여 주고, 대표 질문을 1~' + MAXQ + "개 골라 <b>한 사람만</b> 내자.</p><div class=\"two\">");
      h.push('<div><div class="step navy">우리 조</div><div class="groups" id="groups">');
      for (var g = 1; g <= (C.GROUPS || 9); g++) h.push('<button data-g="' + g + '">' + g + "조</button>");
      h.push('</div><div id="now"></div></div><div><div id="gqs"></div>');
      h.push('<div class="btns"><button class="btn sec" id="loadMine">내 질문 불러오기</button><button class="btn pri" id="submit">조 질문 내기</button></div>');
      h.push('<div id="result"></div>' + (window.Api && Api.demo ? '<div class="demo">체험 모드: 아직 선생님 시트와 연결되지 않아 이 기기에만 저장돼.</div>' : "") + "</div></div></section>");
    }
    h.push("</div></section>");
  });
  h.push("</div></main>");
  h.push('<footer class="navbar"><button class="nbtn" id="prev">← 이전</button><div class="where" id="where"></div><button class="nbtn pri" id="next">다음 →</button></footer>');

  var app = $("#app");
  app.innerHTML = h.join("");
  document.body.classList.add("slides");
  document.body.insertAdjacentHTML("beforeend",
    '<div class="toast" id="toast"></div>');
  math(app);

  /* ── 넘기기 ── */
  var track = $("#track"), slides = $$(".slide"), cur = 0, stage = $("#stage");
  function paintSteps() {
    $$("#steps button").forEach(function (b, i) {
      var s = SL[i], done = false;
      if (s.card != null) done = TEACHER || cardDone(s.card);
      else if (s.id === "q") done = st.mine.length > 0;
      else if (s.id === "send") done = !!st.submitted;
      b.classList.toggle("done", done); b.classList.toggle("cur", i === cur);
    });
  }
  function go(i) {
    i = Math.max(0, Math.min(SL.length - 1, i));
    cur = i; st.slide = i; save();
    stage.scrollLeft = 0;
    track.style.transform = "translateX(" + (-100 * i) + "%)";
    slides.forEach(function (sl, j) { sl.inert = j !== i; sl.setAttribute("aria-hidden", j !== i ? "true" : "false"); });
    $("#prev").style.visibility = i > 0 ? "visible" : "hidden";
    var nx = $("#next");
    if (i < SL.length - 1) { nx.style.visibility = "visible"; nx.innerHTML = '<span class="nlab">' + SL[i + 1].name + "</span> →"; math(nx); }
    else nx.style.visibility = "hidden";
    $("#where").textContent = (i + 1) + " / " + SL.length;
    paintSteps();
    if (SL[i].id === "send") showNow();
  }
  $("#prev").onclick = function () { go(cur - 1); };
  $("#next").onclick = function () { go(cur + 1); };
  $$("#steps button").forEach(function (b) { b.onclick = function () { go(+b.dataset.i); }; });
  $$("[data-go]").forEach(function (b) { b.onclick = function () { go(+b.dataset.go); }; });
  document.addEventListener("keydown", function (e) {
    var t = e.target.tagName; if (t === "INPUT" || t === "TEXTAREA" || t === "SELECT") return;
    if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); go(cur + 1); }
    else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(cur - 1); }
  });
  var sx = 0, sy = 0, tracking = false;
  stage.addEventListener("touchstart", function (e) {
    if (e.touches.length > 1) { tracking = false; return; }
    tracking = !e.target.closest("textarea,input,select,.numq");
    sx = e.touches[0].clientX; sy = e.touches[0].clientY;
  }, { passive: true });
  stage.addEventListener("touchend", function (e) {
    if (!tracking) return; tracking = false;
    var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 70 && Math.abs(dx) > 1.6 * Math.abs(dy)) go(cur + (dx < 0 ? 1 : -1));
  }, { passive: true });

  /* ── 빈칸 ──
     reveal: 수식·용어 → 누르면 답이 보이고, 다시 누르면 숨는다
     num   : 숫자 → 바로 써서 확인 (정답! / 다시 생각해 보세요.) */
  var BL = {}; L.cards.forEach(function (c, i) { Object.keys(c.blanks || {}).forEach(function (k) { BL[k] = c.blanks[k]; BL[k].card = i; }); });
  function toNum(v) {
    v = String(v).replace(/\s+/g, "").replace(/[−–—]/g, "-");
    var m = v.match(/^(-?)(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
    if (m) return (m[1] ? -1 : 1) * parseFloat(m[2]) / parseFloat(m[3]);
    return /^-?\d+(\.\d+)?$|^-?\.\d+$/.test(v) ? parseFloat(v) : NaN;
  }
  function pulseConfuse(i) { var cb = $('.confuse[data-i="' + i + '"]'); if (cb && !cb.classList.contains("on")) { cb.classList.remove("pulse"); void cb.offsetWidth; cb.classList.add("pulse"); } }
  function paintBlank(k) {
    var el = $('.bk[data-b="' + k + '"]'), b = BL[k], s = st.blanks[k] || {};
    if (b.type === "reveal") {
      var open = TEACHER || s.open;
      el.className = "bk rv" + (open ? " open" : "") + (TEACHER ? " teacher" : "");
      el.innerHTML = '<button type="button" class="rvb" aria-pressed="' + (open ? "true" : "false") + '">' +
        (open ? '<span class="ans">' + b.show + "</span>" : '<span class="peek">답 보기</span>') + "</button>";
      math(el);
      if (!TEACHER) $(".rvb", el).onclick = function () {
        var cur = st.blanks[k] || {}; cur.open = !cur.open; cur.s = "seen"; st.blanks[k] = cur; save(); paintBlank(k); paintCards();
      };
      return;
    }
    // num
    if (TEACHER || s.s === "ok" || s.s === "shown") {
      el.className = "bk num " + (TEACHER ? "teacher" : s.s);
      el.innerHTML = '<span class="ans">' + b.show + "</span>" + (s.s === "ok" && !TEACHER ? '<span class="fb good">정답!</span>' : "");
      math(el); return;
    }
    el.className = "bk num";
    el.innerHTML = '<span class="numq"><input type="text" inputmode="decimal" autocomplete="off" aria-label="답" placeholder="?">' +
      '<button type="button" class="neg" title="음수 부호">−</button><button type="button" class="chk">확인</button></span>' +
      '<span class="fb"></span>';
    var inp = $("input", el), fb = $(".fb", el);
    $(".neg", el).onclick = function () { var v = inp.value.trim(); inp.value = /^[-−]/.test(v) ? v.replace(/^[-−]\s*/, "") : "−" + v; inp.focus(); };
    function check() {
      var v = toNum(inp.value), cur = st.blanks[k] || { t: 0 };
      if (isNaN(v)) { fb.className = "fb bad"; fb.textContent = "숫자로 써 주세요."; return; }
      if (b.answer.some(function (a) { return Math.abs(toNum(a) - v) < 1e-9; })) {
        st.blanks[k] = { s: "ok", t: cur.t || 0 }; save(); paintBlank(k); paintCards(); return;
      }
      cur.t = (cur.t || 0) + 1; st.blanks[k] = cur; save();
      fb.className = "fb bad";
      fb.innerHTML = "다시 생각해 보세요." + (b.hint ? '<span class="hint">힌트: ' + b.hint + "</span>" : "") +
        (cur.t >= 2 ? '<button type="button" class="giveup">답 보기</button>' : "");
      math(fb);
      var g = $(".giveup", fb); if (g) g.onclick = function () { st.blanks[k] = { s: "shown", t: cur.t }; save(); paintBlank(k); paintCards(); pulseConfuse(b.card); };
      inp.select();
    }
    $(".chk", el).onclick = check;
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); check(); } });
  }
  function paintCards() { L.cards.forEach(function (c, i) { $('.card[data-i="' + i + '"]').classList.toggle("done", !TEACHER && cardDone(i)); }); paintSteps(); }
  Object.keys(BL).forEach(paintBlank); paintCards();

  if (TEACHER) { go(0); return; }

  /* ── 헷갈려요 → 질문 만들기 ── */
  var toastT;
  function toast(html, btn, fn) {
    var t = $("#toast"); t.innerHTML = "<span>" + html + "</span>" + (btn ? "<button>" + btn + "</button>" : "");
    if (btn) $("button", t).onclick = function () { t.classList.remove("show"); fn(); };
    t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove("show"); }, 3200);
  }
  function paintConfuse() {
    $$(".confuse").forEach(function (b) { b.classList.toggle("on", st.confuse.indexOf(+b.dataset.i) >= 0); });
    var cc = $("#cchips");
    if (!st.confuse.length) { cc.innerHTML = '<span class="empty-note">카드에서 「여기가 헷갈려요」를 누르면 여기에 담겨. 없으면 바로 질문틀을 골라도 돼.</span>'; return; }
    cc.innerHTML = st.confuse.map(function (i) { return '<button class="chip' + (st.active === i ? " sel" : "") + '" data-i="' + i + '">' + L.cards[i].confuse.label + "</button>"; }).join("");
    math(cc);
    $$(".chip", cc).forEach(function (b) { b.onclick = function () { st.active = st.active === +b.dataset.i ? null : +b.dataset.i; save(); paintConfuse(); }; });
  }
  $$(".confuse").forEach(function (b) {
    b.onclick = function () {
      var i = +b.dataset.i, at = st.confuse.indexOf(i);
      if (at >= 0) { st.confuse.splice(at, 1); if (st.active === i) st.active = null; }
      else { st.confuse.push(i); st.active = i; toast("질문 재료로 담았어", "질문 만들러 가기", function () { go(idx("q")); }); }
      save(); paintConfuse();
    };
  });
  paintConfuse();

  var draft = $("#draft"), lastTpl = "";
  draft.value = st.draft || "";
  draft.oninput = function () { st.draft = draft.value; save(); };
  $$(".frames button").forEach(function (b) {
    b.onclick = function () {
      var k = b.dataset.k, f = FRAMES.filter(function (x) { return x.k === k; })[0];
      var t = (st.active != null && L.cards[st.active].confuse.frames && L.cards[st.active].confuse.frames[k]) || f.text;
      if (draft.value.trim() && draft.value !== lastTpl && !confirm("지금 쓴 문장을 질문틀 문장으로 바꿀까?")) return;
      draft.value = t; lastTpl = t; st.draft = t; save();
      $$(".frames button").forEach(function (x) { x.classList.toggle("sel", x === b); });
      draft.focus();
      var u = t.indexOf("___"); if (u >= 0 && draft.setSelectionRange) draft.setSelectionRange(u, u + 3);
    };
  });
  function paintMine() {
    $("#mine").innerHTML = st.mine.map(function (q, j) { return '<li><span class="n">Q' + (j + 1) + '</span><span>' + esc(q) + '</span><button class="x" data-j="' + j + '">지우기</button></li>'; }).join("");
    $$("#mine .x").forEach(function (b) { b.onclick = function () { st.mine.splice(+b.dataset.j, 1); save(); paintMine(); paintSteps(); }; });
  }
  $("#addMine").onclick = function () {
    var v = draft.value.trim();
    if (!v) { toast("질문을 먼저 써 줘"); return; }
    if (/___/.test(v)) { toast("___ 자리를 내 말로 채워 줘"); return; }
    if (st.mine.length >= MAXQ) { toast("내 질문은 " + MAXQ + "개까지야. 하나 지우고 담자"); return; }
    st.mine.push(v); draft.value = ""; lastTpl = ""; st.draft = ""; save(); paintMine(); paintSteps();
    $$(".frames button").forEach(function (x) { x.classList.remove("sel"); });
    toast("내 질문 " + st.mine.length + "개 담았어", "조 질문 내기로", function () { go(idx("send")); });
  };
  paintMine();

  /* ── 조 질문 내기 ── */
  var gqs = $("#gqs");
  gqs.innerHTML = Array.apply(null, Array(MAXQ)).map(function (_, j) {
    return '<div class="gq"><label>대표 질문 ' + (j + 1) + (j ? " (선택)" : "") + '</label><textarea data-j="' + j + '" placeholder="' + (j ? "더 있으면 써 줘" : "조에서 고른 질문") + '"></textarea></div>';
  }).join("");
  $$("#gqs textarea").forEach(function (t) { t.value = st.gq[+t.dataset.j] || ""; t.oninput = function () { st.gq[+t.dataset.j] = t.value; save(); }; });
  function paintGroups() { $$("#groups button").forEach(function (b) { b.classList.toggle("sel", +b.dataset.g === st.group); }); }
  function showNow() {
    var box = $("#now"); if (!box) return; if (!st.group) { box.innerHTML = '<div class="now">우리 조 번호를 눌러 줘.</div>'; return; }
    box.innerHTML = '<div class="now">' + st.group + "조 질문 확인 중…</div>";
    Api.group(L.id, st.group).then(function (r) {
      if (!r.ok) throw new Error(r.error);
      box.innerHTML = '<div class="now">' + (r.rows.length
        ? "<b>" + st.group + "조가 이미 낸 질문</b> (다시 내면 이걸로 바뀌어)<ol>" + r.rows.map(function (x) { return "<li>" + esc(x.text) + "</li>"; }).join("") + "</ol>"
        : st.group + "조는 아직 질문을 내지 않았어.") + "</div>";
    }).catch(function () { box.innerHTML = '<div class="now">' + st.group + "조 질문을 불러오지 못했어. 그래도 낼 수 있어.</div>"; });
  }
  $$("#groups button").forEach(function (b) { b.onclick = function () { st.group = +b.dataset.g; save(); paintGroups(); showNow(); }; });
  paintGroups();
  $("#loadMine").onclick = function () {
    if (!st.mine.length) { toast("먼저 '질문 만들기'에서 내 질문을 담아 줘"); return; }
    $$("#gqs textarea").forEach(function (t) { var j = +t.dataset.j; if (!t.value.trim() && st.mine[j]) { t.value = st.mine[j]; st.gq[j] = t.value; } });
    save();
  };
  function copyText(s) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(s);
    var t = document.createElement("textarea"); t.value = s; document.body.appendChild(t); t.select();
    try { document.execCommand("copy"); } catch (e) {} document.body.removeChild(t); return Promise.resolve();
  }
  $("#submit").onclick = function () {
    var qs = $$("#gqs textarea").map(function (t) { return t.value.trim(); }).filter(Boolean);
    var res = $("#result");
    if (!st.group) { toast("우리 조를 먼저 골라 줘"); return; }
    if (!qs.length) { toast("대표 질문을 하나 이상 써 줘"); return; }
    if (qs.some(function (q) { return /___/.test(q); })) { toast("___ 자리를 채워 줘"); return; }
    var btn = this; btn.disabled = true; btn.textContent = "보내는 중…";
    var text = L.id + " " + st.group + "조 질문\n" + qs.map(function (q, j) { return (j + 1) + ". " + q; }).join("\n");
    Api.submit(L.id, st.group, qs).then(function (r) {
      if (!r.ok) throw new Error(r.error || "저장 실패");
      st.submitted = true; save(); paintSteps();
      res.innerHTML = '<div class="done-box"><b>' + st.group + "조 질문이 들어갔어!</b><br>수업 시간에 이 질문으로 시작해.</div>";
      showNow();
    }).catch(function (e) {
      res.innerHTML = '<div class="err-box">보내지 못했어 (' + esc(e.message || e) + '). 아래 단추로 복사해서 선생님께 보내 줘.<div class="btns" style="margin-top:8px"><button class="btn sec" id="cp">질문 복사하기</button></div></div>';
      $("#cp").onclick = function () { copyText(text).then(function () { toast("복사했어"); }); };
    }).then(function () { btn.disabled = false; btn.textContent = "조 질문 내기"; });
  };

  go(st.slide || 0);
})();
