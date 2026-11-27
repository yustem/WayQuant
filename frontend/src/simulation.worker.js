import {runOpenFairMonteCarlo} from './engine.js';
self.onmessage = ({data}) => {
  try {
    const {localParams,residualParams,iterations,seed,threshold} = data;
    const baseline = runOpenFairMonteCarlo(localParams,iterations,seed,threshold);
    const residual = JSON.stringify(localParams) === JSON.stringify(residualParams) ? baseline : runOpenFairMonteCarlo(residualParams,iterations,seed,threshold,baseline.lecPoints.map(p=>p.loss));
    self.postMessage({baseline,residual});
  } catch (error) { self.postMessage({error: error.message}); }
};
