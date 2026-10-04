// Feed the REAL regenerated sine regression loss chain to the e-process
// witness: a DECREASES claim under a pilot-registered sigma.
// Ported for #1: the stale src/witness.mjs (archived) is gone, and with it the
// IMPROVES_BEYOND claim type — the current tool (eproc.mjs) witnesses
// DECREASES/INCREASES only, with sigma REQUIRED and pre-registered
// (src/pilot.mjs recipe: pilot seed 43 declares the null step scale; the
// claim series is seed 42 and is never used to tune the null spec).
import { trainSine } from '../../src/train.mjs';
import { witness } from '../../src/eproc.mjs';
import { pilotSigma0 } from '../../src/pilot.mjs';

const pilot = trainSine({ seed: 43, epochs: 3000, lr: 0.1 });
const run = trainSine({ seed: 42, epochs: 3000, lr: 0.1 });
const sigma = pilotSigma0(pilot.series);
const dec = witness(run.series, { claim: 'DECREASES', sigma, delta: 0.05 });

console.log('== SINE loss chain -> e-process witness ==');
console.log('config        :', JSON.stringify(run.config));
console.log('first loss    :', run.series[0]);
console.log('final loss    :', run.finalLoss);
console.log('--- DECREASES ---');
console.log('sigma (pilot) :', dec.sigma, '(seed 43, inflate x2, pre-registered)');
console.log('E_final       :', dec.E_final);
console.log('E_max         :', dec.E_max);
console.log('verdict       :', dec.verdict);
console.log('stop_t        :', dec.stop_t, '(loss there:', dec.stop_t > 0 ? run.series[dec.stop_t] : null, ')');
console.log('retracted     :', dec.retracted, '(fired then decayed — reported, not hidden)');
console.log('Ville bar     :', dec.bar, '(= 1/delta = 20)');
