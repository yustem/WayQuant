import React from 'react';
import {localeFor} from './international';
import './executiveReport.css';

/** Presentation only: all metrics and reproducibility values come from the committed run. */
export function ExecutiveReport({lang,paper,run,asset,threat,controls,riskAppetite,Chart}:any) {
 const ru=lang==='ru', locale=localeFor(lang), request=run.snapshot, b=run.baseline,r=run.residual,g=run.governance;
 const currency=request.context.currency;
 const money=(n:number)=>new Intl.NumberFormat(locale,{style:'currency',currency,maximumFractionDigits:0}).format(n);
 const number=(n:number)=>new Intl.NumberFormat(locale).format(n);
 const pct=(n:number,digits=2)=>new Intl.NumberFormat(locale,{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(n)+'%';
 const text=(en:string,rus:string)=>ru?rus:en;
 const date=new Intl.DateTimeFormat(locale,{year:'numeric',month:'long',day:'numeric'}).format(new Date());
 const page=(n:number)=>text(`Page ${n} of 2`,`Страница ${n} из 2`);
 const metric=(label:string,value:string)=><div className="report-kpi"><div>{label}</div><div style={value.length>18?{fontSize:12}:undefined}>{value}</div></div>;
 const heading=text('Executive Cyber Risk Report','Отчёт об оценке киберриска');
 const metadata=run.metadata||{};
 return <div className="report-pages executive-report" data-paper={paper} style={{'--report-page-height':paper==='Letter'?'241.4mm':'259mm'} as React.CSSProperties}>
  <style>{`@page { size: ${paper==='Letter'?'letter':'A4'} portrait; margin: 19mm; }`}</style>
  <section className="print-page-1">
   <div className="report-heading no-break"><img src={`${import.meta.env.BASE_URL}wayquant-mark-light.svg`} alt=""/><div><div className="report-designation">WayQuant · {text('Executive Risk Assessment','Оценка риска для руководства')}</div><h2>{heading}</h2></div><div className="report-date">{date}<br/>v{metadata.software_version||'3.0.0'} · {currency}</div></div>
   <div className="report-context no-break"><div><strong>{text('Enterprise asset','Целевой актив')}</strong><span>{asset}</span></div><div><strong>{text('Threat scenario','Сценарий угрозы')}</strong><span>{threat}</span></div></div>
   <p className="report-method-note">{text('Monte Carlo iterations','Итерации Монте-Карло')}: {number(request.iterations)} · {text('Deterministic seed','Детерминированный seed')}: {number(request.random_seed)}</p>
   <section data-search-target="report-summary" className="no-break"><h3>{text('1. Executive risk assessment summary','1. Резюме оценки риска')}</h3><p>{text('Annual loss exposure under the configured scenario. Cyber VaR (95%) is the 95th percentile of modeled annual losses; it is not a confidence interval.','Годовые потери при заданном сценарии. Кибер-VaR (95%) — 95-й процентиль моделируемых годовых потерь, а не доверительный интервал.')}</p></section>
   <div className="report-metrics no-break">
    {metric(text('Baseline ALE (mean annual loss)','Исходные ожидаемые годовые потери (ALE)'),money(b.ale))}
    {metric(text('Baseline Cyber VaR (95%)','Исходный кибер-VaR (95%)'),money(b.var95))}
    {metric(text('Residual Cyber VaR (95%)','Остаточный кибер-VaR (95%)'),money(r.var95))}
    {metric(text('Expected Shortfall (99%)','Ожидаемый ущерб в хвосте (99%)'),money(b.cvar99))}
    {metric(text('Annual threshold exceedance','Превышение сценарного порога за год'),pct(g.secMaterialityExceedProb))}
    {metric(text('Portfolio expected ROSI','Ожидаемая рентабельность мер (ROSI)'),pct(g.rosiPct,1))}
   </div>
   <section id="report-lec-section" className="report-lec-panel no-break"><h3>{text('2. Baseline versus residual loss exceedance (LEC)','2. Исходная и остаточная кривые превышения потерь (LEC)')}</h3>
    <div className="report-chart-row"><span className="report-y-axis">{text('Annual loss exceedance probability','Вероятность превышения годовых потерь')}</span><div className="report-chart"><Chart baselineLec={b.lecPoints} residualLec={r.lecPoints} ale={b.ale} var95={b.var95} riskAppetite={riskAppetite} currency={currency} logScale={false} lang={lang}/></div></div>
    <div className="report-legend">{text('Annual loss threshold','Порог годового ущерба')} ({currency}) · <span>━ {text('Baseline','Исходный риск')}</span> · <span>╌ {text('Residual','Остаточный риск')}</span></div>
   </section>
   <p className="report-method-note no-break">{text('Scenario assumptions are synthetic, not empirically calibrated. Control effects are scenario assumptions, not NIST effectiveness estimates. SLM uses floor / mode / P95; P95 is not a loss ceiling.','Сценарные допущения синтетические, без эмпирической калибровки. Эффекты мер — допущения, а не оценка эффективности NIST. SLM: нижняя граница / мода / P95; P95 не является пределом ущерба.')}</p>
   <footer className="report-page-number">{page(1)}</footer>
  </section>
  <section className="print-page-2">
   <div className="report-continuation no-break">WayQuant · {heading}</div>
   <section className="no-break"><h3>{text('3. Security Control Portfolio & ROSI Analysis','3. Портфель защитных мер и анализ ROSI')}</h3>
    <div className="report-table-scroll"><table className="report-controls-table"><thead><tr>{[text('NIST reference','Ссылка NIST'),text('Security control','Защитная мера'),text('Status','Статус'),text('Annual cost¹','Годовая стоимость¹'),'LEF / PLM / SLM'].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{controls.map((c:any)=><tr key={c.id}><td>{c.code}</td><td>{c.name[lang]}</td><td>{c.enabled?text('ACTIVE','ВКЛЮЧЕНА'):text('EXCLUDED','ИСКЛЮЧЕНА')}</td><td>{money(c.annualCost)}</td><td>{[c.lefReduction,c.plmReduction,c.slmReduction].map(x=>pct(-x*100,0)).join(' / ')}</td></tr>)}</tbody></table></div>
    <p className="report-method-note">{text('¹ Excluded controls show hypothetical costs; only active controls contribute to selected expenditure. Percentage columns are assumed reductions in frequency / primary severity / secondary severity.','¹ Для исключённых мер указана гипотетическая стоимость; в выбранные расходы входят только включённые меры. Процентные столбцы — допущения о снижении частоты / прямого / вторичного ущерба.')}</p>
   </section>
   <section className="report-recommendation no-break"><h3>{text('4. Security investment and financial impact','4. Инвестиции в защиту и финансовый эффект')}</h3><div className="report-finance">{metric(text('Selected annual expenditure','Выбранные годовые расходы'),money(g.annualControlSpend))}{metric(text('Modeled prevented annual loss','Моделируемое снижение годовых потерь'),money(g.preventedAle))}{metric(text('Expected net benefit','Ожидаемый чистый эффект'),money(g.netBenefit))}</div><p>{text('Financial effects are model estimates, not guaranteed realized savings. Residual ALE:','Финансовый эффект — оценка модели, а не гарантированная экономия. Остаточные ожидаемые потери (ALE):')} {money(r.ale)}. {text('Zero-cost ROSI is displayed as 0 by convention; negative sampled loss reduction is floored at zero by the existing model.','При нулевой стоимости ROSI отображается как 0; отрицательное выборочное снижение ущерба ограничено нулём в существующей модели.')}</p></section>
   <section data-search-target="report-metadata" className="no-break report-metadata"><h3>{text('5. Methodology and reproducibility metadata','5. Методология и воспроизводимость')}</h3><p>{text('FAIR-inspired annual Monte Carlo model; independent incidents and severities, multiplicative control effects. Preserve the accompanying audit JSON and matching engine version to reproduce this run.','FAIR-ориентированная годовая модель Монте-Карло; независимые инциденты и тяжесть ущерба, мультипликативные эффекты мер. Для воспроизведения сохраните JSON расчёта и соответствующую версию ядра.')}</p>
    <dl><div className="report-run-id"><dt>{text('Simulation run ID','Идентификатор расчёта')}</dt><dd>{run.runId}</dd></div>{[
     [text('Computational engine','Вычислительное ядро'),metadata.engine==='numpy'?'NumPy (PCG64)':text('Browser Web Worker (Mulberry32)','Web Worker браузера (Mulberry32)')],
     [text('Iterations / deterministic seed','Итерации / детерминированный seed'),`${number(request.iterations)} / ${number(request.random_seed)}`],
     [text('Scenario loss threshold','Сценарный денежный порог'),money(request.sec_materiality_threshold)],
     [text('Risk appetite threshold','Порог толерантности к риску'),money(riskAppetite)],
     [text('Units / paper','Единицы / бумага'),`${currency} / ${paper==='Letter'?'US Letter':'A4'}`],
     [text('Model version','Версия модели'),metadata.model||'shifted-lognormal-mode-p95-v1']
    ].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <p className="report-method-note">{text('Currency denotes input units; no FX conversion is performed. Thresholds are scenario settings, not legal materiality determinations. NIST references are contextual mappings, not certification or evidence of compliance.','Валюта обозначает единицы ввода; пересчёта по курсу нет. Пороги — настройки сценария, а не юридическая оценка существенности. Ссылки NIST — контекстные соответствия, а не сертификация или доказательство соответствия требованиям.')}</p>
   </section><footer className="report-page-number">{page(2)}</footer>
  </section>
 </div>;
}
