// React as a UI runtime, told with a USB-C charger. One scene:
//   react-usb-c: one charger at the wall. You carry its cable to a phone, a
//     laptop and headphones. Each device and the charger agree on a voltage
//     (9V, 20V, 5V), and its battery fills. One charger, every device.
// Load after stick.js. Use as <stick-scene scene="react-usb-c" play="view">.
(function () {
  const SC = (window.SCENES = window.SCENES || {});
  const R = window.RIG;
  const { C, E, P, mix, legs, walkSeg, fig, inkFill, rr, ln, circle, text, seg, breathe, pulse, lp, sparks, bubble, pill, stand, lerp, words } = R;

  const HOME = -140;
  const STRIP = { x: -264, y: -7, w: 38, h: 7 };
  const BRICK = { x: -252, y: -30, w: 18, h: 23 };
  const CABLE_START = [BRICK.x + BRICK.w / 2, BRICK.y];
  const FLOOR = -4; // the cable lies just above the ground line
  const FULL = '#8fd19e', LOW = '#f0a3a3';
  const IDLE_LEVEL = 0.18;

  // Each device: where it stands, its charging port, the voltage it asks for,
  // where you stand to plug it in, and when (seconds into the action).
  const DEVICES = [
    { kind: 'phone', label: 'phone', cx: -40, top: -108, port: [-52, -72], volts: '9V', at: -92, t: 0.55 },
    { kind: 'laptop', label: 'laptop', cx: 70, top: -104, port: [33, -61], volts: '20V', at: -6, t: 2.3 },
    { kind: 'headphones', label: 'headphones', cx: 200, top: -124, port: [168, -84], volts: '5V', at: 129, t: 4.3 },
  ].map((d) => ({ ...d, battery: [d.cx, d.top - 13] }));
  const [D0, D1, D2] = DEVICES;

  const HOLD = P({ hF: [14, -64], hB: [-4, -52] });
  const LOOK = P({ hF: [16, -72], hB: [-4, -52], head: [8, -113] });
  const GLANCE = P({ hF: [14, -64], hB: [-4, -52], head: [10, -116] });
  const CHEER = P({ hF: [14, -132], hB: [-10, -130], head: [3, -118] });

  // ---------------------------------------------------------------- props

  function charger(g) {
    rr(g, STRIP.x, STRIP.y, STRIP.w, STRIP.h, 2);
    inkFill(g, C.paper, 1.3);
    circle(g, STRIP.x + 29, STRIP.y + 3.5, 1.3);
    inkFill(g, C.ink, 0.6);
    rr(g, BRICK.x, BRICK.y, BRICK.w, BRICK.h, 3);
    inkFill(g, C.paper, 1.5);
    bolt(g, BRICK.x + BRICK.w / 2, BRICK.y + 11.5, 0.9, C.amber);
  }

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

  function port(g, x, y, vertical) {
    if (vertical) {
      ln(g, x - 0.5, y - 2.5, x - 0.5, y + 2.5, 2.4, C.ink);
    } else {
      ln(g, x - 2.5, y, x + 2.5, y, 2.4, C.ink);
    }
  }

  function phone(g, d) {
    const x = d.cx - 12, y = d.top, w = 24, h = 44;
    stand(g, d.cx - 6, d.cx + 6, y + h, 3);
    rr(g, x, y, w, h, 5);
    inkFill(g, C.paper, 1.6);
    ln(g, d.cx - 4, y + 4, d.cx + 4, y + 4, 1.2);
    rr(g, x + 3.5, y + 8, w - 7, h - 14, 2);
    g.fillStyle = '#f4f4f4';
    g.fill();
    port(g, d.port[0], d.port[1], true);
  }

  function laptop(g, d) {
    const y = d.top;
    stand(g, d.cx - 22, d.cx + 22, y + 46, 4);
    rr(g, d.cx - 31, y, 62, 40, 3);
    inkFill(g, C.paper, 1.6);
    rr(g, d.cx - 27, y + 4, 54, 32, 2);
    g.fillStyle = '#f4f4f4';
    g.fill();
    words(g, d.cx - 21, y + 13, 40, 5, '#d4d4d4', 2);
    words(g, d.cx - 21, y + 21, 32, 9, '#d4d4d4', 2);
    g.beginPath();
    g.moveTo(d.cx - 36, y + 40);
    g.lineTo(d.cx + 36, y + 40);
    g.lineTo(d.cx + 39, y + 46);
    g.lineTo(d.cx - 39, y + 46);
    g.closePath();
    inkFill(g, C.paper, 1.5);
    port(g, d.port[0], d.port[1], true);
  }

  function headphones(g, d) {
    const y = d.top;
    // A stand: a foot on the ground and a pole up to the headband.
    rr(g, d.cx - 12, -4, 24, 4, 2);
    inkFill(g, C.paper, 1.3);
    ln(g, d.cx, -4, d.cx, y + 4, 2.2);
    g.beginPath();
    g.arc(d.cx, y + 26, 26, Math.PI, 0);
    g.lineWidth = 2.6;
    g.strokeStyle = C.ink;
    g.stroke();
    for (const cx of [d.cx - 26, d.cx + 26]) {
      rr(g, cx - 6, y + 22, 12, 22, 5);
      inkFill(g, C.paper, 1.6);
    }
    port(g, d.port[0], d.port[1], true);
  }

  const DRAW = { phone, laptop, headphones };

  function battery(g, x, y, level, charging) {
    rr(g, x - 9, y - 5, 18, 10, 2);
    inkFill(g, C.paper, 1.3);
    rr(g, x + 9, y - 2, 2.2, 4, 1);
    g.fillStyle = C.ink;
    g.fill();
    if (level > 0) {
      rr(g, x - 7.5, y - 3.5, 15 * level, 7, 1);
      g.fillStyle = level > 0.4 ? FULL : LOW;
      g.fill();
    }
    if (charging) {
      bolt(g, x + 18, y, 0.9, C.amber);
    }
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

  // A USB-C plug held at the hand, pointing the way you face.
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

  // Walks between devices, kept under ~160 units a second so feet don't skip.
  const BACK = [6.3, 8.0]; // the walk home, facing left
  function walkAt(T) {
    if (T < 1.7) {
      return walkSeg(T, 0.1, 0.55, HOME, D0.at);
    }
    if (T < 3.45) {
      return walkSeg(T, 1.7, 2.3, D0.at, D1.at);
    }
    if (T < BACK[0]) {
      return walkSeg(T, 3.45, 4.3, D1.at, D2.at);
    }
    return walkSeg(T, BACK[0], BACK[1], D2.at, HOME);
  }

  // ---------------------------------------------------------------- scene

  SC['react-usb-c'] = {
    dur: 8.5,
    width: 540,
    label: 'One USB-C charger at the wall. A person carries its cable to a phone, a laptop and headphones. Each device agrees its own voltage with the charger, 9 volts, 20 volts and 5 volts, and charges. One charger works for every device.',
    draw(g, S) {
      const T = S.on ? S.u * this.dur : -1;
      const t = S.t;
      let pose = breathe(HOLD, t);
      let x = HOME, sx = 1, gait = { ph: 0, amp: 0 };
      const levels = DEVICES.map(() => IDLE_LEVEL);
      const charging = DEVICES.map(() => false);
      const pills = DEVICES.map(() => 0);
      let cheerK = 0;

      // Idle gestures; when the action starts, they fade out instead of cutting.
      const idle = T < 0 ? 1 : 1 - E.soft(seg(T, 0, 0.3));
      pose = mix(pose, LOOK, pulse(t, 6.5, 2, 2) * idle);
      pose = mix(pose, GLANCE, pulse(t + 3.4, 7, 1, 1.8) * idle);
      if (T >= 0) {
        const back = seg(T, this.dur - 0.5, this.dur);
        const ws = walkAt(T);
        x = ws.x;
        gait = ws;
        sx = T >= BACK[0] && T < BACK[1] ? -1 : 1;

        DEVICES.forEach((d, i) => {
          // Reach in, hold the plug in the port while it charges, pull it out.
          const reach = P({ hF: lp([d.port[0] - 13, d.port[1]], d.at, 0, 1), hB: [-4, -54], head: [9, -114], chest: [3, -90] });
          pose = mix(pose, reach, E.soft(seg(T, d.t, d.t + 0.3)) * (1 - E.soft(seg(T, d.t + 0.9, d.t + 1.15))));
          const filled = lerp(IDLE_LEVEL, 1, E.out(seg(T, d.t + 0.3, d.t + 0.9)));
          levels[i] = lerp(filled, IDLE_LEVEL, back);
          charging[i] = T >= d.t + 0.3 && T < d.t + 0.95;
          pills[i] = E.back(seg(T, d.t + 0.3, d.t + 0.55)) * (1 - seg(T, d.t + 1.3, d.t + 1.6));
        });

        pose = mix(pose, CHEER, E.back(seg(T, 5.45, 5.95)) * (1 - E.soft(seg(T, 6.05, 6.4))));
        cheerK = seg(T, 5.6, 5.75) * (1 - seg(T, 6.25, 6.45));
      }
      pose = legs(pose, gait.ph, gait.amp, { arms: false, stride: gait.stride });

      charger(g);
      DEVICES.forEach((d) => DRAW[d.kind](g, d));

      // The cable hangs from the plug in your hand. `held` draws it with the
      // figure, under the near arm, so the hand stays in front of the plug.
      fig(g, pose, x, 0, {
        sx,
        wave: S.wave,
        wt: S.wt,
        held: (gg, J) =>
          R.held(gg, J, (hand) => {
            cable(gg, CABLE_START, [hand[0] - 2 * sx, hand[1]]);
            plug(gg, hand, sx);
          }),
      });

      DEVICES.forEach((d, i) => {
        battery(g, d.battery[0], d.battery[1], levels[i], charging[i]);
        if (pills[i] > 0) {
          g.save();
          g.translate(d.battery[0], d.battery[1] - 17);
          g.scale(pills[i], pills[i]);
          pill(g, 0, 0, d.volts, C.butter, C.umber, 9);
          g.restore();
        }
        if (T >= 0) {
          sparks(g, d.battery[0], d.battery[1] - 8, seg(T, d.t + 0.85, d.t + 1.35), 11, 5, C.amber);
        }
      });

      bubble(g, D2.at - 34, -136, 'one charger!', cheerK, { tail: 26 });

      text(g, 'charger', BRICK.x + BRICK.w / 2, 17, 9, C.muted);
      for (const d of DEVICES) {
        text(g, d.label, d.cx, 17, 9, C.muted);
      }
    },
  };
})();
