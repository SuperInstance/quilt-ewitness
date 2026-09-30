// train.mjs — minimal seeded trainers that regenerate tonight's REAL loss chains.
//
// Lineage: SuperInstance/quilt-nn (67-d) trained a 2-4-1 tanh-hidden /
// sigmoid-out XOR net with per-sample SGD, lr 0.5, seed 42, 3000 epochs, and a
// 1-16-1 tanh/tanh sine net at lr 0.1 — recording the mean PRE-STEP loss per
// epoch into a receipt chain. This file re-implements the same seeded procedure
// minimally (LCG init + Fisher-Yates from the same stream) WITHOUT the cell-graph
// and receipt machinery: the e-process witnesses the SHAPE of the loss chain,
// which does not depend on those details.
//
// HONEST: these curves are NOT byte-identical to quilt-nn's (different init draw
// order and arithmetic path — no f64hex canonicalization here), so the loss
// VALUES differ slightly. What must match is the claim being witnessed: the
// curve decreases, for real, under a pinned seed. Deviations are documented in
// TEST-RECEIPT.md.

import { makeLCG } from './rng.mjs';

const sigmoid = (a) => 1 / (1 + Math.exp(-a));

/**
 * XOR: 2-4-1, tanh hidden, sigmoid out, MSE, per-sample SGD.
 * Returns { series, finalLoss, config }. series[t] = mean pre-step loss of epoch t.
 */
export function trainXor({ seed = 42, epochs = 3000, lr = 0.5 } = {}) {
  const rand = makeLCG(seed);
  const X = [[0, 0], [0, 1], [1, 0], [1, 1]];
  const Y = [0, 1, 1, 0];
  const H = 4;
  // init U(-0.5, 0.5), drawn in a fixed order: W1 rows, b1, W2, b2
  const W1 = [], b1 = new Array(H), W2 = new Array(H);
  for (let j = 0; j < H; j++) W1.push([(rand() - 0.5), (rand() - 0.5)]);
  for (let j = 0; j < H; j++) b1[j] = rand() - 0.5;
  for (let j = 0; j < H; j++) W2[j] = rand() - 0.5;
  let b2 = rand() - 0.5;

  const idx = [0, 1, 2, 3];
  const series = new Array(epochs);
  const z = new Array(H), h = new Array(H);

  const lossOf = (si) => {
    const x = X[si];
    for (let j = 0; j < H; j++) { z[j] = W1[j][0] * x[0] + W1[j][1] * x[1] + b1[j]; h[j] = Math.tanh(z[j]); }
    let a = b2;
    for (let j = 0; j < H; j++) a += W2[j] * h[j];
    const yh = sigmoid(a);
    const e = yh - Y[si];
    return e * e;
  };

  for (let ep = 0; ep < epochs; ep++) {
    let L = 0;
    for (let si = 0; si < 4; si++) L += lossOf(si);
    series[ep] = L / 4;                       // receipt convention: PRE-step mean loss

    // Fisher-Yates shuffle from the same LCG stream (quilt-nn idiom)
    for (let i = 3; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const t = idx[i]; idx[i] = idx[j]; idx[j] = t;
    }
    for (const si of idx) {
      const x = X[si];
      for (let j = 0; j < H; j++) { z[j] = W1[j][0] * x[0] + W1[j][1] * x[1] + b1[j]; h[j] = Math.tanh(z[j]); }
      let a = b2;
      for (let j = 0; j < H; j++) a += W2[j] * h[j];
      const yh = sigmoid(a);
      const ey = 2 * (yh - Y[si]) * yh * (1 - yh);   // dL/da
      for (let j = 0; j < H; j++) {
        const gW2 = ey * h[j];
        const dz = ey * W2[j] * (1 - h[j] * h[j]);
        const gW1_0 = dz * x[0], gW1_1 = dz * x[1];
        W2[j] -= lr * gW2;
        W1[j][0] -= lr * gW1_0; W1[j][1] -= lr * gW1_1;
        b1[j] -= lr * dz;
      }
      b2 -= lr * ey;
    }
  }
  let L = 0;
  for (let si = 0; si < 4; si++) L += lossOf(si);
  return { series, finalLoss: L / 4, config: { arch: '2-4-1 tanh/sigmoid', seed, epochs, lr, init: 'U(-0.5,0.5) LCG' } };
}

/**
 * SINE regression: 1-H-1, tanh hidden, tanh out (tanh because targets are
 * negative — the 67-d activation-ceiling finding), MSE, per-sample SGD.
 */
export function trainSine({ seed = 42, epochs = 3000, lr = 0.1, hidden = 16, points = 64 } = {}) {
  const rand = makeLCG(seed);
  const xs = new Array(points), ys = new Array(points);
  for (let i = 0; i < points; i++) {
    xs[i] = -Math.PI + 2 * Math.PI * rand();
    ys[i] = Math.sin(xs[i]);
  }
  const H = hidden;
  const W1 = new Array(H), b1 = new Array(H), W2 = new Array(H);
  for (let j = 0; j < H; j++) W1[j] = rand() - 0.5;
  for (let j = 0; j < H; j++) b1[j] = rand() - 0.5;
  for (let j = 0; j < H; j++) W2[j] = rand() - 0.5;
  let b2 = rand() - 0.5;

  const idx = new Array(points);
  for (let i = 0; i < points; i++) idx[i] = i;
  const series = new Array(epochs);
  const h = new Array(H);

  const lossOf = (i) => {
    for (let j = 0; j < H; j++) h[j] = Math.tanh(W1[j] * xs[i] + b1[j]);
    let a = b2;
    for (let j = 0; j < H; j++) a += W2[j] * h[j];
    const e = Math.tanh(a) - ys[i];
    return e * e;
  };

  for (let ep = 0; ep < epochs; ep++) {
    let L = 0;
    for (let i = 0; i < points; i++) L += lossOf(i);
    series[ep] = L / points;                  // PRE-step mean loss

    for (let i = points - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const t = idx[i]; idx[i] = idx[j]; idx[j] = t;
    }
    for (const i of idx) {
      for (let j = 0; j < H; j++) h[j] = Math.tanh(W1[j] * xs[i] + b1[j]);
      let a = b2;
      for (let j = 0; j < H; j++) a += W2[j] * h[j];
      const yh = Math.tanh(a);
      const ey = 2 * (yh - ys[i]) * (1 - yh * yh);   // dL/da
      for (let j = 0; j < H; j++) {
        const gW2 = ey * h[j];
        const dz = ey * W2[j] * (1 - h[j] * h[j]);
        W2[j] -= lr * gW2;
        W1[j] -= lr * dz * xs[i];
        b1[j] -= lr * dz;
      }
      b2 -= lr * ey;
    }
  }
  let L = 0;
  for (let i = 0; i < points; i++) L += lossOf(i);
  return { series, finalLoss: L / points, config: { arch: `1-${H}-1 tanh/tanh`, seed, epochs, lr, points, init: 'U(-0.5,0.5) LCG' } };
}
