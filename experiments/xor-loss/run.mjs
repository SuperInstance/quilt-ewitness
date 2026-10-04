// Feed the REAL regenerated quilt-nn-style XOR loss chain to the e-process
// witness and report the verdict with actual numbers.
// Ported for #1: the stale src/witness.mjs (archived) is gone; this now calls
// eproc.mjs's witness with a PILOT-REGISTERED sigma — src/pilot.mjs recipe:
// pilot seed 43 supplies the declared null step scale, the claim series is
// seed 42, and the claim series is never used to tune the null spec.
import { trainXor } from '../../src/train.mjs';
import { witness } from '../../src/eproc.mjs';
import { pilotSigma0 } from '../../src/pilot.mjs';

const pilot = trainXor({ seed: 43, epochs: 3000, lr: 0.5 });
const run = trainXor({ seed: 42, epochs: 3000, lr: 0.5 });
const sigma = pilotSigma0(pilot.series);
const w = witness(run.series, { claim: 'DECREASES', sigma, delta: 0.05 });

console.log('== XOR loss chain -> e-process witness ==');
console.log('config        :', JSON.stringify(run.config));
console.log('first loss    :', run.series[0]);
console.log('final loss    :', run.finalLoss);
console.log('loss @ stop   :', w.stop_t > 0 ? run.series[w.stop_t] : null);
console.log('claim         :', w.claim);
console.log('sigma (pilot) :', w.sigma, '(seed 43, inflate x2, pre-registered)');
console.log('E_final       :', w.E_final);
console.log('E_max         :', w.E_max);
console.log('verdict       :', w.verdict);
console.log('stop_t        :', w.stop_t, '(epoch index into the 3000-epoch chain)');
console.log('retracted     :', w.retracted, '(fired then decayed — reported, not hidden)');
console.log('Ville bar     :', w.bar, '(= 1/delta = 20)');
