// React Server Components, before and after. Two scenes on the same stage:
// a server with its database on the left, a browser window and its user on
// the right.
//   rsc-before: the server heaves a heavy bundle across, then the browser asks
//     for the post, the author and the comments one request at a time, and
//     the page fills in piece by piece.
//   rsc-after: the server reads the database next door, renders the page, and
//     sends it over in one trip with a tiny like.js that the browser wires up.
// Load after stick.js. Use as <stick-scene scene="rsc-before" play="view">.
(function () {
  const SC = (window.SCENES = window.SCENES || {});
  const R = window.RIG;
  const { C, E, P, mix, fig, inkFill, rr, ln, circle, text, seg, breathe, pulse, lp, sparks, bubble, words, plane, arcPt, lerp, clamp, floatText, stand, win, partial, tip, pill } = R;

  const SRV = '#3d7a8c', SRV_FAR = '#a9c9d1';
  const LIKED = '#e2575b';
  const WIDTH = 540;

  // Fixed layout in world units: ground is y = 0, up is negative.
  const DB = { x: -264, y: -54, w: 30, h: 54 };
  const WIN = { x: 92, y: -114, w: 112, h: 88 };
  const BODY = { x: WIN.x, y: WIN.y + 13 }; // top-left of the page content (112 × 75)
  const BX = 222; // the browser's user, facing left
  const LIKE = { x: 74, y: 16, w: 30, h: 16 }; // like button, in page coordinates

  const REST = P({ hF: [12, -60], hB: [-4, -52] });
  const CHIN = P({ hF: [10, -96], head: [7, -116], hB: [-4, -54] });
  const UP = P({ hF: [22, -128], hB: [-4, -54], head: [6, -117] });
  const FLICK = P({ hF: [40, -104], hB: [-4, -54], head: [10, -116] });
  const CHEER = P({ hF: [14, -132], hB: [-10, -130], head: [3, -118] });

  // ---------------------------------------------------------------- props

  function database(g, glow, box) {
    const { x, y, w, h } = box || DB;
    const rx = w / 2, ry = 4.5, cx = x + rx;
    const body = () => {
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x, y + h - ry);
      g.ellipse(cx, y + h - ry, rx, ry, 0, Math.PI, 0, true);
      g.lineTo(x + w, y);
      g.ellipse(cx, y, rx, ry, 0, 0, Math.PI, true);
      g.closePath();
    };
    body();
    inkFill(g, C.paper, 1.5);
    if (glow > 0) {
      g.save();
      g.globalAlpha *= glow;
      body();
      g.fillStyle = C.butter;
      g.fill();
      g.restore();
      body();
      inkFill(g, null, 1.5);
    }
    for (const yy of h > 44 ? [y + 15, y + 30] : [y + 13]) {
      g.beginPath();
      g.ellipse(cx, yy, rx, ry, 0, 0, Math.PI);
      inkFill(g, null, 1.1);
    }
    g.beginPath();
    g.ellipse(cx, y, rx, ry, 0, 0, Math.PI * 2);
    inkFill(g, glow > 0.5 ? C.butterHi : C.paper, 1.3);
    text(g, 'db', cx, y + h - 9, 9, C.muted);
  }

  function heart(g, x, y, r, fill, stroke) {
    g.beginPath();
    g.moveTo(x, y + r * 0.9);
    g.bezierCurveTo(x - r * 1.4, y - r * 0.15, x - r * 0.7, y - r * 1.15, x, y - r * 0.35);
    g.bezierCurveTo(x + r * 0.7, y - r * 1.15, x + r * 1.4, y - r * 0.15, x, y + r * 0.9);
    g.closePath();
    inkFill(g, fill, 1, stroke);
  }

  // like: { mode: 'plain' | 'slot' | 'static' | 'live', live: 0..1, count }
  function likeButton(g, like) {
    const { x, y, w, h } = LIKE;
    if (like.mode === 'slot') {
      g.save();
      g.setLineDash([2.5, 2.5]);
      rr(g, x, y, w, h, 4);
      inkFill(g, null, 1.1, C.amber);
      g.restore();
      return;
    }
    const live = like.mode === 'live' ? like.live : like.mode === 'plain' ? 1 : 0;
    rr(g, x, y, w, h, 4);
    inkFill(g, live > 0.5 && like.mode === 'live' ? C.butter : C.paper, 1.2, live > 0.5 ? C.ink : '#c4c4c4');
    const col = live > 0.5 ? C.ink : '#b0b0b0';
    heart(g, x + 9, y + 8.4, 3.6, like.liked ? LIKED : C.paper, like.liked ? '#a83236' : col);
    text(g, String(like.count ?? 12), x + 21, y + 11.3, 8.5, col);
  }

  function row(g, k, fn) {
    if (k <= 0) {
      return;
    }
    g.save();
    g.globalAlpha *= clamp(k, 0, 1);
    g.translate(0, (1 - E.out3(clamp(k, 0, 1))) * 4);
    fn();
    g.restore();
  }

  // A blog post page, 112 × 75 with its origin at the top-left: a byline,
  // the post with a like button, and two comments. k[i] reveals row i.
  function pageBody(g, k, like) {
    row(g, k[0], () => {
      circle(g, 12, 10, 4.5);
      inkFill(g, C.butterSoft, 1.2);
      ln(g, 21, 10, 50, 10, 2.4, '#a3a3a3');
    });
    row(g, k[1], () => {
      ln(g, 8, 24, 62, 24, 3.2, C.ink);
      words(g, 8, 33, 60, 3, '#cfcfcf', 2);
      words(g, 8, 40, 46, 9, '#cfcfcf', 2);
      likeButton(g, like);
    });
    row(g, k[2], () => {
      for (let i = 0; i < 2; i++) {
        rr(g, 8, 47 + i * 12, 96, 9, 2);
        inkFill(g, '#f6f6f6', 1, '#d9d9d9');
        words(g, 13, 51.5 + i * 12, 58 - i * 16, 5 + i * 7, '#c4c4c4', 1.8);
      }
    });
  }

  // Grey placeholders for rows that haven't arrived, pulsing gently.
  function skeleton(g, k, t) {
    const a = 0.55 + Math.sin(t * 5) * 0.2;
    const block = (kk, fn) => {
      if (kk <= 0.01) {
        return;
      }
      g.save();
      g.globalAlpha *= kk * a;
      fn();
      g.restore();
    };
    block(k[0], () => {
      circle(g, 12, 10, 4.5);
      g.fillStyle = '#e8e8e8';
      g.fill();
      ln(g, 21, 10, 50, 10, 3, '#e8e8e8');
    });
    block(k[1], () => {
      ln(g, 8, 24, 62, 24, 4, '#e8e8e8');
      ln(g, 8, 33, 66, 33, 3, '#efefef');
      ln(g, 8, 40, 52, 40, 3, '#efefef');
    });
    block(k[2], () => {
      for (let i = 0; i < 2; i++) {
        rr(g, 8, 47 + i * 12, 96, 9, 2);
        g.fillStyle = '#efefef';
        g.fill();
      }
    });
  }

  function browserWindow(g, shake, draw) {
    g.save();
    g.translate(shake, 0);
    stand(g, WIN.x + 20, WIN.x + WIN.w - 20, WIN.y + WIN.h);
    win(g, WIN.x, WIN.y, WIN.w, WIN.h, '/post/42');
    g.save();
    g.translate(BODY.x, BODY.y);
    draw();
    g.restore();
    g.restore();
  }

  function crate(g, cx, cy, rot, s, alpha) {
    if (alpha <= 0) {
      return;
    }
    g.save();
    g.translate(cx, cy);
    g.rotate(rot);
    g.scale(s, s);
    g.globalAlpha *= alpha;
    rr(g, -29, -21, 58, 42, 3);
    inkFill(g, C.wood, 1.7);
    ln(g, -29, -11, 29, -11, 1.1, '#b9a383');
    ln(g, -29, 11, 29, 11, 1.1, '#b9a383');
    ln(g, -24, -21, -24, 21, 1.1, '#b9a383');
    ln(g, 24, -21, 24, 21, 1.1, '#b9a383');
    rr(g, -21, -13, 42, 26, 2);
    inkFill(g, C.paper, 1.2);
    text(g, 'bundle.js', 0, -2, 8.5, C.ink);
    text(g, '240 KB', 0, 9, 8.5, C.redInk);
    g.restore();
  }

  // The finished page the server sends: a sheet with the same rows, small.
  function sheet(g, cx, cy, rot, s, alpha) {
    if (alpha <= 0) {
      return;
    }
    g.save();
    g.translate(cx, cy);
    g.rotate(rot);
    g.scale(s, s);
    g.globalAlpha *= alpha;
    rr(g, -15, -19, 30, 38, 2);
    inkFill(g, C.paper, 1.4);
    circle(g, -9, -13, 2.2);
    inkFill(g, C.butterSoft, 0.9);
    ln(g, -5, -13, 6, -13, 1.5, '#a3a3a3');
    ln(g, -10, -6, 6, -6, 2.2, C.ink);
    ln(g, -10, 0, 9, 0, 1.4, '#cfcfcf');
    ln(g, -10, 4.5, 3, 4.5, 1.4, '#cfcfcf');
    rr(g, -10, 9, 20, 3.5, 1);
    g.fillStyle = '#ececec';
    g.fill();
    rr(g, -10, 14, 20, 3.5, 1);
    g.fill();
    g.restore();
  }

  function flyLabel(g, a, b, h, k, s, col) {
    if (k <= 0 || k >= 1) {
      return;
    }
    const p = arcPt(a, b, h, k);
    g.save();
    g.globalAlpha *= seg(k, 0.14, 0.26) * (1 - seg(k, 0.76, 0.88));
    text(g, s, p[0], p[1] - 11, 8.5, col || C.muted);
    g.restore();
  }

  function labels(g, serverX, gapLeft) {
    text(g, 'server', serverX, 17, 9, C.muted);
    text(g, 'browser', BX, 17, 9, C.muted);
    // The gap between them is the network.
    const mid = (gapLeft + WIN.x) / 2;
    text(g, 'network', mid, 17, 9, C.soft);
    g.save();
    g.setLineDash([3, 4]);
    ln(g, mid - 78, 14, mid - 26, 14, 1.1, C.faint);
    ln(g, mid + 26, 14, mid + 78, 14, 1.1, C.faint);
    g.restore();
  }

  function sweat(g, J, k) {
    if (k <= 0) {
      return;
    }
    const h = J.w.head;
    g.save();
    g.globalAlpha *= k;
    for (let i = 0; i < 2; i++) {
      const x = h[0] + 13 + i * 5, y = h[1] - 8 + i * 6 + (1 - k) * -3;
      g.beginPath();
      g.moveTo(x, y - 3.5);
      g.quadraticCurveTo(x + 2.6, y, x, y + 1.8);
      g.quadraticCurveTo(x - 2.6, y, x, y - 3.5);
      inkFill(g, '#cfe6f5', 1, '#5b8db0');
    }
    g.restore();
  }

  // ---------------------------------------------------------------- before

  const SX = -205; // the server, facing right
  const HOLD = P({ hF: [26, -72], hB: [20, -68], hang: 0, chest: [2, -88], head: [5, -114], hip: [0, -57] });
  const HEAVE = P({ hF: [38, -102], hB: [32, -98], hang: 0, chest: [4, -91], head: [8, -116] });
  const CATCH = P({ hF: [34, -98], hB: [-4, -54], head: [8, -116] });
  const LOOK = P({ hF: [30, -90], hB: [-4, -54], head: [-6, -115] });
  const WHOA = P({ hF: [22, -96], hB: [16, -92], hang: 0, head: [-3, -114], chest: [-2, -89] });
  const WIPE = P({ hF: [17, -111], hB: [-4, -54], head: [4, -115], chest: [1, -89] });

  const TRIPS = [
    { s: 2.2, req: 'GET /post', row: 1 },
    { s: 3.6, req: 'GET /author', row: 0 },
    { s: 5.0, req: 'GET /comments', row: 2 },
  ];
  const OUT_A = [BX - 22, -118], OUT_B = [SX + 30, -86];
  // Where the server's hand is at the top of the heave, so the crate leaves it cleanly.
  const heaveHand = fig(R.NULLG, HEAVE, SX, 0).w.handF;
  const CRATE_OFF = [24, -8];

  SC['rsc-before'] = {
    dur: 7.9,
    width: WIDTH,
    label: 'Before Server Components: the server heaves a heavy JavaScript bundle over to the browser, then the browser asks for the post, the author and the comments one request at a time, and the page fills in piece by piece.',
    draw(g, S) {
      const T = S.on ? S.u * this.dur : -1;
      const t = S.t;
      let sp = breathe(REST, t + 1.7);
      let bp = breathe(REST, t);
      let glow = 0, shake = 0, crateK = -1, crateIn = 0, barK = 0, barA = 0, skel = 0, wipe = 0, said = 0;
      const rows = [0, 0, 0];
      const planes = [];

      if (T < 0) {
        bp = mix(bp, CHIN, pulse(t, 6.5, 2, 2.2));
        sp = mix(sp, P({ hF: [12, -60], hB: [-4, -52], head: [-5, -115] }), pulse(t + 3, 7, 1, 1.6));
      } else {
        const fade = 1 - seg(T, this.dur - 0.5, this.dur);

        // The server lifts the bundle and heaves it across.
        sp = mix(sp, HOLD, E.soft(seg(T, 0, 0.35)));
        sp = mix(sp, HEAVE, E.soft(seg(T, 0.45, 0.72)));
        sp = mix(sp, breathe(REST, t + 1.7), E.soft(seg(T, 0.85, 1.25)));
        crateIn = E.back(seg(T, 0.05, 0.32));
        crateK = seg(T, 0.74, 1.65);

        // It lands in the window, which downloads it and then shows placeholders.
        const land = seg(T, 1.65, 1.95);
        shake = T > 1.65 && T < 2.0 ? Math.sin(T * 70) * 2.2 * (1 - land) : 0;
        barA = seg(T, 1.6, 1.72) * (1 - seg(T, 2.25, 2.4));
        barK = E.soft(seg(T, 1.7, 2.25));
        skel = seg(T, 2.3, 2.5) * fade;

        bp = mix(bp, WHOA, E.soft(seg(T, 1.25, 1.5)));
        bp = mix(bp, breathe(REST, t), E.soft(seg(T, 1.85, 2.15)));

        // Three requests, each waiting for the one before it.
        for (const trip of TRIPS) {
          const r = T - trip.s;
          bp = mix(bp, UP, E.soft(seg(r, 0, 0.18)));
          bp = mix(bp, FLICK, E.soft(seg(r, 0.18, 0.28)));
          bp = mix(bp, breathe(CHIN, t), E.soft(seg(r, 0.4, 0.7)));

          sp = mix(sp, CATCH, E.soft(seg(r, 0.42, 0.6)));
          sp = mix(sp, LOOK, E.soft(seg(r, 0.64, 0.76)));
          sp = mix(sp, FLICK, E.soft(seg(r, 0.82, 0.94)));
          sp = mix(sp, breathe(REST, t + 1.7), E.soft(seg(r, 1.0, 1.3)));

          glow = Math.max(glow, seg(r, 0.62, 0.7) * (1 - seg(r, 0.84, 0.92)));
          const back = [BODY.x + 40, BODY.y + [10, 24, 50][trip.row]];
          planes.push({ a: OUT_A, b: OUT_B, h: 62, k: seg(r, 0.25, 0.65), label: trip.req });
          planes.push({ a: OUT_B, b: back, h: 48, k: seg(r, 0.92, 1.3), label: '{ … }' });
          rows[trip.row] = seg(r, 1.28, 1.42) * fade;
        }

        // Finally done, and tired.
        wipe = E.soft(seg(T, 6.5, 6.75)) * (1 - E.soft(seg(T, 7.05, 7.35)));
        bp = mix(bp, WIPE, wipe);
        bp = mix(bp, breathe(REST, t), E.soft(seg(T, 7.0, 7.4)));
        said = seg(T, 6.6, 6.8) * (1 - seg(T, 7.25, 7.4));
      }

      database(g, glow);
      browserWindow(g, shake, () => {
        if (barA > 0) {
          g.save();
          g.globalAlpha *= barA;
          text(g, 'bundle.js', 56, 30, 8.5, C.muted);
          rr(g, 24, 36, 64, 7, 3.5);
          inkFill(g, C.paper, 1.1);
          if (barK > 0.02) {
            rr(g, 24, 36, 64 * barK, 7, 3.5);
            inkFill(g, C.butterHi, 1.1);
          }
          g.restore();
        }
        skeleton(g, rows.map((k) => skel * (1 - k)), t);
        pageBody(g, rows, { mode: 'plain', count: 12 });
      });

      const SJ = fig(g, sp, SX, 0, { ink: SRV, far: SRV_FAR });
      if (crateK >= 0 && crateK < 1) {
        // Held at the chest until the throw, then a slow, heavy arc.
        const hand = SJ.w.handF;
        const held = [hand[0] + CRATE_OFF[0], hand[1] + CRATE_OFF[1]];
        if (crateK <= 0) {
          crate(g, held[0], held[1], 0, 0.6 + 0.4 * crateIn, crateIn);
          R.frontArm(g, SJ);
        } else {
          const p = arcPt([heaveHand[0] + CRATE_OFF[0], heaveHand[1] + CRATE_OFF[1]], [WIN.x + WIN.w / 2, -66], 64, E.sm(crateK));
          crate(g, p[0], p[1], -0.22 * Math.sin(Math.PI * crateK), 1, 1);
        }
      }
      if (T >= 1.65 && T < 1.95) {
        const k = seg(T, 1.65, 1.95);
        crate(g, WIN.x + WIN.w / 2, -66, 0, 1 - 0.75 * E.soft(k), 1 - k);
      }
      const BJ = fig(g, bp, BX, 0, { sx: -1, wave: S.wave, wt: S.wt });
      sweat(g, BJ, wipe);
      for (const p of planes) {
        plane(g, p.a, p.b, p.k, p.h, 0.9);
        flyLabel(g, p.a, p.b, p.h, p.k, p.label);
      }
      sparks(g, WIN.x + WIN.w / 2, WIN.y - 4, T >= 0 ? seg(T, 1.62, 2.1) : 0, 16, 6);
      bubble(g, BX - 6, -130, 'finally…', said, { tail: 6 });
      labels(g, SX, SX + 30);
    },
  };

  // ---------------------------------------------------------------- after

  const AX = -232; // the server, facing right, at its board
  const SB = { x: -210, y: -118, w: 72, h: 63 };
  const SBS = SB.w / 112; // the board shows the same page, smaller
  // The database sits right under the board: one short pipe, no network.
  const DB2 = { x: SB.x + SB.w / 2 - 14, y: -36, w: 28, h: 36 };
  const PIPE = [[SB.x + SB.w / 2, DB2.y - 3], [SB.x + SB.w / 2, SB.y + SB.h]];
  const ARRIVE = [0.55, 0.9, 1.25];
  const boardPt = (px, py) => [SB.x + px * SBS, SB.y + 13 + py * SBS];
  const UP_S = P({ hF: [22, -128], hB: [-4, -54], head: [6, -117] });
  const LOOK_UP = P({ hF: [12, -60], hB: [-4, -52], head: [9, -118] });
  const SHEET_OFF = [13, -14];
  const upHand = fig(R.NULLG, UP_S, AX, 0).w.handF;
  const FROM = [upHand[0] + SHEET_OFF[0], upHand[1] + SHEET_OFF[1]];

  function board(g, k, slot) {
    stand(g, SB.x + 14, SB.x + SB.w - 14, SB.y + SB.h);
    win(g, SB.x, SB.y, SB.w, SB.h, 'Post.jsx');
    g.save();
    g.translate(SB.x, SB.y + 13);
    g.scale(SBS, SBS);
    pageBody(g, k, { mode: slot });
    g.restore();
  }

  function pipe(g) {
    R.strokePath(g, PIPE, 7, C.ink);
    R.strokePath(g, PIPE, 3.8, C.steel);
  }

  SC['rsc-after'] = {
    dur: 6.4,
    width: WIDTH,
    label: 'With Server Components: the server reads the post, the author and the comments from the database right next to it, renders the page, and sends it to the browser in one trip with a small like button that the browser wires up.',
    draw(g, S) {
      const T = S.on ? S.u * this.dur : -1;
      const t = S.t;
      let sp = breathe(REST, t + 1.7);
      let bp = breathe(REST, t);
      let glow = 0, held = 0, flyK = -1, chipK = -1, live = 0, liked = false, count = 12, said = 0;
      const bk = [0, 0, 0], wk = [0, 0, 0];
      const dots = [];

      if (T < 0) {
        bp = mix(bp, CHIN, pulse(t, 6.5, 2, 2.2));
        sp = mix(sp, P({ hF: [12, -60], hB: [-4, -52], head: [-5, -115] }), pulse(t + 3, 7, 1, 1.6));
      } else {
        const fade = 1 - seg(T, this.dur - 0.5, this.dur);

        // The server renders: each row's data comes straight up the pipe.
        const rowY = [10, 24, 50];
        const tapY = lerp(lerp(rowY[0], rowY[1], E.soft(seg(T, 0.6, 0.85))), rowY[2], E.soft(seg(T, 0.95, 1.2)));
        const bob = ARRIVE.reduce((a, at) => a + Math.sin(Math.PI * seg(T, at - 0.04, at + 0.12)) * 2.5, 0);
        const TYPE = P({ hF: lp(boardPt(14, tapY + bob / SBS), AX, 0, 1), hB: [-4, -54], head: [9, -114], chest: [3, -90] });
        sp = mix(sp, TYPE, E.soft(seg(T, 0, 0.3)));
        sp = mix(sp, P({ hF: lp(boardPt(26, 30), AX, 0, 1), hB: [-4, -54], head: [9, -114], chest: [3, -90] }), E.soft(seg(T, 1.4, 1.6)));
        sp = mix(sp, UP_S, E.soft(seg(T, 1.62, 1.85)));
        sp = mix(sp, FLICK, E.soft(seg(T, 1.85, 1.97)));
        sp = mix(sp, breathe(REST, t + 1.7), E.soft(seg(T, 2.1, 2.5)));
        ARRIVE.forEach((at, i) => {
          dots.push(seg(T, at - 0.2, at));
          bk[i] = seg(T, at, at + 0.15) * (1 - seg(T, 1.58, 1.68));
          glow = Math.max(glow, seg(T, at - 0.32, at - 0.26) * (1 - seg(T, at - 0.1, at)));
        });
        held = seg(T, 1.58, 1.68) * (1 - seg(T, 1.86, 1.88));
        flyK = seg(T, 1.87, 2.7);

        // One trip: the page streams into the window, then the like button
        // gets its JavaScript.
        [0, 1, 2].forEach((i) => {
          wk[i] = seg(T, 2.68 + i * 0.12, 2.83 + i * 0.12) * fade;
        });
        chipK = seg(T, 2.7, 3.0);
        live = seg(T, 3.0, 3.15) * fade;

        bp = mix(bp, LOOK_UP, E.soft(seg(T, 1.95, 2.25)) * (1 - E.soft(seg(T, 2.8, 3.1))));
        const likeAt = [BODY.x + LIKE.x + LIKE.w - 6, BODY.y + LIKE.y + LIKE.h / 2];
        const press = Math.sin(Math.PI * seg(T, 3.52, 3.68)) * 2;
        const TAP = P({ hF: lp([likeAt[0], likeAt[1] + press], BX, 0, -1), hB: [-4, -54], head: [9, -114], chest: [3, -90] });
        bp = mix(bp, TAP, E.soft(seg(T, 3.25, 3.52)));
        bp = mix(bp, breathe(REST, t), E.soft(seg(T, 3.72, 3.95)));
        bp = mix(bp, CHEER, E.back(seg(T, 3.98, 4.35)));
        bp = mix(bp, breathe(REST, t), E.soft(seg(T, 4.65, 5.0)));
        liked = T > 3.6 && fade > 0.5;
        count = liked ? 13 : 12;
        said = seg(T, 5.0, 5.2) * (1 - seg(T, 5.7, 5.85));
      }

      pipe(g);
      dots.forEach((k) => {
        if (k > 0 && k < 1) {
          const p = tip(partial(PIPE, k));
          circle(g, p[0], p[1], 2.6);
          inkFill(g, C.butterHi, 1);
        }
      });
      database(g, glow, DB2);
      board(g, bk, 'slot');
      browserWindow(g, 0, () => {
        pageBody(g, wk, { mode: 'live', live, liked, count });
      });

      const SJ = fig(g, sp, AX, 0, { ink: SRV, far: SRV_FAR });
      if (held > 0) {
        const hand = SJ.w.handF;
        sheet(g, hand[0] + SHEET_OFF[0], hand[1] + SHEET_OFF[1], -0.08, 1, held);
        R.frontArm(g, SJ);
      }
      fig(g, bp, BX, 0, { sx: -1, wave: S.wave, wt: S.wt });

      const from = FROM, to = [WIN.x + WIN.w / 2, -70];
      if (flyK > 0 && flyK < 1) {
        const k = E.sm(flyK);
        const p = arcPt(from, to, 70, k);
        sheet(g, p[0], p[1], -0.08 + Math.sin(Math.PI * k) * 0.25, 1, 1);
        pill(g, p[0] + 17, p[1] + 18, 'like.js', C.butter, C.umber, 8.5);
        flyLabel(g, from, to, 70, flyK, 'the whole page', C.muted);
      }
      if (T >= 2.7 && T < 2.86) {
        // The sheet melts into the window as the rows stream in.
        sheet(g, to[0], to[1], 0, 1 + seg(T, 2.7, 2.86) * 0.4, 1 - seg(T, 2.7, 2.86));
      }
      if (chipK > 0 && chipK < 1) {
        const slot = [BODY.x + LIKE.x + LIKE.w / 2, BODY.y + LIKE.y + LIKE.h / 2];
        const p = arcPt([to[0] + 17, to[1] + 18], slot, 16, E.soft(chipK));
        g.save();
        g.globalAlpha *= 1 - seg(chipK, 0.75, 1);
        pill(g, p[0], p[1], 'like.js', C.butter, C.umber, 8.5);
        g.restore();
      }
      if (T >= 0) {
        const likeC = [BODY.x + LIKE.x + 9, BODY.y + LIKE.y + 6];
        sparks(g, likeC[0], likeC[1] - 4, seg(T, 3.6, 4.1), 10, 5, LIKED);
        floatText(g, '+1', likeC[0] + 2, likeC[1] - 14, seg(T, 3.62, 4.4), LIKED, 9);
        sparks(g, WIN.x + WIN.w / 2, WIN.y - 6, seg(T, 3.05, 3.5), 14, 5, C.amber);
      }
      bubble(g, BX - 8, -130, 'one trip!', said, { tail: 8 });
      labels(g, AX, SB.x + SB.w);
    },
  };
})();
