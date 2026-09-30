// witness.mjs — anytime-valid witness over a training curve.
//
// witness(series, claim, { sigma0, ... }) ->
//   { E, verdict: WITNESSED|NOT_WITNESSED, citype_stop_t, ... }
//
//   claim = { type: 'DECREASES' }                       "the loss goes down"
//   claim = { type: 'IMPROVES_BEYOND', threshold: c }   "the loss reaches below c"
//
// THE NULL, stated precisely (witness-validation DESIGN.md: "the expensive part
// is defining the null precisely"). With d_t = y_t - y_{t-1} the diffs of the
// (optionally aggregate-k window-averaged) series y, the claimed null
// conditional law is
//
//     d_1 | F_0      ~ N(0, sigma0^2)
//     d_t | F_{t-1}  ~ N(0, s_t),   s_t = lambda*s_{t-1} + (1-lambda)*d_{t-1}^2
//
// Every quantity on the right at time t is a function of F_{t-1} plus the
// PRE-DECLARED constants (sigma0, lambda): the law is predictable and fully
// replayable from the series. Under this null each likelihood-ratio multiplier
// below has conditional expectation exactly 1, so E is a nonnegative martingale
// with E_0 = 1, and Ville's inequality gives
//
//     P( sup_t E_t >= 1/delta ) <= delta      at EVERY stopping time.
//
// CONDITIONAL HONESTY (the DESIGN's "THE IMPORTANT PART"): the bound is
// conditional on the claimed law being correct. sigma0 must UPPER-BOUND the
// true null step scale (a conservative sigma0 keeps the process a
// supermartingale under pure scale mismatch; an UNDER-declared sigma0 is a
// wrong null and voids the bound entirely). src/pilot.mjs provides the
// pre-registered recipe used by the experiments: sigma0 = 2 x RMS of
// mean-centered diffs of a PILOT run with a different seed, so that no part of
// the claim series is spent on scale estimation and the pilot's own decrease is
// not misread as noise.
//
// THE STOPPING RULE (anytime valid): stop at the first betting step where
// logE >= -log(delta)  (E >= 1/delta; delta = 0.05 gives the Ville threshold
// 2.9957..., the same 2.996 cellgraph ran on its forecast). For
// IMPROVES_BEYOND the alarm additionally requires the observed raw level to
// have actually reached the threshold (min level so far <= threshold); that
// gate is F_t-measurable, so it only shrinks the rejection region and the
// Ville bound still covers it.

import { geometricGrid, makeDriftMixture, makeApproachMixture } from './eproc.mjs';

const DEFAULTS = Object.freeze({
  delta: 0.05,     // Ville level: P(sup E >= 1/delta) <= delta under the null
  lambda: 0.94,    // EWMA memory for the claimed conditional variance
  gridLo: 1e-6,    // DECREASES drift grid: absolute per-step decrements
  gridHi: 1,
  gridN: 41,
  rates: undefined, // IMPROVES_BEYOND: multiplicative approach-rate grid
  aggregate: 1      // non-overlapping window mean before diffing (1 = raw)
});

export function witness(series, claim, opts = {}) {
  if (!Array.isArray(series) || series.length < 2) {
    throw new TypeError('series must be an array of >= 2 finite numbers');
  }
  for (let i = 0; i < series.length; i++) {
    if (typeof series[i] !== 'number' || !Number.isFinite(series[i])) {
      throw new TypeError(`series[${i}] is not a finite number`);
    }
  }
  if (!claim || (claim.type !== 'DECREASES' && claim.type !== 'IMPROVES_BEYOND')) {
    throw new TypeError('claim must be {type:"DECREASES"} or {type:"IMPROVES_BEYOND", threshold:number}');
  }
  if (claim.type === 'IMPROVES_BEYOND' && typeof claim.threshold !== 'number') {
    throw new TypeError('IMPROVES_BEYOND needs a numeric threshold');
  }
  // sigma0 is the declared null step scale: REQUIRED, never silently guessed.
  // A silent guess would be the "wrong null, no bound" failure the DESIGN warns
  // about, wearing a reassuring face.
  const sigma0 = opts.sigma0;
  if (typeof sigma0 !== 'number' || !Number.isFinite(sigma0) || sigma0 <= 0) {
    throw new TypeError('sigma0 is required: the declared null step scale (a positive number; see src/pilot.mjs for the pre-registered recipe)');
  }
  const delta = opts.delta ?? DEFAULTS.delta;
  if (!(delta > 0 && delta < 1)) throw new RangeError('delta must be in (0,1)');
  const lambda = opts.lambda ?? DEFAULTS.lambda;
  if (!(lambda > 0 && lambda < 1)) throw new RangeError('lambda must be in (0,1)');
  const agg = Math.max(1, Math.floor(opts.aggregate ?? DEFAULTS.aggregate));

  const logThr = -Math.log(delta);
  const n = series.length;

  // pre-committed transform: non-overlapping window means (deterministic,
  // data-independent); the tail remainder is dropped
  const J = Math.max(2, Math.floor(n / agg));
  let ys;
  if (agg === 1) {
    ys = series;
  } else {
    ys = new Array(J);
    for (let j = 0; j < J; j++) {
      let s = 0;
      for (let i = j * agg; i < (j + 1) * agg; i++) s += series[i];
      ys[j] = s / agg;
    }
  }

  const nd = ys.length - 1;
  const diffs = new Array(nd);
  for (let i = 0; i < nd; i++) diffs[i] = ys[i + 1] - ys[i];

  const proc = claim.type === 'DECREASES'
    ? makeDriftMixture({ mus: geometricGrid(opts.gridLo ?? DEFAULTS.gridLo, opts.gridHi ?? DEFAULTS.gridHi, opts.gridN ?? DEFAULTS.gridN) })
    : makeApproachMixture({ rates: opts.rates ?? geometricGrid(0.005, 0.5, 25) });

  let logEMax = 0;
  let stopStep = null;
  let stopLogE = null;
  let logE = 0;
  let minLevel = series[0];        // gate reads RAW levels (finer than windows)
  let seen = 1;                    // raw levels revealed by completed windows
  let s2 = sigma0 * sigma0;        // claimed conditional variance, F_0 part

  for (let i = 0; i < nd; i++) {
    const d = diffs[i];
    if (claim.type === 'DECREASES') proc.update(d, s2);
    else proc.update(ys[i], claim.threshold, d, s2);

    logE = proc.logTotal();
    if (logE > logEMax) logEMax = logE;

    // raw levels observable by the close of window i+1
    const upto = Math.min((i + 1) * agg, n);
    while (seen < upto) { if (series[seen] < minLevel) minLevel = series[seen]; seen++; }

    const gateOpen = claim.type === 'DECREASES' || minLevel <= claim.threshold;
    if (logE >= logThr && gateOpen) { stopStep = i + 1; stopLogE = logE; break; }

    s2 = lambda * s2 + (1 - lambda) * d * d; // update AFTER betting on d_t
  }

  const witnessed = stopStep !== null;
  return {
    E: witnessed ? Math.exp(stopLogE) : Math.exp(logE),
    verdict: witnessed ? 'WITNESSED' : 'NOT_WITNESSED',
    citype_stop_t: witnessed ? stopStep * agg : null,
    citype_stop_step: stopStep,
    E_max: Math.exp(logEMax),
    E_final: Math.exp(logE),
    logE_max: logEMax,
    logE_final: logE,
    log_threshold: logThr,
    delta,
    n,
    aggregate: agg,
    agg_points: ys.length,
    diffs_bet: witnessed ? stopStep : nd,
    claim: { ...claim },
    sigma0,
    lambda,
    null_spec: {
      sigma0,
      s_floor: 'none (sigma0 declared, EWMA keeps s_t > 0 by recursion)',
      model: 'd_1 ~ N(0, sigma0^2); d_t | F ~ N(0, s_t), s_t = lambda*s_{t-1} + (1-lambda)*d_{t-1}^2'
    }
  };
}
