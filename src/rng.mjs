// rng.mjs — deterministic seeded randomness. Zero dependencies.
//
// The e-process statistic itself uses NO randomness (mixture over a fixed grid);
// randomness exists only in the trainers and the null-law fixture generator, and
// every stream is seeded so every run is byte-reproducible.

/** Numerical Recipes LCG (mod 2^32), the fleet idiom. Returns units in [0,1). */
export function makeLCG(seed) {
  let s = seed >>> 0;
  return function next() {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Box-Muller standard normal from a unit stream; cached second variate. */
export function makeGauss(rand) {
  let cached = null;
  return function gauss() {
    if (cached !== null) { const v = cached; cached = null; return v; }
    let u1 = rand();
    while (u1 <= 0) u1 = rand();       // log(0) guard
    const u2 = rand();
    const r = Math.sqrt(-2 * Math.log(u1));
    const th = 2 * Math.PI * u2;
    cached = r * Math.sin(th);
    return r * Math.cos(th);
  };
}

/**
 * Synthetic series generated from the EXACT conditional law that witness()
 * claims as its null — this is what makes the T3 anytime-validity check exact:
 *
 *   d_1 ~ N(0, sigma^2)
 *   d_t = sqrt(s_t) * z_t,  z_t ~ N(0,1)
 *   s_t = lambda*s_{t-1} + (1-lambda)*d_{t-1}^2,  s_1 = sigma^2
 *
 * i.e. precisely the law witness() declares when given {sigma0: sigma, lambda}.
 * The series is a zero-drift random walk — "stationary/no-decrease" in the
 * sense the DECREASES null claims (no systematic downward drift, step scale
 * bounded by sigma).
 */
export function genNullWalk({ seed, n, sigma, lambda = 0.94 }) {
  if (!Number.isInteger(n) || n < 2) throw new RangeError('n must be >= 2');
  if (!(sigma > 0)) throw new RangeError('sigma must be > 0');
  const rand = makeLCG(seed);
  const gauss = makeGauss(rand);
  const series = new Array(n);
  let x = 0;
  let s2 = sigma * sigma;
  series[0] = x;
  for (let t = 1; t < n; t++) {
    const d = Math.sqrt(s2) * gauss();
    x += d;
    series[t] = x;
    s2 = lambda * s2 + (1 - lambda) * d * d;
  }
  return series;
}

/** Fisher-Yates shuffle driven by the LCG stream (deterministic given seed). */
export function seededShuffle(arr, seed) {
  const rand = makeLCG(seed);
  const out = Array.from(arr);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = out[i]; out[i] = out[j]; out[j] = t;
  }
  return out;
}
