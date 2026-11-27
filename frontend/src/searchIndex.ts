export type SearchCategory = 'modules' | 'assets' | 'threats' | 'parameters' | 'metrics' | 'controls' | 'sections' | 'reports' | 'architecture';
export type SearchEntry = {
  id: string;
  label: string;
  category: SearchCategory;
  keywords?: string;
  module?: string;
  selector?: string;
  section?: string;
  review?: {id: string; value: string};
  unavailable?: boolean;
};

export const searchCopy = {
  en: {
    trigger: 'Search workspace', placeholder: 'Search modules, parameters, controls…', title: 'Search WayQuant',
    close: 'Close search', empty: 'No matching results', emptyHint: 'Try a module, asset, risk parameter, or NIST control.',
    navigate: 'Navigate', select: 'Open', dismiss: 'Close', review: 'Review in selector — confirm there to change the scenario.',
    unavailable: 'Available after the current simulation completes.', count: 'results',
    categories: {modules:'Workspace modules', assets:'Enterprise assets', threats:'Threat scenarios', parameters:'Risk parameters', metrics:'Analytical metrics', controls:'NIST controls', sections:'Analytical sections', reports:'Report sections', architecture:'Architecture sections'}
  },
  ru: {
    trigger: 'Поиск по платформе', placeholder: 'Модули, параметры, защитные меры…', title: 'Поиск в WayQuant',
    close: 'Закрыть поиск', empty: 'Совпадений не найдено', emptyHint: 'Введите название модуля, актива, параметра риска или меры NIST.',
    navigate: 'Навигация', select: 'Открыть', dismiss: 'Закрыть', review: 'Открыть в списке — подтвердите там изменение сценария.',
    unavailable: 'Доступно после завершения текущего расчёта.', count: 'результатов',
    categories: {modules:'Рабочие модули', assets:'Целевые активы', threats:'Сценарии угроз', parameters:'Параметры риска', metrics:'Аналитические показатели', controls:'Защитные меры NIST', sections:'Аналитические разделы', reports:'Разделы отчёта', architecture:'Разделы архитектуры'}
  }
};

/** Build navigation entries from the same translations, presets and control catalog as the UI. */
export function buildSearchIndex({t, otherT, lang, fairParams, catalog, selectedThreat, hasResults, resultsReady, percentiles}: {
  t: any; otherT: any; lang: string; fairParams: Record<string, number>;
  catalog: Record<string, Array<{id: string; code: string; name: Record<string,string>; desc: Record<string,string>}>>;
  selectedThreat: string; hasResults: boolean; resultsReady: boolean;
  percentiles: number[];
}): SearchEntry[] {
  const entries: SearchEntry[] = [];
  for (const [module, label] of Object.entries(t.sidebar.tabs)) entries.push({id:`module-${module}`, label:String(label), category:'modules', module, keywords:otherT.sidebar.tabs[module], selector:'.workspace-content h1'});
  for (const [key, label] of Object.entries(t.assets)) entries.push({id:`asset-${key}`, label:String(label), category:'assets', keywords:`${key} ${otherT.assets[key]}`, review:{id:'context-asset', value:key}});
  for (const [key, label] of Object.entries(t.threats)) entries.push({id:`threat-${key}`, label:String(label), category:'threats', keywords:`${key} ${otherT.threats[key]}`, review:{id:'context-threat', value:key}});

  for (const prefix of ['lef','plm','slm']) {
    for (const suffix of ['Min','Mode','Max']) {
      const key = `${prefix}${suffix}`;
      if (!(key in fairParams)) continue;
      const label = prefix === 'slm' && suffix === 'Max' ? (lang === 'ru' ? 'P95 (не максимум)' : 'P95 (not a maximum)') : t.inputTab[`${suffix.toLowerCase()}Label`];
      entries.push({id:`parameter-${key}`, label:`${prefix.toUpperCase()} · ${label}`, category:'parameters', module:'input', selector:`#fair-${key}`, keywords:`${key} ${t.inputTab[`${prefix}Section`]} ${otherT.inputTab[`${prefix}Section`]}`});
    }
  }
  for (const prefix of ['lef','plm']) entries.push({id:`parameter-${prefix}Gamma`, label:`${prefix.toUpperCase()} · ${t.inputTab.gammaLabel}`, category:'parameters', module:'input', selector:`#fair-${prefix}Gamma`, keywords:`${prefix} gamma lambda ${otherT.inputTab.gammaLabel}`});
  entries.push(
    {id:'parameter-slefProb', label:t.inputTab.slefProbLabel, category:'parameters', module:'input', selector:'#fair-slefProb', keywords:`SLEF ${otherT.inputTab.slefProbLabel}`},
    {id:'parameter-riskAppetite', label:t.simTab.riskToleranceLabel, category:'parameters', module:'input', selector:'#risk-appetite', keywords:otherT.simTab.riskToleranceLabel},
    {id:'parameter-materiality', label:t.simTab.secMaterialityLabel, category:'parameters', module:'input', selector:'#scenario-loss-threshold', keywords:otherT.simTab.secMaterialityLabel}
  );
  for (const [id,key] of [['iterations','iterationsLabel'],['seed','seedLabel'],['currency','currencyLabel']]) entries.push({id:`parameter-${id}`, label:t.sidebar[key], category:'parameters', selector:`#context-${id}`, keywords:otherT.sidebar[key]});

  for (const [key, target] of [['kpiAle','ale'],['kpiVar95','var95'],['kpiCvar99','cvar99'],['kpiZeroProb','zeroLoss']]) entries.push({id:`metric-${target}`, label:t.simTab[key], category:'metrics', module:'simulation', selector:`[data-search-target="${target}"]`, keywords:otherT.simTab[key], unavailable:!hasResults});
  for (const [key,target] of [['annualSecSpend','controlSpend'],['preventedLoss','preventedLoss'],['netBenefit','netBenefit'],['rosiMetric','rosi']]) entries.push({id:`metric-${target}`, label:t.controlsTab[key], category:'metrics', module:'controls', selector:`[data-search-target="${target}"]`, keywords:otherT.controlsTab[key], unavailable:!hasResults});
  entries.push({id:'metric-thresholdExceedance', label:lang === 'ru' ? 'Вероятность превышения сценарного порога' : 'Scenario threshold exceedance', category:'metrics', module:'simulation', selector:'[data-search-target="thresholdExceedance"]', unavailable:!hasResults});
  entries.push({id:'metric-residualVar',label:t.controlsTab.residualVar,category:'metrics',selector:'[data-search-target="residualVar"]',keywords:otherT.controlsTab.residualVar,unavailable:!hasResults});
  for(const percentile of percentiles) entries.push({id:`percentile-${percentile}`,label:`${t.simTab.percentileCol} P${percentile}`,category:'metrics',module:'simulation',selector:`[data-search-percentile="${percentile}"]`,keywords:`${otherT.simTab.percentileCol} ${t.simTab.percentileTableTitle}`,unavailable:!hasResults});

  for (const [threat, controls] of Object.entries(catalog)) {
    for (const control of controls) entries.push({id:`control-${threat}-${control.id}`, label:control.name[lang], category:'controls', keywords:`${control.code} ${control.name.en} ${control.name.ru} ${control.desc[lang]} ${t.threats[threat]}`,
      ...(threat === selectedThreat ? {module:'controls', selector:`[data-search-control="${control.id}"]`, unavailable:!hasResults} : {review:{id:'context-threat',value:threat}})});
  }
  for (const [key,target,module,group] of [
    ['fairTaxonomy','fair-decomposition-title','input','inputTab'],
    ['lefSection','lef-section','input','inputTab'],['plmSection','plm-section','input','inputTab'],['slmSection','slm-section','input','inputTab'],
    ['lecTitle','search-lec','simulation','simTab'],['histTitle','search-histogram','simulation','simTab'],['percentileTableTitle','search-percentiles','simulation','simTab'],
    ['comparisonChartTitle','search-comparison','controls','controlsTab']
  ]) entries.push({id:`section-${target}`, label:t[group][key], category:'sections', module, selector:`#${target}`, keywords:otherT[group][key], unavailable:module !== 'input' && !hasResults});

  for (const [id,label,selector] of [
    ['summary',t.exportTab.execSummaryTitle,'[data-search-target="report-summary"]'],
    ['exposure',t.exportTab.page1Label,'.print-page-1'],
    ['controls',t.exportTab.page2Label,'.print-page-2'],
    ['recommendation',t.exportTab.boardRecTitle,'.report-recommendation'],
    ['metadata',lang === 'ru' ? 'Метаданные запуска' : 'Run Metadata','[data-search-target="report-metadata"]'],
    ['lec',t.simTab.lecTitle,'#report-lec-section'],
    ['json',t.exportTab.exportJsonBtn,'[data-search-target="report-json"]']
  ]) entries.push({id:`report-${id}`, label, category:'reports', module:'export', selector, keywords:id==='metadata'?'Run Metadata Метаданные запуска':undefined, unavailable:!resultsReady});
  for (const [section,label] of Object.entries(t.archTab.sections)) entries.push({id:`architecture-${section}`, label:String(label), category:'architecture', module:'architecture', section, selector:'[data-search-target="architecture-viewer"]', keywords:otherT.archTab.sections[section]});
  return entries;
}
