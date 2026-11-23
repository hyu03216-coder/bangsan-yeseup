/* 예습 플랫폼 — 질문 저장소 연결
   API_URL이 있으면 구글 Apps Script로, 없으면 이 기기(localStorage) '체험 모드'로 동작한다. */
window.Api = (function () {
  var C = window.YESEUP_CONFIG || {};
  var URL_ = String(C.API_URL || "").trim();
  var demo = !URL_;
  var DK = "yeseup_demo_db";

  /* ── 체험 모드 저장소 ── */
  function dload() {
    try { return JSON.parse(localStorage.getItem(DK)) || { rows: [], tags: null }; }
    catch (e) { return { rows: [], tags: null }; }
  }
  function dsave(d) { try { localStorage.setItem(DK, JSON.stringify(d)); } catch (e) {} }
  function uid() { return Math.random().toString(36).slice(2, 10); }
  function later(v) { return new Promise(function (res) { setTimeout(function () { res(v); }, 120); }); }

  var D = {
    submit: function (lesson, cls, group, qs) {
      var d = dload();
      d.rows.forEach(function (r) {
        if (r.lesson === lesson && r.group === group && r.status === "active") r.status = "replaced";
      });
      var t = new Date().toISOString();
      qs.forEach(function (q, i) {
        d.rows.push({ id: uid(), time: t, lesson: lesson, cls: cls, group: group, order: i + 1,
          text: q, status: "active", tag: "", star: false, cluster: "" });
      });
      dsave(d);
      return D.group(lesson, group);
    },
    group: function (lesson, group) {
      var rows = dload().rows.filter(function (r) {
        return r.lesson === lesson && r.group === group && r.status === "active";
      }).sort(function (a, b) { return a.order - b.order; })
        .map(function (r) { return { text: r.text, order: r.order, time: r.time }; });
      return { ok: true, rows: rows };
    },
    list: function (lesson) {
      var d = dload();
      return { ok: true, tags: d.tags, rows: d.rows.filter(function (r) { return !lesson || r.lesson === lesson; })
        .map(function (r) { var o = {}; for (var k in r) if (k !== "device") o[k] = r[k]; o.pick = !!r.pick; return o; }) };
    },
    update: function (items) {
      var d = dload();
      items.forEach(function (it) {
        d.rows.forEach(function (r) {
          if (r.id !== it.id) return;
          ["tag", "star", "cluster", "status"].forEach(function (k) { if (k in it) r[k] = it[k]; });
        });
      });
      dsave(d);
      return { ok: true };
    },
    tags: function (tags) { var d = dload(); d.tags = tags; dsave(d); return { ok: true }; },
    submitOne: function (lesson, cls, group, device, text) {
      var d = dload();
      d.rows.forEach(function (r) { if (r.lesson === lesson && r.device === device && r.status === "active") r.status = "replaced"; });
      var id = uid();
      d.rows.push({ id: id, time: new Date().toISOString(), lesson: lesson, cls: cls, group: group, order: 1,
        text: text, status: "active", tag: "", star: false, cluster: "", device: device, pick: false });
      dsave(d);
      return { ok: true, id: id };
    },
    board: function (lesson, device) {
      var rows = dload().rows.filter(function (r) { return r.lesson === lesson && r.status === "active"; })
        .sort(function (a, b) { return a.group - b.group || (a.time < b.time ? -1 : 1); })
        .map(function (r) { return { id: r.id, group: r.group, text: r.text, pick: !!r.pick, time: r.time, mine: !!device && r.device === device }; });
      return { ok: true, rows: rows };
    },
    pick: function (lesson, group, id) {
      var d = dload();
      d.rows.forEach(function (r) { if (r.lesson === lesson && r.group === group && r.status === "active") r.pick = r.id === id; });
      dsave(d);
      return { ok: true };
    }
  };

  /* ── Apps Script 연결 ── */
  function get(params) {
    var u = URL_ + "?" + new URLSearchParams(params).toString();
    return fetch(u, { redirect: "follow" }).then(function (r) { return r.json(); });
  }
  function post(body) {
    return fetch(URL_, {
      method: "POST", redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); });
  }

  return {
    demo: demo,
    submit: function (lesson, group, qs) {
      return demo ? later(D.submit(lesson, C.CLASS_NAME || "", group, qs))
        : post({ action: "submit", lesson: lesson, cls: C.CLASS_NAME || "", group: group, questions: qs });
    },
    group: function (lesson, group) {
      return demo ? later(D.group(lesson, group)) : get({ action: "group", lesson: lesson, group: group });
    },
    check: function (key) { return demo ? later({ ok: true }) : get({ action: "check", key: key }); },
    list: function (lesson, key) {
      return demo ? later(D.list(lesson)) : get({ action: "list", lesson: lesson || "", key: key });
    },
    update: function (key, items) {
      return demo ? later(D.update(items)) : post({ action: "update", key: key, items: items });
    },
    setTags: function (key, tags) {
      return demo ? later(D.tags(tags)) : post({ action: "tags", key: key, tags: tags });
    },
    /* 학생 한 명 질문 하나 · 조별 질문 보기 · 조 대표 고르기 */
    submitOne: function (lesson, group, device, text) {
      return demo ? later(D.submitOne(lesson, C.CLASS_NAME || "", group, device, text))
        : post({ action: "submitOne", lesson: lesson, cls: C.CLASS_NAME || "", group: group, device: device, text: text });
    },
    board: function (lesson, device) {
      return demo ? later(D.board(lesson, device)) : get({ action: "board", lesson: lesson, device: device || "" });
    },
    pick: function (lesson, group, id) {
      return demo ? later(D.pick(lesson, group, id)) : post({ action: "pick", lesson: lesson, group: group, id: id || "" });
    },
    /* 체험 모드 전용: samples = [[조, 질문, 대표?], ...] (질문 하나씩, 예전 [[조, [질문들]]] 꼴도 됨) */
    seedDemo: function (lesson, samples) {
      samples.forEach(function (s, i) {
        var qs = Array.isArray(s[1]) ? s[1] : [s[1]];
        qs.forEach(function (q, j) {
          var r = D.submitOne(lesson, C.CLASS_NAME || "", s[0], "demo" + i + "_" + j, q);
          if (s[2] && j === 0) D.pick(lesson, s[0], r.id);
        });
      });
    },
    clearDemo: function () { try { localStorage.removeItem(DK); } catch (e) {} }
  };
})();
