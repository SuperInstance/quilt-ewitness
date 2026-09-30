# quilt-ewitness

**Anytime-valid e-process witnesses for "it learned" claims.** A p-value is computed once and frozen; an e-process grows with every observation, can be checked continuously, and carries Ville's guarantee: under the null, `P(sup_t E_t >= 1/delta) <= delta`. Evidence that fires and then decays is **retracted** — a process that cannot retract is a p-value in disguise.

Lineage: SuperInstance/witness-validation (the design: log-space multipliers, "no bound if null wrong") and SuperInstance/cellgraph (Ville-bound forecast witnessing, E=2.996). Authored from the standard construction (Waudby-Smith–Ramdas-style honesty, Gaussian mixture likelihood ratios) without reading that code — receipted deviation, see src/eproc.mjs header.

## The tool

```js
import { witness } from "./src/eproc.mjs";
witness(logLossSeries, { claim: "DECREASES", sigma: 0.02, delta: 0.05 });
// -> { verdict, stop_t, E_max, E_final, retracted, bar }
```

- `claim`: DECREASES (training works) | INCREASES
- `sigma`: **REQUIRED, pre-registered** increment noise scale — the tool refuses to run without it (no silent defaults, no peeking)
- `delta`: false-witness budget (default 0.05); the Ville bar is 1/delta = 20

## Receipt (run-verified, Node v24.21.0, 7/7 tests)

| probe | verdict | stop_t | E_max | E_final | note |
|---|---|---|---|---|---|
| T1 log-loss decay (3000 ep, 1% noise) | WITNESSED | **324** | 2.5e16 | 2.5e16 | monotone, no retraction |
| T3 matched-σ random-walk null (2000 steps) | NOT_WITNESSED | — | **0.85** | — | Ville bar 20 never approached |
| NC2 V-shape (steep down, full rebound) | WITNESSED then **RETRACTED** | 16 | 9.7e2 | **0.22** | honesty guarantee demonstrated |

**What counts as failure**: a null that crosses the bar (T3/NC1); a reversed effect that stays witnessed (NC2 retraction); byte-nondeterminism; witnessing without a pre-registered sigma.

## Receipted design lessons (the failures that shaped the tool)

1. **Scale-free betting was REJECTED**: a bounded betting e-process on past-max-normalized signals stalled at E≈2.3 on a real drift (mean signal 1.66e-4) — scale-free normalization destroys SNR. Likelihood ratios on raw increments exploit SNR and are the right tool.
2. **Multiplicative noise is differenced**: log-loss noise amplitude a contributes ~√2·a to the INCREMENT sigma (MA structure). Register the increment scale, not the level scale. Fixture with 5% noise and σ=0.05 → E_max stalled at 6.8 (bar 20); 1% noise with σ=0.02 → crosses at t=324.
3. **Shuffle negative controls are wrong for drift detectors**: drift is order-invariant — shuffling a decreasing series must STILL witness. The correct retraction control is the V-shape series (NC2).

## Limitations (honest)

- Gaussian null: heavy-tailed increment noise can break validity (documented "no bound if null wrong"); a Student-t variant is the next lane.
- σ mis-registration degrades power or validity — pre-registration discipline is the user's duty; the tool only enforces that it happens.
- Single-series tool; sequential comparison across many curves (multiplicity) is not handled.
