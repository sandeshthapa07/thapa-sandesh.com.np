// How React works behind the scenes. Three scenes:
//   react-pipeline: a click triggers an update, React re-renders only the
//     component that changed, and carries one small patch to the page.
//   react-hooks: React hands out hook values from a shelf in call order. The
//     second play wraps the first hook in an `if`, and every value lands in
//     the wrong place.
//   react-batch: an event handler drops three state updates in a tray. React
//     waits for the handler to finish, then applies them in one render.
// Load after stick.js. Use as <stick-scene scene="react-pipeline" play="view">.
(function () {
  const SC = (window.SCENES = window.SCENES || {});
  const R = window.RIG;
  const { C, E, P, mix, legs, walkSeg, fig, inkFill, rr, ln, circle, text, seg, breathe, pulse, lp, sparks, bubble, words, arcPt, lerp, clamp, floatText, stand, win, pill, tw, tick } = R;

  const REACT = '#087ea4', REACT_FAR = '#9fcfde';
  const REST = P({ hF: [12, -60], hB: [-4, -52] });
  const CHIN = P({ hF: [10, -96], head: [7, -116], hB: [-4, -54] });
  const UP = P({ hF: [22, -128], hB: [-4, -54], head: [6, -117] });
  const FLICK = P({ hF: [40, -104], hB: [-4, -54], head: [10, -116] });
  const CHEER = P({ hF: [14, -132], hB: [-10, -130], head: [3, -118] });
  const WHOA = P({ hF: [22, -96], hB: [16, -92], hang: 0, head: [-3, -114], chest: [-2, -89] });

  function note(g, x, y, rot, label, alpha, s) {
    if (alpha <= 0) {
      return;
    }
    const w = tw(g, label, 8.5) + 12, h = 17;
    g.save();
    g.translate(x, y);
    g.rotate(rot || 0);
    g.scale(s || 1, s || 1);
    g.globalAlpha *= alpha;
    rr(g, -w / 2, -h / 2, w, h, 2);
    inkFill(g, C.butter, 1.2);
    text(g, label, 0, 3, 8.5, C.umber);
    g.restore();
  }

  function figLabel(g, s, x) {
    text(g, s, x, 17, 9, C.muted);
  }

  // ---------------------------------------------------------------- pipeline

  const TB = { x: -270, y: -168, w: 158, h: 96 };
  const NODES = {
    app: [-192, -138, 'App'],
    header: [-236, -112, 'Header'],
    list: [-152, -112, 'List'],
    count: [-236, -86, 'Count'],
    item1: [-176, -86, 'Item'],
    item2: [-134, -86, 'Item'],
  };
  const EDGES = [['app', 'header'], ['app', 'list'], ['header', 'count'], ['list', 'item1'], ['list', 'item2']];
  const BADGE = [-206, -86]; // what Count renders: a number
  const WIN = { x: 70, y: -128, w: 118, h: 96 };
  const BODY = [WIN.x, WIN.y + 13];
  const NUM = [BODY[0] + 16, BODY[1] + 34]; // the number on the page
  const BTN = { x: 84, y: 22, w: 28, h: 17 }; // +1 button, page coords
  const BTN_C = [BODY[0] + BTN.x + BTN.w / 2, BODY[1] + BTN.y + BTN.h / 2];
  const RH = -90, RAT = 52; // react's home and where it stands to patch the page
  const UX = 208; // the user, facing left
  const CATCH = P({ hF: [24, -78], hB: [-4, -54], head: [8, -114], chest: [3, -90] });
  const catchHand = fig(R.NULLG, CATCH, RH, 0, { sx: -1 }).w.handF;

  function nodeBox(g, key, o) {
    const [x, y, label] = NODES[key];
    const w = tw(g, label, 8.5) + 12, h = 16;
    rr(g, x - w / 2, y - h / 2, w, h, 4);
    const fill = o.render > 0 ? C.butterSoft : C.paper;
    inkFill(g, fill, o.lit > 0 ? 1.6 : 1.2, o.lit > 0 ? REACT : o.dim ? '#c4c4c4' : C.ink);
    text(g, label, x, y + 3, 8.5, o.dim ? '#a3a3a3' : C.ink);
  }

  function tree(g, st) {
    stand(g, TB.x + 24, TB.x + TB.w - 24, TB.y + TB.h);
    win(g, TB.x, TB.y, TB.w, TB.h, 'fiber tree');
    for (const [a, b] of EDGES) {
      const A = NODES[a], B = NODES[b];
      ln(g, A[0], A[1] + 8, B[0], B[1] - 8, 1.2, '#bdbdbd');
    }
    for (const key of Object.keys(NODES)) {
      nodeBox(g, key, { lit: st.lit[key] || 0, render: key === 'count' ? st.render : 0, dim: st.dim && !['app', 'header', 'count'].includes(key) });
    }
    // Count's output: the number it renders.
    circle(g, BADGE[0], BADGE[1], 7);
    inkFill(g, st.flip > 0.5 ? C.butter : C.paper, 1.2);
    text(g, st.flip > 0.5 ? '4' : '3', BADGE[0], BADGE[1] + 3.2, 9, C.ink);
    if (st.dirty > 0) {
      g.save();
      g.globalAlpha *= st.dirty;
      circle(g, NODES.count[0] - 22, NODES.count[1] - 8, 3.2);
      inkFill(g, C.butterHi, 1);
      g.restore();
    }
  }

  function page(g, st) {
    stand(g, WIN.x + 22, WIN.x + WIN.w - 22, WIN.y + WIN.h);
    win(g, WIN.x, WIN.y, WIN.w, WIN.h, 'localhost');
    g.save();
    g.translate(BODY[0], BODY[1]);
    ln(g, 10, 11, 62, 11, 3, C.ink);
    if (st.hl > 0) {
      g.save();
      g.globalAlpha *= st.hl;
      rr(g, 7, 21, 20, 18, 3);
      g.fillStyle = C.butter;
      g.fill();
      g.restore();
    }
    text(g, st.four ? '4' : '3', 16, 35, 13, C.ink);
    text(g, 'clicks', 30, 34, 8.5, C.muted, 'left');
    rr(g, BTN.x, BTN.y + st.press, BTN.w, BTN.h, 4);
    inkFill(g, C.butter, 1.3);
    text(g, '+1', BTN.x + BTN.w / 2, BTN.y + 12 + st.press, 9, C.ink);
    words(g, 10, 54, 90, 4, '#cfcfcf', 2);
    words(g, 10, 63, 74, 11, '#cfcfcf', 2);
    words(g, 10, 72, 84, 17, '#cfcfcf', 2);
    g.restore();
  }

  function patchCard(g, x, y, alpha) {
    if (alpha <= 0) {
      return;
    }
    g.save();
    g.globalAlpha *= alpha;
    rr(g, x - 9, y - 8, 18, 16, 2);
    inkFill(g, C.butter, 1.2);
    text(g, '4', x, y + 3.5, 10, C.ink);
    g.restore();
  }

  SC['react-pipeline'] = {
    dur: 7.4,
    width: 540,
    label: 'A user clicks +1. The update flies to React\'s component tree, React re-renders only the Count component, then carries one small change to the page and patches just that number.',
    draw(g, S) {
      const T = S.on ? S.u * this.dur : -1;
      const t = S.t;
      let rp = breathe(REST, t + 1.3), up = breathe(REST, t);
      let rx = RH, rsx = -1, gait = { ph: 0, amp: 0 };
      const st = { lit: {}, render: 0, flip: 0, dirty: 0, dim: false };
      const pg = { four: false, hl: 0, press: 0 };
      let noteK = -1, dot = null, patchFly = -1, held = 0, stuck = 0, step = '', stepA = 0, stepPop = 1, paint = -1;

      if (T < 0) {
        rp = mix(rp, CHIN, pulse(t, 6.5, 2, 2.2));
        up = mix(up, CHIN, pulse(t + 3, 7.5, 1, 2));
      } else {
        const fade = 1 - seg(T, this.dur - 0.5, this.dur);

        // 1. Trigger: the user clicks, an update is queued on Count.
        const tap = P({ hF: lp([BTN_C[0] + 4, BTN_C[1]], UX, 0, -1), hB: [-4, -54], head: [9, -114], chest: [4, -89] });
        up = mix(up, tap, E.soft(seg(T, 0, 0.32)));
        up = mix(up, breathe(REST, t), E.soft(seg(T, 0.5, 0.8)));
        pg.press = Math.sin(Math.PI * seg(T, 0.3, 0.45)) * 2;
        noteK = seg(T, 0.42, 1.22);
        st.dirty = seg(T, 1.18, 1.25) * (1 - seg(T, 2.1, 2.2));

        // 2. Render: React walks down to Count and calls it again.
        rp = mix(rp, P({ hF: [10, -96], head: [9, -118], hB: [-4, -54] }), E.soft(seg(T, 1.0, 1.35)));
        st.lit.app = seg(T, 1.25, 1.32) * (1 - seg(T, 1.6, 1.75));
        st.lit.header = seg(T, 1.72, 1.78) * (1 - seg(T, 2.0, 2.15));
        st.lit.count = seg(T, 2.08, 2.14) * (1 - seg(T, 2.7, 2.9));
        st.render = seg(T, 2.1, 2.2) * (1 - seg(T, 2.75, 2.95));
        st.flip = T >= 2.35 && fade > 0.5 ? 1 : 0;
        st.dim = T >= 1.3 && T < 3.0;
        if (T >= 1.3 && T < 2.6) {
          if (T < 1.5) {
            dot = NODES.app;
          } else if (T < 1.75) {
            dot = R.L2(NODES.app, NODES.header, E.soft(seg(T, 1.5, 1.75)));
          } else if (T < 1.85) {
            dot = NODES.header;
          } else if (T < 2.1) {
            dot = R.L2(NODES.header, NODES.count, E.soft(seg(T, 1.85, 2.1)));
          } else {
            dot = NODES.count;
          }
        }

        // The change comes out of the tree and into React's hand.
        rp = mix(rp, CATCH, E.soft(seg(T, 2.5, 2.8)));
        patchFly = seg(T, 2.6, 2.95);
        held = T >= 2.95 && T < 4.48 ? 1 : 0;

        // 3. Commit: React carries it to the page and patches one number.
        const CARRY = P({ hF: [14, -68], hB: [-4, -54], head: [6, -115] });
        rp = mix(rp, CARRY, E.soft(seg(T, 3.0, 3.3)));
        const out = walkSeg(T, 3.35, 4.2, RH, RAT);
        const back = walkSeg(T, 5.6, 6.5, RAT, RH);
        const ws = T < 5.6 ? out : back;
        rx = ws.x;
        gait = ws;
        rsx = T >= 3.32 && T < 5.6 ? 1 : -1;
        const APPLY = P({ hF: lp([NUM[0] - 2, NUM[1] - 4], RAT, 0, 1), hB: [-4, -54], head: [9, -114], chest: [4, -89] });
        rp = mix(rp, APPLY, E.soft(seg(T, 4.2, 4.48)));
        rp = mix(rp, breathe(REST, t + 1.3), E.soft(seg(T, 4.75, 5.1)));
        stuck = seg(T, 4.46, 4.5) * (1 - seg(T, 4.55, 4.85));
        pg.four = T >= 4.5 && fade > 0.5;
        pg.hl = seg(T, 4.5, 4.6) * (1 - seg(T, 5.3, 5.8));
        paint = seg(T, 4.55, 5.1);

        const NICE = P({ hF: [18, -92], hB: [-4, -54], head: [7, -118], chest: [1, -90] });
        up = mix(up, NICE, E.back(seg(T, 4.8, 5.15)) * (1 - E.soft(seg(T, 5.5, 5.85))));

        step = T < 1.25 ? '1 · trigger' : T < 3.25 ? '2 · render' : '3 · commit';
        stepA = seg(T, 0, 0.2) * (1 - seg(T, 5.6, 5.9));
        const sw = T < 1.25 ? 0 : T < 3.25 ? 1.25 : 3.25;
        stepPop = sw ? E.back(seg(T, sw, sw + 0.3)) : E.back(seg(T, 0, 0.3));
      }
      rp = legs(rp, gait.ph, gait.amp, { arms: false, stride: gait.stride });

      tree(g, st);
      page(g, pg);
      if (dot) {
        circle(g, dot[0], dot[1] - 13, 3.4);
        inkFill(g, REACT, 1, REACT);
      }
      const RJ = fig(g, rp, rx, 0, { sx: rsx, ink: REACT, far: REACT_FAR, wave: S.wave, wt: S.wt });
      if (held) {
        const h = RJ.w.handF;
        patchCard(g, h[0] + 3 * rsx, h[1] - 7, 1);
        R.frontArm(g, RJ);
      }
      fig(g, up, UX, 0, { sx: -1 });

      if (noteK > 0 && noteK < 1) {
        const p = arcPt(BTN_C, [NODES.count[0], NODES.count[1] - 2], 58, E.sm(noteK));
        note(g, p[0], p[1], Math.sin(Math.PI * noteK) * -0.2, 'setCount(4)', 1);
      }
      if (patchFly > 0 && patchFly < 1) {
        const p = arcPt([BADGE[0], BADGE[1] + 7], [catchHand[0] - 3, catchHand[1]], 26, E.soft(patchFly));
        patchCard(g, p[0], p[1] - 7, 1);
      }
      patchCard(g, NUM[0], NUM[1] - 4, stuck);
      sparks(g, WIN.x + WIN.w / 2, WIN.y - 5, paint, 14, 5, C.amber);
      sparks(g, BTN_C[0], BTN_C[1] - 10, T >= 0 ? seg(T, 0.36, 0.7) : 0, 9, 5);
      if (stepA > 0) {
        g.save();
        g.globalAlpha *= stepA;
        g.translate(-10, -174);
        g.scale(stepPop, stepPop);
        pill(g, 0, 0, step, C.paper, REACT, 9);
        g.restore();
      }
      figLabel(g, 'react', RH);
      figLabel(g, 'user', UX);
    },
  };

  // ---------------------------------------------------------------- hooks

  const HX = -146; // react, facing right
  const SH = { x: -132, y: -120, w: 46 }; // the shelf: one slot per hook
  const SLOT_H = 26;
  const slotY = (i) => SH.y + i * SLOT_H + SLOT_H / 2;
  const VALUES = ['0', "'Ana'", 'fx'];
  const CODE = { x: -60, y: -152, w: 252, h: 110 };
  const LINES = [
    { s: 'useState(0)', y: -118 },
    { s: "useState('Ana')", y: -96 },
    { s: 'useEffect(…)', y: -74 },
  ];
  const GOT = CODE.x + CODE.w - 52; // where each hook's value lands

  function tile(g, x, y, label, alpha, col) {
    if (alpha <= 0) {
      return;
    }
    const w = Math.max(24, tw(g, label, 8.5) + 10), h = 16;
    g.save();
    g.globalAlpha *= alpha;
    rr(g, x - w / 2, y - h / 2, w, h, 3);
    inkFill(g, col || C.butter, 1.2);
    text(g, label, x, y + 3, 8.5, C.umber);
    g.restore();
  }

  function shelf(g, has) {
    ln(g, SH.x + 6, SH.y + SLOT_H * 3, SH.x, 0, 2.2);
    ln(g, SH.x + SH.w - 6, SH.y + SLOT_H * 3, SH.x + SH.w, 0, 2.2);
    for (let i = 0; i < 3; i++) {
      rr(g, SH.x, SH.y + i * SLOT_H, SH.w, SLOT_H, 2);
      inkFill(g, C.wood, 1.5);
      rr(g, SH.x + 4, SH.y + i * SLOT_H + 4, SH.w - 8, SLOT_H - 6, 2);
      inkFill(g, '#f7f1e6', 1.1);
      tile(g, SH.x + SH.w / 2, slotY(i) + 1, VALUES[i], has[i]);
      text(g, String(i + 1), SH.x + SH.w + 8, slotY(i) + 3, 9, C.muted);
    }
    text(g, 'hooks', SH.x + SH.w / 2, SH.y - 7, 9, C.muted);
  }

  function code(g, st) {
    stand(g, CODE.x + 30, CODE.x + CODE.w - 30, CODE.y + CODE.h);
    win(g, CODE.x, CODE.y, CODE.w, CODE.h, 'Profile.jsx');
    LINES.forEach((L, i) => {
      const skip = i === 0 ? st.skip : 0;
      text(g, L.s, CODE.x + 30, L.y + 3, 9.5, skip > 0.5 ? '#b0b0b0' : C.ink, 'left');
      if (skip > 0) {
        g.save();
        g.globalAlpha *= skip;
        ln(g, CODE.x + 28, L.y, CODE.x + 30 + tw(g, L.s, 9.5) + 2, L.y, 1.4, C.redInk);
        pill(g, CODE.x + 140, L.y, 'if (show)', C.red, C.redInk, 8.5);
        g.restore();
      }
      g.save();
      g.setLineDash([2.5, 2.5]);
      rr(g, GOT - 22, L.y - 9, 44, 18, 3);
      inkFill(g, null, 1, '#cfcfcf');
      g.restore();
    });
    if (st.arrow) {
      R.arrowHead(g, [CODE.x + 22, st.arrow[1]], 0, 6, 1.8, REACT);
      ln(g, CODE.x + 12, st.arrow[1], CODE.x + 21, st.arrow[1], 1.8, REACT);
    }
  }

  SC['react-hooks'] = {
    dur: 6.6,
    width: 460,
    label: 'React keeps a component\'s hook values on a numbered shelf and hands them out in the order the hooks are called. Play it again and the first hook is skipped by an if, so every value lands in the wrong place.',
    draw(g, S) {
      const T = S.on ? S.u * this.dur : -1;
      const t = S.t;
      const broken = S.on && S.n % 2 === 1;
      let rp = breathe(REST, t);
      const has = [1, 1, 1];
      const landed = [];
      const fly = [];
      const st = { skip: 0, arrow: null };
      let said = 0;

      if (T < 0) {
        rp = mix(rp, CHIN, pulse(t, 6.5, 2, 2.2));
      } else {
        const fade = 1 - seg(T, this.dur - 0.5, this.dur);
        st.skip = broken ? E.back(seg(T, 0.05, 0.35)) * fade : 0;
        const calls = broken ? [1, 2] : [0, 1, 2]; // which line each call comes from
        const arrowA = seg(T, 0.15, 0.3) * (1 - seg(T, 3.9, 4.1));
        calls.forEach((line, c) => {
          const s = 0.45 + c * 1.1;
          // React reaches into the next slot, whatever the line asks for.
          const lean = c === 2 ? { chest: [4, -84], hip: [0, -55], head: [9, -110] } : c === 0 ? { chest: [3, -92], head: [9, -117] } : { chest: [3, -90], head: [9, -114] };
          const reach = P(Object.assign({ hF: lp([SH.x + 10, slotY(c) + 2], HX, 0, 1), hB: [-3, -50] }, lean));
          rp = mix(rp, reach, E.soft(seg(T, s, s + 0.3)));
          rp = mix(rp, breathe(REST, t), E.soft(seg(T, s + 0.45, s + 0.75)));
          has[c] = Math.min(has[c], 1 - seg(T, s + 0.3, s + 0.36));
          const k = seg(T, s + 0.33, s + 0.85);
          if (k > 0 && k < 1) {
            fly.push({ c, line, k });
          }
          if (T >= s + 0.85) {
            landed.push({ c, line, ok: c === line, k: seg(T, s + 0.85, s + 1.0) });
          }
          if (T >= s - 0.15) {
            const prev = c === 0 ? null : LINES[calls[c - 1]].y;
            const y = prev == null ? LINES[line].y : lerp(prev, LINES[line].y, E.soft(seg(T, s - 0.15, s + 0.05)));
            st.arrow = [0, y];
          }
        });
        if (T < 0.45) {
          st.arrow = [0, LINES[calls[0]].y];
        }
        if (arrowA <= 0) {
          st.arrow = null;
        }
        const end = broken ? 2.75 : 3.85;
        if (broken) {
          rp = mix(rp, WHOA, E.soft(seg(T, end, end + 0.3)) * (1 - E.soft(seg(T, end + 1.4, end + 1.8))));
          said = seg(T, end + 0.2, end + 0.4) * (1 - seg(T, end + 1.6, end + 1.8));
        } else {
          rp = mix(rp, CHEER, E.back(seg(T, end, end + 0.55)) * (1 - E.soft(seg(T, end + 0.95, end + 1.3))));
        }
        // Everything goes back on the shelf at the end.
        for (let i = 0; i < 3; i++) {
          has[i] = Math.max(has[i], seg(T, this.dur - 0.5, this.dur));
        }
        landed.forEach((L) => {
          L.alpha = fade;
        });
      }

      shelf(g, has);
      code(g, st);
      landed.forEach((L) => {
        const y = LINES[L.line].y;
        tile(g, GOT, y, VALUES[L.c], L.alpha, L.ok ? C.butter : C.red);
        g.save();
        g.globalAlpha *= L.alpha;
        if (L.ok) {
          tick(g, GOT + 32, y, L.k, 0.9);
        } else if (L.k > 0) {
          ln(g, GOT + 28, y - 5, GOT + 28 + 9 * L.k, y - 5 + 9 * L.k, 2, C.redInk);
          if (L.k > 0.5) {
            ln(g, GOT + 37, y - 5, GOT + 37 - 9 * seg(L.k, 0.5, 1), y - 5 + 9 * seg(L.k, 0.5, 1), 2, C.redInk);
          }
        }
        g.restore();
      });
      fig(g, rp, HX, 0, { ink: REACT, far: REACT_FAR, wave: S.wave, wt: S.wt });
      fly.forEach((f) => {
        const p = arcPt([SH.x + SH.w / 2, slotY(f.c)], [GOT, LINES[f.line].y], 36, E.sm(f.k));
        tile(g, p[0], p[1], VALUES[f.c], 1);
      });
      bubble(g, HX - 4, -150, 'wrong values!', said, { tail: 4 });
      figLabel(g, 'react', HX);
    },
  };

  // ---------------------------------------------------------------- batch

  const OX = -182; // the event handler, facing right
  const TRAY = { x: -158, y: -60, w: 62 };
  const BX2 = -76; // react, faces left at the tray, right to throw
  const W3 = { x: 76, y: -130, w: 116, h: 96 };
  const B3 = [W3.x, W3.y + 13];
  const NOTES = ['setCount', 'setName', 'setOpen'];
  const restSpot = (i) => [TRAY.x + 16 + i * 15, TRAY.y - 13 - i * 6];

  function tray(g) {
    ln(g, TRAY.x - 4, -50, TRAY.x, 0, 2.2);
    ln(g, TRAY.x + TRAY.w + 4, -50, TRAY.x + TRAY.w, 0, 2.2);
    rr(g, TRAY.x - 10, -52, TRAY.w + 20, 6, 2);
    inkFill(g, C.wood, 1.4);
    text(g, 'queue', TRAY.x + TRAY.w / 2, -34, 9, C.muted);
  }
  function trayFront(g) {
    g.beginPath();
    g.moveTo(TRAY.x, TRAY.y - 6);
    g.lineTo(TRAY.x + 3, -52);
    g.lineTo(TRAY.x + TRAY.w - 3, -52);
    g.lineTo(TRAY.x + TRAY.w, TRAY.y - 6);
    inkFill(g, '#f3ece0', 1.4);
  }

  function screen(g, k, flash) {
    stand(g, W3.x + 22, W3.x + W3.w - 22, W3.y + W3.h);
    win(g, W3.x, W3.y, W3.w, W3.h, 'localhost');
    g.save();
    g.translate(B3[0], B3[1]);
    const rows = [['count', k ? '4' : '3'], ['name', k ? 'Bo' : 'Ana'], ['menu', null]];
    rows.forEach(([label, val], i) => {
      const y = 22 + i * 20;
      if (flash > 0) {
        g.save();
        g.globalAlpha *= flash;
        rr(g, 50, y - 11, 52, 16, 3);
        g.fillStyle = C.butterSoft;
        g.fill();
        g.restore();
      }
      text(g, label, 10, y + 1, 8.5, C.muted, 'left');
      if (val) {
        text(g, val, 56, y + 1.5, 10, C.ink, 'left');
      } else {
        rr(g, 56, y - 7, 24, 12, 6);
        inkFill(g, k ? C.green : '#ececec', 1.2, k ? C.greenInk : '#b0b0b0');
        circle(g, k ? 74 : 62, y - 1, 4.2);
        inkFill(g, C.paper, 1.1, k ? C.greenInk : '#b0b0b0');
      }
    });
    g.restore();
  }

  SC['react-batch'] = {
    dur: 6.4,
    width: 460,
    label: 'An event handler drops three state updates into a queue. React waits until the handler has finished, then takes all three at once and updates the page in a single render.',
    draw(g, S) {
      const T = S.on ? S.u * this.dur : -1;
      const t = S.t;
      let op = breathe(REST, t + 2.1), rp = breathe(REST, t);
      let rsx = -1, said = 0, done = 0, scoop = 0, flyK = -1, held = 0, applied = false, flash = 0, sign = 0;
      const notes = [];

      if (T < 0) {
        rp = mix(rp, CHIN, pulse(t, 6.5, 2, 2.2));
        op = mix(op, P({ hF: [12, -60], hB: [-4, -52], head: [-4, -115] }), pulse(t + 2, 7, 1, 1.5));
      } else {
        const fade = 1 - seg(T, this.dur - 0.5, this.dur);
        // The handler runs: three set calls, each just a note in the queue.
        const WRITE = (b) => P({ hF: [26, -72 - b], hB: [16, -66], hang: 0, head: [7, -114], chest: [3, -90] });
        const tosses = [0.2, 0.6, 1.0];
        const bob = tosses.reduce((a, s) => a + Math.sin(Math.PI * seg(T, s, s + 0.2)) * 7, 0);
        op = mix(op, WRITE(bob), E.soft(seg(T, 0, 0.2)) * (1 - E.soft(seg(T, 1.35, 1.6))));
        tosses.forEach((s, i) => {
          const k = seg(T, s + 0.05, s + 0.35);
          notes.push({ i, k, s });
        });
        done = seg(T, 1.4, 2.2);

        rp = mix(rp, CHIN, E.soft(seg(T, 0.1, 0.4)));
        said = seg(T, 0.35, 0.5) * (1 - seg(T, 1.3, 1.45));
        // When the handler returns, React takes them all at once.
        const SCOOP = P({ hF: lp([TRAY.x + TRAY.w - 14, TRAY.y - 4], BX2, 0, -1), hB: [-4, -54], head: [9, -112], chest: [5, -87] });
        rp = mix(rp, SCOOP, E.soft(seg(T, 1.55, 1.85)));
        rp = mix(rp, P({ hF: [14, -68], hB: [-4, -54], head: [6, -115] }), E.soft(seg(T, 1.95, 2.15)));
        scoop = seg(T, 1.85, 2.0);
        rsx = T >= 2.15 && T < 4.6 ? 1 : -1;
        rp = mix(rp, UP, E.soft(seg(T, 2.2, 2.42)));
        rp = mix(rp, FLICK, E.soft(seg(T, 2.42, 2.52)));
        rp = mix(rp, breathe(REST, t), E.soft(seg(T, 2.65, 3.0)));
        held = T >= 2.0 && T < 2.47 ? 1 : 0;
        flyK = seg(T, 2.47, 3.1);
        applied = T >= 3.1 && fade > 0.5;
        flash = seg(T, 3.1, 3.2) * (1 - seg(T, 3.8, 4.4));
        sign = seg(T, 3.15, 3.4) * fade;
        rp = mix(rp, CHEER, E.back(seg(T, 3.35, 3.9)) * (1 - E.soft(seg(T, 4.2, 4.55))));
        op = mix(op, P({ hF: [12, -60], hB: [-4, -52], head: [9, -117] }), E.soft(seg(T, 3.2, 3.5)) * (1 - E.soft(seg(T, 4.3, 4.7))));
      }

      tray(g);
      // Notes resting in the tray, drawn before its front lip.
      notes.forEach((n) => {
        if (n.k >= 1 && scoop <= 0) {
          const p = restSpot(n.i);
          note(g, p[0], p[1], -0.1 + n.i * 0.08, NOTES[n.i], 1, 0.85);
        }
      });
      trayFront(g);
      screen(g, applied, flash);
      fig(g, op, OX, 0, {});
      const RJ = fig(g, rp, BX2, 0, { sx: rsx, ink: REACT, far: REACT_FAR, wave: S.wave, wt: S.wt });
      const stack = (x, y, a) => {
        for (let i = 0; i < 3; i++) {
          note(g, x + i * 2, y - i * 4, -0.06 + i * 0.05, NOTES[i], a, 0.8);
        }
      };
      if (scoop > 0 && scoop < 1) {
        const hand = RJ.w.handF;
        const p = R.L2([TRAY.x + TRAY.w / 2, TRAY.y - 2], [hand[0], hand[1] - 8], E.soft(scoop));
        stack(p[0], p[1], 1);
      } else if (held || (scoop >= 1 && T < 2.0)) {
        const hand = RJ.w.handF;
        stack(hand[0], hand[1] - 8, 1);
        R.frontArm(g, RJ);
      }
      notes.forEach((n) => {
        if (n.k > 0 && n.k < 1) {
          const from = [OX + 26, -66];
          const p = arcPt(from, restSpot(n.i), 22, E.sm(n.k));
          note(g, p[0], p[1], 0, NOTES[n.i], 1, 0.85);
        }
      });
      if (flyK > 0 && flyK < 1) {
        const from = [BX2 + 22, -122], to = [W3.x + W3.w / 2, -86];
        const p = arcPt(from, to, 46, E.sm(flyK));
        stack(p[0], p[1], 1);
      }
      sparks(g, W3.x + W3.w / 2, W3.y - 6, T >= 0 ? seg(T, 3.1, 3.6) : 0, 14, 5, C.amber);
      if (sign > 0) {
        g.save();
        g.globalAlpha *= sign;
        const z = E.back(clamp(sign * 1.4, 0, 1));
        g.translate(W3.x + W3.w / 2, W3.y - 26);
        g.scale(z, z);
        pill(g, 0, 0, '1 render', C.green, C.greenInk, 9.5);
        g.restore();
      }
      floatText(g, 'done', OX + 4, -128, done, C.muted, 9);
      bubble(g, BX2 - 4, -132, 'not yet…', said, { tail: 6 });
      figLabel(g, 'onClick', OX);
      figLabel(g, 'react', BX2);
    },
  };
})();
