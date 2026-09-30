// eproc.mjs — anytime-valid e-process witnesses for "it learned" claims.
//
// Construction: Gaussian mixture likelihood-ratio on RAW increments.
//   d_t = y_{t+1} - y_t.  Null H0: d_t ~ N(0, sigma^2) i.i.d. (no drift).
//   Alternatives: d_t ~ N(-mu, sigma^2) for mu on a pre-registered grid
//   (mu in units of sigma: [0.05, 0.1, 0.2, 0.4, 0.8, 1.6] * sigma), uniform weights.
//   Per-observation log-ratio (DECREASES, drift mu>0 on downward moves):
//     log f_{-mu}(d) - log f_0(d) = -d*mu/sigma^2 - mu^2/(2*sigma^2)
//   E_t = mixture; maintained in log space; Ville: P(sup_t E_t >= 1/delta) <= delta
//   under H0 — the honesty bound. Under a true drift, E grows geometrically.
//
// HONESTY CONTRACT: sigma is REQUIRED and must be pre-registered (fixed before
// looking at the series). If the registered sigma is wrong, the guarantee degrades —
// the tool refuses to run without it rather than silently peeking.
//
// Lineage (honest): witness-validation's log-space multiplier design and cellgraph's
// Ville-bound forecast e-process (E=2.996) are the fleet precedent; two prior build
// attempts timed out, so this was authored from the standard construction without
// reading that code. A scale-free betting variant was tried first and REJECTED for
// low power under noise (mean signal 1.66e-4, E stalled at 2.3 — receipts in the
// session worklog); the likelihood-ratio form exploits SNR and is the right tool.

const MU_GRID = [0.01, 0.025, 0.05, 0.1, 0.2, 0.4, 0.8, 1.6]; // in units of sigma

export function logsumexp(arr) {
  const m = Math.max(...arr);
  if (!isFinite(m)) return m;
  return m + Math.log(arr.reduce((s, x) => s + Math.exp(x - m), 0));
}

export function increments(y) {
  const d = [];
  for (let t = 0; t + 1 < y.length; t++) d.push(y[t + 1] - y[t]);
  return d;
}

// running mixture e-process over increments; sign=-1 for DECREASES (drift down),
// sign=+1 for INCREASES. Returns {logE[], E[]}.
export function eprocess(d, sigma, sign = -1, muGrid = MU_GRID) {
  if (!(sigma > 0) || !isFinite(sigma)) throw new Error("sigma must be a positive finite number (pre-registered)");
  const logE = [];
  const logAcc = muGrid.map(() => Math.log(1 / muGrid.length));
  for (let t = 0; t < d.length; t++) {
    for (let k = 0; k < muGrid.length; k++) {
      const mu = sign * muGrid[k] * sigma; // drift direction per claim
      // log f_{mu}(d) - log f_0(d) for N(mu, sigma^2): (d - mu)^2 term
      const lr = -((d[t] - mu) ** 2 - d[t] ** 2) / (2 * sigma * sigma);
      logAcc[k] += lr;
    }
    logE.push(logsumexp(logAcc));
  }
  return { logE, E: logE.map((l) => Math.exp(l)) };
}

// witness a claim on a series. sigma REQUIRED (pre-registered noise scale).
export function witness(series, { claim = "DECREASES", sigma, delta = 0.05 } = {}) {
  if (claim !== "DECREASES" && claim !== "INCREASES") throw new Error(`unknown claim ${claim}`);
  if (!Array.isArray(series) || series.length < 10) throw new Error("series too short (<10) — refuse to witness");
  if (series.some((v) => !isFinite(v))) throw new Error("non-finite value in series — refuse");
  if (sigma === undefined) throw new Error("sigma is REQUIRED and pre-registered — no silent default");
  const sign = claim === "DECREASES" ? -1 : 1;
  const { logE, E } = eprocess(increments(series), sigma, sign);
  const bar = 1 / delta;
  let stop_t = -1;
  for (let t = 0; t < E.length; t++) if (E[t] >= bar) { stop_t = t + 1; break; }
  return {
    claim, sigma, delta, bar,
    E_final: E[E.length - 1],
    E_max: Math.max(...E),
    stop_t, // first t (1-indexed) with E >= 1/delta; -1 if never
    retracted: stop_t > 0 && E[E.length - 1] < bar, // fired once, then evidence decayed
    verdict: stop_t > 0 ? "WITNESSED" : "NOT_WITNESSED",
  };
}
