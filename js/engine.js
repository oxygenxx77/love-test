// 计分、类型判定、合盘分析、分享编码、本地存储。只做计算，不碰页面。
window.LT = (function () {
  const { DIMS, QUESTIONS, TYPES, SAME, PAIRS, GRADES } = window.LT_DATA;
  const N = QUESTIONS.length;
  const DIM_MAX = 25;

  function dimScores(answers) {
    const out = {};
    DIMS.forEach((d) => (out[d.key] = 0));
    QUESTIONS.forEach((q, i) => (out[DIMS[q.dim].key] += answers[i] || 0));
    return out;
  }

  function level(score) {
    return score >= 20 ? "high" : score >= 13 ? "mid" : "low";
  }

  function personType(scores) {
    const ranked = DIMS.map((d) => [d.key, scores[d.key]]).sort((a, b) => b[1] - a[1]);
    const spread = ranked[0][1] - ranked[ranked.length - 1][1];
    const main = spread <= 3 ? TYPES["平衡"] : TYPES[ranked[0][0]];
    return { ...main, top: ranked[0][0], second: ranked[1][0] };
  }

  function profile(person) {
    const scores = dimScores(person.answers);
    return { name: person.name, answers: person.answers, scores, type: personType(scores) };
  }

  function grade(match) {
    return GRADES.find((g) => match >= g.min);
  }

  function comboText(ta, tb) {
    if (ta.name === tb.name) return SAME[ta.name];
    const key = [ta.name, tb.name].sort().join("|");
    if (PAIRS[key]) return PAIRS[key];
    return `${ta.name}最需要${ta.needs}，而${tb.name}擅长给出${tb.gives}；反过来，${tb.name}更在意${tb.needs}，这正是${ta.name}可以多花心思的地方。看见彼此真正需要的东西，差异就会变成互补。`;
  }

  function pair(a, b) {
    const pa = profile(a), pb = profile(b);
    const dims = DIMS.map((d) => {
      const diff = Math.abs(pa.scores[d.key] - pb.scores[d.key]);
      const status = diff <= 2 ? "same" : diff <= 5 ? "mild" : "gap";
      return { ...d, a: pa.scores[d.key], b: pb.scores[d.key], diff, status, match: Math.max(0, 100 - diff * 5) };
    });
    // 维度总分接近不代表每道题都想得一样，所以逐题的接近程度也计入一部分
    const dimAvg = dims.reduce((s, d) => s + d.match, 0) / dims.length;
    const qAvg = QUESTIONS.reduce((s, q, i) => s + (1 - Math.abs(a.answers[i] - b.answers[i]) / 4) * 100, 0) / N;
    const match = Math.round(dimAvg * 0.6 + qAvg * 0.4);

    const gaps = QUESTIONS.map((q, i) => ({ ...q, a: a.answers[i], b: b.answers[i], diff: Math.abs(a.answers[i] - b.answers[i]) }))
      .filter((q) => q.diff >= 2)
      .sort((x, y) => y.diff - x.diff || x.id - y.id)
      .slice(0, 3);
    const sameCount = QUESTIONS.filter((q, i) => a.answers[i] === b.answers[i]).length;

    const byGap = [...dims].sort((x, y) => y.diff - x.diff);
    const focus = byGap.filter((d) => d.status !== "same").slice(0, 2);
    const strengths = [...dims].sort((x, y) => x.diff - y.diff).filter((d) => d.status === "same").slice(0, 2);

    const tips = [];
    if (match >= 70) tips.push("保持现在的沟通习惯，定期聊聊彼此的感受，让默契继续加深。");
    else tips.push("每周留一段固定的「关系时间」，专门聊聊你们差异最大的那几个维度。");
    const indep = dims.find((d) => d.key === "独立需求"), intim = dims.find((d) => d.key === "亲密需求");
    if (indep.status === "gap" || intim.status === "gap") tips.push("一起写一份「边界清单」：哪些社交自由彼此都能接受，多久联系一次刚刚好。");
    else if (indep.status === "same" && intim.status === "same") tips.push("你们对亲密和空间的期待很接近，可以放心地给彼此空间，也不用担心被冷落。");
    else tips.push("你们对「黏在一起」和「各自空间」的期待略有不同，把理想的联系频率说出来，很容易对齐。");
    if (focus[0]) tips.push(`从「${focus[0].key}」开始聊：${focus[0].advice}`);
    else tips.push("一起列一张「快乐清单」，写下两个人都喜欢的事，定期一件件完成。");

    return { a: pa, b: pb, dims, match, grade: grade(match), gaps, sameCount, focus, strengths,
      combo: comboText(pa.type, pb.type), tips };
  }

  // ---------- 分享编码：昵称 + 30 个 1~5 的数字，base64url ----------
  function b64urlEncode(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function b64urlDecode(s) {
    s = s.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    const bin = atob(s);
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  }
  function validAnswers(arr) {
    return Array.isArray(arr) && arr.length === N && arr.every((v) => Number.isInteger(v) && v >= 1 && v <= 5);
  }
  function encodePerson(p) {
    return b64urlEncode(JSON.stringify({ v: 1, n: p.name, a: p.answers.join("") }));
  }
  function decodePerson(code) {
    try {
      const o = JSON.parse(b64urlDecode(code.trim()));
      // Streamlit 旧版导出的编码是 base64 的 [3, 4, ...] 数组
      if (Array.isArray(o)) return validAnswers(o) ? { name: "TA", answers: o } : null;
      const answers = String(o.a || "").split("").map(Number);
      if (!validAnswers(answers)) return null;
      return { name: cleanName(o.n) || "TA", answers };
    } catch (e) {
      return null;
    }
  }
  function cleanName(s) {
    return String(s || "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 12);
  }
  // 粘贴进来的可能是整条链接，也可能只是编码
  function parseShared(text) {
    text = String(text || "").trim();
    const hash = text.includes("#") ? text.slice(text.indexOf("#") + 1) : text;
    const params = new URLSearchParams(hash.replace(/^\/?[^?]*\?/, ""));
    if (params.get("pair")) {
      const [x, y] = params.get("pair").split(".");
      const a = decodePerson(x || ""), b = decodePerson(y || "");
      return a && b ? { kind: "pair", a, b } : null;
    }
    const code = params.get("invite") || params.get("from") || text;
    const p = decodePerson(code);
    return p ? { kind: "person", person: p } : null;
  }

  // ---------- 本地存储 ----------
  const KEY_HISTORY = "lt.history.v1", KEY_DRAFT = "lt.draft.v1";
  function load(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch (e) {
      return fallback;
    }
  }
  function save(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { /* 隐私模式下可能写不进去，忽略 */ }
  }
  const history = {
    list: () => load(KEY_HISTORY, []),
    // 同一组答案只记一次，避免反复打开报告时重复记录
    add(rec) {
      const all = history.list();
      const sig = JSON.stringify([rec.kind, rec.a, rec.b || null]);
      const found = all.find((r) => JSON.stringify([r.kind, r.a, r.b || null]) === sig);
      if (found) return found.id;
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      all.unshift({ id, ts: Date.now(), ...rec });
      save(KEY_HISTORY, all.slice(0, 50));
      return id;
    },
    get: (id) => history.list().find((r) => r.id === id),
    remove(id) {
      save(KEY_HISTORY, history.list().filter((r) => r.id !== id));
    },
    clear: () => save(KEY_HISTORY, []),
    replace: (all) => save(KEY_HISTORY, all),
    // 导入时只收结构完整的记录，并按 id 去重
    merge(items) {
      const ok = (p) => p && typeof p.name === "string" && validAnswers(p.answers);
      const valid = (Array.isArray(items) ? items : []).filter((r) => r && r.id && (r.kind === "solo" ? ok(r.a) : ok(r.a) && ok(r.b)));
      const all = history.list();
      const ids = new Set(all.map((r) => r.id));
      const added = valid.filter((r) => !ids.has(r.id));
      save(KEY_HISTORY, [...added, ...all].sort((x, y) => y.ts - x.ts).slice(0, 50));
      return added.length;
    },
  };
  const draft = {
    get: () => load(KEY_DRAFT, null),
    set: (d) => save(KEY_DRAFT, d),
    clear: () => localStorage.removeItem(KEY_DRAFT),
  };

  return { N, DIM_MAX, dimScores, level, profile, personType, pair, grade, encodePerson, decodePerson, parseShared,
    cleanName, history, draft };
})();
