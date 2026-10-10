// film.js — The Ostrich, Plate VII. One plate builds over the film: cut → proof → passes → labels →
// eye roundel → iris → press pass → nest & eggs → finished plate. 88 BPM grid, 85 beats ≈ 57.95 s.
import * as B from './engine/burin.js';
import { drawSheet, paperTexture, borderInk, engraveText, writeScript, wrapLines, roundelFrame, PAL, FONTS, measure } from './engine/plate.js';
import { Wash } from './engine/wash.js';
import * as Cu from './engine/copper.js';
import { buildOstrich, buildEyeDetail } from './ostrich.js';

export const BPM = 88, BEAT = 60 / BPM;
const bb = n => n * BEAT;                      // beat → seconds
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => B.clamp((t - a) / (b - a));
const ss = (x, a = 0, b = 1) => { const u = seg(x, a, b); return u * u * (3 - 2 * u); };
const eio = x => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;

const W = 1920, H = 1080, PLATE = [70, 44, 1850, 1036], BORDER = [100, 72, 1820, 1008];
const SLOT = [1545, 280], RR = 118;

const T = {
  first: [0.9, bb(9) - 0.02],                  // the first stroke, on copper
  peel: [bb(9), bb(9) + 0.95],                 // the proof is pulled early: copper → paper
  olRest: [bb(9) + 1.05, bb(14)],              // remaining outlines on paper
  gr: [bb(14.1), bb(16.8)],                    // ground
  h1: [bb(17), bb(21)],                        // first hatch family
  h2: [bb(28), bb(33)],                        // crossing
  h3: [bb(33.2), bb(35.8)],                    // darks
  lblRule: [bb(24.5), bb(26)],                 // height rule + prints
  lblA: [bb(24.8), bb(25.7)], lblB: [bb(25.4), bb(26.3)],
  lblC: [bb(27.3), bb(28.2)], lblD: [bb(28.4), bb(29.3)],
  strideRule: [bb(31), bb(32.2)], lblE: [bb(31.8), bb(32.9)],
  eyePush: [bb(36), bb(37.6)],
  silence: [bb(38), bb(40.3)],
  ring: bb(40.3), burn: [bb(42), bb(42.7)], art: [bb(42.55), bb(44.9)],
  travel: [bb(45), bb(45) + 1.6],
  labN: bb(46.8), labL: bb(47.4), labQ: bb(48.1),
  iris: bb(49.1),
  roller: [bb(53), bb(55.1)],
  egg: [bb(59), bb(62.5)],
  washA: bb(60.2), washB: bb(60.95),
  fx: [bb(63), bb(67)],
  lblF: [bb(63.1), bb(64.2)],
  title: bb(71), latin: bb(73.5), plateNo: bb(75), series: bb(75.4),
  sigL: bb(77.4), sigR: bb(77.9), lock: bb(79),
};

const LINES = [
  { id: 'l1', t: 0.8 }, { id: 'l2', t: bb(11) }, { id: 'l3', t: bb(24.7) },
  { id: 'l4', t: bb(41) }, { id: 'l5', t: bb(60.2) }, { id: 'l6', t: bb(75.5) },
];

export function makeFilm(texts, voiceDur, subs) {
  const bird = buildOstrich({ x: 940, y: 930, s: 6.0, seed: 7 });
  const art = buildEyeDetail({ seed: 31 });
  const ink = bird.ink;

  // ---------------------------------------------------------------- voice
  const vd = id => voiceDur[id] || 3;
  const vo = LINES.filter(l => texts[l.id]).map(l => ({ id: l.id, t0: l.t, t1: l.t + vd(l.id), text: texts[l.id] }));
  const cues = subs && subs.length ? subs : vo.map((v, i) => ({ t0: v.t0 - 0.1, t1: v.t1 + 0.6, text: v.text }));

  // ---------------------------------------------------------------- schedules
  ink.group('ol0'); ink.schedule('ol0', T.first[0], T.first[1], { conc: 1 });
  ink.group('ol'); ink.schedule('ol', T.olRest[0], T.olRest[1], { conc: 3 });
  ink.schedule('gr', T.gr[0], T.gr[1], { conc: 8 });
  ink.schedule('h1', T.h1[0], T.h1[1], { conc: 40 });
  ink.schedule('h2', T.h2[0], T.h2[1], { conc: 40 });
  ink.schedule('h3', T.h3[0], T.h3[1], { conc: 30 });
  ink.schedule('fx', T.fx[0], T.fx[1], { conc: 30 });
  ink.schedule('egg', T.egg[0], T.egg[1], { conc: 16 });
  ink.group('lbl');
  // height rule (left) + stride rule and prints
  B.stroke(ink, [[250, 930], [250, 334]], 1.3, { taper: 8, grain: 0.1, seed: 201 });
  B.stroke(ink, [[242, 334], [258, 334]], 1.3, { taper: 4, seed: 202 });
  B.stroke(ink, [[242, 930], [258, 930]], 1.3, { taper: 4, seed: 203 });
  B.stroke(ink, [[640, 966], [1272, 966]], 1.2, { taper: 8, grain: 0.1, seed: 204 });
  B.stroke(ink, [[640, 958], [640, 974]], 1.2, { taper: 4, seed: 205 });
  B.stroke(ink, [[1272, 958], [1272, 974]], 1.2, { taper: 4, seed: 206 });
  for (const [px, py] of [[640, 941], [1272, 941]]) {   // two-toed prints
    B.outline(ink, B.ellipse(px, py, 8.5, 3.2, -0.12, 16).polys[0], { w: 0.8, vary: 0.4, run: 0, seed: 207 });
    B.outline(ink, B.ellipse(px + 9, py + 2.5, 5, 2.6, 0.3, 14).polys[0], { w: 0.7, vary: 0.4, run: 0, seed: 208 });
  }
  ink.schedule('lbl', T.lblRule[0], T.strideRule[1], { conc: 4 });
  ink.build();

  art.ink.group('aol'); art.ink.schedule('aol', T.art[0], T.art[0] + (T.art[1] - T.art[0]) * 0.42, { conc: 5 });
  art.ink.group('art'); art.ink.schedule('art', T.art[0] + (T.art[1] - T.art[0]) * 0.4, T.art[1], { conc: 30 });
  art.ink.build();

  // ---------------------------------------------------------------- washes
  const wash = new Wash({ scale: 1.5 });
  const eggA = bird.regions.eggA[0], eggB = bird.regions.eggB[0];
  wash.add({ path: eggA.path, polys: eggA.polys, color: '#e0cfa4', alpha: 0.7, origin: [eggA.polys[0][0][0] - 8, eggA.polys[0][0][1]], t0: T.washA, dur: 1.5, seed: 3, spill: 2.6 });
  wash.add({ path: eggB.path, polys: eggB.polys, color: '#d9c69a', alpha: 0.68, origin: [eggB.polys[0][0][0] - 6, eggB.polys[0][0][1] - 4], t0: T.washB, dur: 1.4, seed: 4, spill: 2.6 });
  const artWash = new Wash({ scale: 1.5 });
  const irisPath = new Path2D(); irisPath.arc(-30, -30, 205, 0, Math.PI * 2);
  artWash.add({ path: irisPath, polys: B.ellipse(-30, -30, 205, 205, 0, 48).polys, color: '#c9862e', alpha: 0.62, origin: [-140, -100], t0: T.iris, dur: 1.4, seed: 6, spill: 10, offset: [6, 4] });

  // ---------------------------------------------------------------- camera
  const EYE = bird.focus.eye;
  const ol0 = ink.S.find(s0 => s0.g === 'ol0');
  const tipAt = t => {
    const f = (ol0.n - 1) * seg(t, T.first[0], T.first[1]), j = Math.min(ol0.n - 2, Math.floor(f)), u = f - j;
    const x = lerp(ol0.xy[2 * j], ol0.xy[2 * j + 2], u), y = lerp(ol0.xy[2 * j + 1], ol0.xy[2 * j + 3], u);
    const k0 = Math.max(0, j - 3), k1 = Math.min(ol0.n - 1, j + 4);
    const dx = ol0.xy[2 * k1] - ol0.xy[2 * k0], dy = ol0.xy[2 * k1 + 1] - ol0.xy[2 * k0 + 1], L = Math.hypot(dx, dy) || 1;
    return { x, y, dx: dx / L, dy: dy / L };
  };
  const followCam = t => { const tp = tipAt(Math.min(t, T.first[1])); return { cx: tp.x + 16, cy: tp.y + 26, z: 4.2 * (1 - 0.03 * Math.min(t, 3)), rot: -0.045 + 0.011 * Math.min(t, 3) }; };
  const WIDE = { cx: 960, cy: 545, z: 1.0, rot: 0 };
  const EYEFR = { cx: EYE.x + 4, cy: EYE.y + 2, z: 3.4, rot: 0 };
  const READ = { cx: 1235, cy: 330, z: 1.42, rot: 0 };
  const keys = [];
  const K = (t, c, e = eio) => keys.push([t, c, e]);
  K(T.peel[1], followCam(T.peel[1]), x => x);
  K(bb(14), { cx: 905, cy: 620, z: 1.5 });
  K(bb(17.5), { cx: 950, cy: 565, z: 1.06 });
  K(bb(24), { cx: 950, cy: 565, z: 1.06 }, x => x);
  K(bb(27.5), { cx: 1008, cy: 762, z: 1.62 });
  K(bb(31), { cx: 893, cy: 788, z: 1.3 });
  K(T.eyePush[0], { cx: 893, cy: 788, z: 1.3 }, x => x);
  K(T.eyePush[1], EYEFR);
  K(T.travel[0], EYEFR, x => x);
  K(T.travel[1] + 0.55, READ);
  K(bb(52.6), READ, x => x);
  K(bb(53.8), WIDE);
  K(T.lock, WIDE, x => x);
  K(bb(84.4), { cx: 960, cy: 547, z: 1.018 });
  const camKeys = t => {
    let i = 0; while (i < keys.length - 1 && keys[i + 1][0] <= t) i++;
    const [ta, ca] = keys[i], nx = keys[i + 1]; if (!nx) return ca;
    const [tb, cb, e] = nx, u = e(seg(t, ta, tb));
    const z = Math.exp(lerp(Math.log(ca.z), Math.log(cb.z), u));
    const wa = 1 / ca.z, wb = 1 / cb.z;
    const k = Math.abs(wb - wa) > 1e-6 ? B.clamp((1 / z - wa) / (wb - wa)) : u;
    return { cx: lerp(ca.cx, cb.cx, k), cy: lerp(ca.cy, cb.cy, k), z, rot: lerp(ca.rot || 0, cb.rot || 0, u) };
  };
  const camAt = t => {
    if (t < T.peel[1]) return followCam(t);
    if (t >= T.travel[0] && t <= T.travel[1] + 0.55) {   // the signature move: ride with the roundel
      const u = eio(seg(t, T.travel[0], T.travel[1] + 0.55));
      const r = roundelAt(Math.min(t, T.travel[1]));
      const z = Math.exp(lerp(Math.log(EYEFR.z), Math.log(READ.z), u));
      const w = Math.pow(ss(u, 0.25, 0.95), 1.5), k0 = ss(u, 0, 0.45);
      const fx = lerp(EYEFR.cx, r.x + (READ.cx - SLOT[0]) * 0.3, k0), fy = lerp(EYEFR.cy, r.y + (READ.cy - SLOT[1]) * 0.3, k0);
      return { cx: lerp(fx, READ.cx, w), cy: lerp(fy, READ.cy, w), z, rot: lerp(0.008, 0, u) };
    }
    return camKeys(t);
  };

  // ---------------------------------------------------------------- roundel
  function roundelAt(t) {
    if (t < T.ring) return null;
    const u = eio(seg(t, T.travel[0], T.travel[1]));
    const x = lerp(EYE.x, SLOT[0], u), y = lerp(EYE.y, SLOT[1], u) - Math.sin(u * Math.PI) * 30;
    const r = Math.exp(lerp(Math.log(EYE.r * 3.4), Math.log(RR), u));
    return { x, y, r, ring: seg(t, T.ring, T.ring + 1.05), burn: seg(t, T.burn[0], T.burn[1]), travel: u };
  }

  function applyCam(ctx, c, pre = null) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (pre) ctx.transform(...pre);
    ctx.translate(W / 2, H / 2); ctx.rotate(c.rot || 0); ctx.scale(c.z, c.z); ctx.translate(-c.cx, -c.cy);
  }
  const screenOf = (cam, x, y) => {
    const m = new DOMMatrix().translateSelf(W / 2, H / 2).rotateSelf((cam.rot || 0) * 180 / Math.PI).scaleSelf(cam.z, cam.z).translateSelf(-cam.cx, -cam.cy);
    const p = m.transformPoint(new DOMPoint(x, y)); return [p.x, p.y];
  };

  // ---------------------------------------------------------------- copper scene
  function drawCopperScene(ctx, t, cam) {
    applyCam(ctx, cam);
    Cu.drawCopper(ctx, [-300, -300, W + 300, H + 300]);
    Cu.copperLight(ctx, W, H, cam); applyCam(ctx, cam);
    bird.guide.draw(ctx, Infinity, { color: 'rgba(255,226,196,0.4)', wScale: 0.3, dx: -0.25, dy: -0.25 });
    bird.guide.draw(ctx, Infinity, { color: 'rgba(60,24,8,0.25)', wScale: 0.2, dx: 0.2, dy: 0.2 });
    Cu.drawGrooves(ctx, ink, Math.min(t, T.first[1] + 0.001), { zoom: cam.z });
    const tp = tipAt(Math.min(t, T.first[1])), sp = screenOf(cam, tp.x, tp.y);
    const dv = [tp.dx * Math.cos(cam.rot || 0) - tp.dy * Math.sin(cam.rot || 0), tp.dx * Math.sin(cam.rot || 0) + tp.dy * Math.cos(cam.rot || 0)];
    const lift = ss(t, T.first[1], T.first[1] + 0.35);
    const cut = (Math.min(t, T.first[1]) + 1.6) * 150;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    Cu.drawSwarf(ctx, sp, dv, cut, { s: 1.25 });
    Cu.drawBurin(ctx, sp, dv, { s: 1.1, lift });
    ctx.restore();
  }

  // ---------------------------------------------------------------- paper scene
  function drawLeader(ctx, r, t) {
    const f = [EYE.x, EYE.y];
    const dx = f[0] - r.x, dy = f[1] - r.y, L = Math.hypot(dx, dy) || 1;
    const end = [r.x + dx / L * r.r, r.y + dy / L * r.r];
    const p = ss(t, T.travel[0], T.travel[1]);
    if (p <= 0) return;
    ctx.save(); ctx.strokeStyle = PAL.ink; ctx.lineCap = 'round'; ctx.lineWidth = 0.95;
    const mx = lerp(f[0], end[0], p), my = lerp(f[1], end[1], p);
    ctx.beginPath(); ctx.moveTo(...f); ctx.lineTo(mx, my); ctx.stroke();
    ctx.fillStyle = PAL.ink; ctx.beginPath(); ctx.arc(f[0], f[1], 1.7, 0, 7); ctx.fill(); ctx.restore();
    engraveText(ctx, '1', f[0] - 14, f[1] + 22, { size: 15, italic: true, p: ss(t, T.travel[1] - 0.3, T.travel[1] + 0.2) });
  }

  function drawPaperScene(ctx, t, cam, { noColour = false, pre = null, inkOnly = false } = {}) {
    applyCam(ctx, cam, pre);
    if (!inkOnly) drawSheet(ctx, { W, H, plate: PLATE });
    if (!noColour) wash.draw(ctx, t);
    ink.draw(ctx, t);
    if (inkOnly) return;
    // margins: plate number and series (cut late, with the finished plate)
    engraveText(ctx, 'PLATE VII.', BORDER[2] - 16, 116, { size: 22, weight: 600, track: 0.12, align: 'right', p: seg(t, T.plateNo, T.plateNo + 0.5) });
    engraveText(ctx, 'ORNITHOLOGIA · AVES', BORDER[0] + 16, 112, { size: 13, weight: 500, track: 0.22, align: 'left', p: seg(t, T.series, T.series + 0.6) });
    // dimension labels
    engraveText(ctx, '2.8 M.', 250, 615, { size: 19, weight: 600, track: 0.12, p: seg(t, T.lblA[0], T.lblA[1]) });
    engraveText(ctx, 'UP TO 156 KG.', 250, 662, { size: 15, weight: 500, track: 0.1, p: seg(t, T.lblB[0], T.lblB[1]) });
    engraveText(ctx, '70 KM/H.', 1240, 745, { size: 15, weight: 500, track: 0.1, p: seg(t, T.lblC[0], T.lblC[1]) });
    engraveText(ctx, 'TWO TOES.', 1150, 893, { size: 15, weight: 500, track: 0.1, p: seg(t, T.lblD[0], T.lblD[1]) });
    engraveText(ctx, 'STRIDE AT SPEED · 3 M.', 956, 992, { size: 15, weight: 500, track: 0.1, p: seg(t, T.lblE[0], T.lblE[1]) });
    engraveText(ctx, 'THE EGG, TWICE NATURAL SIZE.', 386, 948, { size: 15, weight: 500, track: 0.08, p: seg(t, T.lblF[0], T.lblF[1]) });
    // the eye roundel
    const r = roundelAt(t);
    if (r) {
      drawLeader(ctx, r, t);
      ctx.save(); ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.clip();
      ctx.globalAlpha = ss(r.burn); ctx.fillStyle = PAL.paper;
      ctx.fillRect(r.x - r.r, r.y - r.r, r.r * 2, r.r * 2);
      ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(paperTexture(W, H), 0, 0, W, H);
      ctx.globalAlpha = 0.55 * ss(r.burn); ctx.fillStyle = PAL.plateTone; ctx.fillRect(r.x - r.r, r.y - r.r, r.r * 2, r.r * 2);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      const k = r.r / 500;
      if (t < T.art[0]) {   // before the re-cut: the plate's own eye, magnified live
        const M = 500 / (EYE.r * 2.1);
        ctx.translate(r.x, r.y); ctx.scale(k * M, k * M); ctx.translate(-EYE.x, -EYE.y);
        ink.draw(ctx, Math.min(t, T.burn[0]), { wScale: 0.5 });
      } else {
        ctx.translate(r.x, r.y); ctx.scale(k, k); ctx.translate(-250, -250);
        artWash.draw(ctx, t);
        art.ink.draw(ctx, t, { wScale: Math.max(1, 0.55 / (k * cam.z)) ** 0.6 });
        for (const lb of art.labels) engraveText(ctx, lb.t, lb.x, lb.y, { size: 96, weight: 600, track: 0.12, p: ss(t, T.labN, T.labN + 0.55) });
      }
      ctx.restore();
      roundelFrame(ctx, r.x, r.y, r.r, { p: r.ring, w: 2.0 });
      if (r.travel > 0.98) {
        engraveText(ctx, 'THE EYE.', SLOT[0], SLOT[1] + RR + 36, { size: 17, weight: 600, track: 0.14, p: seg(t, T.labN, T.labN + 0.6) });
        engraveText(ctx, '50 mm across', SLOT[0], SLOT[1] + RR + 66, { size: 20, italic: true, weight: 400, p: seg(t, T.labL, T.labL + 0.55) });
        writeScript(ctx, 'the brain within is smaller still.', SLOT[0], SLOT[1] + RR + 108, { size: 29, p: seg(t, T.labQ, T.labQ + 1.0) });
      }
    }
    // the finished plate: title, name, credits
    engraveText(ctx, 'THE OSTRICH.', 960, 132, { size: 50, weight: 600, track: 0.16, p: seg(t, T.title, T.title + 0.9) });
    engraveText(ctx, 'Struthio camelus', 960, 172, { size: 24, italic: true, weight: 400, p: seg(t, T.latin, T.latin + 0.65) });
    writeScript(ctx, 'ad vivum del.', BORDER[0] + 4, 1026, { size: 26, align: 'left', p: seg(t, T.sigL, T.sigL + 0.55) });
    writeScript(ctx, 'sculp. 2026', BORDER[2] - 4, 1026, { size: 26, align: 'right', p: seg(t, T.sigR, T.sigR + 0.55) });
  }

  // ---------------------------------------------------------------- press pass
  function drawRoller(ctx, t) {
    const u = seg(t, T.roller[0], T.roller[1]);
    if (u <= 0 || u >= 1) return;
    const yc = lerp(-280, H + 280, u);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    // fresh-print deepening where it has passed
    ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#6a4a20'; ctx.fillRect(0, 0, W, Math.max(0, yc));
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    // shadow cast ahead of the drum
    const sh = ctx.createLinearGradient(0, yc + 236, 0, yc + 330);
    sh.addColorStop(0, 'rgba(40,22,6,0.30)'); sh.addColorStop(1, 'rgba(40,22,6,0)');
    ctx.fillStyle = sh; ctx.fillRect(0, yc + 236, W, 100);
    // the drum
    const g = ctx.createLinearGradient(0, yc, 0, yc + 236);
    g.addColorStop(0, '#241a12'); g.addColorStop(0.18, '#5a4634'); g.addColorStop(0.42, '#c9b49a');
    g.addColorStop(0.55, '#8a6f52'); g.addColorStop(0.85, '#2c2014'); g.addColorStop(1, '#180f08');
    ctx.fillStyle = g; ctx.fillRect(0, yc, W, 236);
    ctx.fillStyle = 'rgba(255,244,224,0.5)'; ctx.fillRect(0, yc + 96, W, 7);
    ctx.fillStyle = 'rgba(20,10,4,0.55)'; ctx.fillRect(0, yc + 232, W, 5);
    ctx.restore();
  }

  // ---------------------------------------------------------------- subtitles
  function drawSubs(ctx, t) {
    const sb = cues.find(x => t >= x.t0 && t < x.t1); if (!sb) return;
    const a = Math.min(ss(t, sb.t0, sb.t0 + 0.25), 1 - ss(t, sb.t1 - 0.2, sb.t1));
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const size = 34, lines = wrapLines(ctx, sb.text, 880, { size, font: FONTS.script });
    const lh = size * 1.12, hgt = lines.length * lh + 22;
    const wid = Math.max(...lines.map(l => measure(ctx, l, { size, font: FONTS.script, weight: 400 }).tw)) + 66;
    const y1 = 1058, y0 = y1 - hgt, x0 = 960 - wid / 2;
    ctx.globalAlpha = a;
    ctx.shadowColor = 'rgba(60,40,20,0.28)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#f4eddb'; ctx.beginPath();
    const R = B.RNG(11); ctx.moveTo(x0, y0);
    for (let x = x0; x <= x0 + wid; x += 14) ctx.lineTo(x, y0 + (R() - 0.5) * 2.2);
    for (let y = y0; y <= y1; y += 12) ctx.lineTo(x0 + wid + (R() - 0.5) * 2, y);
    for (let x = x0 + wid; x >= x0; x -= 14) ctx.lineTo(x, y1 + (R() - 0.5) * 2.2);
    for (let y = y1; y >= y0; y -= 12) ctx.lineTo(x0 + (R() - 0.5) * 2, y);
    ctx.closePath(); ctx.fill();
    ctx.shadowColor = 'transparent';
    lines.forEach((ln, i) => writeScript(ctx, ln, 960, y0 + 11 + lh * (i + 0.8), { size, color: '#2b1e14', p: 1, alpha: a }));
    ctx.restore();
    return { x0, y0, x1: x0 + wid, y1 };
  }

  // ---------------------------------------------------------------- the proof peel
  function drawPeel(ctx, t, cam) {
    const u = ss(t, T.peel[0], T.peel[1]) * 0.7 + seg(t, T.peel[0], T.peel[1]) * 0.3;
    const dir = [-0.72, -0.69], span = 2600, off = lerp(-span / 2 - 260, span / 2 + 260, u);
    const c = [W / 2 - dir[0] * off, H / 2 - dir[1] * off], n = [-dir[1], dir[0]], fw = 340;
    const band = (d0, d1) => {
      const A = [c[0] + dir[0] * d0, c[1] + dir[1] * d0], Bp = [c[0] + dir[0] * d1, c[1] + dir[1] * d1];
      ctx.beginPath();
      ctx.moveTo(A[0] + n[0] * 3000, A[1] + n[1] * 3000); ctx.lineTo(A[0] - n[0] * 3000, A[1] - n[1] * 3000);
      ctx.lineTo(Bp[0] - n[0] * 3000, Bp[1] - n[1] * 3000); ctx.lineTo(Bp[0] + n[0] * 3000, Bp[1] + n[1] * 3000);
      ctx.closePath();
    };
    drawCopperScene(ctx, t, cam);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); band(0, 4000); ctx.clip(); drawPaperScene(ctx, t, cam, { noColour: true }); ctx.restore();
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); band(-fw * 0.9, -fw * 2.2); ctx.clip();
    const sg = ctx.createLinearGradient(c[0] - dir[0] * fw * 0.9, c[1] - dir[1] * fw * 0.9, c[0] - dir[0] * fw * 2.2, c[1] - dir[1] * fw * 2.2);
    sg.addColorStop(0, 'rgba(30,10,2,0.6)'); sg.addColorStop(1, 'rgba(30,10,2,0)');
    ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H); ctx.restore();
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); band(0, -fw); ctx.clip();
    ctx.fillStyle = '#efe6d0'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(paperTexture(W, H), 0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
    const dx = dir[0], dy = dir[1], cd = c[0] * dx + c[1] * dy;
    const M = [1 - 2 * dx * dx, -2 * dx * dy, -2 * dx * dy, 1 - 2 * dy * dy, 2 * cd * dx, 2 * cd * dy];
    ctx.globalAlpha = 0.28; ctx.filter = 'blur(0.8px)';
    drawPaperScene(ctx, t, cam, { noColour: true, pre: M, inkOnly: true });
    ctx.filter = 'none'; ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0);
    const fg = ctx.createLinearGradient(c[0], c[1], c[0] - dir[0] * fw, c[1] - dir[1] * fw);
    fg.addColorStop(0, 'rgba(70,52,28,0.55)'); fg.addColorStop(0.06, 'rgba(120,96,60,0.2)');
    fg.addColorStop(0.22, 'rgba(255,252,242,0.55)'); fg.addColorStop(0.5, 'rgba(255,255,255,0.05)');
    fg.addColorStop(0.85, 'rgba(120,96,60,0.25)'); fg.addColorStop(1, 'rgba(80,60,34,0.45)');
    ctx.fillStyle = fg; ctx.fillRect(0, 0, W, H); ctx.restore();
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.strokeStyle = 'rgba(80,60,34,0.5)'; ctx.lineWidth = 1.4; band(-fw, -fw - 0.01); ctx.stroke(); ctx.restore();
  }

  // ---------------------------------------------------------------- render
  function render(ctx, t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    const cam = camAt(t);
    if (t < T.peel[0]) drawCopperScene(ctx, t, cam);
    else if (t < T.peel[1]) drawPeel(ctx, t, cam);
    else {
      drawPaperScene(ctx, t, cam);
      drawRoller(ctx, t);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (t >= T.peel[0]) {
      const vg = ctx.createRadialGradient(W / 2, H * 0.5, H * 0.55, W / 2, H / 2, H * 1.15);
      vg.addColorStop(0, 'rgba(255,255,255,0)'); vg.addColorStop(1, 'rgba(120,86,46,0.2)');
      ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
    }
    if (t >= T.peel[1] && !(typeof location !== 'undefined' && location.search.includes('nosub'))) drawSubs(ctx, t);
  }

  // ---------------------------------------------------------------- text inventory (readcheck)
  const textRect = (str, x, y, o, t0) => {
    const m = measure(ctx0, str, o);
    const x0 = (o.align === 'right') ? x - m.tw : (o.align === 'left' ? x : x - m.tw / 2);
    return { x0: x0 - 4, y0: y - o.size * 0.9, x1: x0 + m.tw + 4, y1: y + o.size * 0.35, t0 };
  };
  let ctx0 = null;
  const LBL = [
    ['2.8 M.', 250, 615, { size: 19, weight: 600, track: 0.12 }, T.lblA[0]],
    ['UP TO 156 KG.', 250, 662, { size: 15, weight: 500, track: 0.1 }, T.lblB[0]],
    ['70 KM/H.', 1240, 745, { size: 15, weight: 500, track: 0.1 }, T.lblC[0]],
    ['TWO TOES.', 1150, 893, { size: 15, weight: 500, track: 0.1 }, T.lblD[0]],
    ['STRIDE AT SPEED · 3 M.', 956, 992, { size: 15, weight: 500, track: 0.1 }, T.lblE[0]],
    ['THE EGG, TWICE NATURAL SIZE.', 386, 948, { size: 15, weight: 500, track: 0.08 }, T.lblF[0]],
    ['THE EYE.', SLOT[0], SLOT[1] + RR + 36, { size: 17, weight: 600, track: 0.14 }, T.labN],
    ['50 mm across', SLOT[0], SLOT[1] + RR + 66, { size: 20, italic: true }, T.labL],
    ['the brain within is smaller still.', SLOT[0], SLOT[1] + RR + 108, { size: 29, font: FONTS.script }, T.labQ],
    ['THE OSTRICH.', 960, 132, { size: 50, weight: 600, track: 0.16 }, T.title],
    ['Struthio camelus', 960, 172, { size: 24, italic: true }, T.latin],
    ['PLATE VII.', BORDER[2] - 16, 116, { size: 22, weight: 600, track: 0.12, align: 'right' }, T.plateNo],
    ['ORNITHOLOGIA · AVES', BORDER[0] + 16, 112, { size: 13, weight: 500, track: 0.22, align: 'left' }, T.series],
    ['ad vivum del.', BORDER[0] + 4, 1026, { size: 26, font: FONTS.script, align: 'left' }, T.sigL],
    ['sculp. 2026', BORDER[2] - 4, 1026, { size: 26, font: FONTS.script, align: 'right' }, T.sigR],
  ];
  function TEXTS(t) {
    if (!ctx0) return [];
    const out = [];
    for (const [str, x, y, o, t0] of LBL) {
      if (t < t0) continue;
      const r = textRect(str, x, y, o, t0);
      out.push({ id: 'l' + str, text: str, ...r });
    }
    const r = roundelAt(t);
    if (r && r.travel > 0.98) for (const lb of art.labels) {
      const k = r.r / 500, sz = 96 * k;
      out.push({ id: 'art' + lb.t, text: lb.t, x0: r.x + (lb.x - 250) * k - sz, y0: r.y + (lb.y - 250) * k - sz, x1: r.x + (lb.x - 250) * k + sz * 4, y1: r.y + (lb.y - 250) * k + sz, t0: T.labN });
    }
    const sb = cues.find(x => t >= x.t0 && t < x.t1);
    if (sb && t >= T.peel[1]) {
      const size = 34, lines = wrapLines(ctx0, sb.text, 880, { size, font: FONTS.script });
      const lh = size * 1.12, hgt = lines.length * lh + 22;
      const wid = Math.max(...lines.map(l => measure(ctx0, l, { size, font: FONTS.script, weight: 400 }).tw)) + 66;
      out.push({ id: 'sub', text: sb.text, x0: 960 - wid / 2, y0: 1058 - hgt, x1: 960 + wid / 2, y1: 1058 });
    }
    return out;
  }

  // ---------------------------------------------------------------- events for the mixer
  const EV = [];
  EV.push({ t: 0, type: 'burin', until: T.first[1] }, { t: T.first[1], type: 'lift' });
  EV.push({ t: T.peel[0] - 0.25, type: 'press' }, { t: T.peel[0], type: 'peel' });
  EV.push({ t: T.olRest[0], type: 'hatch', until: T.olRest[1], d: 0.8 });
  for (const [k, w] of [['h1', T.h1], ['h2', T.h2], ['h3', T.h3], ['egg', T.egg], ['fx', T.fx]]) EV.push({ t: w[0], type: 'hatch', until: w[1], d: k === 'h3' || k === 'fx' ? 0.55 : 1 });
  EV.push({ t: T.lblA[0], type: 'letters', n: 6, dur: T.lblA[1] - T.lblA[0] });
  EV.push({ t: T.lblB[0], type: 'letters', n: 13, dur: T.lblB[1] - T.lblB[0] });
  EV.push({ t: T.lblC[0], type: 'letters', n: 8, dur: T.lblC[1] - T.lblC[0] });
  EV.push({ t: T.lblD[0], type: 'letters', n: 9, dur: T.lblD[1] - T.lblD[0] });
  EV.push({ t: T.lblE[0], type: 'letters', n: 22, dur: T.lblE[1] - T.lblE[0] });
  EV.push({ t: T.lblF[0], type: 'letters', n: 28, dur: T.lblF[1] - T.lblF[0] });
  EV.push({ t: T.strideRule[0], type: 'rule', dur: T.strideRule[1] - T.strideRule[0] });
  EV.push({ t: T.silence[0], type: 'silence', until: T.silence[1] });
  EV.push({ t: T.ring, type: 'ring' }, { t: T.burn[0], type: 'burnish' }, { t: T.art[0], type: 'cut', until: T.art[1] });
  EV.push({ t: T.travel[0], type: 'travel', until: T.travel[1] }, { t: T.travel[1], type: 'land' });
  EV.push({ t: T.labN, type: 'letters', n: 8, dur: 0.6 }, { t: T.labQ, type: 'quill', dur: 1.0 });
  EV.push({ t: T.iris, type: 'plip' }, { t: T.iris + 0.08, type: 'brush', dur: 1.4 });
  EV.push({ t: T.roller[0], type: 'press' }, { t: T.roller[0] + 0.15, type: 'roller', until: T.roller[1] });
  EV.push({ t: T.washA, type: 'plip' }, { t: T.washA + 0.08, type: 'brush', dur: 1.4 }, { t: T.washB, type: 'plip' }, { t: T.washB + 0.08, type: 'brush', dur: 1.3 });
  EV.push({ t: T.egg[0] + 0.2, type: 'nest', until: T.egg[1] + 1.2 });
  EV.push({ t: T.title, type: 'title', n: 12, dur: 0.9 });
  EV.push({ t: T.latin, type: 'letters', n: 16, dur: 0.65 });
  EV.push({ t: T.plateNo, type: 'letters', n: 10, dur: 0.5 }, { t: T.series, type: 'letters', n: 19, dur: 0.6 });
  EV.push({ t: T.sigL, type: 'quill', dur: 0.55 }, { t: T.sigR, type: 'quill', dur: 0.55 });
  EV.push({ t: T.lock, type: 'lock' });
  vo.forEach(v => EV.push({ t: v.t0, type: 'vo', id: v.id, dur: v.t1 - v.t0 }));
  EV.sort((a, b) => a.t - b.t);

  const DUR = bb(85);
  return { render, DUR, T, EV, TEXTS: t => { ctx0 = filmCtx; return TEXTS(t); }, subs: cues, cam: camAt, setCtx: c => { filmCtx = c; } };
}

let filmCtx = null;
