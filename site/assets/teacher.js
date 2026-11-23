/* 예습 플랫폼 — 교사 화면: 조별/분류별/다룰 질문 보기, 확대, 분류·별표·묶기·숨기기 */
(function () {
  var C = window.YESEUP_CONFIG || {};
  var G = C.GROUPS || 9;
  var S = { key: "", lesson: "", rows: [], tags: (C.DEFAULT_TAGS || []).slice(), view: "group",
    hid: false, sel: false, picked: {}, zoomList: [], zi: 0, timer: null, lessons: [] };

  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } }
  var tt;
  function toast(m) { var t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(tt); tt = setTimeout(function () { t.classList.remove("show"); }, 2400); }

  /* ── 들어가기 ── */
  function start() {
    $("#login").style.display = "none";
    if (Api.demo) $("#demo").hidden = false;
    if (C.SHEET_URL) { $("#sheetBtn").href = C.SHEET_URL; $("#sheetBtn").hidden = false; }
    fetch("lessons.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).catch(function () { return []; }).then(function (ls) {
      S.lessons = ls;
      var sel = $("#lesson");
      sel.innerHTML = ls.slice().reverse().map(function (l) { return '<option value="' + esc(l.id) + '">' + esc(l.id + " " + l.title) + "</option>"; }).join("");
      S.lesson = ss("t_lesson") && ls.some(function (l) { return l.id === ss("t_lesson"); }) ? ss("t_lesson") : (ls.length ? ls[ls.length - 1].id : "");
      sel.value = S.lesson;
      load(); setAuto();
    });
  }
  $("#lform").onsubmit = function (e) {
    e.preventDefault();
    var k = $("#key").value.trim(); $("#lmsg").textContent = "확인 중…";
    Api.check(k).then(function (r) {
      if (r.ok) { S.key = k; ss("t_key", k); start(); } else $("#lmsg").textContent = r.error || "암호가 맞지 않습니다.";
    }).catch(function () { $("#lmsg").textContent = "연결하지 못했습니다. API_URL을 확인해 주세요."; });
  };
  document.addEventListener("DOMContentLoaded", function () {
    if (Api.demo) { S.key = "demo"; start(); return; }
    var k = ss("t_key");
    if (k) Api.check(k).then(function (r) { if (r.ok) { S.key = k; start(); } }).catch(function () {});
    $("#key").focus();
  });

  /* ── 불러오기 ── */
  var busy = false;
  function load(quiet) {
    if (!S.lesson || busy) return; busy = true;
    Api.list(S.lesson, S.key).then(function (r) {
      if (!r.ok) throw new Error(r.error);
      S.rows = r.rows.filter(function (x) { return x.status !== "replaced"; });
      if (r.tags && r.tags.length) S.tags = r.tags;
      render();
    }).catch(function (e) { if (!quiet) toast("불러오지 못했습니다: " + (e.message || e)); })
      .then(function () { busy = false; });
  }
  function setAuto() {
    clearInterval(S.timer);
    if ($("#autoChk").checked) S.timer = setInterval(function () { if ($("#zoom").hidden && $("#modal").hidden && !dragging) load(true); }, 20000);
  }
  $("#autoChk").onchange = setAuto;
  $("#refBtn").onclick = function () { load(); };
  $("#lesson").onchange = function () { S.lesson = this.value; ss("t_lesson", S.lesson); S.picked = {}; load(); };
  $("#hidChk").onchange = function () { S.hid = this.checked; render(); };
  $$("#tabs button").forEach(function (b) {
    b.onclick = function () { S.view = b.dataset.v; $$("#tabs button").forEach(function (x) { x.classList.toggle("on", x === b); }); render(); };
  });

  /* ── 고치기(저장) ── */
  function byId(id) { return S.rows.filter(function (r) { return r.id === id; })[0]; }
  function save(items, msg) {
    items.forEach(function (it) { var r = byId(it.id); if (r) Object.keys(it).forEach(function (k) { r[k] = it[k]; }); });
    render(); if (!$("#zoom").hidden) paintZoom();
    Api.update(S.key, items).then(function (r) { if (!r.ok) throw new Error(r.error); if (msg) toast(msg); })
      .catch(function (e) { toast("저장하지 못했습니다: " + (e.message || e)); load(true); });
  }
  function family(id) { // 같은 묶음 전체
    var r = byId(id); if (!r || !r.cluster) return [r];
    return S.rows.filter(function (x) { return x.cluster === r.cluster; });
  }
  function setTag(id, tag) { save(family(id).map(function (r) { return { id: r.id, tag: tag }; })); }
  function toggleStar(id) { var r = byId(id); save([{ id: id, star: !r.star }]); }
  function toggleHide(id) { var r = byId(id); save([{ id: id, status: r.status === "hidden" ? "active" : "hidden" }], r.status === "hidden" ? "다시 보이게 했습니다" : "숨겼습니다"); }

  /* ── 그리기 ── */
  function visible() { return S.rows.filter(function (r) { return S.hid || r.status !== "hidden"; }); }
  function sortQ(a, b) { return a.group - b.group || (b.pick ? 1 : 0) - (a.pick ? 1 : 0) || a.order - b.order || (a.time < b.time ? -1 : a.time > b.time ? 1 : 0); }
  function qHTML(r, opt) {
    opt = opt || {};
    var h = '<div class="q' + (r.star ? " star" : "") + (r.pick ? " pick" : "") + (r.status === "hidden" ? " hidden" : "") + (S.picked[r.id] ? " sel" : "") + '" data-id="' + esc(r.id) + '"' + (opt.drag ? ' draggable="true"' : "") + ">";
    if (S.sel) h += '<input type="checkbox" class="ck"' + (S.picked[r.id] ? " checked" : "") + ">";
    h += '<div class="qt">' + esc(r.text) + "</div><div class=\"qm\">";
    if (opt.who) h += '<span class="who">' + r.group + "조</span>";
    if (r.pick) h += '<span class="pk">조 대표</span>';
    if (r.cluster) h += '<span class="cl">묶음 ' + esc(r.cluster) + "</span>";
    h += '<select class="tagsel"><option value="">분류 없음</option>' + S.tags.map(function (t) { return '<option' + (t === r.tag ? " selected" : "") + ">" + esc(t) + "</option>"; }).join("") +
      (r.tag && S.tags.indexOf(r.tag) < 0 ? '<option selected>' + esc(r.tag) + "</option>" : "") + "</select>";
    h += '<button class="ib st' + (r.star ? " on" : "") + '" title="수업에서 다룰 질문">★</button>';
    h += '<button class="ib zm" title="크게 보기">크게</button>';
    h += '<button class="ib hd">' + (r.status === "hidden" ? "보이기" : "숨기기") + "</button>";
    return h + "</div></div>";
  }
  function paintStatus() {
    var rows = S.rows.filter(function (r) { return r.status !== "hidden"; });
    var h = '<span class="lb">조별 질문</span>', n = 0, pk = 0;
    for (var g = 1; g <= G; g++) {
      var gr = rows.filter(function (r) { return r.group === g; }), c = gr.length, p = gr.some(function (r) { return r.pick; });
      if (c) n++; if (p) pk++;
      h += '<span class="gs' + (c ? " on" : "") + (p ? " pk" : "") + '" title="' + (p ? "대표 고름" : "") + '">' + g + "조" + (c ? " " + c + "명" : "") + (p ? " ★" : "") + "</span>";
    }
    h += '<span class="sum">' + n + " / " + G + "조 · 질문 " + rows.length + "개 · 조 대표 " + pk + "조 · ★ " + rows.filter(function (r) { return r.star; }).length + "개</span>";
    $("#status").innerHTML = h;
  }
  function render() {
    paintStatus();
    var rows = visible(), b = $("#board"), h = "";
    if (S.view === "group") {
      h = '<div class="grid">';
      for (var g = 1; g <= G; g++) {
        var gr = rows.filter(function (r) { return r.group === g; }).sort(sortQ);
        var tm = gr.length ? new Date(gr[0].time) : null;
        h += '<section class="gcard' + (gr.length ? "" : " none") + '"><h2><span class="gn">' + g + "조</span>" + (gr.length ? gr.length + "명" : "") +
          (tm && !isNaN(tm) ? '<span class="tm">' + (tm.getMonth() + 1) + "/" + tm.getDate() + " " + String(tm.getHours()).padStart(2, "0") + ":" + String(tm.getMinutes()).padStart(2, "0") + "</span>" : "") + "</h2>";
        h += gr.length ? gr.map(function (r) { return qHTML(r); }).join("") : '<div class="nothing">아직 내지 않았습니다.</div>';
        h += "</section>";
      }
      h += "</div>";
      S.zoomList = rows.slice().sort(sortQ);
    } else if (S.view === "tag") {
      var cols = [""].concat(S.tags);
      rows.forEach(function (r) { if (r.tag && cols.indexOf(r.tag) < 0) cols.push(r.tag); });
      S.zoomList = [];
      h = '<div class="cols">';
      cols.forEach(function (t) {
        var cr = rows.filter(function (r) { return (r.tag || "") === t; }).sort(function (a, b) { return (a.cluster || "~").localeCompare(b.cluster || "~") || sortQ(a, b); });
        h += '<section class="col' + (t ? "" : " untag") + '" data-tag="' + esc(t) + '"><h3>' + (t ? esc(t) : "분류 전") + "<span>" + cr.length + "</span></h3>";
        var i = 0;
        while (i < cr.length) {
          var c = cr[i].cluster;
          if (c) {
            var grp = cr.filter(function (r) { return r.cluster === c; });
            h += '<div class="clbox"><div class="cll">묶음 ' + esc(c) + " · " + grp.length + "개</div>" + grp.map(function (r) { return qHTML(r, { who: 1, drag: 1 }); }).join("") + "</div>";
            S.zoomList = S.zoomList.concat(grp); i += grp.length;
          } else { h += qHTML(cr[i], { who: 1, drag: 1 }); S.zoomList.push(cr[i]); i++; }
        }
        h += "</section>";
      });
      h += "</div>";
    } else if (S.view === "pick") {
      var pr = rows.filter(function (r) { return r.pick; }).sort(sortQ);
      S.zoomList = pr;
      h = pr.length ? '<div class="starlist" style="max-width:900px">' + pr.map(function (r) { return qHTML(r, { who: 1 }); }).join("") + "</div>"
        : '<div class="empty">조에서 대표 질문을 고르면 여기에 모입니다.</div>';
    } else {
      var sr = rows.filter(function (r) { return r.star; }).sort(sortQ);
      S.zoomList = sr;
      h = sr.length ? '<div class="starlist" style="max-width:900px">' + sr.map(function (r) { return qHTML(r, { who: 1 }); }).join("") + "</div>"
        : '<div class="empty">★를 누른 질문이 여기에 모입니다. 수업에서 다룰 질문을 골라 보세요.</div>';
    }
    b.innerHTML = h;
    bind();
  }

  /* ── 카드 동작 ── */
  var dragging = null;
  function bind() {
    $$(".q").forEach(function (q) {
      var id = q.dataset.id;
      $(".qt", q).onclick = function () { if (S.sel) pick(id); else openZoom(id); };
      $(".tagsel", q).onchange = function () { setTag(id, this.value); };
      $(".st", q).onclick = function () { toggleStar(id); };
      $(".zm", q).onclick = function () { openZoom(id); };
      $(".hd", q).onclick = function () { toggleHide(id); };
      var ck = $(".ck", q); if (ck) ck.onchange = function () { pick(id); };
      if (q.draggable) {
        q.addEventListener("dragstart", function (e) { dragging = id; e.dataTransfer.setData("text/plain", id); e.dataTransfer.effectAllowed = "move"; });
        q.addEventListener("dragend", function () { dragging = null; });
      }
    });
    $$(".col").forEach(function (col) {
      col.addEventListener("dragover", function (e) { e.preventDefault(); col.classList.add("over"); });
      col.addEventListener("dragleave", function () { col.classList.remove("over"); });
      col.addEventListener("drop", function (e) {
        e.preventDefault(); col.classList.remove("over");
        var id = e.dataTransfer.getData("text/plain") || dragging; dragging = null;
        var r = byId(id); if (r && (r.tag || "") !== col.dataset.tag) setTag(id, col.dataset.tag);
      });
    });
  }

  /* ── 묶기 ── */
  function pick(id) { if (S.picked[id]) delete S.picked[id]; else S.picked[id] = 1; paintSel(); render(); }
  function paintSel() { $("#selN").textContent = Object.keys(S.picked).length + "개 고름"; }
  $("#selBtn").onclick = function () { S.sel = !S.sel; S.picked = {}; this.classList.toggle("on", S.sel); $("#selbar").hidden = !S.sel; paintSel(); render(); };
  $("#selCancel").onclick = function () { $("#selBtn").click(); };
  $("#doCluster").onclick = function () {
    var ids = Object.keys(S.picked); if (ids.length < 2) { toast("비슷한 질문을 2개 이상 골라 주세요"); return; }
    var used = {}; S.rows.forEach(function (r) { if (r.cluster) used[r.cluster] = 1; });
    var abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZ", c = ""; for (var i = 0; i < abc.length; i++) if (!used[abc[i]]) { c = abc[i]; break; }
    if (!c) c = "Z" + ids.length;
    var tag = byId(ids[0]).tag || "";
    S.picked = {}; paintSel();
    save(ids.map(function (id) { return { id: id, cluster: c, tag: tag }; }), "묶음 " + c + "로 묶었습니다");
  };
  $("#unCluster").onclick = function () {
    var ids = Object.keys(S.picked); if (!ids.length) { toast("풀 질문을 골라 주세요"); return; }
    S.picked = {}; paintSel(); save(ids.map(function (id) { return { id: id, cluster: "" }; }), "묶음을 풀었습니다");
  };

  /* ── 크게 보기 ── */
  function openZoom(id) {
    S.zi = Math.max(0, S.zoomList.map(function (r) { return r.id; }).indexOf(id));
    if (!S.zoomList.length) S.zoomList = [byId(id)];
    $("#zoom").hidden = false; paintZoom();
  }
  function paintZoom() {
    var r = S.zoomList[S.zi]; if (!r) return; r = byId(r.id) || r;
    $("#zg").textContent = r.group + "조" + (r.pick ? " · 조 대표" : "");
    $("#zi").textContent = (S.zi + 1) + " / " + S.zoomList.length + (r.cluster ? " · 묶음 " + r.cluster : "");
    $("#zt").textContent = r.text;
    $("#ztools").innerHTML = S.tags.map(function (t) { return '<button class="zt' + (r.tag === t ? " on" : "") + '">' + esc(t) + "</button>"; }).join("") +
      '<button class="zs' + (r.star ? " on" : "") + '">★ 다룰 질문</button>';
    $$("#ztools .zt").forEach(function (b, i) { b.onclick = function () { setTag(r.id, r.tag === S.tags[i] ? "" : S.tags[i]); }; });
    $("#ztools .zs").onclick = function () { toggleStar(r.id); };
    $("#zprev").style.visibility = S.zi > 0 ? "visible" : "hidden";
    $("#znext").style.visibility = S.zi < S.zoomList.length - 1 ? "visible" : "hidden";
  }
  function zmove(d) { var n = S.zi + d; if (n >= 0 && n < S.zoomList.length) { S.zi = n; paintZoom(); } }
  function zclose() { $("#zoom").hidden = true; if (document.fullscreenElement) document.exitFullscreen().catch(function () {}); }
  $("#zprev").onclick = function () { zmove(-1); };
  $("#znext").onclick = function () { zmove(1); };
  $("#zclose").onclick = zclose;
  $("#zfull").onclick = function () { var z = $("#zoom"); if (document.fullscreenElement) document.exitFullscreen(); else if (z.requestFullscreen) z.requestFullscreen().catch(function () {}); };
  document.addEventListener("keydown", function (e) {
    if ($("#zoom").hidden) return;
    if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); zmove(1); }
    else if (e.key === "ArrowLeft") zmove(-1);
    else if (e.key === "Escape" && !document.fullscreenElement) zclose();
  });

  /* ── 분류 관리 ── */
  $("#tagBtn").onclick = function () {
    var m = $("#modal");
    function rowsHTML(tags) { return tags.map(function (t, i) { return '<div class="trow"><input value="' + esc(t) + '" data-old="' + esc(t) + '"><button data-i="' + i + '">지우기</button></div>'; }).join(""); }
    m.innerHTML = '<div class="mbox"><h2>분류 관리</h2><p>꼬리표 이름을 바꾸면 이미 붙은 질문도 함께 바뀝니다. 지우면 그 질문들은 \'분류 전\'으로 갑니다.</p><div id="tl">' + rowsHTML(S.tags) +
      '</div><button id="tadd" style="border:1px dashed #b9c1cd;background:#fff;border-radius:8px;padding:6px 12px">+ 꼬리표 더하기</button><div class="mbtns"><button class="s" id="tx">취소</button><button class="p" id="tok">저장</button></div></div>';
    m.hidden = false;
    function bindDel() { $$("#tl .trow button").forEach(function (b) { b.onclick = function () { b.parentNode.remove(); }; }); }
    bindDel();
    $("#tadd").onclick = function () { $("#tl").insertAdjacentHTML("beforeend", '<div class="trow"><input placeholder="새 꼬리표" data-old=""><button>지우기</button></div>'); bindDel(); $("#tl .trow:last-child input").focus(); };
    $("#tx").onclick = function () { m.hidden = true; };
    $("#tok").onclick = function () {
      var ins = $$("#tl input"), next = [], ren = {}, kept = {};
      ins.forEach(function (i) { var v = i.value.trim(), o = i.dataset.old; if (!v || next.indexOf(v) >= 0) return; next.push(v); if (o) { kept[o] = 1; if (o !== v) ren[o] = v; } });
      var items = [];
      S.rows.forEach(function (r) {
        if (!r.tag) return;
        if (ren[r.tag]) items.push({ id: r.id, tag: ren[r.tag] });
        else if (S.tags.indexOf(r.tag) >= 0 && !kept[r.tag]) items.push({ id: r.id, tag: "" });
      });
      S.tags = next; m.hidden = true;
      Api.setTags(S.key, next).then(function (r) { if (!r.ok) throw new Error(r.error); toast("분류를 저장했습니다"); })
        .catch(function (e) { toast("분류를 저장하지 못했습니다: " + (e.message || e)); });
      if (items.length) save(items); else render();
    };
  };

  /* ── 체험 모드 ── */
  var SEED = {
    A9: [[1, "왜 x축 아래에 있으면 정적분이 −S일까?", 1], [1, "정적분과 넓이는 무엇이 다를까?"], [2, "왜 S₁+S₂가 아니라 S₁−S₂일까?", 1],
      [3, "만약 S₁과 S₂가 같으면 정적분은 어떻게 될까?"], [3, "y=x²처럼 곡선 아래 넓이는 어떻게 구할 수 있을까?", 1], [4, "왜 위끝과 아래끝을 바꾸면 부호가 바뀔까?"]],
    A10: [[1, "왜 적분상수 C를 꼭 붙여야 할까?", 1], [1, "미분하면 2x가 되는 함수는 몇 개일까?"], [1, "C는 아무 수나 넣어도 될까?"],
      [2, "왜 지수를 1 올리고 그 수로 나눌까?"], [2, "만약 n=−1이면 공식이 될까?", 1], [3, "부정적분과 정적분은 무엇이 다를까?", 1],
      [3, "곡선 y=x² 아래의 넓이 S는 어떻게 구할 수 있을까?"], [4, "적분상수를 하나의 C로 모아 써도 되는 이유는?"], [5, "(x−1)³처럼 괄호가 있는 식은 어떻게 적분할까?", 1]]
  };
  $("#seed").onclick = function () {
    Api.seedDemo(S.lesson || "A10", SEED[S.lesson] || SEED.A10);
    load(); toast("예시 질문을 넣었습니다");
  };
  $("#clear").onclick = function () { if (confirm("체험 모드 질문을 모두 지울까요?")) { Api.clearDemo(); load(); } };
})();
