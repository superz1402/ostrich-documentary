// ostrich.js — the film's subject: an adult male ostrich, authored for the engraving engine.
// Local units: ground at y=0, the bird faces LEFT, height ≈ 101 units (head top ≈ y=-101).
//   buildOstrich({x, y, s, seed}) → { ink, guide, regions, bodyPolys, focus }
//     ink     B.Ink, groups: ol0 (first stroke) | ol | h1 | h2 | h3 | fx (plumes) | gr (ground) | lbl | egg
//     guide   faint scratched drawing for the copper close-up (drawn instantly)
//     regions eggA / eggB {path, polys} for hand colouring
//     focus   { eye: {x, y, r} } world coords for the magnification roundel
//   buildEyeDetail({ seed }) → { ink, labels } — the roundel's drawn magnification (500-unit radius space)
import * as B from './engine/burin.js';

const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const norm2 = v => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
const sample = (fn, n) => Array.from({ length: n + 1 }, (_, i) => fn(i / n));

// ---------------------------------------------------------------- local anatomy
const BODY_D = 'M-19,-64 C-26,-58 -28,-47 -21,-41 C-16,-36.8 -6,-34.8 4,-35.2 C10,-35.4 14.5,-33 17.5,-28.5 C19.5,-25.5 22,-25 23.5,-28 C25,-31.5 25.8,-36 26.2,-42 C27,-52 25.5,-60 19,-65 C12,-69.6 0,-70.5 -8,-69 C-13.5,-68 -17,-66.5 -19,-64 Z';
const NECK_D = 'M-16.5,-62.5 C-23,-70 -20.5,-79 -14,-86.5 C-10.5,-90.6 -8.2,-93.4 -7.4,-96.2 L-4.4,-94.8 C-5,-92.6 -6.8,-90 -10,-86.6 C-15.4,-80.2 -16.8,-71.6 -11.2,-62.8 Z';
const HEAD_D = 'M-12.6,-98.3 C-10.2,-99.5 -7.6,-100.2 -5.4,-100.05 C-2.6,-99.85 -0.6,-98.9 -0.1,-97.6 C0.25,-96.2 -0.7,-95.2 -2.5,-95.05 C-4.7,-94.9 -7.4,-95.5 -9.2,-96.4 C-10.6,-97.05 -12,-97.7 -12.6,-98.3 Z';
const SHANK_N_D = 'M17.9,-27 C16.4,-19.5 15.4,-11.5 15.3,-4.2 C15.3,-3 16.6,-3 16.8,-4.2 C17.5,-11.5 18.4,-19.5 20,-26.5 C20.4,-28.2 18.2,-28.7 17.9,-27 Z';
const TOE1_D = 'M15.5,-4.6 C11.5,-3.7 7.6,-2.2 5.3,-0.8 C4.7,-0.35 4.9,0.4 5.7,0.45 C9,0.6 12.6,0.3 15.2,-0.65 C15.9,-2 15.7,-3.7 15.5,-4.6 Z';
const TOE2_D = 'M16.1,-3 C14.1,-2.3 12.2,-1.4 10.9,-0.6 C10.6,-0.05 10.9,0.4 11.7,0.45 C13.3,0.5 14.9,0.25 16.3,-0.5 C16.6,-1.3 16.5,-2.3 16.1,-3 Z';
const SHANK_F_D = 'M22.1,-27.8 C20.9,-20 20.2,-12 20.4,-4.5 C20.4,-3.4 21.6,-3.4 21.8,-4.5 C22.4,-12 23.2,-20 24.3,-27.2 C24.6,-28.8 22.4,-29.4 22.1,-27.8 Z';
const TOEF_D = 'M20.2,-4.9 C17.3,-4.1 14.4,-2.8 12.6,-1.4 C12.1,-0.9 12.4,-0.2 13.2,-0.15 C15.7,-0.1 18.4,-0.4 20.5,-1.3 C21.1,-2.5 21,-4.1 20.2,-4.9 Z';
const EGG_D = 'M0,-32 C14,-30 24,-16 23,2 C22,18 12,30 0,31 C-12,30 -22,18 -23,2 C-24,-16 -14,-30 0,-32 Z';

// arc of a closed shape by cumulative arclength: sh._arcs[u0..u1] → world points
function arc(sh, u0, u1) {
  const P = sh.subs[0].pts;
  if (!sh._cum) {
    const cum = [0];
    for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    sh._cum = cum;
  }
  const cum = sh._cum, tot = cum[cum.length - 1], d0 = u0 * tot, d1 = u1 * tot;
  const out = [];
  for (let i = 0; i < P.length; i++) {
    if (cum[i] >= d0 && cum[i] <= d1) out.push(P[i]);
    else if (out.length && cum[i] > d1) break;
  }
  return out;
}

export function buildOstrich({ x = 940, y = 930, s = 6.0, seed = 7 } = {}) {
  const F = B.xf(x, y, s);
  const wpt = ([px, py]) => F([px, py]);
  const ink = new B.Ink(), guide = new B.Ink();
  const regions = {}, add = (name, sh) => { (regions[name] ||= []).push(sh); };
  const LIGHT = [-0.55, -0.62];
  const R = B.RNG(seed);

  // ---- shapes ----
  const body = B.shape(BODY_D, F), neck = B.shape(NECK_D, F), head = B.shape(HEAD_D, F);
  const shankN = B.shape(SHANK_N_D, F);
  const toe1 = B.shape(TOE1_D, F), toe2 = B.shape(TOE2_D, F);
  const shankF = B.shape(SHANK_F_D, F), toeF = B.shape(TOEF_D, F);
  const wing = B.shape(ellipseD(9, -50, 11.5, 13.5, 0.32), F);
  const tail = B.shape(ellipseD(25.5, -50, 8, 12, 0.62), F);

  // ---- tone fields ----
  const tBody = B.formTone(body.polys, { light: LIGHT, base: 0.03 });
  const tNeck = B.formTone(neck.polys, { light: LIGHT, base: 0.04 });
  const tHead = B.formTone(head.polys, { light: LIGHT, base: 0.05 });
  const tShankN = B.formTone(shankN.polys, { light: LIGHT, base: 0.05 });
  const tWing = B.formTone(wing.polys, { light: LIGHT, base: 0.10 });
  const tTail = B.formTone(tail.polys, { light: LIGHT, base: 0.12 });

  // ---- ol0: the first stroke — one long run along the back -----------------
  ink.group('ol0');
  B.stroke(ink, arc(body, 0.72, 1.0), 2.3, { taper: 20, grain: 0.12, seed });

  // ---- ol: contours (sampled from the same rings the hatching uses) --------
  ink.group('ol');
  B.stroke(ink, arc(body, 0.0, 0.20), 2.05, { taper: 16, seed: seed + 1 });     // chest
  B.stroke(ink, arc(body, 0.20, 0.56), 2.05, { taper: 16, seed: seed + 2 });    // belly
  B.stroke(ink, arc(body, 0.56, 0.76), 2.1, { taper: 16, seed: seed + 3 });     // rear, down from the rump
  B.stroke(ink, arc(neck, 0.0, 0.46), 1.7, { taper: 14, seed: seed + 4 });      // neck, front edge
  B.stroke(ink, arc(neck, 0.56, 0.95), 1.55, { taper: 14, seed: seed + 5 });    // neck, back edge
  B.outline(ink, head.polys[0], { w: 1.45, light: LIGHT, vary: 0.7, run: 90, seed: seed + 6 });
  B.outline(ink, shankN.polys[0], { w: 1.7, light: LIGHT, vary: 0.7, run: 80, seed: seed + 8 });
  B.outline(ink, toe1.polys[0], { w: 1.55, light: LIGHT, vary: 0.6, run: 60, seed: seed + 9 });
  B.outline(ink, toe2.polys[0], { w: 1.3, light: LIGHT, vary: 0.6, run: 50, seed: seed + 10 });
  B.outline(ink, shankF.polys[0], { w: 1.25, light: LIGHT, vary: 0.6, run: 80, seed: seed + 11 });
  B.outline(ink, toeF.polys[0], { w: 1.1, light: LIGHT, vary: 0.6, run: 50, seed: seed + 12 });
  B.stroke(ink, [wpt([5.9, 0.42]), wpt([3.7, 0.12]), wpt([5.7, -0.72])], 1.0, { seed: seed + 13 });   // claw, big toe
  B.stroke(ink, [wpt([11.9, 0.42]), wpt([10.8, 0.16]), wpt([12, -0.44])], 0.9, { seed: seed + 14 });   // claw, small toe
  const EYE_L = [-5.0, -97.7], EYE_R = 1.5;
  const eyeC = wpt(EYE_L);
  B.outline(ink, B.ellipse(eyeC[0], eyeC[1], EYE_R * s, EYE_R * s * 1.04, -0.15, 40).polys[0], { w: 0.95, vary: 0.5, run: 0, seed: seed + 16, light: LIGHT });
  B.outline(ink, B.ellipse(eyeC[0], eyeC[1], EYE_R * s * 0.55, EYE_R * s * 0.57, -0.15, 28).polys[0], { w: 0.7, vary: 0.4, run: 0, seed: seed + 17, light: LIGHT });
  B.stroke(ink, [wpt([-9.2, -99.4]), wpt([-7.4, -100.1])], 0.8, { seed: seed + 18 });   // nostril
  // thigh/shank joint marks + scale ticks on the tarsus
  B.stroke(ink, [wpt([18.6, -24.5]), wpt([20.2, -25.2])], 0.9, { seed: seed + 18 });
  B.stroke(ink, [wpt([16.2, -13.5]), wpt([18.1, -13.9])], 0.7, { seed: seed + 19 });
  B.stroke(ink, [wpt([15.9, -8.5]), wpt([17.7, -8.9])], 0.7, { seed: seed + 20 });

  // ---- h1: first hatch families -------------------------------------------
  ink.group('h1');
  const exclWT = [wing.polys[0]];
  B.hatch(ink, body.polys, { angle: -0.2, spacing: 3.3, tone: tBody, thr: 0.13, wMax: 1.85, seed: seed + 25, excl: exclWT });
  B.hatch(ink, neck.polys, { angle: 1.25, spacing: 3.0, tone: tNeck, thr: 0.14, wMax: 1.5, seed: seed + 26 });
  B.hatch(ink, head.polys, { angle: 0.5, spacing: 2.6, tone: tHead, thr: 0.24, wMax: 1.15, seed: seed + 27 });
  B.hatch(ink, shankN.polys, { angle: 1.5, spacing: 2.5, tone: tShankN, thr: 0.22, wMax: 1.25, seed: seed + 28 });
  B.hatch(ink, wing.polys, { angle: -0.45, spacing: 3.6, tone: tWing, thr: 0.15, wMax: 1.5, seed: seed + 31 });
  B.hatch(ink, tail.polys, { angle: -0.55, spacing: 3.8, tone: tTail, thr: 0.22, wMax: 1.45, seed: seed + 32 });

  // ---- h2: crossing ---------------------------------------------------------
  ink.group('h2');
  B.hatch(ink, body.polys, { angle: 0.85, spacing: 3.65, tone: tBody, thr: 0.5, wMax: 1.45, seed: seed + 35, excl: exclWT });
  B.hatch(ink, neck.polys, { angle: 2.3, spacing: 3.35, tone: tNeck, thr: 0.52, wMax: 1.2, seed: seed + 36 });
  B.hatch(ink, wing.polys, { angle: 0.55, spacing: 3.95, tone: tWing, thr: 0.5, wMax: 1.2, seed: seed + 37 });
  B.hatch(ink, tail.polys, { angle: 0.45, spacing: 4.1, tone: tTail, thr: 0.52, wMax: 1.15, seed: seed + 38 });

  // ---- h3: darks, pupil, knee ----------------------------------------------
  ink.group('h3');
  B.hatch(ink, body.polys, { angle: -0.7, spacing: 4.35, tone: tBody, thr: 0.76, wMax: 1.1, seed: seed + 40, excl: exclWT });
  B.hatch(ink, neck.polys, { angle: 0.8, spacing: 3.9, tone: tNeck, thr: 0.78, wMax: 0.9, seed: seed + 41 });
  B.stipple(ink, B.ellipse(eyeC[0], eyeC[1], EYE_R * s * 0.52, EYE_R * s * 0.54, -0.15, 24).polys, { density: 0.35, tone: () => 0.92, r: 0.55, seed: seed + 43 });
  B.hatch(ink, tail.polys, { angle: -1.05, spacing: 4.6, tone: tTail, thr: 0.78, wMax: 0.9, seed: seed + 44 });
  B.stipple(ink, B.ellipse(...wpt([18.9, -28.2]), 6.5, 6.5, 0, 20).polys, { density: 0.1, tone: () => 0.7, r: 0.5, seed: seed + 45 });
  B.stipple(ink, head.polys, { density: 0.05, tone: tHead, r: 0.45, seed: seed + 46, thr: 0.62 });

  // ---- fx: shaggy drooping plumes ------------------------------------------
  ink.group('fx');
  B.fur(ink, wing.polys, { density: 0.016, len: 13, w: 1.05, seed: seed + 50, tone: (xx, yy) => 0.35 + 0.4 * tWing(xx, yy), curl: 0.55, rimOut: 1, dir: (px, py) => norm2([0.6 + 0.2 * B.noise1(py / 40, 3), 0.74 + 0.18 * B.noise1(px / 50, 4)]) });
  B.fur(ink, tail.polys, { density: 0.02, len: 16, w: 1.1, seed: seed + 51, tone: (xx, yy) => 0.4 + 0.4 * tTail(xx, yy), curl: 0.5, rimOut: 1, dir: () => norm2([0.82 + 0.12 * R(), 0.58]) });
  for (let k = 0; k < 7; k++) {
    const a = lerp(-0.9, 0.6, k / 6), c = wpt([9 + 9 * Math.cos(a), -48 + 10 * Math.sin(a)]);
    B.stroke(ink, [c, [c[0] + 26 + 8 * R(), c[1] + 20 + 10 * R()], [c[0] + 44 + 12 * R(), c[1] + 52 + 14 * R()]], 0.95, { taper: 26, seed: seed + 52 + k });
  }

  // ---- gr: ground -----------------------------------------------------------
  ink.group('gr');
  B.stroke(ink, sample(u => [lerp(-64, 60, u), 0.15 * Math.sin(u * 21 + 1)], 40).map(wpt), 1.15, { taper: 30, seed: seed + 55 });
  const shad = [wpt([-19, 0.8]), wpt([27, 0.8]), wpt([25, 2.6]), wpt([-17, 2.6])];
  B.stipple(ink, [shad], { density: 0.05, tone: (px, py) => 0.55 - 0.35 * Math.abs(px - x) / 300, r: 0.5, seed: seed + 56 });
  for (const [px, py, r] of [[-38, 0.9, 2.1], [42, 1.1, 1.7], [22, 1.0, 1.2]]) {
    const c = wpt([px, py]);
    B.outline(ink, B.ellipse(c[0], c[1], r * s, r * s * 0.55, 0, 16).polys[0], { w: 0.8, vary: 0.4, run: 0, seed: seed + 57, light: LIGHT });
  }
  for (const [px, hgt] of [[-52, 3.5], [-46, 2.4], [50, 3.0], [55, 2.2]]) {
    for (let k = -1; k <= 1; k++) B.stroke(ink, [wpt([px, 0.2]), wpt([px + k * 1.4 + 0.5, -hgt * (0.7 + 0.3 * R())])], 0.7, { seed: seed + 58 + k + px });
  }

  // ---- egg: the nest vignette, lower left ----------------------------------
  ink.group('egg');
  const BX = 386, BY = 868;
  const bowl = sample(u => { const a = lerp(Math.PI * 0.08, Math.PI * 0.92, u); return [BX - 96 * Math.cos(a), BY + 30 * Math.sin(a) - 30]; }, 26);
  B.stroke(ink, bowl, 1.7, { taper: 12, seed: seed + 60 });
  B.stroke(ink, bowl.map(([px, py]) => [px, py - 5]), 1.0, { taper: 14, seed: seed + 61 });
  for (let k = 0; k < 16; k++) {
    const a = lerp(Math.PI * 0.1, Math.PI * 0.9, (k + 0.5) / 16);
    const cx = BX - 96 * Math.cos(a), cy = BY - 30 + 30 * Math.sin(a) * 0.55 - 4;
    const aa = -a + (R() - 0.5) * 1.6;
    B.stroke(ink, [[cx - 14 * Math.cos(aa), cy - 14 * Math.sin(aa)], [cx + 14 * Math.cos(aa), cy + 14 * Math.sin(aa)]], 0.75, { seed: seed + 62 + k });
  }
  const eggA = B.shape(EGG_D, B.xf(BX - 32, BY - 34, 1.0, -0.10));
  const eggB = B.shape(EGG_D, B.xf(BX + 24, BY - 30, 0.96, 0.14));
  B.outline(ink, eggA.polys[0], { w: 1.6, light: LIGHT, vary: 0.65, run: 95, seed: seed + 80 });
  B.hatch(ink, eggA.polys, { angle: -0.5, spacing: 4.2, tone: B.formTone(eggA.polys, { light: LIGHT }), thr: 0.16, wMax: 1.3, seed: seed + 81 });
  B.hatch(ink, eggA.polys, { angle: 0.6, spacing: 4.6, tone: B.formTone(eggA.polys, { light: LIGHT }), thr: 0.55, wMax: 1.0, seed: seed + 82 });
  B.outline(ink, eggB.polys[0], { w: 1.5, light: LIGHT, vary: 0.65, run: 95, seed: seed + 83 });
  B.hatch(ink, eggB.polys, { angle: -0.4, spacing: 4.4, tone: B.formTone(eggB.polys, { light: LIGHT }), thr: 0.18, wMax: 1.25, seed: seed + 84 });
  B.hatch(ink, eggB.polys, { angle: 0.7, spacing: 4.8, tone: B.formTone(eggB.polys, { light: LIGHT }), thr: 0.57, wMax: 0.95, seed: seed + 85 });
  add('eggA', eggA); add('eggB', eggB);

  // ---- guide for the copper close-up ---------------------------------------
  guide.group('g');
  for (const sh of [body, neck, head, shankN, toe1, toe2]) B.outline(guide, sh.polys[0], { w: 0.65, vary: 0.3, run: 0, seed: seed + 90 });
  guide.instant('g', -1); guide.build();

  return { ink, guide, regions, bodyPolys: body.polys, focus: { eye: { x: eyeC[0], y: eyeC[1], r: EYE_R * s * 1.15 } } };
}

function ellipseD(cx, cy, rx, ry, rot) {
  const P = B.ellipsePts(cx, cy, rx, ry, rot, 40);
  return 'M' + P.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L') + ' Z';
}

// ---------------------------------------------------------------- the eye, magnified
// Drawn for a 500-unit radius. Groups: aol (contours) | art (striations, stipple, folds)
export function buildEyeDetail({ seed = 31 } = {}) {
  const ink = new B.Ink();
  const LIGHT = [-0.55, -0.62];
  const iris = B.ellipse(-30, -30, 205, 205, 0, 64), pupil = B.ellipse(-30, -30, 92, 92, 0, 40);
  const skin = B.ellipse(-30, -30, 330, 300, -0.1, 56);
  ink.group('aol');
  B.outline(ink, skin.polys[0], { w: 3.2, light: LIGHT, vary: 0.75, run: 260, seed });
  B.outline(ink, iris.polys[0], { w: 3.0, light: LIGHT, vary: 0.6, run: 200, seed: seed + 1 });
  B.outline(ink, B.ellipse(-30, -30, 210, 210, 0, 56).polys[0], { w: 1.7, light: LIGHT, vary: 0.5, run: 0, seed: seed + 2 });
  B.stroke(ink, sample(u => { const a = lerp(Math.PI * 1.08, Math.PI * 1.92, u); return [-30 + 352 * Math.cos(a), -30 + 320 * Math.sin(a)]; }, 20), 4.2, { taper: 30, seed: seed + 3 });
  B.stroke(ink, sample(u => { const a = lerp(Math.PI * 0.18, Math.PI * 0.82, u); return [-30 + 340 * Math.cos(a), -30 + 310 * Math.sin(a)]; }, 18), 3.4, { taper: 26, seed: seed + 4 });
  const brain = 'M150,-95 C230,-118 330,-70 345,10 C358,88 310,158 228,172 C160,184 96,140 84,72 C74,10 96,-78 150,-95 Z';
  const brainSh = B.shape(brain, B.xf(105, 40, 1));
  B.outline(ink, brainSh.polys[0], { w: 2.6, light: LIGHT, vary: 0.7, run: 220, seed: seed + 5 });
  B.stroke(ink, [[295, 10], [335, 45], [310, 95], [353, 132]], 2.2, { seed: seed + 6 });
  B.stroke(ink, [[390, -20], [373, 28], [405, 70]], 1.9, { seed: seed + 7 });
  ink.group('art');
  B.stipple(ink, brainSh.polys, { density: 0.012, tone: () => 0.5, r: 2.6, seed: seed + 8 });
  B.stipple(ink, pupil.polys, { density: 0.5, tone: () => 0.95, r: 3.4, seed: seed + 9 });
  B.hatch(ink, pupil.polys, { angle: 0.8, spacing: 26, tone: () => 0.9, thr: 0.05, wMax: 5.5, seed: seed + 10 });
  for (let k = 0; k < 88; k++) {
    const a = k / 88 * TAU, r0 = 108 + 14 * B.hash(k, 1), r1 = 196 + 10 * B.hash(k, 2);
    const wob = 0.05 * Math.sin(a * 3 + 1);
    B.stroke(ink, [[-30 + Math.cos(a + wob) * r0, -30 + Math.sin(a + wob) * r0], [-30 + Math.cos(a) * (r0 + r1) / 2, -30 + Math.sin(a) * (r0 + r1) / 2], [-30 + Math.cos(a - wob) * r1, -30 + Math.sin(a - wob) * r1]], 3.0, { taper: 30, seed: seed + 11 + k });
  }
  B.contourHatch(ink, skin.polys, { spacing: 26, thr: 0.1, wMax: 2.2, seed: seed + 100, from: 0.42 });
  return { ink, labels: [{ t: 'EYE.', x: -40, y: 350 }, { t: 'BRAIN.', x: 320, y: 330 }] };
}
