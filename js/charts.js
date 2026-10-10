// 雷达图（SVG）和分享海报（Canvas），都不依赖第三方库。
window.LTCharts = (function () {
  const { DIMS } = window.LT_DATA;
  const MAX = 25;
  const COLORS = { a: "#F0567A", b: "#7C6CF2" };

  function point(cx, cy, r, i, value) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / DIMS.length;
    const k = (value / MAX) * r;
    return [cx + k * Math.cos(angle), cy + k * Math.sin(angle)];
  }

  function radarSVG(series, opts = {}) {
    const size = opts.size || 340, cx = size / 2, cy = size / 2, r = size * 0.34;
    const rings = [5, 10, 15, 20, 25].map((v) => {
      const pts = DIMS.map((_, i) => point(cx, cy, r, i, v).join(",")).join(" ");
      return `<polygon points="${pts}" class="radar-ring"/>`;
    }).join("");
    const axes = DIMS.map((d, i) => {
      const [x, y] = point(cx, cy, r, i, MAX);
      const [lx, ly] = point(cx, cy, r + 30, i, MAX);
      const anchor = Math.abs(lx - cx) < 4 ? "middle" : lx > cx ? "start" : "end";
      return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" class="radar-axis"/>
        <text x="${lx}" y="${ly}" text-anchor="${anchor}" dominant-baseline="middle" class="radar-label">${d.icon} ${d.key}</text>`;
    }).join("");
    const shapes = series.map((s, idx) => {
      const pts = DIMS.map((d, i) => point(cx, cy, r, i, s.scores[d.key]));
      const dots = pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.5" fill="${s.color}"/>`).join("");
      return `<g class="radar-shape" style="--delay:${idx * 180}ms; transform-origin:${cx}px ${cy}px">
        <polygon points="${pts.map((p) => p.join(",")).join(" ")}" fill="${s.color}" fill-opacity="0.22" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round"/>${dots}</g>`;
    }).join("");
    return `<svg viewBox="-56 0 ${size + 112} ${size}" class="radar" role="img" aria-label="六维度雷达图">${rings}${axes}${shapes}</svg>`;
  }

  // ---------- 海报 ----------
  const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC",sans-serif';

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function wrap(ctx, text, maxWidth) {
    const lines = [];
    let line = "";
    for (const ch of text) {
      if (ctx.measureText(line + ch).width > maxWidth && line) {
        lines.push(line);
        line = ch;
      } else line += ch;
    }
    if (line) lines.push(line);
    return lines;
  }

  function drawRadar(ctx, cx, cy, r, series) {
    ctx.save();
    ctx.lineWidth = 2;
    [5, 10, 15, 20, 25].forEach((v) => {
      ctx.beginPath();
      DIMS.forEach((_, i) => {
        const [x, y] = point(cx, cy, r, i, v);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.closePath();
      ctx.strokeStyle = "rgba(43,34,53,0.10)";
      ctx.stroke();
    });
    ctx.font = `600 30px ${FONT}`;
    ctx.fillStyle = "#5B4F66";
    DIMS.forEach((d, i) => {
      const [lx, ly] = point(cx, cy, r + 60, i, MAX);
      ctx.textAlign = Math.abs(lx - cx) < 4 ? "center" : lx > cx ? "left" : "right";
      ctx.textBaseline = "middle";
      const [ax, ay] = point(cx, cy, r, i, MAX);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(ax, ay);
      ctx.stroke();
      ctx.fillText(d.key, lx + (ctx.textAlign === "left" ? -30 : ctx.textAlign === "right" ? 30 : 0), ly);
    });
    series.forEach((s) => {
      ctx.beginPath();
      DIMS.forEach((d, i) => {
        const [x, y] = point(cx, cy, r, i, s.scores[d.key]);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = s.color + "40";
      ctx.fill();
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 5;
      ctx.lineJoin = "round";
      ctx.stroke();
    });
    ctx.restore();
  }

  function poster(result, siteUrl) {
    const W = 1080, H = 1620;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#FFF1EC");
    bg.addColorStop(0.55, "#FCE7F3");
    bg.addColorStop(1, "#EDE9FE");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(240,86,122,0.08)";
    [[120, 160, 140], [960, 300, 180], [880, 1460, 220], [140, 1380, 120]].forEach(([x, y, r]) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    });

    roundRect(ctx, 60, 60, W - 120, H - 120, 48);
    ctx.fillStyle = "rgba(255,255,255,0.86)";
    ctx.fill();

    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#2B2235";
    ctx.font = `600 34px ${FONT}`;
    ctx.fillText("恋爱观测试 · 我们合拍吗", W / 2, 150);

    if (result.kind === "pair") {
      const { a, b, match, grade } = result;
      ctx.font = `700 46px ${FONT}`;
      ctx.fillStyle = COLORS.a;
      ctx.textAlign = "right";
      ctx.fillText(a.name, W / 2 - 50, 240);
      ctx.fillStyle = COLORS.b;
      ctx.textAlign = "left";
      ctx.fillText(b.name, W / 2 + 50, 240);
      ctx.textAlign = "center";
      ctx.font = `40px ${FONT}`;
      ctx.fillText("💞", W / 2, 238);

      const grad = ctx.createLinearGradient(W / 2 - 160, 0, W / 2 + 160, 0);
      grad.addColorStop(0, COLORS.a);
      grad.addColorStop(1, COLORS.b);
      ctx.fillStyle = grad;
      ctx.font = `800 190px ${FONT}`;
      ctx.fillText(`${match}%`, W / 2, 440);
      ctx.fillStyle = "#2B2235";
      ctx.font = `700 44px ${FONT}`;
      ctx.fillText(`${grade.emoji} ${grade.name}`, W / 2, 515);

      drawRadar(ctx, W / 2, 895, 205, [
        { scores: a.scores, color: COLORS.a },
        { scores: b.scores, color: COLORS.b },
      ]);

      [[a, COLORS.a, 120], [b, COLORS.b, W / 2 + 15]].forEach(([p, color, x]) => {
        roundRect(ctx, x, 1205, W / 2 - 135, 160, 28);
        ctx.fillStyle = color + "14";
        ctx.fill();
        ctx.textAlign = "center";
        ctx.fillStyle = color;
        ctx.font = `600 30px ${FONT}`;
        ctx.fillText(p.name, x + (W / 2 - 135) / 2, 1258);
        ctx.fillStyle = "#2B2235";
        ctx.font = `700 40px ${FONT}`;
        ctx.fillText(`${p.type.emoji} ${p.type.name}`, x + (W / 2 - 135) / 2, 1322);
      });
      ctx.font = `30px ${FONT}`;
      ctx.fillStyle = "#5B4F66";
      const line = result.strengths[0]
        ? `最合拍：${result.strengths.map((d) => d.key).join("、")}` + (result.focus[0] ? `　多聊聊：${result.focus[0].key}` : "")
        : result.focus[0] ? `最值得多聊聊：${result.focus.map((d) => d.key).join("、")}` : "";
      ctx.fillText(line, W / 2, 1425);
    } else {
      const p = result.person;
      ctx.font = `600 40px ${FONT}`;
      ctx.fillStyle = COLORS.a;
      ctx.fillText(`${p.name} 的恋爱观画像`, W / 2, 240);
      ctx.font = `120px ${FONT}`;
      ctx.fillText(p.type.emoji, W / 2, 400);
      ctx.fillStyle = "#2B2235";
      ctx.font = `800 76px ${FONT}`;
      ctx.fillText(p.type.name, W / 2, 500);
      ctx.font = `34px ${FONT}`;
      ctx.fillStyle = "#5B4F66";
      ctx.fillText(`「${p.type.tagline}」`, W / 2, 565);
      drawRadar(ctx, W / 2, 905, 210, [{ scores: p.scores, color: COLORS.a }]);
      ctx.font = `30px ${FONT}`;
      ctx.fillStyle = "#5B4F66";
      wrap(ctx, p.type.desc, W - 280).slice(0, 3).forEach((l, i) => ctx.fillText(l, W / 2, 1275 + i * 48));
      ctx.font = `600 30px ${FONT}`;
      ctx.fillStyle = COLORS.a;
      ctx.fillText(`最突出：${p.type.top}、${p.type.second}`, W / 2, 1420);
    }

    ctx.font = `26px ${FONT}`;
    ctx.fillStyle = "#9A8FA5";
    ctx.textAlign = "center";
    ctx.fillText(`来测测你们的合拍度 → ${siteUrl}`, W / 2, H - 110);
    return canvas;
  }

  return { radarSVG, poster, COLORS };
})();
