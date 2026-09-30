// witness.test.mjs — the falsifiable claims. What counts as failure is stated per test.
// NOTE (honest redesign): the original NC2 ("shuffle destroys the evidence") was
// STATISTICALLY WRONG — likelihood-ratio e-processes are drift detectors and drift is
// order-invariant, so shuffling a decreasing series must STILL witness. The correct
// retraction control is the V-shape series (NC2 below): evidence must DECAY when the
// effect reverses. The redesign is receipted in the session worklog.
import { test } from "node:test";
import assert from "node:assert/strict";
import { witness, eprocess, logsumexp } from "../src/eproc.mjs";

function prng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}
const gauss = (rand) => {
  const a = Math.max(rand(), 1e-12), b = rand();
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b);
};

// T1: decreasing log-loss curve. RECIPE (README): exponential-decay loss is LINEAR
// in log space, so witnesses read log(loss). LESSON (receipted): multiplicative noise
// is DIFFERENCED by the increment view (MA structure) — its log-noise contributes
// ~sqrt(2)*amplitude to the increment sigma. 1% noise -> register sigma 0.02.
test("T1: decreasing log-loss curve is WITNESSED, crossing time deterministic", () => {
  const rand = prng(42);
  const loss = [];
  for (let t = 0; t < 3000; t++) loss.push(0.5 * Math.exp(-t / 300) * (1 + 0.01 * gauss(rand)) + 1e-6);
  const logLoss = loss.map((v) => Math.log(v));
  const w = witness(logLoss, { claim: "DECREASES", sigma: 0.02, delta: 0.05 });
  assert.equal(w.verdict, "WITNESSED", `E_max=${w.E_max}`);
  assert.ok(w.stop_t > 0 && w.stop_t < 1500, `crossed at t=${w.stop_t}, want <1500`);
  assert.ok(!w.retracted, "a monotone decrease must not retract");
  const w2 = witness(logLoss, { claim: "DECREASES", sigma: 0.02, delta: 0.05 });
  assert.equal(JSON.stringify(w), JSON.stringify(w2), "byte-deterministic");
});

// T2: shorter horizon (1500 epochs), same decay law -> still WITNESSED
 test("T2: 1500-epoch log-loss curve is WITNESSED", () => {
  const rand = prng(7);
  const loss = [];
  for (let t = 0; t < 1500; t++) loss.push(1.0 * Math.exp(-t / 300) * (1 + 0.01 * gauss(rand)) + 1e-6);
  const w = witness(loss.map((v) => Math.log(v)), { claim: "DECREASES", sigma: 0.02, delta: 0.05 });
  assert.equal(w.verdict, "WITNESSED", `E_max=${w.E_max}`);
});

// T3: under a matched-sigma random-walk null, E must stay below the Ville bar
test("T3: anytime validity holds empirically on a matched-sigma null", () => {
  const rand = prng(0x5eed);
  let y = 0;
  const series = [];
  for (let t = 0; t < 2000; t++) { y += 0.01 * gauss(rand); series.push(y); }
  const w = witness(series, { claim: "DECREASES", sigma: 0.01, delta: 0.05 });
  assert.equal(w.verdict, "NOT_WITNESSED", `null must not witness (E_max=${w.E_max})`);
  assert.ok(w.E_max < 20, `Ville bar 20; null E_max=${w.E_max}`);
});
// T4: logsumexp numerical stability across extremes
test("T4: logsumexp stable for tiny and huge inputs", () => {
  assert.ok(Math.abs(logsumexp([-1e10, -1e10]) - (-1e10 + Math.log(2))) < 1e-6);
  assert.ok(Math.abs(logsumexp([1e10, 1e10]) - (1e10 + Math.log(2))) < 1e-6);
  assert.ok(isFinite(logsumexp([-1e10, 1e10])));
});

// NC1: increasing loss series must NOT witness DECREASES
test("NC1: increasing series refuses the DECREASES claim", () => {
  const rand = prng(99);
  const loss = [];
  for (let t = 0; t < 1500; t++) loss.push(0.01 + 0.4 * (t / 1500) + 0.005 * gauss(rand));
  const w = witness(loss, { claim: "DECREASES", sigma: 0.01, delta: 0.05 });
  assert.equal(w.verdict, "NOT_WITNESSED");
  assert.ok(w.E_max < 20, `E_max=${w.E_max}`);
});

// NC2 (retraction control): steep V-shape — down fast (drift 0.8 sigma), then fully
// back up. Evidence must fire on the down-leg and DECAY after the rebound: a process
// that cannot retract is a p-value in disguise. This pin is the honesty guarantee.
test("NC2: V-shape series retracts — E decays after the effect reverses", () => {
  const rand = prng(5);
  const loss = [];
  for (let t = 0; t < 600; t++) loss.push(0.5 * Math.exp(-t / 60) + 0.005 * gauss(rand));
  for (let t = 0; t < 1200; t++) loss.push(loss[599] + 0.45 * (t / 1200) ** 2 + 0.005 * gauss(rand));
  const w = witness(loss, { claim: "DECREASES", sigma: 0.01, delta: 0.05 });
  assert.equal(w.verdict, "WITNESSED", "the down-leg should fire");
  assert.ok(w.retracted, "and the up-leg must retract it");
  assert.ok(w.E_final < w.E_max / 100, `E_final=${w.E_final} must collapse vs E_max=${w.E_max}`);
});

// NC3: refusal contract — short, non-finite, unknown claim, MISSING SIGMA all fail loudly
test("NC3: witness refuses malformed inputs loudly (sigma is required)", () => {
  assert.throws(() => witness([1, 2, 3], { sigma: 1 }));
  assert.throws(() => witness(new Array(20).fill(NaN), { sigma: 1 }));
  assert.throws(() => witness(new Array(20).fill(1), { claim: "FLATEN", sigma: 1 }));
  assert.throws(() => witness(new Array(20).fill(1), {}), /sigma is REQUIRED/);
});
