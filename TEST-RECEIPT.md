# TEST-RECEIPT — quilt-ewitness v0.1.0

- **Run**: node --test test/witness.test.mjs, Node v24.21.0, 7 tests.
- **Came back**: 7 pass / 0 fail / 0 skipped. Key numbers: T1 WITNESSED stop_t=324 E_max=2.5e16; T3 null E_max=0.85 (bar 20); NC2 WITNESSED@16 then RETRACTED E_final=0.22 (E_max 9.7e2).
- **Counts as failure**: null crossing the Ville bar; reversed effect staying witnessed; byte-nondeterminism; witnessing without pre-registered sigma.
- **Negative controls**: NC1 increasing-refuses, NC2 retraction, NC3 loud refusals incl. missing sigma.
- **Design-failure receipts**: scale-free betting REJECTED (E stalled 2.3); 5%-noise fixture underpowered (E_max 6.8) -> 1% + increment-sigma registration -> cross at 324. Full narrative in README.
