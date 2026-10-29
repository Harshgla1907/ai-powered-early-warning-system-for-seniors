// Small hand-rolled SVG helpers so we don't need a chart library.

function sparkline(values, color) {
  const w = 300, h = 60, pad = 6;
  const max = 100;
  const step = (w - pad * 2) / (values.length - 1);
  const pts = values.map((v, i) => [pad + i * step, h - pad - (v / max) * (h - pad * 2)]);
  const last = pts[pts.length - 1];
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="60" role="img" aria-label="Risk score over the last 7 days">
    <polyline points="${pts.map(p => p.join(",")).join(" ")}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="${last[0]}" cy="${last[1]}" r="5" fill="${color}"/>
  </svg>`;
}

function barRow(label, value, max, suffix) {
  const pct = Math.round((value / max) * 100);
  return `<div style="display:grid;grid-template-columns:110px 1fr 46px;gap:8px;align-items:center;margin-bottom:8px">
    <span>${label}</span>
    <div style="background:#e5ece9;border-radius:4px;height:16px"><div style="width:${pct}%;background:var(--brand);height:100%;border-radius:4px"></div></div>
    <b>${value}${suffix || ""}</b>
  </div>`;
}
