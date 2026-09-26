import {catalog,traitsFor} from './config';
import {buildEntity} from './src/particles/particleData';
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const mix = (a, b, t) => a + (b - a) * t;

// ------------------------------------------------------------------ render
export function renderEntity(seed,selected,SIZE=480) {
 const SS=1;
  const traits=traitsFor(seed,selected);
 const built=buildEntity(seed,traits,{quality:'export',pixelScale:.55});
 const color=catalog.find(d=>d.key==='colorway').choices.find(c=>c.id===selected.colorway);
 const bg=catalog.find(d=>d.key==='background').choices.find(c=>c.id===selected.background);
 const pal={bgTop:bg.rgb,bgBottom:bg.rgb,colorA:color.rgb.map(c=>c*.12),colorB:color.rgb,accent:color.rgb,ambient:color.rgb};const paletteId=color.id;
  const W = SIZE * SS, H = SIZE * SS;
  const buf = new Uint8Array(W * H * 3);

  // background: vertical gradient, exactly like the studio scene
  for (let y = 0; y < H; y++) {
    const t = y / (H - 1);
    const r = (mix(pal.bgTop[0], pal.bgBottom[0], t) * 255) | 0;
    const g = (mix(pal.bgTop[1], pal.bgBottom[1], t) * 255) | 0;
    const b = (mix(pal.bgTop[2], pal.bgBottom[2], t) * 255) | 0;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3;
      buf[i] = r; buf[i + 1] = g; buf[i + 2] = b;
    }
  }

  const P = built.particles;
  // world -> pixel. The silhouette is built around origin, roughly 2 units tall.
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < P.count; i++) {
    if (![1, 2, 3, 8].includes(P.region[i])) continue;
    const x = P.home[i * 3], y = P.home[i * 3 + 1];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const spanY = (maxY - minY) || 1;
  const spanX = (maxX - minX) || 1;
  const pad = 0.14;
  const scale = Math.min(W * (1 - pad * 2) / spanX, H * (1 - pad * 2) / spanY);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const toPx = (x, y) => [W / 2 + (x - cx) * scale, H / 2 - (y - cy) * scale];

  // body fragments
  for (let i = 0; i < P.count; i++) {
    if (![1, 2, 3, 8].includes(P.region[i])) continue;
    const [px, py] = toPx(P.home[i * 3], P.home[i * 3 + 1]);
    const s = Math.max(1, P.size[i] * scale);
    const br = clamp01(P.bright[i]);
    const acc = P.accent[i] | 0;
    let col;
    if (acc === 1) col = pal.accent;
    else if (acc === 2) col = [.85, .85, .85];
    else if (acc === 3) col = [.65, .65, .65];
    else col = [
      mix(pal.colorA[0], pal.colorB[0], br),
      mix(pal.colorA[1], pal.colorB[1], br),
      mix(pal.colorA[2], pal.colorB[2], br),
    ];
    if(P.region[i]===3){col=selected.eyes==='dim'?color.rgb.map(c=>c*.35):selected.eyes==='burning'?[1,.35,.12]:[.98,.98,1];if(selected.eyes==='beam')paintSquare(buf,W,H,px,py,s*2.1,col.map(c=>c*.5));}
 // edge fragments
    const boost = 1 + (P.edge ? P.edge[i] * 0.35 : 0);
    paintSquare(buf, W, H, px, py, s, col.map((c) => c * boost));
  }

  return { buf, W, H, traits, paletteId, pal };
}
function paintSquare(buf, W, H, cx, cy, s, rgb) {
  const half = s / 2;
  const x0 = Math.max(0, Math.floor(cx - half)), x1 = Math.min(W - 1, Math.ceil(cx + half));
  const y0 = Math.max(0, Math.floor(cy - half)), y1 = Math.min(H - 1, Math.ceil(cy + half));
  const r = clamp01(rgb[0]) * 255, g = clamp01(rgb[1]) * 255, b = clamp01(rgb[2]) * 255;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = (y * W + x) * 3;
      // additive-ish compositing so overlapping fragments glow like the shader
      buf[i] = Math.min(255, buf[i] * 0.25 + r * 0.85);
      buf[i + 1] = Math.min(255, buf[i + 1] * 0.25 + g * 0.85);
      buf[i + 2] = Math.min(255, buf[i + 2] * 0.25 + b * 0.85);
    }
  }
}
