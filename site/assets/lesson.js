/* 예습 플랫폼 — 차시 예습 화면 엔진
   각 차시 파일(lessons/A○.html)은 window.LESSON 자료만 담고, 화면은 이 파일이 그린다. */
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
  function save() { try { localStorage.setItem(SKEY, JSON.stringify(st)); } catch (e) {} }

  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function math(el) {
    if (window.renderMathInElement) {
      try { window.renderMathInElement(el, { delimiters: [{ left: "$", right: "$", display: false }], throwOnError: false }); return; } catch (e) {}
    }
    // KaTeX를 못 불러왔을 때: $ 기호만 지워서라도 읽히게
    $$("*", el).concat([el]).forEach(function (n) {
      Array.prototype.forEach.call(n.childNodes, function (t) { if (t.nodeType === 3) t.nodeValue = t.nodeValue.replace(/\$/g, ""); });
    });
  }
  function norm(s) {
    return String(s).toLowerCase().replace(/\s+/g, "").replace(/²/g, "^2").replace(/³/g, "^3")
      .replace(/\*\*/g, "^").replace(/\*/g, "").replace(/[{}$]/g, "").replace(/−/g, "-");
  }
  function blankList() { var a = []; L.cards.forEach(function (c, i) { Object.keys(c.blanks || {}).forEach(function (k) { a.push([k, i]); }); }); return a; }
  function cardDone(i) { return Object.keys(L.cards[i].blanks || {}).every(function (k) { var b = st.blanks[k]; return b && (b.s === "ok" || b.s === "shown"); }); }

  /* ── 화면 그리기 ── */
  var app = $("#app");
  var h = [];
  h.push('<header class="top"><div class="row"><a class="back" href="../index.html">← 예습 목록</a><span class="meta">' + esc(C.COURSE || "") + " · " + esc(L.unit || "") + "</span></div>");
  h.push("<h1>" + esc(L.id) + ". " + esc(L.title) + (TEACHER ? '<span class="tbadge">교사용 · 정답</span>' : "") + "</h1>");
  h.push('<div class="sub">예습 약 ' + (L.minutes || 7) + "분 · 읽기 → 빈칸 → 질문</div>");
  h.push('</header><div class="pbar" id="pbar"><div class="prog"><div class="track"><div class="bar"></div></div><span class="pnum"></span></div></div>');
  if (!TEACHER) h.push('<div class="guide"><b>①</b> 카드를 읽고 빈칸을 눌러 채우자. <b>②</b> 헷갈리면 「여기가 헷갈려요」를 눌러. <b>③</b> 맨 아래에서 질문을 만들어 조 질문으로 내자.</div>');

  L.cards.forEach(function (c, i) {
    h.push('<section class="card" data-i="' + i + '"><div class="card-head"><span class="pill' + (c.today ? " today" : "") + '">' + esc(c.tag) + "</span>");
    h.push("<h2>" + (i + 1) + ". " + c.title + '</h2><span class="check">✓ 완료</span></div>');
    c.lines.forEach(function (ln) {
      h.push("<p>" + ln.replace(/\[\[(\w+)\]\]/g, function (_, k) { return '<button class="blank" data-b="' + k + '"></button>'; }) + "</p>");
    });
    if (c.figure) h.push('<div class="fig">' + c.figure + (c.caption ? '<div class="cap">' + c.caption + "</div>" : "") + "</div>");
    if (TEACHER) { if (c.teacherNote) h.push('<div class="tnote">지도 메모 · ' + c.teacherNote + "</div>"); }
    else if (c.confuse) h.push('<button class="confuse" data-i="' + i + '"><span class="qi">?</span>여기가 헷갈려요</button>');
    h.push("</section>");
  });

  if (TEACHER) {
    h.push('<section class="expect"><h2>예상 학생 질문</h2><ol>');
    (L.teacher && L.teacher.expected || []).forEach(function (e) {
      var f = FRAMES.filter(function (x) { return x.k === e.frame; })[0];
      h.push('<li><span class="ft">' + (f ? f.text.replace(/___/g, "○") : "") + "</span>" + e.q + (e.link ? '<span class="lk">→ ' + e.link + "</span>" : "") + "</li>");
    });
    h.push('</ol><p style="font-size:14px;margin:6px 0 0">학생들이 낸 조 질문은 <a href="../teacher.html">교사 화면</a>에서 모아 본다.</p></section>');
  } else {
    h.push('<section class="qbox" id="qbox"><h2>질문 만들기</h2><p class="lead">헷갈린 곳을 질문으로 바꿔 보자. 질문틀을 고르면 문장이 시작돼.</p>');
    h.push('<div class="step">1. 헷갈린 곳 고르기</div><div class="chips" id="cchips"></div>');
    h.push('<div class="step">2. 질문틀 고르기</div><div class="frames">');
    FRAMES.forEach(function (f) { h.push('<button data-k="' + f.k + '">' + f.label + "</button>"); });
    h.push('</div><div class="step">3. 내 말로 고쳐 쓰기</div><textarea id="draft" placeholder="여기에 질문을 써 보자"></textarea>');
    h.push('<div class="btns" style="display:flex;margin-top:8px"><button class="btn gold" id="addMine">내 질문에 담기</button></div>');
    h.push('<ol class="mine" id="mine"></ol>');
    if (L.example) h.push('<details class="ex"><summary>좋은 질문 예시 보기</summary>' + L.example + "</details>");
    h.push("</section>");

    h.push('<section class="send" id="send"><h2>조 질문 내기</h2><p class="lead">조에서 내 질문을 서로 보여 주고, 대표 질문을 1~' + MAXQ + "개 골라 <b>한 사람만</b> 내자.</p>");
    h.push('<div class="step" style="color:var(--navy)">우리 조</div><div class="groups" id="groups">');
    for (var g = 1; g <= (C.GROUPS || 9); g++) h.push('<button data-g="' + g + '">' + g + "조</button>");
    h.push('</div><div id="now"></div><div id="gqs"></div>');
    h.push('<div class="btns"><button class="btn sec" id="loadMine">내 질문 불러오기</button><button class="btn pri" id="submit">조 질문 내기</button></div>');
    h.push('<div id="result"></div>' + (window.Api && Api.demo ? '<div class="demo">체험 모드: 아직 선생님 시트와 연결되지 않아 이 기기에만 저장돼.</div>' : "") + "</section>");
  }
  app.innerHTML = h.join("");
  var pb = document.getElementById("pbar");
  window.addEventListener("scroll", function () { pb.classList.toggle("stuck", pb.getBoundingClientRect().top <= 0); }, { passive: true });
  document.body.insertAdjacentHTML("beforeend",
    '<div class="sheet-bg" id="sbg"></div><div class="sheet" id="sheet"></div><div class="toast" id="toast"></div>');
  math(app);

  /* ── 빈칸 ── */
  var BL = {}; L.cards.forEach(function (c, i) { Object.keys(c.blanks || {}).forEach(function (k) { BL[k] = c.blanks[k]; BL[k].card = i; }); });
  function paintBlank(k) {
    var el = $('.blank[data-b="' + k + '"]'), b = BL[k], s = st.blanks[k] || {};
    el.className = "blank"; el.innerHTML = "";
    if (TEACHER) { el.classList.add("teacher"); el.innerHTML = b.show; }
    else if (s.s === "ok") { el.classList.add("ok"); el.innerHTML = b.show; }
    else if (s.s === "shown") { el.classList.add("shown"); el.innerHTML = b.show; }
    else el.classList.add("empty");
    math(el);
  }
  function paintProgress() {
    var n = L.cards.length, d = 0;
    L.cards.forEach(function (c, i) { var ok = TEACHER || cardDone(i); if (ok) d++; $('.card[data-i="' + i + '"]').classList.toggle("done", ok && !TEACHER); });
    $(".bar").style.width = (100 * d / n) + "%";
    $(".pnum").textContent = d + " / " + n + " 카드";
  }
  Object.keys(BL).forEach(paintBlank); paintProgress();

  var sheet = $("#sheet"), sbg = $("#sbg"), curK = null, choice = null;
  function closeSheet() { sheet.classList.remove("open"); sbg.style.display = "none"; curK = null; }
  sbg.onclick = closeSheet;
  function openSheet(k) {
    curK = k; choice = null;
    var b = BL[k], s = st.blanks[k] || { t: 0 };
    var p = $('.blank[data-b="' + k + '"]').parentNode.cloneNode(true);
    $$(".blank", p).forEach(function (x) {
      var sp = document.createElement("span");
      if (x.getAttribute("data-b") === k) { sp.className = "hole"; sp.textContent = "?"; }
      else { sp.innerHTML = x.innerHTML || "□"; }
      x.parentNode.replaceChild(sp, x);
    });
    var hh = '<div class="ctx">' + p.innerHTML + "</div>";
    if (b.type === "choice") {
      hh += '<div class="opts">' + b.options.map(function (o, j) { return '<button data-j="' + j + '">' + o + "</button>"; }).join("") + "</div>";
    } else {
      hh += '<input id="inp" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="답을 써 봐 (예: ' + esc(b.placeholder || "3x²") + ')">';
      hh += '<div class="keys">' + [["x", "x"], ["²", "□²"], ["³", "□³"], ["+", "+"], ["-", "−"]].map(function (t) { return '<button data-t="' + t[0] + '">' + t[1] + "</button>"; }).join("") + "</div>";
    }
    hh += '<div class="msg" id="msg">' + (s.t ? '<span class="bad">힌트: ' + b.hint + "</span>" : "") + "</div>";
    hh += '<div class="btns"><button class="btn sec" id="dunno">모르겠어요</button><button class="btn pri" id="ok">확인</button></div>';
    sheet.innerHTML = hh; math(sheet);
    sbg.style.display = "block"; requestAnimationFrame(function () { sheet.classList.add("open"); });
    $$(".opts button", sheet).forEach(function (bt) { bt.onclick = function () { $$(".opts button", sheet).forEach(function (x) { x.classList.remove("sel"); }); bt.classList.add("sel"); choice = +bt.dataset.j; }; });
    $$(".keys button", sheet).forEach(function (bt) { bt.onclick = function () { var i = $("#inp"); i.value += bt.dataset.t; i.focus(); }; });
    var inp = $("#inp"); if (inp) { inp.addEventListener("keydown", function (e) { if (e.key === "Enter") check(); }); }
    $("#ok").onclick = check;
    $("#dunno").onclick = function () { reveal(k, true); };
  }
  function check() {
    var k = curK, b = BL[k], s = st.blanks[k] || { t: 0 }, right;
    if (b.type === "choice") { if (choice == null) { $("#msg").innerHTML = '<span class="bad">하나를 골라 줘.</span>'; return; } right = choice === b.answer; }
    else { var v = norm($("#inp").value); if (!v) { $("#msg").innerHTML = '<span class="bad">답을 써 줘.</span>'; return; } right = b.answer.some(function (a) { return norm(a) === v; }); }
    if (right) {
      st.blanks[k] = { s: "ok", t: s.t }; save(); paintBlank(k); paintProgress();
      $("#msg").innerHTML = '<span class="good">맞았어!</span>'; setTimeout(closeSheet, 450);
    } else {
      s.t = (s.t || 0) + 1; st.blanks[k] = s; save();
      if (s.t >= 2) reveal(k, false);
      else { $("#msg").innerHTML = '<span class="bad">다시 생각해 보자. 힌트: ' + b.hint + "</span>"; math($("#msg")); }
    }
  }
  function reveal(k, dunno) {
    var s = st.blanks[k] || { t: 0 };
    st.blanks[k] = { s: "shown", t: s.t, d: !!dunno }; save(); paintBlank(k); paintProgress();
    $("#msg").innerHTML = '<span class="bad">정답은 ' + BL[k].show + " 이야. 헷갈렸다면 질문으로 만들어 보자!</span>"; math($("#msg"));
    var cb = $('.confuse[data-i="' + BL[k].card + '"]'); if (cb && !cb.classList.contains("on")) { cb.classList.remove("pulse"); void cb.offsetWidth; cb.classList.add("pulse"); }
    setTimeout(closeSheet, 1600);
  }
  if (!TEACHER) $$(".blank").forEach(function (el) {
    el.onclick = function () { var s = st.blanks[el.dataset.b]; if (s && (s.s === "ok" || s.s === "shown")) return; openSheet(el.dataset.b); };
  });

  if (TEACHER) return;

  /* ── 헷갈려요 → 질문 만들기 ── */
  var toastT;
  function toast(html, btn, fn) {
    var t = $("#toast"); t.innerHTML = "<span>" + html + "</span>" + (btn ? "<button>" + btn + "</button>" : "");
    if (btn) $("button", t).onclick = function () { t.classList.remove("show"); fn(); };
    t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove("show"); }, 3200);
  }
  function goQ() { $("#qbox").scrollIntoView({ behavior: "smooth", block: "start" }); }
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
      else { st.confuse.push(i); st.active = i; toast("질문 만들기에 담았어", "지금 가기", goQ); }
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
    $$("#mine .x").forEach(function (b) { b.onclick = function () { st.mine.splice(+b.dataset.j, 1); save(); paintMine(); }; });
  }
  $("#addMine").onclick = function () {
    var v = draft.value.trim();
    if (!v || v === lastTpl && /___/.test(v)) { toast("___ 자리를 내 말로 채워 줘"); return; }
    if (/___/.test(v)) { toast("___ 자리를 채워 줘"); return; }
    if (st.mine.length >= MAXQ) { toast("내 질문은 " + MAXQ + "개까지야. 하나 지우고 담자"); return; }
    st.mine.push(v); draft.value = ""; lastTpl = ""; st.draft = ""; save(); paintMine();
    $$(".frames button").forEach(function (x) { x.classList.remove("sel"); });
    toast("내 질문 " + st.mine.length + "개 · 조 질문 내기에서 불러올 수 있어");
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
    var box = $("#now"); if (!st.group) { box.innerHTML = ""; return; }
    box.innerHTML = '<div class="now">' + st.group + "조 질문 확인 중…</div>";
    Api.group(L.id, st.group).then(function (r) {
      if (!r.ok) throw new Error(r.error);
      box.innerHTML = '<div class="now">' + (r.rows.length
        ? "<b>" + st.group + "조가 이미 낸 질문</b> (다시 내면 이걸로 바뀌어)<ol>" + r.rows.map(function (x) { return "<li>" + esc(x.text) + "</li>"; }).join("") + "</ol>"
        : st.group + "조는 아직 질문을 내지 않았어.") + "</div>";
    }).catch(function () { box.innerHTML = '<div class="now">' + st.group + "조 질문을 불러오지 못했어. 그래도 낼 수 있어.</div>"; });
  }
  $$("#groups button").forEach(function (b) { b.onclick = function () { st.group = +b.dataset.g; save(); paintGroups(); showNow(); }; });
  paintGroups(); showNow();
  $("#loadMine").onclick = function () {
    if (!st.mine.length) { toast("먼저 위에서 내 질문을 담아 줘"); return; }
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
      st.submitted = true; save();
      res.innerHTML = '<div class="done-box"><b>' + st.group + "조 질문이 들어갔어!</b><br>수업 시간에 이 질문으로 시작해.</div>";
      showNow();
    }).catch(function (e) {
      res.innerHTML = '<div class="err-box">보내지 못했어 (' + esc(e.message || e) + '). 아래 단추로 복사해서 선생님께 보내 줘.<div class="btns" style="margin-top:8px"><button class="btn sec" id="cp">질문 복사하기</button></div></div>';
      $("#cp").onclick = function () { copyText(text).then(function () { toast("복사했어"); }); };
    }).then(function () { btn.disabled = false; btn.textContent = "조 질문 내기"; });
  };
})();
