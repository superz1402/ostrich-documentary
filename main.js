// page contract for core/render: window.READY, window.render(t), window.DUR, window.EV, window.TEXTS
import { makeFilm } from './film.js';
const ctx = document.getElementById('c').getContext('2d');
const texts = { l1: 'It cannot fly. It has never needed to.',
  l2: 'The ostrich — the largest of all living birds. Two metres eighty tall, and up to one hundred and fifty-six kilograms.',
  l3: 'It is the fastest animal on two legs. Seventy kilometres an hour, on strides three metres long — each foot carrying just two toes.',
  l4: 'And the eye, five centimetres across, is larger than the brain it serves.',
  l5: "The largest egg on Earth: one and a half kilograms — two dozen hen's eggs in the hand. The male keeps it warm through the African night.",
  l6: 'It cannot fly. It never needed to.' };
let dur = {}, subs = [];
try { const r = await fetch('voices/dur.json'); if (r.ok) dur = await r.json(); } catch {}
try { const r = await fetch('subs.json'); if (r.ok) subs = await r.json(); } catch {}
await Promise.all(['600 40px "Bodoni Moda"', '500 40px "Bodoni Moda"', 'italic 400 40px "Bodoni Moda"', '400 40px "Pinyon Script"'].map(f => document.fonts.load(f)));
const film = makeFilm(texts, dur, subs);
film.setCtx(ctx);
window.DUR = film.DUR; window.EV = film.EV; window.T = film.T;
window.render = t => film.render(ctx, t);
window.TEXTS = film.TEXTS;
window.READY = true;
