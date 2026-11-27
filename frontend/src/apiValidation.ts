/** Validate transport/provenance boundaries without altering any returned values. */
export function validateSimulationResponse(data: any, request: Record<string, any>, lang: string) {
  const fail = (path: string): never => {throw new Error(lang === 'ru'
    ? `Некорректный ответ API (${path}). Результат не принят; повторите расчёт.`
    : `Invalid API response (${path}). Results were not accepted; retry the calculation.`);};
  const nonnegative = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
  const probability = (value: unknown) => nonnegative(value) && Number(value) <= 100;
  const levels = [10,25,50,75,90,95,99,99.5];
  for (const name of ['baseline','residual']) {
    const scenario = data?.[name];
    if (!scenario || !Number.isInteger(scenario.iterations) || scenario.iterations !== request.iterations) fail(`${name}.iterations`);
    for (const key of ['compute_time_ms','ale','cyber_var_95','cyber_var_99','tail_cvar_99']) if (!nonnegative(scenario[key])) fail(`${name}.${key}`);
    if (!probability(scenario.zero_loss_prob_pct)) fail(`${name}.zero_loss_prob_pct`);
    if (scenario.cyber_var_95 > scenario.cyber_var_99 || scenario.cyber_var_99 > scenario.tail_cvar_99) fail(`${name}.quantile_order`);
    if (!Array.isArray(scenario.lec_curve) || scenario.lec_curve.length < 2) fail(`${name}.lec_curve`);
    scenario.lec_curve.forEach((point: any, index: number) => {
      if (!nonnegative(point.loss) || !probability(point.prob)) fail(`${name}.lec_curve[${index}]`);
      if (index && (point.loss < scenario.lec_curve[index-1].loss || point.prob > scenario.lec_curve[index-1].prob)) fail(`${name}.lec_order`);
    });
    if (!Array.isArray(scenario.percentiles) || scenario.percentiles.length !== levels.length) fail(`${name}.percentiles`);
    scenario.percentiles.forEach((row: any,index: number) => {
      if (row.percentile !== levels[index] || !probability(row.exceed_prob)) fail(`${name}.percentiles[${index}]`);
      for (const key of ['total','primary','secondary']) {
        if (!nonnegative(row[key]) || (index && row[key] < scenario.percentiles[index-1][key])) fail(`${name}.percentiles[${index}].${key}`);
      }
    });
    if (!Array.isArray(scenario.histogram_bins) || scenario.histogram_bins.length !== 40) fail(`${name}.histogram_bins`);
    let count = 0, mass = 0;
    scenario.histogram_bins.forEach((bin: any,index: number) => {
      if (![bin.bin_start,bin.bin_end,bin.bin_mid].every(nonnegative) || bin.bin_start > bin.bin_mid || bin.bin_mid > bin.bin_end || !Number.isInteger(bin.count) || bin.count < 0 || !probability(bin.density_pct)) fail(`${name}.histogram_bins[${index}]`);
      if (index && bin.bin_start < scenario.histogram_bins[index-1].bin_end) fail(`${name}.histogram_order`);
      count += bin.count;mass += bin.density_pct;
    });
    if (count > scenario.iterations || Math.abs(mass - (count ? 100 : 0)) > 1e-7) fail(`${name}.histogram_mass`);
  }
  const metadata = data?.metadata;
  if (!metadata || metadata.engine !== 'numpy' || metadata.engine_version !== '3.0.0' || metadata.model !== 'shifted-lognormal-mode-p95-v1' || !Number.isFinite(Date.parse(metadata.timestamp))) fail('metadata');
  const keys = ['lef_min','lef_mode','lef_max','lef_gamma','plm_min','plm_mode','plm_max','plm_gamma','slef_prob','slm_min','slm_mode','slm_max','sec_materiality_threshold','iterations','random_seed'];
  for (const key of keys) if (metadata.inputs?.[key] !== request[key]) fail(`metadata.inputs.${key}`);
  const controls = request.controls.filter((control: any)=>control.enabled);
  if (!Array.isArray(metadata.controls) || metadata.controls.length !== controls.length) fail('metadata.controls');
  controls.forEach((control: any,index: number)=>{
    for (const key of Object.keys(control)) if (metadata.controls[index]?.[key] !== control[key]) fail(`metadata.controls[${index}].${key}`);
  });
  if (data.baseline.lec_curve.length !== data.residual.lec_curve.length || data.baseline.lec_curve.some((point: any,index: number)=>point.loss !== data.residual.lec_curve[index].loss)) fail('residual.lec_thresholds');
  const governance = data.governance;
  if (!governance || !nonnegative(governance.annual_control_spend) || !nonnegative(governance.prevented_annual_loss) || !Number.isFinite(governance.net_benefit) || !Number.isFinite(governance.rosi_percentage) || !probability(governance.sec_materiality_exceed_prob)) fail('governance');
}
