// Only a confirmed result for the current request may leave the application.
export function exportConfirmedRun(result, currentKey, computing) {
  if (computing || !result || result.requestKey !== currentKey) throw new Error('Stale or pending simulation');
  return structuredClone({softwareVersion:'3.0.0',runId:result.runId,request:result.snapshot,
    metadata:result.metadata,baseline:result.baseline,residual:result.residual,governance:result.governance});
}
