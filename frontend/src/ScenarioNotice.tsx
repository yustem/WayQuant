import {useState} from 'react';
import {Info} from 'lucide-react';
export const scenarioNotes = {
 en: {label:'Synthetic scenario', full:'Illustrative synthetic scenario; not empirically calibrated data. Control effects are scenario assumptions, not NIST effectiveness estimates.', slm:'SLM uses Floor / Mode / P95. P95 is the 95th percentile, not a loss ceiling.'},
 ru: {label:'Синтетический сценарий', full:'Иллюстративный синтетический сценарий; данные не откалиброваны эмпирически. Эффективность мер — сценарное допущение, а не оценка NIST.', slm:'SLM: нижняя граница / мода / P95. P95 — 95-й процентиль, а не предел ущерба.'}
};
export function ScenarioNotice({lang}:{lang:string}) {
 const [open,setOpen]=useState(false);
 const note=scenarioNotes[lang];
 return <div className="relative" onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);}}>
   <button type="button" className="inline-flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-slate-200 focus-visible:outline focus-visible:outline-blue-400 rounded" aria-expanded={open} aria-controls="scenario-explanation" onFocus={()=>setOpen(true)} onClick={()=>setOpen(true)} onKeyDown={e=>{if(e.key==='Escape')setOpen(false);}}>
     <Info size={12} aria-hidden="true"/>{note.label}
   </button>
   {open && <div id="scenario-explanation" role="note" className="absolute top-full left-0 z-30 mt-1 w-60 max-w-[85vw] rounded border border-slate-700 bg-[#161F30] p-3 text-xs leading-relaxed text-slate-300 shadow-xl">
     {note.full}<button type="button" aria-label={lang==='ru'?'Закрыть':'Close'} className="block mt-2 text-blue-300" onClick={()=>setOpen(false)} onKeyDown={e=>{if(e.key==='Escape')setOpen(false);}}>×</button>
   </div>}
 </div>;
}
