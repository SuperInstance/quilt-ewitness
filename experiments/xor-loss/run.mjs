// Feed the REAL regenerated quilt-nn-style XOR loss chain to the e-process
// witness and report the verdict with actual numbers.
import { trainXor } from '../../src/train.mjs';
import { witness } from '../../src/witness.mjs';

const run = trainXor({ seed: 42, epochs: 3000, lr: 0.5 });
const w = witness(run.series, { type: 'DECREASES' });

console.log('== XOR loss chain -> e-process witness ==');
console.log('config        :', JSON.stringify(run.config));
console.log('first loss    :', run.series[0]);
console.log('final loss    :', run.finalLoss);
console.log('loss @ stop   :', w.citype_stop_t !== null ? run.series[w.citype_stop_t - 1] : null);
console.log('claim         :', JSON.stringify(w.claim));
console.log('E             :', w.E);
console.log('logE @ stop   :', w.citype_stop_t !== null ? w.logE_final : null);
console.log('E_max         :', w.E_max);
console.log('verdict       :', w.verdict);
console.log('citype_stop_t :', w.citype_stop_t, '(epoch index into the 3000-epoch chain)');
console.log('Ville logThr  :', w.log_threshold, '(= -ln 0.05 = 2.9957, cellgraph precedent 2.996)');
console.log('null_spec.s0  :', w.null_spec.s0);
