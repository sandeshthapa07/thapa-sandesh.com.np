// React as the charger, renderers as the devices. One scene:
//   react-charger: a charger labelled react sits at the wall. You carry its
//     cable to a browser window (react-dom), a phone (react-native), a
//     terminal (ink) and a PDF page (react-pdf). Each one answers the plug with
//     its own building block (<div>, <View>, <Box>, <Page>) and draws the same
//     order its own way. Same plug, a different handshake every time.
// Load after stick.js. Use as <stick-scene scene="react-charger" play="view">.
(function () {
  const SC = (window.SCENES = window.SCENES || {});
  const R = window.RIG;
  const { C, E, P, mix, legs, walkSeg, fig, inkFill, rr, ln, circle, text, seg, breathe, pulse, lp, sparks, bubble, pill, stand, win, term, clamp } = R;

  const REACT = '#087ea4';
  const STRIP = { x: -266, y: -7, w: 42, h: 7 };
  const BRICK = { x: -258, y: -30, w: 24, h: 23 };
  const CABLE_START = [BRICK.x + BRICK.w / 2, BRICK.y];
  const FLOOR = -4;
  const BOT = -58; // every host sits on a stand with its bottom here
  const PORT_Y = -72;

  // Each host: its frame, the building block it answers with, where you
  // stand to plug it in, and when (seconds into the action).
  const HOSTS = [
    { kind: 'dom', label: 'react-dom', block: '<div>', x: -148, w: 72, h: 62, t: 0.1 },
    { kind: 'native', label: 'react-native', block: '<View>', x: -18, w: 40, h: 70, t: 1.85 },
    { kind: 'ink', label: 'ink', block: '<Box>', x: 80, w: 72, h: 58, t: 3.4 },
    { kind: 'pdf', label: 'react-pdf', block: '<Page>', x: 210, w: 52, h: 66, t: 5.15 },
  ].map((d) => ({ ...d, y: BOT - d.h, cx: d.x + d.w / 2, port: [d.x, PORT_Y], at: d.x - 40 }));
  const [H0, H1, H2, H3] = HOSTS;
  const HOME = H0.at;

  const HOLD = P({ hF: [14, -64], hB: [-4, -52] });
  const LOOK = P({ hF: [16, -72], hB: [-4, -52], head: [8, -113] });
  const GLANCE = P({ hF: [14, -64], hB: [-4, -52], head: [10, -116] });
  const CHEER = P({ hF: [14, -132], hB: [-10, -130], head: [3, -118] });

  // ---------------------------------------------------------------- props

  function bolt(g, x, y, s, col) {
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    g.beginPath();
    g.moveTo(1.5, -6);
    g.lineTo(-3.5, 1);
    g.lineTo(-0.2, 1);
    g.lineTo(-1.5, 6);
    g.lineTo(3.5, -1);
    g.lineTo(0.2, -1);
    g.closePath();
    g.fillStyle = col;
    g.fill();
    g.restore();
  }

  function charger(g, glow) {
    rr(g, STRIP.x, STRIP.y, STRIP.w, STRIP.h, 2);
    inkFill(g, C.paper, 1.3);
    circle(g, STRIP.x + 34, STRIP.y + 3.5, 1.3);
    inkFill(g, C.ink, 0.6);
    rr(g, BRICK.x, BRICK.y, BRICK.w, BRICK.h, 3);
    inkFill(g, glow > 0 ? '#dff1f7' : C.paper, 1.5);
    bolt(g, BRICK.x + BRICK.w / 2, BRICK.y + 11.5, 0.95, REACT);
  }

  // The cable: from the charger, along the floor, and up to the plug.
  function cable(g, a, b) {
    g.beginPath();
    g.moveTo(a[0], a[1]);
    if (b[0] - a[0] > 80) {
      g.bezierCurveTo(a[0], FLOOR, a[0] + 8, FLOOR, a[0] + 22, FLOOR);
      g.lineTo(b[0] - 34, FLOOR);
      g.bezierCurveTo(b[0] - 14, FLOOR, b[0] - 16, b[1], b[0], b[1]);
    } else {
      g.bezierCurveTo(a[0] + 6, FLOOR + 2, b[0] - 26, FLOOR + 2, b[0], b[1]);
    }
    g.lineWidth = 2;
    g.strokeStyle = C.ink;
    g.lineCap = 'round';
    g.stroke();
  }

  // The plug, held at the hand, pointing the way you face.
  function plug(g, hand, sx) {
    g.save();
    g.translate(hand[0], hand[1]);
    g.scale(sx, 1);
    rr(g, -2, -3.5, 12, 7, 2);
    inkFill(g, C.paper, 1.4);
    rr(g, 10, -2, 4, 4, 1);
    inkFill(g, C.steel, 1);
    g.restore();
  }

  function port(g, d) {
    ln(g, d.port[0] - 0.5, d.port[1] - 2.5, d.port[0] - 0.5, d.port[1] + 2.5, 2.4, C.ink);
  }

  function dot(g, x, y, r, col) {
    circle(g, x, y, r);
    g.fillStyle = col;
    g.fill();
  }

  // A line that grows from x0 as k goes from 0 to 1.
  function grow(g, x0, y, len, k, lw, col) {
    if (k > 0) {
      ln(g, x0, y, x0 + len * k, y, lw, col);
    }
  }

  // react-dom: a browser window with a heading, a list, a total and a button.
  function domHost(g, d, k) {
    win(g, d.x, d.y, d.w, d.h);
    if (k <= 0) {
      return;
    }
    const x = d.x + 8, y = d.y + 13;
    g.save();
    g.globalAlpha *= clamp(k * 1.6, 0, 1);
    grow(g, x, y + 10, 30, k, 3, C.ink);
    for (let i = 0; i < 2; i++) {
      dot(g, x + 2, y + 19 + i * 8, 1.4, C.ink);
      grow(g, x + 7, y + 19 + i * 8, i ? 26 : 34, k, 2, '#bdbdbd');
    }
    grow(g, x, y + 38, 22, k, 2, '#8a8a8a');
    rr(g, d.x + d.w - 30, y + 33, 22, 10, 5);
    inkFill(g, C.butter, 1.1);
    g.restore();
  }

  // react-native: a phone with list cells and a wide button.
  function nativeHost(g, d, k) {
    const { x, y, w, h } = d;
    rr(g, x, y, w, h, 8);
    inkFill(g, C.paper, 1.6);
    ln(g, x + 15, y + 5, x + 25, y + 5, 1.4);
    ln(g, x + 14, y + h - 5, x + 26, y + h - 5, 1.4);
    if (k <= 0) {
      return;
    }
    g.save();
    g.globalAlpha *= clamp(k * 1.6, 0, 1);
    for (let i = 0; i < 2; i++) {
      rr(g, x + 6, y + 12 + i * 12, w - 12, 9, 3);
      inkFill(g, C.paper, 1, '#bdbdbd');
      grow(g, x + 9, y + 16.5 + i * 12, i ? 14 : 19, k, 1.6, '#9a9a9a');
    }
    grow(g, x + 7, y + 41, 18, k, 2, '#8a8a8a');
    rr(g, x + 6, y + 48, w - 12, 10, 5);
    inkFill(g, C.butter, 1.1);
    g.restore();
  }

  // ink: a terminal with a rounded border box around the order.
  function inkHost(g, d, k) {
    const { x, y, w, h } = d;
    term(g, x, y, w, h);
    if (k <= 0) {
      return;
    }
    g.save();
    g.globalAlpha *= clamp(k * 1.6, 0, 1);
    rr(g, x + 6, y + 18, w - 12, h - 24, 5);
    g.lineWidth = 1;
    g.strokeStyle = '#8fd19e';
    g.stroke();
    grow(g, x + 12, y + 26, 30, k, 1.8, '#e5e5e5');
    grow(g, x + 12, y + 33, 24, k, 1.8, '#e5e5e5');
    grow(g, x + 12, y + 41, 22, k, 2.6, '#ffffff');
    grow(g, x + 12, y + 47, 36, k, 1.4, '#7a7a7a');
    g.restore();
  }

  // react-pdf: a page with a folded corner, rows and a total on the right.
  function pdfHost(g, d, k) {
    const { x, y, w, h } = d;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + w - 12, y);
    g.lineTo(x + w, y + 12);
    g.lineTo(x + w, y + h);
    g.lineTo(x, y + h);
    g.closePath();
    inkFill(g, C.paper, 1.6);
    g.beginPath();
    g.moveTo(x + w - 12, y);
    g.lineTo(x + w - 12, y + 12);
    g.lineTo(x + w, y + 12);
    inkFill(g, null, 1.2);
    text(g, 'PDF', x + 6, y + 12, 8.5, C.redInk, 'left');
    if (k <= 0) {
      return;
    }
    g.save();
    g.globalAlpha *= clamp(k * 1.6, 0, 1);
    grow(g, x + 6, y + 23, 26, k, 2.6, C.ink);
    for (let i = 0; i < 2; i++) {
      grow(g, x + 6, y + 32 + i * 7, i ? 16 : 20, k, 1.6, '#9a9a9a');
      grow(g, x + w - 16, y + 32 + i * 7, 10, k, 1.6, '#9a9a9a');
    }
    grow(g, x + 6, y + 46, w - 12, k, 1, C.faint);
    grow(g, x + w - 26, y + 54, 20, k, 2.2, '#6b6b6b');
    g.restore();
  }

  const DRAW = { dom: domHost, native: nativeHost, ink: inkHost, pdf: pdfHost };

  function host(g, d, k) {
    stand(g, d.x + Math.min(16, d.w / 3), d.x + d.w - Math.min(16, d.w / 3), BOT, 4);
    DRAW[d.kind](g, d, k);
    port(g, d);
  }

  // Walks between hosts, kept under ~160 units a second so feet don't skip.
  function walkAt(T) {
    if (T < 2.75) {
      return walkSeg(T, 1.0, 1.85, H0.at, H1.at);
    }
    if (T < 4.3) {
      return walkSeg(T, 2.75, 3.4, H1.at, H2.at);
    }
    return walkSeg(T, 4.3, 5.15, H2.at, H3.at);
  }

  // ---------------------------------------------------------------- scene

  SC['react-charger'] = {
    dur: 7.8,
    width: 540,
    label: 'A charger labelled react sits at the wall. A person carries its cable to a browser window, a phone, a terminal and a PDF page, the react-dom, react-native, ink and react-pdf renderers. Each one answers with its own building block, div, View, Box and Page, and draws the same order in its own way.',
    draw(g, S) {
      const T = S.on ? S.u * this.dur : -1;
      const t = S.t;
      let pose = breathe(HOLD, t);
      let x = HOME, gait = { ph: 0, amp: 0 };
      let alpha = 1;
      const rendered = HOSTS.map(() => 0);
      const pills = HOSTS.map(() => 0);
      let glow = 0, cheerK = 0;

      // Idle gestures; when the action starts, they fade out instead of cutting.
      const idle = T < 0 ? 1 : 1 - E.soft(seg(T, 0, 0.3));
      pose = mix(pose, LOOK, pulse(t, 6.5, 2, 2) * idle);
      pose = mix(pose, GLANCE, pulse(t + 3.4, 7, 1, 1.8) * idle);

      if (T >= 0) {
        const fade = 1 - seg(T, 7.0, 7.6);
        const ws = T < 1.0 ? { x: HOME, ph: 0, amp: 0 } : walkAt(T);
        x = ws.x;
        gait = ws;

        HOSTS.forEach((d, i) => {
          // Reach in, hold the plug in the port while it renders, pull it out.
          const reach = P({ hF: lp([d.port[0] - 13, d.port[1]], d.at, 0, 1), hB: [-4, -54], head: [9, -114], chest: [3, -90] });
          pose = mix(pose, reach, E.soft(seg(T, d.t, d.t + 0.25)) * (1 - E.soft(seg(T, d.t + 0.7, d.t + 0.9))));
          rendered[i] = E.out3(seg(T, d.t + 0.3, d.t + 0.7)) * fade;
          pills[i] = E.back(seg(T, d.t + 0.25, d.t + 0.5)) * (1 - seg(T, d.t + 1.1, d.t + 1.4));
          if (T >= d.t + 0.25 && T < d.t + 0.75) {
            glow = 1;
          }
        });

        pose = mix(pose, CHEER, E.back(seg(T, 6.05, 6.55)) * (1 - E.soft(seg(T, 6.65, 7.0))));
        cheerK = seg(T, 6.2, 6.35) * (1 - seg(T, 6.8, 6.95));

        // Instead of a long walk home, fade out at the last host and fade
        // back in at the first one, holding the plug again.
        if (T >= 7.3) {
          x = HOME;
          gait = { ph: 0, amp: 0 };
          alpha = seg(T, 7.3, 7.7);
        } else {
          alpha = 1 - seg(T, 6.95, 7.3);
        }
      }
      pose = legs(pose, gait.ph, gait.amp, { arms: false, stride: gait.stride });

      charger(g, glow);
      HOSTS.forEach((d, i) => host(g, d, rendered[i]));

      // The cable hangs from the plug in your hand; `held` draws it with the
      // figure, under the near arm, so the hand stays in front of the plug.
      if (alpha > 0) {
        fig(g, pose, x, 0, {
          alpha,
          wave: S.wave,
          wt: S.wt,
          held: (gg, J) =>
            R.held(gg, J, (hand) => {
              cable(gg, CABLE_START, [hand[0] - 2, hand[1]]);
              plug(gg, hand, 1);
            }),
        });
      }

      HOSTS.forEach((d, i) => {
        if (pills[i] > 0) {
          g.save();
          g.translate(d.cx, d.y - 13);
          g.scale(pills[i], pills[i]);
          pill(g, 0, 0, d.block, C.paper, REACT, 9);
          g.restore();
        }
        if (T >= 0) {
          sparks(g, d.cx, d.y - 26, seg(T, d.t + 0.6, d.t + 1.1), 11, 5, C.amber);
        }
      });

      bubble(g, H3.at - 36, -136, 'same plug!', cheerK, { tail: 28 });

      text(g, 'react', BRICK.x + BRICK.w / 2, 17, 9, REACT);
      for (const d of HOSTS) {
        text(g, d.label, d.cx, 17, 9, C.muted);
      }
    },
  };
})();
