/* 예습 플랫폼 — 차시 예습 화면 엔진
   한 장씩 넘기기: 시작 → 카드들 → 내 질문 내기 → 조별 질문 보기(조 대표 고르기) (교사 보기: 시작 → 카드들 → 예상 질문)
   카드 안은 '한 줄씩 드러내기': 「다음 줄」(또는 카드 누르기, →키, 밀기)마다 한 줄이 열린다.
   - 빈칸이 있는 줄은 빈칸을 확인해야 다음 줄이 열린다(관문).
   - 그림은 줄에 붙은 fig 단계까지 차례로 그려진다(<g data-l="n">).
   - 줄 끝 「?」를 누르면 그 줄이 질문 재료로 담긴다.
   차시 파일(lessons/A○.html)은 window.LESSON 자료만 담는다.
   카드 자료: seq = [{p|f|ex|note: "문장", fig: 단계, q: "헷갈린 곳 이름", frames: {...}}] */
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
  st.blanks = st.blanks || {}; st.rev = st.rev || {};
  st.confuse = (st.confuse || []).filter(function (x) { return typeof x === "string"; });
  if (typeof st.active !== "string") st.active = null;
  var onSlide = null;
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
  /* 줄바꿈: 수식·빈칸이 뒤따르는 조사와 떨어지지 않게 묶는다 */
  function glue(t) {
    return String(t)
      .replace(/(\$[^$]+\$)([가-힣]+[.,!?]?)/g, '<span class="nb">$1$2</span>')
      .replace(/\[\[(\w+)\]\]([가-힣]+[.,!?]?)?/g, function (_, k, j) { return '<span class="nb">[[' + k + ']]' + (j || "") + "</span>"; })
      .replace(/([가-힣]+[.,]?)\s(<span class="nb">\[\[\w+\]\][^<]*<\/span>)/g, '<span class="nb">$1 $2</span>');
  }
  function blanks(t) { return t.replace(/\[\[(\w+)\]\]/g, function (_, k) { return '<span class="bk" data-b="' + k + '"></span>'; }); }

  /* ── 줄(단계) ── */
  function kindOf(it) { return it.f != null ? "f" : it.ex != null ? "ex" : it.note != null ? "note" : "p"; }
  function textOf(it) { return it[kindOf(it)]; }
  function seqOf(i) { return L.cards[i].seq || []; }
  function total(i) { return seqOf(i).length; }
  function rev(i) { return TEACHER ? total(i) : Math.min(total(i), Math.max(1, st.rev[i] || 1)); }
  function blanksIn(it) { return (textOf(it).match(/\[\[(\w+)\]\]/g) || []).map(function (m) { return m.slice(2, -2); }); }
  function resolved(k) { var b = st.blanks[k]; return !!b && (b.s === "ok" || b.s === "shown" || b.s === "seen"); }
  function stepOk(i, k) { var it = seqOf(i)[k]; return !it || blanksIn(it).every(resolved); }
  function cardDone(i) { return rev(i) >= total(i) && seqOf(i).every(function (_, k) { return stepOk(i, k); }); }

  /* ── 장(슬라이드) 목록 ── */
  var SL = [{ id: "intro", chip: "시작", name: "시작하기" }];
  L.cards.forEach(function (c, i) { SL.push({ id: "c" + i, chip: String(i + 1), name: (i + 1) + ". " + c.title, card: i }); });
  if (TEACHER) SL.push({ id: "expect", chip: "예상", name: "예상 학생 질문" });
  else { SL.push({ id: "send", chip: "질문", name: "내 질문 내기" }); SL.push({ id: "board", chip: "조 보기", name: "조별 질문 보기" }); }
  function idx(id) { for (var i = 0; i < SL.length; i++) if (SL[i].id === id) return i; return 0; }

  /* ── 화면 그리기 ── */
  function stepHTML(i, k) {
    var it = seqOf(i)[k], kd = kindOf(it);
    return '<p class="st' + (kd === "note" ? " note" : "") + '" data-s="' + k + '">' + blanks(glue(textOf(it))) +
      (it.q && !TEACHER ? '<button type="button" class="lq" data-k="' + i + "-" + k + '" aria-label="이 줄이 헷갈려요" title="이 줄이 헷갈려요">?</button>' : "") + "</p>";
  }
  var h = [];
  h.push('<header class="top"><a class="back" href="../index.html">← 목록</a>');
  h.push('<div class="ttl"><span class="meta">' + esc(C.COURSE || "") + " · " + esc(L.unit || "") + "</span><h1>" + esc(L.id) + ". " + esc(L.title) +
    (TEACHER ? '<span class="tbadge">교사용 · 정답</span>' : "") + "</h1></div>");
  h.push('<nav class="steps" id="steps">' + SL.map(function (s, i) {
    return '<button data-i="' + i + '" class="' + (s.card != null ? "num" : "word") + '" title="' + esc(s.name.replace(/\$/g, "")) + '">' + s.chip + "</button>";
  }).join("") + "</nav></header>");
  h.push('<main class="stage" id="stage"><div class="track" id="track">');

  SL.forEach(function (s) {
    h.push('<section class="slide' + (s.card != null ? " cslide" : "") + '" data-id="' + s.id + '"><div class="inner">');
    if (s.id === "intro") {
      h.push('<div class="intro"><div class="meta">' + esc(C.COURSE || "") + " · " + esc(L.unit || "") + " · 예습 약 " + (L.minutes || 7) + "분</div>");
      h.push("<h2>" + esc(L.id) + ". " + esc(L.title) + "</h2>");
      if (TEACHER) h.push('<p class="lead">교사용 미리보기입니다. 모든 줄과 빈칸 정답(빨강)이 펼쳐져 있고, 카드마다 지도 메모, 마지막 장에 예상 학생 질문이 있습니다.</p>');
      else {
        h.push('<ol class="howto"><li><b>한 줄씩 읽기</b><span>「다음 줄」을 누를 때마다<br>한 줄씩 나와. 천천히 읽어 봐.</span></li>');
        h.push("<li><b>빈칸 확인하기</b><span>「답 보기」는 눌러서 확인,<br>숫자 칸은 직접 써 봐.</span></li>");
        h.push("<li><b>헷갈린 줄에 ?</b><span>줄 끝의 ?를 누르면 질문 재료가 돼.<br>내 질문을 내고, 조에서 하나를 골라.</span></li></ol>");
      }
      h.push('<button class="btn pri big" data-go="1">시작하기 →</button>');
      if (!TEACHER) h.push('<div><button type="button" class="reset all" id="resetAll">↺ 이 차시 처음부터 다시</button></div>');
      h.push('<p class="tip">「다음 줄」 단추, 카드 빈 곳 누르기, 키보드 →, 손가락으로 밀기 모두 돼.</p></div>');
    } else if (s.card != null) {
      var c = L.cards[s.card], i = s.card, seq = seqOf(i);
      h.push('<section class="card' + (c.figure ? " has-fig" : "") + '" data-i="' + i + '"><div class="card-head"><span class="pill' + (c.today ? " today" : "") + '">' + esc(c.tag) + "</span>");
      h.push("<h2>" + (i + 1) + ". " + c.title + '</h2><span class="check">✓ 완료</span>' +
        (TEACHER ? "" : '<button type="button" class="reset" data-reset="' + i + '" title="이 카드를 첫 줄부터 다시">↺ 다시</button>') + '</div><div class="cbody"><div class="ctext">');
      var j = 0;
      while (j < seq.length) {
        var kd = kindOf(seq[j]);
        if (kd === "f" || kd === "ex") {
          var grp = [];
          while (j < seq.length && kindOf(seq[j]) === kd) { grp.push(stepHTML(i, j)); j++; }
          h.push('<div class="grp ' + (kd === "f" ? "formula" : "exbox") + '">' + (kd === "ex" ? '<span class="exlab">예시</span>' : "") + grp.join("") + "</div>");
        } else { h.push(stepHTML(i, j)); j++; }
      }
      if (!TEACHER) h.push('<button type="button" class="more" data-i="' + i + '">눌러서 다음 줄 ▸</button>');
      h.push("</div>");
      if (c.figure) h.push('<div class="fig">' + c.figure + (c.caption ? '<div class="cap">' + c.caption + "</div>" : "") + "</div>");
      if (TEACHER && c.teacherNote) h.push('<div class="tnote side">지도 메모 · ' + c.teacherNote + "</div>");
      h.push("</div></section>");
    } else if (s.id === "expect") {
      h.push('<section class="expect"><h2>예상 학생 질문</h2><ol>');
      (L.teacher && L.teacher.expected || []).forEach(function (e) {
        var f = FRAMES.filter(function (x) { return x.k === e.frame; })[0];
        h.push('<li><span class="ft">' + (f ? f.text.replace(/___/g, "○") : "") + "</span>" + e.q + (e.link ? '<span class="lk">→ ' + e.link + "</span>" : "") + "</li>");
      });
      h.push('</ol><p class="lead" style="margin:10px 0 0">학생들이 낸 질문(조 대표 포함)은 <a href="../teacher.html">교사 화면</a>에서 모아 봅니다.</p></section>');
    } else if (s.id === "send") {
      h.push('<section class="send" id="send"><h2>내 질문 내기</h2><p class="lead">우리 조를 고르고, 헷갈린 곳을 <b>내 질문 하나</b>로 써서 내자.</p><div class="two">');
      h.push('<div><div class="step navy">1. 우리 조</div><div class="groups" id="groups">');
      for (var g = 1; g <= (C.GROUPS || 9); g++) h.push('<button data-g="' + g + '">' + g + "조</button>");
      h.push('</div><div class="step">2. 헷갈린 곳 고르기 <span class="sub">(카드 줄 끝 「?」)</span></div><div class="chips" id="cchips"></div>');
      h.push('<div class="step">3. 질문틀 고르기</div><div class="frames sm">');
      FRAMES.forEach(function (f) { h.push('<button data-k="' + f.k + '">' + f.label + "</button>"); });
      h.push('</div></div><div><div class="step">4. 내 말로 고쳐 쓰기</div><textarea id="draft" placeholder="여기에 내 질문을 써 보자"></textarea>');
      h.push('<button class="btn pri wide" id="submit">내 질문 내기</button><div id="result"></div>');
      if (L.example) h.push('<details class="ex"><summary>좋은 질문 예시 보기</summary>' + L.example + "</details>");
      h.push((window.Api && Api.demo ? '<div class="demo">체험 모드: 아직 선생님 시트와 연결되지 않아 이 기기에만 저장돼.</div>' : "") + "</div></div></section>");
    } else if (s.id === "board") {
      h.push('<section class="board" id="boardSec"><div class="bhead"><div><h2>조별 질문 보기</h2><p class="lead" id="bguide"></p></div>');
      h.push('<button class="btn sec" id="bref">새로고침</button></div><div class="bgrid" id="bgrid"></div>');
      h.push("</section>");
    }
    h.push("</div></section>");
  });
  h.push("</div></main>");
  h.push('<footer class="navbar"><button class="nbtn" id="prev">← 이전</button><div class="where" id="where"></div><button class="nbtn pri" id="next">다음 →</button></footer>');

  var app = $("#app");
  app.innerHTML = h.join("");
  document.body.classList.add("slides");
  document.body.insertAdjacentHTML("beforeend", '<div class="toast" id="toast"></div>');
  math(app);

  var toastT;
  function toast(html, btn, fn) {
    var t = $("#toast"); t.innerHTML = "<span>" + html + "</span>" + (btn ? "<button>" + btn + "</button>" : "");
    if (btn) $("button", t).onclick = function () { t.classList.remove("show"); fn(); };
    t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove("show"); }, 3200);
  }

  /* ── 카드 안 줄 드러내기 ── */
  function paintCard(i, fresh) {
    var card = $('.card[data-i="' + i + '"]'), r = rev(i), n = total(i), lvl = 0;
    $$(".st", card).forEach(function (el) {
      var k = +el.dataset.s, shown = k < r;
      el.classList.toggle("hide", !shown);
      el.classList.toggle("cur", !TEACHER && k === r - 1 && !(r === n && stepOk(i, k)));
      el.classList.toggle("past", !TEACHER && k < r - 1);
      if (fresh && k === r - 1) { el.classList.remove("enter"); void el.offsetWidth; el.classList.add("enter"); }
      if (shown) lvl = Math.max(lvl, seqOf(i)[k].fig || 0);
    });
    if (TEACHER) lvl = 99;
    $$(".grp", card).forEach(function (g) { g.classList.toggle("hide", !$$(".st", g).some(function (e) { return !e.classList.contains("hide"); })); });
    $$(".fig g[data-l]", card).forEach(function (g) { g.classList.toggle("off", +g.getAttribute("data-l") > lvl); });
    var more = $(".more", card); if (more) more.classList.toggle("hide", r >= n);
    card.classList.toggle("done", !TEACHER && cardDone(i));
  }
  function scrollToCur(i) {
    var card = $('.card[data-i="' + i + '"]'), el = $(".st.cur", card) || $$(".st:not(.hide)", card).pop();
    var sl = card.closest(".slide"); if (!el || !sl) return;
    var a = el.getBoundingClientRect(), b = sl.getBoundingClientRect();
    if (a.bottom > b.bottom - 12) sl.scrollTop += a.bottom - b.bottom + 24;
  }
  function nudge(i) {
    var r = rev(i), it = seqOf(i)[r - 1], k = it && blanksIn(it).filter(function (x) { return !resolved(x); })[0];
    var el = k && $('.bk[data-b="' + k + '"]');
    if (el) { el.classList.remove("wiggle"); void el.offsetWidth; el.classList.add("wiggle"); var inp = $("input", el); if (inp) inp.focus(); }
    toast(BL[k] && BL[k].type === "num" ? "숫자를 먼저 써서 확인해 봐" : "「답 보기」를 먼저 눌러 봐");
  }
  function advance() {
    var s = SL[cur];
    if (s.card == null || TEACHER) { go(cur + 1); return; }
    var i = s.card, r = rev(i);
    if (!stepOk(i, r - 1)) { nudge(i); return; }
    if (r < total(i)) { st.rev[i] = r + 1; save(); paintCard(i, true); paintNav(); paintSteps(); scrollToCur(i); return; }
    go(cur + 1);
  }
  function retreat() {
    var s = SL[cur];
    if (s.card == null || TEACHER || rev(s.card) <= 1) { go(cur - 1); return; }
    var i = s.card; st.rev[i] = rev(i) - 1; save(); paintCard(i); paintNav(); paintSteps(); scrollToCur(i);
  }

  /* ── 넘기기 ── */
  var track = $("#track"), slides = $$(".slide"), cur = 0, stage = $("#stage");
  function paintSteps() {
    $$("#steps button").forEach(function (b, i) {
      var s = SL[i], done = false;
      if (s.card != null) done = TEACHER || cardDone(s.card);
      else if (s.id === "send") done = !!st.submitted;
      else if (s.id === "board") done = !!st.picked;
      b.classList.toggle("done", done); b.classList.toggle("cur", i === cur);
    });
  }
  function paintNav() {
    var s = SL[cur], nx = $("#next"), pv = $("#prev");
    var lineBack = s.card != null && !TEACHER && rev(s.card) > 1;
    pv.style.visibility = cur > 0 ? "visible" : "hidden";
    pv.classList.toggle("line", lineBack);
    pv.innerHTML = lineBack ? "◂ 이전 줄" : "← 이전";
    var w = (cur + 1) + " / " + SL.length;
    if (s.card != null && !TEACHER && rev(s.card) < total(s.card)) {
      nx.style.visibility = "visible"; nx.classList.add("line");
      nx.classList.toggle("wait", !stepOk(s.card, rev(s.card) - 1));
      nx.innerHTML = '<span class="nlab">다음 줄</span> ▸';
      w += " · 줄 " + rev(s.card) + "/" + total(s.card);
    } else if (cur < SL.length - 1) {
      nx.style.visibility = "visible"; nx.classList.remove("line");
      nx.classList.toggle("wait", s.card != null && !TEACHER && !stepOk(s.card, rev(s.card) - 1));
      nx.innerHTML = '<span class="nlab">' + SL[cur + 1].name + "</span> →"; math(nx);
    } else nx.style.visibility = "hidden";
    $("#where").textContent = w;
  }
  function go(i) {
    i = Math.max(0, Math.min(SL.length - 1, i));
    cur = i; st.slide = i; save();
    stage.scrollLeft = 0;
    track.style.transform = "translateX(" + (-100 * i) + "%)";
    slides.forEach(function (sl, j) { sl.inert = j !== i; sl.setAttribute("aria-hidden", j !== i ? "true" : "false"); });
    paintNav(); paintSteps();
    if (SL[i].card != null) setTimeout(function () { scrollToCur(SL[i].card); }, 380);
    if (onSlide) onSlide(SL[i].id);
  }
  // 입력칸에 초점이 갈 때 브라우저가 무대를 옆으로 밀지 않게
  stage.addEventListener("scroll", function () { if (stage.scrollLeft) stage.scrollLeft = 0; });
  slides.forEach(function (sl) { sl.addEventListener("scroll", function () { if (sl.scrollLeft) sl.scrollLeft = 0; }); });
  $("#prev").onclick = retreat;
  $("#next").onclick = advance;
  $$("#steps button").forEach(function (b) { b.onclick = function () { go(+b.dataset.i); }; });
  $$("[data-go]").forEach(function (b) { b.onclick = function () { go(+b.dataset.go); }; });
  $$(".more").forEach(function (b) { b.onclick = advance; });
  // 카드 빈 곳을 눌러도 다음 줄
  $$(".card").forEach(function (card) {
    card.addEventListener("click", function (e) {
      if (TEACHER || e.target.closest("button,input,a,textarea,details,.bk,.lq")) return;
      if (SL[cur].card === +card.dataset.i) advance();
    });
  });
  document.addEventListener("keydown", function (e) {
    var t = e.target.tagName; if (t === "INPUT" || t === "TEXTAREA" || t === "SELECT") return;
    if (e.key === "ArrowRight" || e.key === "PageDown" || (e.key === " " && SL[cur].card != null)) { e.preventDefault(); advance(); }
    else if (e.key === "ArrowLeft" || e.key === "PageUp" || e.key === "Backspace") { e.preventDefault(); retreat(); }
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
    if (Math.abs(dx) > 70 && Math.abs(dx) > 1.6 * Math.abs(dy)) { if (dx < 0) advance(); else retreat(); }
  }, { passive: true });

  /* ── 빈칸 ──
     reveal: 수식·용어 → 누르면 답이 보이고, 다시 누르면 숨는다
     num   : 숫자 → 바로 써서 확인 (정답! / 다시 생각해 보세요.) */
  var BL = {};
  L.cards.forEach(function (c, i) {
    Object.keys(c.blanks || {}).forEach(function (k) { BL[k] = c.blanks[k]; BL[k].card = i; });
    seqOf(i).forEach(function (it, s) { blanksIn(it).forEach(function (k) { if (BL[k]) BL[k].step = s; }); });
  });
  function toNum(v) {
    v = String(v).replace(/\s+/g, "").replace(/[−–—]/g, "-");
    var m = v.match(/^(-?)(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
    if (m) return (m[1] ? -1 : 1) * parseFloat(m[2]) / parseFloat(m[3]);
    return /^-?\d+(\.\d+)?$|^-?\.\d+$/.test(v) ? parseFloat(v) : NaN;
  }
  function pulseQ(i, s) {
    var b = $('.lq[data-k="' + i + "-" + s + '"]') || $$('.card[data-i="' + i + '"] .lq:not(.on)').pop();
    if (b && !b.classList.contains("on")) { b.classList.remove("pulse"); void b.offsetWidth; b.classList.add("pulse"); }
  }
  function afterBlank(k) { var i = BL[k].card; paintCard(i); paintSteps(); if (SL[cur].card === i) paintNav(); }
  function paintBlank(k) {
    var el = $('.bk[data-b="' + k + '"]'), b = BL[k], s = st.blanks[k] || {};
    if (!el || !b) return;
    if (b.type === "reveal") {
      var open = TEACHER || s.open;
      el.className = "bk rv" + (open ? " open" : "") + (TEACHER ? " teacher" : "");
      el.innerHTML = '<button type="button" class="rvb" aria-pressed="' + (open ? "true" : "false") + '">' +
        (open ? '<span class="ans">' + b.show + "</span>" : '<span class="peek">답 보기</span>') + "</button>";
      math(el);
      if (!TEACHER) $(".rvb", el).onclick = function () {
        var c2 = st.blanks[k] || {}; c2.open = !c2.open; c2.s = "seen"; st.blanks[k] = c2; save(); paintBlank(k); afterBlank(k);
      };
      return;
    }
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
      var v = toNum(inp.value), c2 = st.blanks[k] || { t: 0 };
      if (isNaN(v)) { fb.className = "fb bad"; fb.textContent = "숫자로 써 주세요."; return; }
      if (b.answer.some(function (a) { return Math.abs(toNum(a) - v) < 1e-9; })) {
        st.blanks[k] = { s: "ok", t: c2.t || 0 }; save(); paintBlank(k); afterBlank(k); return;
      }
      c2.t = (c2.t || 0) + 1; st.blanks[k] = c2; save();
      fb.className = "fb bad";
      fb.innerHTML = "다시 생각해 보세요." + (b.hint ? '<span class="hint">힌트: ' + b.hint + "</span>" : "") +
        (c2.t >= 2 ? '<button type="button" class="giveup">답 보기</button>' : "");
      math(fb);
      var g = $(".giveup", fb); if (g) g.onclick = function () { st.blanks[k] = { s: "shown", t: c2.t }; save(); paintBlank(k); afterBlank(k); pulseQ(b.card, b.step); };
      inp.select();
    }
    $(".chk", el).onclick = check;
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); check(); } });
  }
  Object.keys(BL).forEach(paintBlank);
  L.cards.forEach(function (_, i) { paintCard(i); });

  /* ── 초기화: 카드별 「↺ 다시」, 시작 장의 「이 차시 처음부터 다시」 (두 번 눌러야 됨) ──
     이 기기의 읽기·빈칸·? 기록만 지운다. 이미 낸 질문은 지우지 않는다. */
  function armed(b, msg, fn) {
    if (b.classList.contains("arm")) { clearTimeout(b._t); b.classList.remove("arm"); b.textContent = b._txt; fn(); return; }
    b._txt = b.textContent; b.classList.add("arm"); b.textContent = msg;
    b._t = setTimeout(function () { b.classList.remove("arm"); b.textContent = b._txt; }, 3000);
  }
  function resetCard(i) {
    Object.keys(BL).forEach(function (k) { if (BL[k].card === i) { delete st.blanks[k]; paintBlank(k); } });
    st.rev[i] = 1;
    st.confuse = st.confuse.filter(function (k) { return +k.split("-")[0] !== i; });
    if (st.active && +st.active.split("-")[0] === i) st.active = null;
    save(); paintCard(i); if (window.__paintConfuse) window.__paintConfuse();
  }
  $$("[data-reset]").forEach(function (b) {
    b.onclick = function (e) {
      e.stopPropagation(); var i = +b.dataset.reset;
      armed(b, "한 번 더 누르면 지워져", function () { resetCard(i); paintNav(); paintSteps(); toast((i + 1) + "번 카드를 처음부터 다시 해."); });
    };
  });
  var ra = $("#resetAll");
  if (ra) ra.onclick = function () {
    armed(ra, "한 번 더 누르면 이 차시 기록이 모두 지워져", function () {
      try { localStorage.removeItem(SKEY); } catch (e) {}
      location.reload();
    });
  };

  if (TEACHER) { go(0); return; }

  /* ── 줄 끝 ? → 질문 재료 ── */
  function itemOf(key) { var a = key.split("-"); return { i: +a[0], k: +a[1], it: seqOf(+a[0])[+a[1]] }; }
  function framesOf(key) {
    var o = itemOf(key), cf = (L.cards[o.i].confuse && L.cards[o.i].confuse.frames) || {}, sf = (o.it && o.it.frames) || {}, r = {};
    FRAMES.forEach(function (f) { r[f.k] = sf[f.k] || cf[f.k]; });
    return r;
  }
  function paintConfuse() {
    $$(".lq").forEach(function (b) { b.classList.toggle("on", st.confuse.indexOf(b.dataset.k) >= 0); });
    var cc = $("#cchips");
    if (!st.confuse.length) { cc.innerHTML = '<span class="empty-note">카드에서 헷갈린 줄 끝의 「?」를 누르면 여기에 담겨. 없으면 바로 질문틀을 골라도 돼.</span>'; return; }
    cc.innerHTML = st.confuse.map(function (key) {
      var o = itemOf(key); if (!o.it) return "";
      return '<button class="chip' + (st.active === key ? " sel" : "") + '" data-k="' + key + '"><span class="cn">' + (o.i + 1) + "</span>" + o.it.q + "</button>";
    }).join("");
    math(cc);
    $$(".chip", cc).forEach(function (b) { b.onclick = function () { st.active = st.active === b.dataset.k ? null : b.dataset.k; save(); paintConfuse(); }; });
  }
  $$(".lq").forEach(function (b) {
    b.onclick = function (e) {
      e.stopPropagation();
      var key = b.dataset.k, at = st.confuse.indexOf(key);
      if (at >= 0) { st.confuse.splice(at, 1); if (st.active === key) st.active = null; toast("질문 재료에서 뺐어"); }
      else { st.confuse.push(key); st.active = key; toast("이 줄을 질문 재료로 담았어", "질문 내러 가기", function () { go(idx("send")); }); }
      b.classList.remove("pulse");
      save(); paintConfuse();
    };
  });
  paintConfuse();
  window.__paintConfuse = paintConfuse;

  /* ── 내 질문 내기: 조 고르기 → 질문틀 → 고쳐 쓰기 → 내기 (한 사람에 하나, 다시 내면 바뀜) ── */
  var DKEY = "yeseup_device";
  function device() {
    var d = null; try { d = localStorage.getItem(DKEY); } catch (e) {}
    if (!d) { d = "d" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36); try { localStorage.setItem(DKEY, d); } catch (e) {} }
    return d;
  }
  var draft = $("#draft"), lastTpl = "";
  draft.value = st.draft || "";
  draft.oninput = function () { st.draft = draft.value; save(); };
  $$(".frames button").forEach(function (b) {
    b.onclick = function () {
      var k = b.dataset.k, f = FRAMES.filter(function (x) { return x.k === k; })[0];
      var t = (st.active && framesOf(st.active)[k]) || f.text;
      draft.value = t; lastTpl = t; st.draft = t; save();
      $$(".frames button").forEach(function (x) { x.classList.toggle("sel", x === b); });
      draft.focus();
      var u = t.indexOf("___"); if (u >= 0 && draft.setSelectionRange) draft.setSelectionRange(u, u + 3);
    };
  });
  function paintGroups() { $$("#groups button").forEach(function (b) { b.classList.toggle("sel", +b.dataset.g === st.group); }); }
  $$("#groups button").forEach(function (b) { b.onclick = function () { st.group = +b.dataset.g; save(); paintGroups(); }; });
  paintGroups();
  function paintSent() {
    var res = $("#result");
    if (st.submitted && st.mytext) res.innerHTML = '<div class="done-box"><b>' + st.group + "조로 질문을 냈어!</b><br>" + esc(st.mytext) +
      '<div style="margin-top:6px;font-size:.85rem;color:var(--sub)">고쳐서 다시 내면 이 질문이 바뀌어.</div><button class="btn sec" id="toBoard" style="margin-top:8px;width:100%">조별 질문 보러 가기 →</button></div>';
    else res.innerHTML = "";
    var tb = $("#toBoard"); if (tb) tb.onclick = function () { go(idx("board")); };
  }
  paintSent();
  function copyText(s) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(s);
    var t = document.createElement("textarea"); t.value = s; document.body.appendChild(t); t.select();
    try { document.execCommand("copy"); } catch (e) {} document.body.removeChild(t); return Promise.resolve();
  }
  $("#submit").onclick = function () {
    var q = draft.value.trim(), res = $("#result");
    if (!st.group) { toast("우리 조를 먼저 골라 줘"); return; }
    if (!q) { toast("질문을 먼저 써 줘"); return; }
    if (/___/.test(q)) { toast("___ 자리를 내 말로 채워 줘"); return; }
    var btn = this; btn.disabled = true; btn.textContent = "보내는 중…";
    Api.submitOne(L.id, st.group, device(), q).then(function (r) {
      if (!r.ok) throw new Error(r.error || "저장 실패");
      st.submitted = true; st.mytext = q; st.myid = r.id; st.draft = ""; draft.value = ""; save(); paintSteps(); paintSent();
      $$(".frames button").forEach(function (x) { x.classList.remove("sel"); });
      toast("질문을 냈어!", "조별 질문 보기", function () { go(idx("board")); });
    }).catch(function (e) {
      res.innerHTML = '<div class="err-box">보내지 못했어 (' + esc(e.message || e) + '). 아래 단추로 복사해서 선생님께 보내 줘.<div class="btns" style="margin-top:8px"><button class="btn sec" id="cp">질문 복사하기</button></div></div>';
      $("#cp").onclick = function () { copyText(L.id + " " + st.group + "조 질문: " + q).then(function () { toast("복사했어"); }); };
    }).then(function () { btn.disabled = false; btn.textContent = "내 질문 내기"; });
  };

  /* ── 조별 질문 보기: 교사 화면처럼 조별로 모아 보고, 우리 조 대표 질문 하나 고르기 ── */
  var brows = [], btimer = null, bbusy = false;
  function bguide() {
    $("#bguide").innerHTML = st.group
      ? "<b>" + st.group + "조</b> 질문을 함께 읽고, 대표 질문 하나에 「이걸로 고르기」를 눌러. 한 사람만 누르면 돼."
      : "「내 질문 내기」에서 우리 조를 먼저 골라 줘.";
  }
  function paintBoard() {
    var G = C.GROUPS || 9, h = "";
    for (var g = 1; g <= G; g++) {
      var gr = brows.filter(function (r) { return r.group === g; }), my = g === st.group;
      var picked = gr.filter(function (r) { return r.pick; })[0];
      h += '<section class="bcard' + (my ? " my" : "") + (gr.length ? "" : " none") + '" data-g="' + g + '"><h3><span class="gn">' + g + "조</span>" +
        (my ? '<span class="us">우리 조</span>' : "") + '<span class="cnt">' + (gr.length ? gr.length + "명" : "") + "</span>" +
        (picked ? '<span class="pk">★ 대표 골랐어</span>' : "") + "</h3>";
      h += gr.length ? gr.map(function (r) {
        return '<div class="bq' + (r.pick ? " pick" : "") + (r.mine ? " mine" : "") + '"><div class="bt">' + esc(r.text) + "</div>" +
          (r.mine ? '<span class="me">내 질문</span>' : "") + (r.pick ? '<span class="pkb">★ 조 대표</span>' : "") +
          (my ? '<button class="pickb" data-id="' + esc(r.id) + '">' + (r.pick ? "고르기 취소" : "이걸로 고르기") + "</button>" : "") + "</div>";
      }).join("") : '<div class="nothing">아직 없어.</div>';
      h += "</section>";
    }
    $("#bgrid").innerHTML = h;
    $$("#bgrid .pickb").forEach(function (b) {
      b.onclick = function () {
        var id = b.dataset.id, r = brows.filter(function (x) { return x.id === id; })[0], nid = r && r.pick ? "" : id;
        brows.forEach(function (x) { if (x.group === st.group) x.pick = x.id === nid; }); paintBoard();
        Api.pick(L.id, st.group, nid).then(function (res) { if (!res.ok) throw new Error(res.error); st.picked = !!nid; save(); paintSteps(); toast(nid ? "우리 조 대표 질문으로 골랐어" : "고르기를 취소했어"); })
          .catch(function (e) { toast("저장하지 못했어: " + (e.message || e)); loadBoard(); });
      };
    });
  }
  function loadBoard(quiet) {
    if (bbusy) return; bbusy = true; bguide();
    if (!quiet) $("#bgrid").classList.add("loading");
    Api.board(L.id, device()).then(function (r) {
      if (!r.ok) throw new Error(r.error);
      brows = r.rows.map(function (x) { if (st.myid && x.id === st.myid) x.mine = true; return x; });
      paintBoard();
    }).catch(function (e) { if (!quiet) $("#bgrid").innerHTML = '<div class="err-box">질문을 불러오지 못했어. 「새로고침」을 눌러 봐.</div>'; })
      .then(function () { bbusy = false; $("#bgrid").classList.remove("loading"); });
  }
  $("#bref").onclick = function () { loadBoard(); };
  onSlide = function (id) {
    clearInterval(btimer);
    if (id === "board") { loadBoard(); btimer = setInterval(function () { if (!document.hidden) loadBoard(true); }, 12000); }
  };
  go(st.slide || 0);
})();
