# TEST-RECEIPT — quilt-ewitness v0.1.0

- **Run**: node --test test/witness.test.mjs, Node v24.21.0, 7 tests.
- **Came back**: 7 pass / 0 fail / 0 skipped. Key numbers: T1 WITNESSED stop_t=324 E_max=2.5e16; T3 null E_max=0.85 (bar 20); NC2 WITNESSED@16 then RETRACTED E_final=0.22 (E_max 9.7e2).
- **Counts as failure**: null crossing the Ville bar; reversed effect staying witnessed; byte-nondeterminism; witnessing without pre-registered sigma.
- **Negative controls**: NC1 increasing-refuses, NC2 retraction, NC3 loud refusals incl. missing sigma.
- **Design-failure receipts**: scale-free betting REJECTED (E stalled 2.3); 5%-noise fixture underpowered (E_max 6.8) -> 1% + increment-sigma registration -> cross at 324. Full narrative in README.

# TEST-RECEIPT — post issue-#1 fix (2026-10-03, Node v22.23.3)

- **Run**: `npm test` (= `node --test`, script fixed — the old `node --test test/`
  form failed module resolution on this node), 8 tests.
- **Came back**: 8 pass / 0 fail. New pin: `test/smoke_imports.test.mjs` imports
  every `src/*.mjs`; observed RED pre-fix on the stale `witness.mjs`, GREEN after
  archive-rename to `src/witness.mjs.archived-20261003`.
- **Runners**: both experiments now call `eproc.mjs`'s witness with pilot-registered
  sigma (seed 43, inflate x2; claim series seed 42 — no peeking).
  XOR: WITNESSED stop_t=103 E_max=2.1e38 no retraction.
  SINE: WITNESSED stop_t=1 E_max=1.6e22, retracted=true (evidence fired then
  decayed — reported, not hidden). Both deterministic across reruns.
