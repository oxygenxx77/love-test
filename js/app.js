// 页面：基于 location.hash 的小路由，每个视图都是一个返回 HTML 的函数 + 事件绑定。
(function () {
  const { DIMS, QUESTIONS, SCALE } = window.LT_DATA;
  const { N, history, draft } = window.LT;
  const { radarSVG, poster, COLORS } = window.LTCharts;
  const app = document.getElementById("app");
  const SITE = "oxygenxx77.github.io/love-test";

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const $ = (sel, root = app) => root.querySelector(sel);
  const $$ = (sel, root = app) => [...root.querySelectorAll(sel)];
  const go = (hash) => (location.hash = hash);
  const baseUrl = () => location.href.split("#")[0];
  const fmtTime = (ts) => {
    const d = new Date(ts), p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  const emptyAnswers = () => Array(N).fill(0);

  // ---------- 通用小组件 ----------
  function toast(msg) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => el.remove(), 300);
    }, 2000);
  }

  async function copy(text, msg = "已复制") {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    toast(msg);
  }

  async function share(text, url, fallbackMsg) {
    if (navigator.share && matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ title: "恋爱观测试 · 我们合拍吗", text, url });
        return;
      } catch (e) {
        if (e.name === "AbortError") return;
      }
    }
    copy(`${text}\n${url}`, fallbackMsg);
  }

  function modal(html, onMount) {
    const wrap = document.createElement("div");
    wrap.className = "modal";
    wrap.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true"><button class="modal-close" aria-label="关闭">×</button>${html}</div>`;
    const close = () => {
      wrap.classList.remove("show");
      setTimeout(() => wrap.remove(), 200);
      document.removeEventListener("keydown", onKey);
    };
    const onKey = (e) => e.key === "Escape" && close();
    wrap.addEventListener("click", (e) => (e.target === wrap || e.target.classList.contains("modal-close")) && close());
    document.addEventListener("keydown", onKey);
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add("show"));
    onMount && onMount(wrap, close);
    return close;
  }

  function confirmBox(text, okText = "确定") {
    return new Promise((resolve) => {
      let answered = false;
      const close = modal(`<p class="confirm-text">${esc(text)}</p>
        <div class="row end"><button class="btn ghost" data-v="0">取消</button><button class="btn primary" data-v="1">${esc(okText)}</button></div>`,
      (root, close) => {
        root.querySelectorAll("[data-v]").forEach((b) => b.addEventListener("click", () => {
          answered = true;
          resolve(b.dataset.v === "1");
          close();
        }));
        new MutationObserver((_, obs) => {
          if (!document.body.contains(root)) {
            obs.disconnect();
            if (!answered) resolve(false);
          }
        }).observe(document.body, { childList: true });
      });
      return close;
    });
  }

  function showPoster(result) {
    const canvas = poster(result, SITE);
    const url = canvas.toDataURL("image/png");
    const name = result.kind === "pair" ? `${result.a.name}和${result.b.name}的合拍报告` : `${result.person.name}的恋爱观画像`;
    modal(`<h3>分享海报</h3>
      <img class="poster-img" src="${url}" alt="${esc(name)}">
      <p class="hint">手机上长按图片即可保存或转发</p>
      <a class="btn primary block" href="${url}" download="${esc(name)}.png">下载图片</a>`);
  }

  function hearts(n = 18) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    for (let i = 0; i < n; i++) {
      const h = document.createElement("span");
      h.className = "float-heart";
      h.textContent = ["💗", "💞", "💖", "✨"][i % 4];
      h.style.left = Math.random() * 100 + "vw";
      h.style.animationDelay = Math.random() * 0.8 + "s";
      h.style.fontSize = 16 + Math.random() * 20 + "px";
      document.body.appendChild(h);
      setTimeout(() => h.remove(), 3200);
    }
  }

  function countUp(el, to, ms = 1100) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = to;
      return;
    }
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / ms);
      el.textContent = Math.round(to * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    setTimeout(() => (el.textContent = to), ms + 100);
  }

  // ---------- 首页 ----------
  function viewHome() {
    const d = draft.get();
    const done = d ? d.people[d.who].answers.filter(Boolean).length : 0;
    const count = history.list().length;
    app.innerHTML = `
      <section class="hero">
        <div class="hero-badge">恋爱观测试 · 30 题 · 约 4 分钟</div>
        <h1>我们<span class="grad">合拍</span>吗？</h1>
        <p class="lead">从亲密、独立、冲突、安全感、长期关系、灵魂共鸣六个维度，看看你的恋爱观，以及你们俩在哪里同频、在哪里需要多聊聊。</p>
        <div class="hero-actions">
          <button class="btn primary big" data-go="#/start/pair">💞 和 TA 一起测</button>
          <button class="btn ghost big" data-go="#/start/solo">🪞 先测测我自己</button>
        </div>
        ${d ? `<button class="resume-card" data-go="#/quiz">
            <span>继续上次的答题</span><b>${esc(d.people[d.who].name)} · ${done}/${N}</b><span class="arrow">→</span></button>` : ""}
      </section>

      <section class="steps">
        <div class="step"><i>1</i><b>你先答</b><span>每题凭第一感觉选，没有对错</span></div>
        <div class="step"><i>2</i><b>发链接给 TA</b><span>TA 答完前看不到你的答案</span></div>
        <div class="step"><i>3</i><b>一起看报告</b><span>匹配度、分歧点和可以聊的话题</span></div>
      </section>

      <section class="dims-intro">
        ${DIMS.map((dm) => `<div class="dim-chip" style="--c:${dm.color}"><span>${dm.icon}</span><b>${dm.key}</b><small>${dm.about}</small></div>`).join("")}
      </section>

      <section class="card import-card">
        <h3>收到了 TA 发来的链接或编码？</h3>
        <div class="row">
          <input id="shared" placeholder="粘贴链接或编码（也支持旧版导出的编码）" autocomplete="off">
          <button class="btn primary" id="open-shared">打开</button>
        </div>
      </section>

      <footer class="foot">
        ${count ? `<a href="#/history">📚 历史记录（${count}）</a> · ` : ""}答案只保存在你自己的设备上，不会上传到任何服务器
      </footer>`;
    bindGo();
    $("#open-shared").addEventListener("click", () => {
      const parsed = window.LT.parseShared($("#shared").value);
      if (!parsed) return toast("没认出来，检查一下是否复制完整");
      if (parsed.kind === "pair") return openPair(parsed.a, parsed.b);
      go("#invite=" + window.LT.encodePerson(parsed.person));
    });
  }

  async function okToReplaceDraft() {
    const d = draft.get();
    if (!d || !d.people.some((p) => p.answers.some(Boolean))) return true;
    return confirmBox(`${d.people[d.who].name} 还有一份没答完的题（${d.people[d.who].answers.filter(Boolean).length}/${N}），开始新的测试会覆盖它。`, "开始新的");
  }

  function bindGo() {
    $$("[data-go]").forEach((b) => b.addEventListener("click", () => go(b.dataset.go)));
  }

  // ---------- 开始：填昵称、选玩法 ----------
  function viewStart(mode) {
    const pair = mode === "pair";
    app.innerHTML = `
      <section class="card narrow pop">
        <button class="link back" data-go="#/">← 返回</button>
        <h2>${pair ? "和 TA 一起测" : "先测测我自己"}</h2>
        <label class="field"><span>你的昵称</span><input id="name" maxlength="12" placeholder="比如：小舟" autocomplete="off"></label>
        ${pair ? `
        <div class="choices">
          <label class="choice"><input type="radio" name="flow" value="invite" checked>
            <b>📱 各自用手机</b><span>你先答，然后把链接发给 TA</span></label>
          <label class="choice"><input type="radio" name="flow" value="local">
            <b>🤝 同一台设备轮流答</b><span>你答完把手机递给 TA</span></label>
        </div>` : ""}
        <button class="btn primary block big" id="begin">开始答题</button>
        <p class="hint">共 ${N} 题，每题凭第一感觉选就好</p>
      </section>`;
    bindGo();
    const input = $("#name");
    input.focus();
    const begin = async () => {
      if (!(await okToReplaceDraft())) return;
      const name = window.LT.cleanName(input.value) || "我";
      const flow = pair ? $("input[name=flow]:checked").value : "solo";
      draft.set({ flow, who: 0, step: 0, people: [{ name, answers: emptyAnswers() }] });
      go("#/quiz");
    };
    $("#begin").addEventListener("click", begin);
    input.addEventListener("keydown", (e) => e.key === "Enter" && begin());
  }

  // ---------- 被邀请：落地页 ----------
  function viewInvite(code) {
    const inviter = window.LT.decodePerson(code);
    if (!inviter) {
      app.innerHTML = `<section class="card narrow"><h2>链接好像不完整</h2><p>请让 TA 重新复制一次链接发给你。</p><button class="btn primary" data-go="#/">回首页</button></section>`;
      return bindGo();
    }
    app.innerHTML = `
      <section class="card narrow pop invite-land">
        <div class="avatar">💌</div>
        <h2><span class="name-a">${esc(inviter.name)}</span> 邀请你测测你们的恋爱观合拍度</h2>
        <p class="muted">TA 已经答完了 ${N} 题。你答完之前看不到 TA 的答案，放心按真实想法选。</p>
        <label class="field"><span>你的昵称</span><input id="name" maxlength="12" placeholder="比如：阿澈" autocomplete="off"></label>
        <button class="btn primary block big" id="begin">开始答题</button>
        <p class="hint">答案只存在你自己的手机里</p>
      </section>`;
    const input = $("#name");
    const begin = async () => {
      if (!(await okToReplaceDraft())) return;
      const name = window.LT.cleanName(input.value) || "TA";
      draft.set({ flow: "join", who: 0, step: 0, inviter, people: [{ name, answers: emptyAnswers() }] });
      go("#/quiz");
    };
    $("#begin").addEventListener("click", begin);
    input.addEventListener("keydown", (e) => e.key === "Enter" && begin());
  }

  // ---------- 答题 ----------
  let quizKeyHandler = null;
  function viewQuiz() {
    const d = draft.get();
    if (!d) return go("#/");
    const person = d.people[d.who];
    const step = Math.min(d.step, N - 1);
    const q = QUESTIONS[step];
    const dim = DIMS[q.dim];
    const answered = person.answers.filter(Boolean).length;
    const val = person.answers[step];
    const whoColor = d.who === 1 || d.flow === "join" ? COLORS.b : COLORS.a;

    app.innerHTML = `
      <section class="quiz" style="--who:${whoColor}">
        <header class="quiz-top">
          <button class="link" id="quit">← 首页</button>
          <span class="who">${esc(person.name)} 答题中${d.flow === "local" && d.who === 1 ? " · 别让 TA 偷看" : ""}</span>
          <span class="count">${answered}/${N}</span>
        </header>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${N}" aria-valuenow="${answered}"><i style="width:${(answered / N) * 100}%"></i></div>

        <article class="q-card" style="--c:${dim.color}">
          <div class="q-meta"><span class="dim-tag">${dim.icon} ${dim.key}</span><span>第 ${step + 1} 题</span></div>
          <h2 class="q-text">${esc(q.text)}</h2>
          <div class="options" role="radiogroup" aria-label="选择你的同意程度">
            ${SCALE.map((label, i) => `
              <button class="opt ${val === i + 1 ? "on" : ""}" role="radio" aria-checked="${val === i + 1}" data-v="${i + 1}">
                <span class="dots" aria-hidden="true">${"●".repeat(i + 1)}<em>${"●".repeat(4 - i)}</em></span><span class="opt-label">${label}</span><kbd aria-hidden="true">${i + 1}</kbd>
              </button>`).join("")}
          </div>
        </article>

        <nav class="quiz-nav">
          <button class="btn ghost" id="prev" ${step === 0 ? "disabled" : ""}>上一题</button>
          <button class="btn ghost" id="map-toggle">题目总览</button>
          <button class="btn ${answered === N ? "primary" : "ghost"}" id="next" ${!val && answered < N ? "disabled" : ""}>${answered === N ? "完成 ✓" : "下一题"}</button>
        </nav>
        <div class="q-map" hidden>
          ${QUESTIONS.map((qq, i) => `<button class="${person.answers[i] ? "done" : ""} ${i === step ? "cur" : ""}" data-i="${i}" style="--c:${DIMS[qq.dim].color}">${i + 1}</button>`).join("")}
        </div>
        <div class="quiz-tools">
          <button class="link" id="random">🎲 随机填完（体验用）</button>
          <button class="link" id="reset">↺ 重新作答</button>
        </div>
      </section>`;

    const save = (patch) => {
      Object.assign(d, patch);
      draft.set(d);
    };
    const choose = (v) => {
      const wasComplete = answered === N;
      person.answers[step] = v;
      $$(".opt").forEach((b) => {
        const on = Number(b.dataset.v) === v;
        b.classList.toggle("on", on);
        b.setAttribute("aria-checked", on);
      });
      const firstEmpty = person.answers.findIndex((x) => !x);
      setTimeout(() => {
        // 已经答完后回头改某一题：停在原地，由用户点「完成」
        if (firstEmpty === -1 && wasComplete) {
          save({});
          viewQuiz();
        } else if (firstEmpty === -1) {
          save({});
          finishPerson(d);
        } else {
          save({ step: step < N - 1 && !person.answers[step + 1] ? step + 1 : firstEmpty });
          viewQuiz();
        }
      }, 220);
    };

    $$(".opt").forEach((b) => b.addEventListener("click", () => choose(Number(b.dataset.v))));
    $("#prev").addEventListener("click", () => {
      save({ step: Math.max(0, step - 1) });
      viewQuiz();
    });
    $("#next").addEventListener("click", () => {
      if (answered === N) return finishPerson(d);
      save({ step: Math.min(N - 1, step + 1) });
      viewQuiz();
    });
    $("#map-toggle").addEventListener("click", () => ($(".q-map").hidden = !$(".q-map").hidden));
    $$(".q-map button").forEach((b) => b.addEventListener("click", () => {
      save({ step: Number(b.dataset.i) });
      viewQuiz();
    }));
    $("#random").addEventListener("click", () => {
      person.answers = person.answers.map((v) => v || 1 + Math.floor(Math.random() * 5));
      d.people[d.who] = person;
      save({ step: N - 1 });
      toast("已随机填完剩下的题，可以回头改");
      viewQuiz();
    });
    $("#reset").addEventListener("click", async () => {
      if (!(await confirmBox(`清空 ${person.name} 的全部答案，从第 1 题重新开始？`, "清空重答"))) return;
      person.answers = emptyAnswers();
      save({ step: 0 });
      viewQuiz();
    });
    $("#quit").addEventListener("click", () => {
      toast("进度已保存，回首页可以继续");
      go("#/");
    });

    quizKeyHandler = (e) => {
      if (e.target.tagName === "INPUT" || document.querySelector(".modal")) return;
      if (/^[1-5]$/.test(e.key)) choose(Number(e.key));
      else if (e.key === "ArrowLeft" && step > 0) $("#prev").click();
      else if (e.key === "ArrowRight" && !$("#next").disabled) $("#next").click();
    };
    document.addEventListener("keydown", quizKeyHandler);
  }

  function finishPerson(d) {
    const me = d.people[d.who];
    if (d.flow === "solo") {
      draft.clear();
      return go("#/r/" + history.add({ kind: "solo", a: me }));
    }
    if (d.flow === "invite") {
      draft.clear();
      return go("#/sent/" + history.add({ kind: "solo", a: me }));
    }
    if (d.flow === "local" && d.who === 0) return go("#/handoff");
    if (d.flow === "local") {
      draft.clear();
      return go("#/r/" + history.add({ kind: "pair", a: d.people[0], b: d.people[1] }) + "?fresh=1");
    }
    if (d.flow === "join") {
      draft.clear();
      return go("#/r/" + history.add({ kind: "pair", a: d.inviter, b: me }) + "?fresh=1&back=1");
    }
  }

  // ---------- 同一台设备：交接 ----------
  function viewHandoff() {
    const d = draft.get();
    if (!d || d.flow !== "local") return go("#/");
    app.innerHTML = `
      <section class="card narrow pop handoff">
        <div class="avatar">🤝</div>
        <h2><span class="name-a">${esc(d.people[0].name)}</span> 答完啦</h2>
        <p class="muted">现在把手机交给 TA。TA 答完之前不会显示 ${esc(d.people[0].name)} 的任何答案。</p>
        <label class="field"><span>TA 的昵称</span><input id="name" maxlength="12" placeholder="比如：阿澈" autocomplete="off"></label>
        <button class="btn primary block big" id="begin">TA 开始答题</button>
        <button class="link" id="redo">← ${esc(d.people[0].name)} 还想改改答案</button>
      </section>`;
    const begin = () => {
      d.people[1] = d.people[1] || { name: "TA", answers: emptyAnswers() };
      d.people[1].name = window.LT.cleanName($("#name").value) || d.people[1].name || "TA";
      Object.assign(d, { who: 1, step: d.people[1].answers.findIndex((x) => !x) === -1 ? 0 : d.people[1].answers.findIndex((x) => !x) });
      draft.set(d);
      go("#/quiz");
    };
    if (d.people[1]) $("#name").value = d.people[1].name;
    $("#begin").addEventListener("click", begin);
    $("#name").addEventListener("keydown", (e) => e.key === "Enter" && begin());
    $("#redo").addEventListener("click", () => {
      draft.set({ ...d, who: 0, step: 0 });
      go("#/quiz");
    });
  }

  // ---------- 发出邀请 ----------
  function inviteUrl(person) {
    return baseUrl() + "#invite=" + window.LT.encodePerson(person);
  }

  function viewSent(id) {
    const rec = history.get(id);
    if (!rec) return go("#/");
    const url = inviteUrl(rec.a);
    app.innerHTML = `
      <section class="card narrow pop sent">
        <div class="avatar">💌</div>
        <h2>答完啦，把链接发给 TA</h2>
        <p class="muted">TA 打开链接答完 ${N} 题后，就能看到你们的合拍报告，也会得到一条「结果链接」发回给你。</p>
        <div class="link-box"><code>${esc(url)}</code></div>
        <div class="row">
          <button class="btn primary grow" id="share">${navigator.share ? "发送给 TA" : "复制邀请链接"}</button>
        </div>
        <div class="row">
          <button class="btn ghost grow" data-go="#/r/${id}">先看看我的画像</button>
          <button class="btn ghost grow" data-go="#/">回首页</button>
        </div>
        <p class="hint">TA 发回结果链接后，粘贴到首页「收到了 TA 发来的链接」里就能打开</p>
      </section>`;
    bindGo();
    $("#share").addEventListener("click", () => share(`${rec.a.name} 邀请你一起测测我们的恋爱观合拍度 💞`, url, "邀请链接已复制，发给 TA 吧"));
  }

  // ---------- 报告 ----------
  function pairUrl(a, b) {
    return baseUrl() + "#pair=" + window.LT.encodePerson(a) + "." + window.LT.encodePerson(b);
  }

  function openPair(a, b) {
    go("#/r/" + history.add({ kind: "pair", a, b }) + "?fresh=1");
  }

  function scaleLabel(v) {
    return SCALE[v - 1];
  }

  function viewResult(id, params) {
    const rec = history.get(id);
    if (!rec) {
      app.innerHTML = `<section class="card narrow"><h2>没找到这份报告</h2><p>可能已经被删除了。</p><button class="btn primary" data-go="#/">回首页</button></section>`;
      return bindGo();
    }
    if (rec.kind === "solo") return viewSolo(rec);

    const r = window.LT.pair(rec.a, rec.b);
    const A = esc(r.a.name), B = esc(r.b.name);
    const back = params.get("back") === "1";
    const talkDims = r.focus.length ? r.focus : r.strengths.slice(0, 1);

    app.innerHTML = `
      <section class="report">
        ${back ? `<div class="card send-back pop">
          <b>📨 把结果发回给 ${A}</b>
          <p>${A} 那边还看不到你的答案，把下面的链接发给 TA，TA 打开就能看到同一份报告。</p>
          <button class="btn primary block" id="send-back">${navigator.share ? `发送给 ${A}` : "复制结果链接"}</button>
        </div>` : ""}

        <header class="r-hero card">
          <div class="r-names"><span class="name-a">${A}</span><span class="heart">💞</span><span class="name-b">${B}</span></div>
          <div class="ring" style="--p:${r.match}">
            <svg viewBox="0 0 120 120"><defs><linearGradient id="rg" x1="0" x2="1"><stop offset="0" stop-color="${COLORS.a}"/><stop offset="1" stop-color="${COLORS.b}"/></linearGradient></defs>
              <circle cx="60" cy="60" r="52" class="ring-bg"/><circle cx="60" cy="60" r="52" class="ring-fg" stroke="url(#rg)" pathLength="100"/></svg>
            <div class="ring-num"><b id="match">0</b><span>%</span></div>
          </div>
          <div class="grade">${r.grade.emoji} ${r.grade.name}</div>
          <p class="grade-desc">${r.grade.desc}</p>
          <p class="mini-stats">30 道题里有 <b>${r.sameCount}</b> 道选得一模一样</p>
        </header>

        <div class="grid-2">
          <section class="card">
            <h3>六维对比</h3>
            ${radarSVG([{ scores: r.a.scores, color: COLORS.a }, { scores: r.b.scores, color: COLORS.b }])}
            <div class="legend"><span class="name-a">● ${A}</span><span class="name-b">● ${B}</span></div>
          </section>
          <section class="card types">
            <h3>你们的类型</h3>
            ${[[r.a, "a"], [r.b, "b"]].map(([p, k]) => `
              <div class="type-row ${k}">
                <div class="type-emoji">${p.type.emoji}</div>
                <div><small class="name-${k}">${esc(p.name)}</small><b>${p.type.name}</b><p>${p.type.tagline}</p></div>
              </div>`).join("")}
            <div class="combo"><b>组合解读</b><p>${esc(r.combo)}</p></div>
          </section>
        </div>

        <section class="card">
          <h3>逐项看看</h3>
          <div class="dim-list">
            ${r.dims.map((dm) => `
              <div class="dim-item">
                <div class="dim-head"><span>${dm.icon} <b>${dm.key}</b></span>
                  <span class="pill ${dm.status}">${{ same: "高度一致", mild: "温和差异", gap: "明显分歧" }[dm.status]} · 差 ${dm.diff}</span></div>
                <div class="track">
                  <i class="span" style="left:${((Math.min(dm.a, dm.b) - 5) / 20) * 100}%; width:${(dm.diff / 20) * 100}%"></i>
                  <i class="dot a" style="left:${((dm.a - 5) / 20) * 100}%" title="${A} ${dm.a}"></i>
                  <i class="dot b" style="left:${((dm.b - 5) / 20) * 100}%" title="${B} ${dm.b}"></i>
                </div>
                <div class="dim-vals"><span class="name-a">${A} ${dm.a}</span><span class="name-b">${B} ${dm.b}</span></div>
                ${dm.status !== "same" ? `<p class="dim-tip">💡 ${dm.advice}</p>` : ""}
              </div>`).join("")}
          </div>
          <p class="hint">每个维度 5 题，满分 25；点在越右边，代表这方面的需求越强</p>
        </section>

        ${r.gaps.length ? `<section class="card">
          <h3>想法差得最远的 ${r.gaps.length} 道题</h3>
          <div class="gaps">
            ${r.gaps.map((g) => `<div class="gap">
              <p>「${esc(g.text)}」</p>
              <div class="gap-ans"><span class="name-a">${A}：${scaleLabel(g.a)}</span><span class="name-b">${B}：${scaleLabel(g.b)}</span></div>
            </div>`).join("")}
          </div>
          <p class="hint">这几道题很适合当面问问对方：「你为什么这么选？」</p>
        </section>` : ""}

        <section class="card">
          <h3>今晚可以聊聊</h3>
          <div class="talk">
            ${talkDims.flatMap((dm) => dm.talk.map((t) => `<div class="talk-card" style="--c:${dm.color}"><small>${dm.icon} ${dm.key}</small><p>${t}</p></div>`)).join("")}
          </div>
        </section>

        <section class="card">
          <h3>给你们的 3 条建议</h3>
          <ol class="tips">${r.tips.map((t) => `<li>${esc(t)}</li>`).join("")}</ol>
        </section>

        <div class="actions sticky">
          <button class="btn primary" id="poster">🖼 生成海报</button>
          <button class="btn ghost" id="copy-link">🔗 复制结果链接</button>
        </div>
        <nav class="more-actions"><a href="#/start/pair">再测一次</a><a href="#/history">历史记录</a><a href="#/">首页</a></nav>
        <p class="disclaimer">结果按题目规则计算，仅供娱乐和沟通参考。真实的关系，还要靠两个人用心经营。</p>
      </section>`;

    bindGo();
    const url = pairUrl(rec.a, rec.b);
    countUp($("#match"), r.match);
    if (params.get("fresh") === "1" && r.match >= 85) setTimeout(() => hearts(), 600);
    $("#poster").addEventListener("click", () => showPoster({ kind: "pair", ...r }));
    $("#copy-link").addEventListener("click", () => copy(url, "结果链接已复制，打开就能看到这份报告"));
    if (back) $("#send-back").addEventListener("click", () => share(`我答完啦！我们的合拍度是 ${r.match}%，来看看完整报告 💞`, url, "结果链接已复制，发给 TA 吧"));
  }

  function viewSolo(rec) {
    const p = window.LT.profile(rec.a);
    const t = p.type;
    app.innerHTML = `
      <section class="report">
        <header class="r-hero card solo-hero">
          <small class="name-a">${esc(p.name)} 的恋爱观画像</small>
          <div class="big-emoji">${t.emoji}</div>
          <h2>${t.name}</h2>
          <p class="tagline">「${t.tagline}」</p>
          <p class="grade-desc">${t.desc}</p>
        </header>

        <div class="grid-2">
          <section class="card">
            <h3>六维画像</h3>
            ${radarSVG([{ scores: p.scores, color: COLORS.a }])}
          </section>
          <section class="card">
            <h3>关于你的类型</h3>
            <dl class="facts">
              <dt>你最需要</dt><dd>${t.needs}</dd>
              <dt>你最能给</dt><dd>${t.gives}</dd>
              <dt>小提醒</dt><dd>${t.watch}</dd>
              <dt>最突出的两个维度</dt><dd>${DIMS.find((d) => d.key === t.top).icon} ${t.top}、${DIMS.find((d) => d.key === t.second).icon} ${t.second}</dd>
            </dl>
          </section>
        </div>

        <section class="card">
          <h3>逐项解读</h3>
          <div class="dim-list">
            ${DIMS.map((dm) => {
              const s = p.scores[dm.key];
              return `<div class="dim-item">
                <div class="dim-head"><span>${dm.icon} <b>${dm.key}</b></span><span class="score">${s}<small>/25</small></span></div>
                <div class="bar"><i style="width:${((s - 5) / 20) * 100}%; background:${dm.color}"></i></div>
                <p class="dim-tip">${dm.level[window.LT.level(s)]}</p>
              </div>`;
            }).join("")}
          </div>
        </section>

        <section class="card invite-cta">
          <h3>想知道你们合不合拍？</h3>
          <p>不用重答，直接用这份答案邀请 TA。TA 答完，你们就能看到合盘报告。</p>
          <button class="btn primary" id="invite">💌 邀请 TA 来测</button>
        </section>

        <div class="actions sticky">
          <button class="btn primary" id="poster">🖼 生成海报</button>
          <button class="btn ghost" id="invite-2">💌 邀请 TA 来测</button>
        </div>
        <nav class="more-actions"><a href="#/start/solo">重新测</a><a href="#/history">历史记录</a><a href="#/">首页</a></nav>
        <p class="disclaimer">结果按题目规则计算，仅供娱乐和自我了解参考。</p>
      </section>`;
    bindGo();
    $("#poster").addEventListener("click", () => showPoster({ kind: "solo", person: p }));
    $$("#invite, #invite-2").forEach((b) => b.addEventListener("click", () => go("#/sent/" + rec.id)));
  }

  // ---------- 历史 ----------
  function viewHistory() {
    const list = history.list();
    app.innerHTML = `
      <section class="card history">
        <button class="link back" data-go="#/">← 返回</button>
        <h2>历史记录</h2>
        <div class="row wrap">
          <button class="btn ghost" id="export" ${list.length ? "" : "disabled"}>导出</button>
          <label class="btn ghost">导入<input type="file" id="import" accept="application/json" hidden></label>
          <button class="btn ghost danger" id="clear" ${list.length ? "" : "disabled"}>清空</button>
        </div>
        ${list.length ? `<ul class="h-list">
          ${list.map((rec) => {
            if (rec.kind === "solo") {
              const p = window.LT.profile(rec.a);
              return `<li><button class="h-item" data-go="#/r/${rec.id}"><span class="h-emoji">${p.type.emoji}</span>
                <span class="h-main"><b>${esc(p.name)} · ${p.type.name}</b><small>个人画像 · ${fmtTime(rec.ts)}</small></span></button>
                <button class="h-del" data-del="${rec.id}" aria-label="删除">×</button></li>`;
            }
            const r = window.LT.pair(rec.a, rec.b);
            return `<li><button class="h-item" data-go="#/r/${rec.id}"><span class="h-score">${r.match}%</span>
              <span class="h-main"><b><span class="name-a">${esc(r.a.name)}</span> 💞 <span class="name-b">${esc(r.b.name)}</span></b><small>${r.grade.name} · ${fmtTime(rec.ts)}</small></span></button>
              <button class="h-del" data-del="${rec.id}" aria-label="删除">×</button></li>`;
          }).join("")}
        </ul>` : `<p class="empty">还没有记录，测一次就会出现在这里。</p>`}
        <p class="hint">记录只保存在这台设备的浏览器里，换设备可以先导出再导入</p>
      </section>`;
    bindGo();
    $$("[data-del]").forEach((b) => b.addEventListener("click", async () => {
      if (!(await confirmBox("删除这条记录？", "删除"))) return;
      history.remove(b.dataset.del);
      viewHistory();
    }));
    $("#clear").addEventListener("click", async () => {
      if (!(await confirmBox("清空全部历史记录？这一步不能撤销。", "全部清空"))) return;
      history.clear();
      viewHistory();
    });
    $("#export").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(history.list(), null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "恋爱观测试-历史记录.json";
      a.click();
      URL.revokeObjectURL(a.href);
    });
    $("#import").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const n = history.merge(JSON.parse(await file.text()));
        toast(n ? `导入了 ${n} 条记录` : "没有新的记录");
        viewHistory();
      } catch (err) {
        toast("文件格式不对");
      }
    });
  }

  // ---------- 路由 ----------
  function route() {
    if (quizKeyHandler) {
      document.removeEventListener("keydown", quizKeyHandler);
      quizKeyHandler = null;
    }
    const hash = location.hash.slice(1);
    window.scrollTo(0, 0);

    if (hash.startsWith("invite=")) return viewInvite(hash.slice(7));
    if (hash.startsWith("pair=")) {
      const parsed = window.LT.parseShared(location.hash);
      if (parsed) return openPairReplace(parsed);
      return viewInvite("");
    }
    const [path, query] = hash.replace(/^\//, "").split("?");
    const params = new URLSearchParams(query || "");
    const [name, arg] = path.split("/");
    switch (name) {
      case "start": return viewStart(arg === "solo" ? "solo" : "pair");
      case "quiz": return viewQuiz();
      case "handoff": return viewHandoff();
      case "sent": return viewSent(arg);
      case "r": return viewResult(arg, params);
      case "history": return viewHistory();
      default: return viewHome();
    }
  }

  // 打开别人发来的结果链接：存进历史，并把地址换成本地报告地址，避免「返回」又回到长链接
  function openPairReplace(parsed) {
    const id = history.add({ kind: "pair", a: parsed.a, b: parsed.b });
    window.history.replaceState(null, "", "#/r/" + id + "?fresh=1");
    route();
  }

  window.addEventListener("hashchange", route);
  route();
})();
