// Feed the REAL regenerated sine regression loss chain to the e-process
// witness: DECREASES claim, plus IMPROVES_BEYOND at a threshold the curve
// actually reaches and one it never does.
import { trainSine } from '../../src/train.mjs';
import { witness } from '../../src/witness.mjs';

const run = trainSine({ seed: 42, epochs: 3000, lr: 0.1 });
const dec = witness(run.series, { type: 'DECREASES' });
const beyond = witness(run.series, { type: 'IMPROVES_BEYOND', threshold: 0.01 });
const never = witness(run.series, { type: 'IMPROVES_BEYOND', threshold: 1e-5 });

console.log('== SINE loss chain -> e-process witness ==');
console.log('config        :', JSON.stringify(run.config));
console.log('first loss    :', run.series[0]);
console.log('final loss    :', run.finalLoss);
console.log('--- DECREASES ---');
console.log('E             :', dec.E);
console.log('E_max         :', dec.E_max);
console.log('verdict       :', dec.verdict);
console.log('citype_stop_t :', dec.citype_stop_t);
console.log('--- IMPROVES_BEYOND(0.01) ---');
console.log('E             :', beyond.E);
console.log('verdict       :', beyond.verdict);
console.log('citype_stop_t :', beyond.citype_stop_t, '(loss there:', run.series[beyond.citype_stop_t - 1], ')');
console.log('--- IMPROVES_BEYOND(1e-5) [unreachable threshold] ---');
console.log('E             :', never.E, ' E_max:', never.E_max);
console.log('verdict       :', never.verdict, ' citype_stop_t:', never.citype_stop_t);
