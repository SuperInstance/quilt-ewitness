// pilot.mjs — the pre-registered recipe for declaring the null step scale.
//
// sigma0 = inflate * RMS of MEAN-CENTERED diffs of a pilot series.
//
// Why this shape:
//  - The witness's Ville bound needs sigma0 to UPPER-BOUND the true null step
//    scale (a conservative sigma0 keeps E a supermartingale under pure scale
//    mismatch; an under-declared sigma0 is a wrong null and voids the bound).
//  - Mean-centering removes the pilot's own net decrease, so the pilot's
//    SIGNAL is not misread as noise (that would inflate sigma0 into uselessness).
//  - inflate = 2 adds headroom for seed-to-seed noise-scale variation.
//
// The experiments run the trainer with a PILOT seed (43) to get sigma0, then
// witness the claim series (seed 42). The claim series is never used to tune
// the null spec.

export function pilotSigma0(series, { inflate = 2 } = {}) {
  if (!Array.isArray(series) || series.length < 3) {
    throw new TypeError('pilot series must be an array of >= 3 finite numbers');
  }
  for (let i = 0; i < series.length; i++) {
    if (typeof series[i] !== 'number' || !Number.isFinite(series[i])) {
      throw new TypeError(`pilot series[${i}] is not finite`);
    }
  }
  const nd = series.length - 1;
  const diffs = new Array(nd);
  let mean = 0;
  for (let i = 0; i < nd; i++) { diffs[i] = series[i + 1] - series[i]; mean += diffs[i]; }
  mean /= nd;
  let s2 = 0;
  for (let i = 0; i < nd; i++) { const c = diffs[i] - mean; s2 += c * c; }
  s2 /= nd;
  return inflate * Math.sqrt(s2);
}
